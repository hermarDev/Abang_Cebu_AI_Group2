import type { Metadata } from "next";
import localFont from "next/font/local";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { LogoutSyncListener } from "@/components/auth/LogoutSyncListener";

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
    <html lang="en">
      <body
        className={`${manrope.variable} antialiased`}
      >
        <LogoutSyncListener />
        {children}
      </body>
    </html>
  );
}
