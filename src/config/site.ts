export const siteConfig = {
  name: "AbangCebuAI",
  description:
    "AI-powered geospatial rental and property discovery platform in Cebu, Philippines.",
  url: "https://abangcebu.ai",
  cebuCoordinates: {
    lng: 123.8854,
    lat: 10.3157,
    zoom: 12,
  },
  defaultMapStyle:
    "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  navItems: [
    { label: "Home", href: "/" },
    { label: "Map Explorer", href: "/map" },
    { label: "Listings", href: "/listings" },
    { label: "Documentation", href: "/docs" },
  ],
};

export type SiteConfig = typeof siteConfig;
