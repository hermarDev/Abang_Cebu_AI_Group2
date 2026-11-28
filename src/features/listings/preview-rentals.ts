import type { Coordinate } from "@/contracts/preview";

/** Neighborhood and landmark anchors for location search. */
export const PREVIEW_PLACES: { id: string; name: string; detail: string; coordinates: Coordinate; category?: string }[] = [
  { id: "lahug", name: "Lahug", detail: "Cebu City", coordinates: [123.907, 10.328], category: "Neighborhood" },
  { id: "it-park", name: "IT Park", detail: "Cebu City", coordinates: [123.909, 10.329], category: "Business Hub" },
  { id: "mabolo", name: "Mabolo", detail: "Cebu City", coordinates: [123.919, 10.322], category: "Neighborhood" },
  { id: "fuente", name: "Fuente area", detail: "Cebu City", coordinates: [123.894, 10.311], category: "Landmark" },
  { id: "mandaue", name: "Mandaue City", detail: "Cebu", coordinates: [123.935, 10.34], category: "City" },
  { id: "aclc-mandaue", name: "ACLC College", detail: "Mandaue City", coordinates: [123.937, 10.338], category: "College" },
  { id: "usc-talamban", name: "USC Talamban", detail: "Talamban, Cebu City", coordinates: [123.913, 10.353], category: "University" },
  { id: "usc-main", name: "USC Main", detail: "Downtown, Cebu City", coordinates: [123.898, 10.301], category: "University" },
  { id: "uc-banilad", name: "UC Banilad", detail: "Banilad, Cebu City", coordinates: [123.914, 10.339], category: "University" },
  { id: "banilad", name: "Banilad", detail: "Cebu City", coordinates: [123.913, 10.341], category: "Neighborhood" },
  { id: "colon", name: "Colon / Downtown", detail: "Cebu City", coordinates: [123.899, 10.297], category: "Downtown" },
  { id: "ayala", name: "Ayala / CBP", detail: "Cebu Business Park", coordinates: [123.905, 10.317], category: "Business Hub" },
  { id: "sm-city", name: "SM City Cebu", detail: "North Reclamation", coordinates: [123.918, 10.312], category: "Commercial" },
];
