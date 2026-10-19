export type LandmarkCategory = "university" | "business_hub" | "commercial";

export type Landmark = {
  id: string;
  name: string;
  shortName: string;
  category: LandmarkCategory;
  coordinates: [longitude: number, latitude: number];
  defaultRadiusMeters: number;
  aliases: string[];
};

// Seeded from the approved spatial-search specification; order is the ranking tie-breaker.
export const LANDMARKS: Landmark[] = [
  {
    id: "usc-tc",
    name: "USC - Talamban Campus",
    shortName: "USC Talamban",
    category: "university",
    coordinates: [123.9114, 10.3541],
    defaultRadiusMeters: 2000,
    aliases: ["USC", "USC TC", "USC-TC", "University of San Carlos", "Talamban Campus"],
  },
  {
    id: "it-park",
    name: "Cebu IT Park (Lahug)",
    shortName: "IT Park",
    category: "business_hub",
    coordinates: [123.9064, 10.3297],
    defaultRadiusMeters: 1500,
    aliases: ["IT Park", "Cebu IT Park", "Cebu IT Park Lahug"],
  },
  {
    id: "cit-u",
    name: "Cebu Institute of Technology - University",
    shortName: "CIT-U",
    category: "university",
    coordinates: [123.8808, 10.2944],
    defaultRadiusMeters: 1500,
    aliases: ["CIT-U", "CIT U", "Cebu Institute of Technology", "Cebu Institute of Technology University"],
  },
  {
    id: "ayala-center",
    name: "Ayala Center Cebu (Cebu Business Park)",
    shortName: "Ayala Center",
    category: "business_hub",
    coordinates: [123.905, 10.3173],
    defaultRadiusMeters: 1500,
    aliases: ["Ayala Center", "Ayala Center Cebu", "Cebu Business Park"],
  },
  {
    id: "uc-main",
    name: "University of Cebu - Main Campus",
    shortName: "UC Main",
    category: "university",
    coordinates: [123.897, 10.2975],
    defaultRadiusMeters: 1200,
    aliases: ["UC Main", "University of Cebu", "University of Cebu Main Campus"],
  },
  {
    id: "sm-city",
    name: "SM City Cebu (North Reclamation Area)",
    shortName: "SM City Cebu",
    category: "commercial",
    coordinates: [123.9183, 10.3117],
    defaultRadiusMeters: 1500,
    aliases: ["SM City Cebu", "SM Cebu", "North Reclamation Area"],
  },
];

export function findLandmarkById(landmarkId: string): Landmark | undefined {
  return LANDMARKS.find((landmark) => landmark.id === landmarkId);
}

export function getLandmarkSuggestions(query: string, limit = 5): Landmark[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery || limit <= 0) return [];

  return LANDMARKS.map((landmark, index) => ({ landmark, index, score: scoreLandmark(landmark, normalizedQuery) }))
    .filter(({ score }) => score < Number.POSITIVE_INFINITY)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, limit)
    .map(({ landmark }) => landmark);
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-PH")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreLandmark(landmark: Landmark, normalizedQuery: string): number {
  const terms = [landmark.name, landmark.shortName, ...landmark.aliases].map(normalize);
  if (terms.some((term) => term === normalizedQuery)) return 0;
  if (terms.some((term) => term.startsWith(normalizedQuery))) return 1;
  if (terms.some((term) => term.split(" ").some((word) => word.startsWith(normalizedQuery)))) return 2;
  if (terms.some((term) => term.includes(normalizedQuery))) return 3;
  if (terms.some((term) => normalizedQuery.split(" ").every((word) => term.includes(word)))) return 4;
  return Number.POSITIVE_INFINITY;
}
