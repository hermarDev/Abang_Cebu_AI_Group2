import type { Metadata } from "next";
import { FinderPage } from "@/features/map/FinderPage";

export const metadata: Metadata = {
  title: "Browse rentals — AbangCebu",
  description: "Explore Cebu rental properties on the AbangCebu map.",
};

export default function BrowseRentalsPage() {
  return <FinderPage landlordRedirectTo="/landlord/map" />;
}