import { type MapMarker } from "@/types";

export interface MapContainerProps {
  markers?: MapMarker[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  className?: string;
  styleUrl?: string;
}
