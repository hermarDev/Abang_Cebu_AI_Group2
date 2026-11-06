import type { Metadata } from "next";
import localFont from "next/font/local";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { LogoutSyncListener } from "@/components/auth/LogoutSyncListener";
import { ThemeSync } from "@/components/theme/ThemeSync";
import { AppToaster } from "@/components/ui/AppToaster";
import StartupReady from "@/components/startup/StartupReady";
import StartupSplash from "@/components/startup/StartupSplash";

const manrope = localFont({ src: "../../public/fonts/manrope-latin-wght-normal.woff2", variable: "--font-manrope", weight: "200 800" });

export const metadata: Metadata = {
  title: "AbangCebu — Find a Place in Cebu",
  description: "Geospatial rental and property discovery platform in Cebu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(() => {
          let theme;
          try { theme = localStorage.getItem("abangcebu-theme"); } catch {}
          if (theme !== "light" && theme !== "dark") {
            try { theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
            catch { theme = "light"; }
          }
          document.documentElement.classList.add(theme);
          document.documentElement.style.colorScheme = theme;
          document.documentElement.dataset.startup = "pending";
        })();` }} />
      </head>
      <body
        className={`${manrope.variable} antialiased`}
      >
        <ThemeSync />
        <LogoutSyncListener />
        <AppToaster />
        <StartupSplash />
        <StartupReady />
        {children}
      </body>
    </html>
  );
}
