/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const LIVE_BASE_URL = "https://abangcebu.tech";
const OUTPUT_DIR = path.join(process.cwd(), "test-results", "navigation-benchmark");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function runBenchmark() {
  console.log("=== STARTING LIVE NAVIGATION BENCHMARK ON ABANGCEBU.TECH ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  const report = {
    timestamp: new Date().toISOString(),
    environment: "production (https://abangcebu.tech)",
    auth: {
      email: "abangcebuai+renter@gmail.com",
      role: "renter"
    },
    guest_navigations: [],
    renter_navigations: [],
    return_navigations: [],
    theme_toggles: [],
    console_logs: [],
    performance_summary: {}
  };

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  page.on("console", msg => {
    report.console_logs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Track network requests
  let activeNavigationRequests = [];
  page.on("request", req => {
    activeNavigationRequests.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      startTime: Date.now()
    });
  });

  page.on("requestfinished", async req => {
    const item = activeNavigationRequests.find(r => r.url === req.url() && !r.endTime);
    if (item) {
      item.endTime = Date.now();
      item.duration = item.endTime - item.startTime;
      const res = await req.response();
      item.status = res ? res.status() : null;
      try {
        const headers = res ? res.headers() : {};
        item.contentLength = headers["content-length"] ? parseInt(headers["content-length"]) : null;
      } catch {}
    }
  });

  page.on("requestfailed", req => {
    const item = activeNavigationRequests.find(r => r.url === req.url() && !r.endTime);
    if (item) {
      item.endTime = Date.now();
      item.duration = item.endTime - item.startTime;
      item.failed = true;
      item.errorText = req.failure()?.errorText;
    }
  });

  async function returnToMap() {
    activeNavigationRequests = [];
    const backBtn = page.getByRole("link", { name: /Back to (map|dashboard)/i });
    if ((await backBtn.count()) > 0) {
      const clickT0 = Date.now();
      await backBtn.first().click();
      await page.waitForURL(url => url.pathname === "/" || url.pathname === "/map", { timeout: 15000 });
      await page.locator("[data-finder-overlay]").waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
      const returnUrlMs = Date.now() - clickT0;
      const canvasPreserved = await page.evaluate(() => {
        const win = window;
        return Boolean(win.__benchCanvas && document.querySelector("canvas.maplibregl-canvas") === win.__benchCanvas);
      });
      return {
        from: "subpage-link",
        to: "/",
        durationMs: returnUrlMs,
        canvasPreserved
      };
    } else {
      const clickT0 = Date.now();
      await page.goto(LIVE_BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(400);
      return {
        from: "direct-goto",
        to: "/",
        durationMs: Date.now() - clickT0,
        canvasPreserved: false
      };
    }
  }

  async function measureSidebarTransition(linkName, expectedUrlPattern, screenshotName) {
    console.log(`\n--- Measuring Sidebar Nav to: ${linkName} ---`);
    activeNavigationRequests = [];

    // Ensure we are on home/map
    if (page.url() !== `${LIVE_BASE_URL}/` && !page.url().startsWith(`${LIVE_BASE_URL}/?`)) {
      await returnToMap();
    }

    // 1. Open sidebar drawer
    const openMenuBtn = page.getByRole("button", { name: "Open menu" });
    await openMenuBtn.waitFor({ state: "visible", timeout: 10000 });
    const drawerT0 = Date.now();
    await openMenuBtn.click();
    const drawer = page.getByRole("dialog", { name: "AbangCebu Menu" });
    await drawer.waitFor({ state: "visible" });
    const drawerOpenMs = Date.now() - drawerT0;

    // Clear performance marks
    await page.evaluate(() => {
      performance.clearMarks?.("abangcebu:nav-start");
      performance.clearMarks?.("abangcebu:nav-end");
      performance.clearMeasures?.("abangcebu:navigation");
      performance.clearMeasures?.("abangcebu:soft-navigation");
    });

    // 2. Click target link in sidebar
    const targetLink = drawer.getByRole("link", { name: linkName, exact: true });
    let clickTarget = targetLink;
    let clickHref = "";

    if ((await targetLink.count()) === 0) {
      const fallbackLink = drawer.getByRole("link", { name: linkName });
      if ((await fallbackLink.count()) > 0) {
        clickTarget = fallbackLink.first();
      } else {
        const targetBtn = drawer.getByRole("button", { name: linkName, exact: true });
        if ((await targetBtn.count()) > 0) {
          clickTarget = targetBtn.first();
        } else {
          console.log(`Neither link nor button "${linkName}" found in sidebar.`);
          return { error: `Element "${linkName}" not in sidebar drawer` };
        }
      }
    }

    try {
      clickHref = (await clickTarget.getAttribute("href")) || "button";
    } catch {
      clickHref = "button";
    }

    const clickT0 = Date.now();
    await clickTarget.click();

    // 3. Wait for URL match and document ready
    await page.waitForURL(expectedUrlPattern, { timeout: 15000 });
    const urlChangeMs = Date.now() - clickT0;

    // 4. Wait for destination back-link/content (past loading skeleton) to finish streaming
    await page.getByRole("link", { name: /Back to (map|dashboard)/i }).first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded");
    const domLoadedMs = Date.now() - clickT0;

    // Settle animation/react transitions
    await page.waitForTimeout(200);
    const totalMs = Date.now() - clickT0;

    // 5. Gather performance marks from browser
    const measures = await page.evaluate(() => {
      const navMeasures = performance.getEntriesByName("abangcebu:navigation", "measure");
      const softMeasures = performance.getEntriesByName("abangcebu:soft-navigation", "measure");
      const allMeasures = performance.getEntriesByType("measure").map(m => ({
        name: m.name,
        duration: m.duration,
        startTime: m.startTime
      }));
      return {
        abangcebuNavigation: navMeasures.map(m => m.duration),
        abangcebuSoftNavigation: softMeasures.map(m => m.duration),
        allMeasures
      };
    });

    if (screenshotName) {
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${screenshotName}.png`), fullPage: false });
    }

    const recordedRequests = [...activeNavigationRequests];

    const result = {
      targetName: linkName,
      targetHref: clickHref,
      destinationUrl: page.url(),
      drawerOpenDurationMs: drawerOpenMs,
      urlChangeDurationMs: urlChangeMs,
      domContentLoadedMs: domLoadedMs,
      totalSettledDurationMs: totalMs,
      abangcebuNavigationMeasureMs: measures.abangcebuNavigation[0] ?? null,
      abangcebuSoftNavigationMeasureMs: measures.abangcebuSoftNavigation[0] ?? null,
      requestCount: recordedRequests.length,
      rscRequests: recordedRequests.filter(r => r.url.includes("_rsc=")).map(r => ({ url: r.url, duration: r.duration, status: r.status })),
      apiRequests: recordedRequests.filter(r => r.url.includes("/api/") || r.url.includes("supabase.co")).map(r => ({ url: r.url, duration: r.duration, status: r.status })),
      slowRequests: recordedRequests.filter(r => (r.duration || 0) > 300).map(r => ({ url: r.url, duration: r.duration, status: r.status }))
    };

    console.log(`  -> Drawer Open: ${drawerOpenMs}ms`);
    console.log(`  -> URL Change: ${urlChangeMs}ms`);
    console.log(`  -> Nav Measure: ${result.abangcebuNavigationMeasureMs ? result.abangcebuNavigationMeasureMs.toFixed(1) + "ms" : "N/A"}`);
    console.log(`  -> Soft Nav: ${result.abangcebuSoftNavigationMeasureMs ? result.abangcebuSoftNavigationMeasureMs.toFixed(1) + "ms" : "N/A"}`);
    console.log(`  -> Total Settled: ${totalMs}ms`);
    console.log(`  -> RSC Count: ${result.rscRequests.length}`);
    console.log(`  -> Supabase/API Count: ${result.apiRequests.length}`);

    // Test return back to map
    const ret = await returnToMap();
    report.return_navigations.push({ from: linkName, method: ret.from, durationMs: ret.durationMs, canvasPreserved: ret.canvasPreserved });
    console.log(`  <- Returned to Map (${ret.from}, canvasPreserved=${ret.canvasPreserved}): ${ret.durationMs}ms`);

    return result;
  }

  // ==========================================
  // PHASE 1: GUEST / UNAUTHENTICATED NAVIGATION
  // ==========================================
  console.log("\n==========================================");
  console.log("PHASE 1: GUEST / UNAUTHENTICATED NAVIGATION");
  console.log("==========================================");
  const guestStart = Date.now();
  await page.goto(LIVE_BASE_URL);
  await page.waitForLoadState("networkidle");
  report.guest_initial_load_ms = Date.now() - guestStart;
  console.log(`Guest Initial Home Load: ${report.guest_initial_load_ms}ms`);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "01-guest-home.png") });

  // Guest Navigations from Sidebar:
  // 1. Saved rentals -> redirects to /login?next=%2Ffavorites
  report.guest_navigations.push(
    await measureSidebarTransition("Saved rentals", /(\/login|\/favorites)/, "02-guest-saved-rentals")
  );

  // 2. Help Center -> /help
  report.guest_navigations.push(
    await measureSidebarTransition("Help Center", /\/help/, "03-guest-help-center")
  );

  // 3. Contact support -> /support
  report.guest_navigations.push(
    await measureSidebarTransition("Contact support", /\/support/, "04-guest-support")
  );

  // Theme toggle test for guest
  await page.getByRole("button", { name: "Open menu" }).click();
  const themeDrawer = page.getByRole("dialog", { name: "AbangCebu Menu" });
  const darkBtn = themeDrawer.getByRole("button", { name: "Switch to dark mode" });
  if ((await darkBtn.count()) > 0) {
    const t0 = Date.now();
    await darkBtn.click();
    await page.waitForTimeout(200);
    report.theme_toggles.push({
      mode: "dark",
      durationMs: Date.now() - t0,
      activeTheme: await page.evaluate(() => document.documentElement.className)
    });
  }
  const lightBtn = themeDrawer.getByRole("button", { name: "Switch to light mode" });
  if ((await lightBtn.count()) > 0) {
    const t0 = Date.now();
    await lightBtn.click();
    await page.waitForTimeout(200);
    report.theme_toggles.push({
      mode: "light",
      durationMs: Date.now() - t0,
      activeTheme: await page.evaluate(() => document.documentElement.className)
    });
  }
  await page.keyboard.press("Escape");

  // ==========================================
  // PHASE 2: AUTHENTICATING AS RENTER
  // ==========================================
  console.log("\n==========================================");
  console.log("PHASE 2: AUTHENTICATING AS RENTER");
  console.log("==========================================");
  await page.getByRole("button", { name: "Open menu" }).click();
  const loginDrawer = page.getByRole("dialog", { name: "AbangCebu Menu" });
  await loginDrawer.getByRole("button", { name: "Log in", exact: true }).click();
  const loginModal = page.getByRole("dialog");
  await loginModal.waitFor({ state: "visible" });

  await loginModal.getByLabel("Email Address", { exact: true }).fill(report.auth.email);
  await loginModal.locator("input[type=password]").fill("Abangcebuai123");

  const loginClickT0 = Date.now();
  await loginModal.getByRole("button", { name: "Log In", exact: true }).click();

  // Wait for login to complete and session to be established
  await page.waitForTimeout(4000);
  report.auth_duration_ms = Date.now() - loginClickT0;
  console.log(`Logged in in ${report.auth_duration_ms}ms, current URL: ${page.url()}`);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "05-renter-authenticated-home.png") });

  // Ensure full reload so server RSC session is hydrated
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("canvas.maplibregl-canvas", { timeout: 15000 });
  await page.evaluate(() => {
    window.__benchCanvas = document.querySelector("canvas.maplibregl-canvas");
  });
  await page.waitForTimeout(500);

  // ==========================================
  // PHASE 3: AUTHENTICATED RENTER SIDEBAR BENCHMARK
  // ==========================================
  console.log("\n==========================================");
  console.log("PHASE 3: TESTING AUTHENTICATED RENTER SIDEBAR NAVIGATION");
  console.log("==========================================");

  // 1. Saved rentals (/favorites)
  report.renter_navigations.push(
    await measureSidebarTransition("Saved rentals", /\/favorites/, "06-renter-favorites")
  );

  // 2. Messages (/messages)
  report.renter_navigations.push(
    await measureSidebarTransition("Messages", /\/messages/, "07-renter-messages")
  );

  // 3. Notifications (/notifications)
  report.renter_navigations.push(
    await measureSidebarTransition("Notifications", /\/notifications/, "08-renter-notifications")
  );

  // 4. Help Center (/help)
  report.renter_navigations.push(
    await measureSidebarTransition("Help Center", /\/help/, "09-renter-help")
  );

  // 5. Contact support (/support)
  report.renter_navigations.push(
    await measureSidebarTransition("Contact support", /\/support/, "10-renter-support")
  );

  // ==========================================
  // AGGREGATION & REPORT COMPILATION
  // ==========================================
  const allNavs = [...report.guest_navigations, ...report.renter_navigations].filter(n => !n.error);
  report.performance_summary = {
    total_navigations_tested: allNavs.length,
    guest_navigations_count: report.guest_navigations.filter(n => !n.error).length,
    renter_navigations_count: report.renter_navigations.filter(n => !n.error).length,
    avg_drawer_open_ms: allNavs.reduce((acc, n) => acc + n.drawerOpenDurationMs, 0) / allNavs.length,
    avg_url_change_ms: allNavs.reduce((acc, n) => acc + n.urlChangeDurationMs, 0) / allNavs.length,
    avg_total_settled_ms: allNavs.reduce((acc, n) => acc + n.totalSettledDurationMs, 0) / allNavs.length,
    avg_nav_measure_ms: (allNavs.filter(n => n.abangcebuNavigationMeasureMs).reduce((acc, n) => acc + n.abangcebuNavigationMeasureMs, 0) / (allNavs.filter(n => n.abangcebuNavigationMeasureMs).length || 1)),
    slowest_transition: allNavs.reduce((prev, curr) => (curr.totalSettledDurationMs > prev.totalSettledDurationMs ? curr : prev), allNavs[0]),
    fastest_transition: allNavs.reduce((prev, curr) => (curr.totalSettledDurationMs < prev.totalSettledDurationMs ? curr : prev), allNavs[0]),
  };

  const jsonReportPath = path.join(OUTPUT_DIR, "live-navigation-benchmark.json");
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n==========================================`);
  console.log(`BENCHMARK COMPLETED SUCCESSFULLY!`);
  console.log(`Report written to: ${jsonReportPath}`);
  console.log(`Screenshots saved to: ${OUTPUT_DIR}/`);
  console.log(`==========================================`);

  await browser.close();
}

runBenchmark().catch(err => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
