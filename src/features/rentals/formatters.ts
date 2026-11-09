import type { ComponentType } from "react";
import {
  AirVent,
  Bike,
  Car,
  Droplets,
  HelpCircle,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
  Zap,
} from "lucide-react";

export function formatOccupancy(occupants?: number | null): string {
  if (!occupants || occupants <= 0) return "Occupancy not specified";
  if (occupants === 1) return "1 occupant maximum";
  return `Up to ${occupants} occupants`;
}

export function formatTenantPolicy(policy?: string | null): string {
  if (!policy) return "No restriction specified";
  const normalized = policy.toLowerCase().replaceAll(/[- ]/g, "_");
  if (normalized === "any" || normalized === "all") return "All tenants welcome";
  if (normalized === "female_only" || normalized === "female") return "Female tenants only";
  if (normalized === "male_only" || normalized === "male") return "Male tenants only";
  if (normalized === "mixed") return "Mixed tenancy allowed";
  return policy.replaceAll("_", " ");
}

export function formatCurfew(curfew?: string | null): string {
  if (!curfew || curfew === "none") return "No curfew";
  if (curfew === "fixed") return "Fixed curfew hours";
  if (curfew === "conditional") return "Conditional curfew";
  return curfew.replaceAll("_", " ");
}

export function getAmenityIcon(amenity: string): ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }> {
  const norm = amenity.toLowerCase();
  if (norm.includes("wi-fi") || norm.includes("wifi") || norm.includes("internet")) return Wifi;
  if (norm.includes("cook") || norm.includes("kitchen")) return UtensilsCrossed;
  if (norm.includes("aircon") || norm.includes("air conditioning") || norm.includes("ac")) return AirVent;
  if (norm.includes("laundr") || norm.includes("wash")) return WashingMachine;
  if (norm.includes("water")) return Droplets;
  if (norm.includes("electric") || norm.includes("power")) return Zap;
  if (norm.includes("motorcycle") || norm.includes("motor") || norm.includes("bike")) return Bike;
  if (norm.includes("parking") || norm.includes("car")) return Car;
  return HelpCircle;
}
