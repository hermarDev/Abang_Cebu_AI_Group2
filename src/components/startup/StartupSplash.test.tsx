import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import StartupSplash from "./StartupSplash";

it("renders one accessible startup status and both theme-safe decorative logos", () => {
  const html = renderToStaticMarkup(<StartupSplash />);
  expect(html).toContain('data-startup-splash="true"');
  expect(html).toContain('role="status"');
  expect(html).toContain("Loading AbangCebu…");
  expect(html.match(/Loading AbangCebu…/g)).toHaveLength(1);
  expect(html).toContain('src="/icons/main_Logo.png"');
  expect(html).toContain('src="/icons/main_Logo_Light.png"');
  expect(html.match(/<img/g)).toHaveLength(2);
  expect(html.match(/alt=""/g)).toHaveLength(2);
  expect(html).not.toContain("<input");
  expect(html).not.toContain("<button");
});
