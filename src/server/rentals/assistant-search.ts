export function formatAssistantListingsReply(listings: { matches: AssistantSelection[]; alternatives: AssistantSelection[]; complete?: boolean }): string {
  const money = (amount: number) => `₱${Math.round(amount).toLocaleString("en-US")}`;
  const isVerified = (status: string | null) => status === "property_verified" || status === "fully_verified";
  const line = (item: AssistantSelection, overBudget: boolean) => {
    const cleanTitle = item.title.replace(/[\r\n]+/g, " ").replace(/[*_`[\]()<>]/g, "").trim();
    const cleanArea = item.area.replace(/[\r\n]+/g, " ").replace(/[*_`[\]()<>]/g, "").trim();
    const status = isVerified(item.verificationStatus) ? " · Verified property" : "";
    const delta = overBudget && item.overBudgetPHP > 0 ? ` (${money(item.overBudgetPHP)} over budget)` : "";
    return `- ${cleanTitle} — ${cleanArea} · ${money(item.monthlyPricePHP)}/mo${delta}${status}`;
  };
  const sections: string[] = [];
  if (listings.matches.length > 0) {
    sections.push(`Matching rentals:\n${listings.matches.map((item) => line(item, false)).join("\n")}`);
  } else if (listings.complete === false) {
    sections.push("No matching rentals were found in the listings checked so far.");
  } else {
    sections.push("I could not find a matching rental in the current listings.");
  }
  if (listings.alternatives.length > 0) {
    sections.push(`Above your budget:\n${listings.alternatives.map((item) => line(item, true)).join("\n")}`);
  }
  if (listings.complete === false) {
    sections.push("Some listings could not be checked; results may be incomplete.");
  }
  return sections.join("\n\n");
}

export type AssistantSearch =
  | { kind: "not-needed" }
  | { kind: "clarify"; question: string }
  | { kind: "search"; minPrice: number | null; maxPrice: number | null; area: string | null; propertyType: string | null; verifiedOnly: boolean;
      wifi?: boolean; aircon?: boolean; parking?: boolean; cooking?: boolean; laundry?: boolean;
      waterIncluded?: boolean; electricityIncluded?: boolean; minOccupants?: number | null;
      curfew?: string | null; tenantPolicy?: string | null };


import type { RentalResult } from "@/contracts/preview";

export type AssistantSelection = { id: string; unitId: string | null; title: string; area: string; monthlyPricePHP: number; propertyType: string; verificationStatus: string | null; overBudgetPHP: number };

export function selectAssistantRentals(rentals: RentalResult[], criteria: Extract<AssistantSearch, { kind: "search" }>): { matches: AssistantSelection[]; alternatives: AssistantSelection[] } {
  const selected: AssistantSelection[] = [];
  const seen = new Set<string>();
  for (const rental of rentals) {
    const location = `${rental.locality} ${rental.barangay ?? ""} ${rental.address ?? ""}`.toLowerCase();
    if (!rental.available || (rental.availableUnitsCount !== undefined && rental.availableUnitsCount !== null && rental.availableUnitsCount <= 0) || (criteria.area && !location.includes(criteria.area)) || (criteria.verifiedOnly && rental.verificationStatus !== "property_verified" && rental.verificationStatus !== "fully_verified")) continue;
    if (criteria.wifi === true && rental.wifiAvailable !== true) continue;
    if (criteria.aircon === true && rental.aircon !== true) continue;
    if (criteria.parking === true && rental.motorcycleParking !== true && rental.carParking !== true) continue;
    if (criteria.cooking === true && rental.cookingAllowed !== true) continue;
    if (criteria.laundry === true && rental.laundryAllowed !== true) continue;
    if (criteria.waterIncluded === true && rental.waterPricingType !== "included") continue;
    if (criteria.electricityIncluded === true && rental.electricityPricingType !== "included") continue;
    if (criteria.curfew === "none" && rental.curfewType !== "none" && rental.curfewType != null) continue;
    if (criteria.tenantPolicy && rental.tenantPolicy !== criteria.tenantPolicy) continue;
    const units = rental.units
      ? rental.units.filter((unit) => unit.isAvailable).map((unit) => ({ id: unit.id, price: unit.monthlyRent, type: unit.rentalType, occupants: unit.maxOccupants }))
      : [{ id: null, price: rental.price, type: rental.type, occupants: rental.maxOccupants ?? null }];
    for (const unit of units) {
      const type = unit.type === "private_room" ? "room" : unit.type === "shared_room" ? "room" : unit.type === "entire_place" ? (rental.propertyType ?? rental.type) : unit.type;
      if (!Number.isFinite(unit.price) || unit.price < 0 || (criteria.minPrice !== null && unit.price < criteria.minPrice) || (criteria.propertyType && type !== criteria.propertyType)) continue;
      if (criteria.minOccupants && unit.occupants !== null && unit.occupants < criteria.minOccupants) continue;
      const key = JSON.stringify([rental.id, unit.id]);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push({ id: rental.id, unitId: unit.id, title: rental.title.trim().slice(0, 120), area: rental.locality.trim().slice(0, 100), monthlyPricePHP: unit.price, propertyType: type, verificationStatus: rental.verificationStatus ?? null, overBudgetPHP: criteria.maxPrice === null ? 0 : Math.max(0, unit.price - criteria.maxPrice) });
    }
  }
  selected.sort((a, b) => a.monthlyPricePHP - b.monthlyPricePHP || a.id.localeCompare(b.id) || (a.unitId ?? "").localeCompare(b.unitId ?? ""));
  const maxOverBudget = criteria.maxPrice === null ? 0 : Math.max(5000, Math.round(criteria.maxPrice * 0.5));
  return {
    matches: selected.filter((item) => item.overBudgetPHP === 0).slice(0, 6),
    alternatives: criteria.maxPrice === null ? [] : selected.filter((item) => item.overBudgetPHP > 0 && item.overBudgetPHP <= maxOverBudget).slice(0, 3),
  };
}
const amount = "(?:₱|php\\s*)?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?\\s*k?)";
const price = (value: string) => Number.parseFloat(value.replace(/,/g, "")) * (/k\s*$/i.test(value) ? 1000 : 1);
const supportedAreas = ["mandaue", "cebu city", "cebu", "lapu-lapu", "talisay", "lahug", "it park", "banilad", "talamban", "mabolo", "mambaling", "basak-san nicolas", "consolacion", "liloan", "minglanilla", "cordova"];
const areaAliases: Record<string, string> = { "mandaue city": "mandaue", "lapu-lapu city": "lapu-lapu", "talisay city": "talisay", "basak san nicolas": "basak-san nicolas" };
const supportedAmenity = /\b(?:wi-?fi|air ?con|air ?conditioning|air-conditioned|parking|can cook|cooking allowed|allow cooking|kitchen|laundry|water included|electricity included|power included|electric bill included|(?:no|without) curfew|female[ -]?only|male[ -]?only)\b/i;
const occupantIntent = /\b(?:\d+\s*(?:persons?|people|pax|occupants?)|solo|couple|family(?:\s+of\s+\d+)?)\b/i;

export function parseAssistantSearch(userMessages: string[]): AssistantSearch {
  const criteria: Extract<AssistantSearch, { kind: "search" }> = { kind: "search", minPrice: null, maxPrice: null, area: null, propertyType: null, verifiedOnly: false };
  let searching = false;
  let lastTurnIsSearch = false;
  let pendingUnsupported: string | null = null;
  for (let index = 0; index < userMessages.length; index++) {
    const isLastTurn = index === userMessages.length - 1;
    const text = userMessages[index].toLowerCase();
    let remaining = text;
    const bareText = remaining.trim().replace(/[.!?]+$/, "");
    const bareArea = supportedAreas.includes(bareText) ? bareText : areaAliases[bareText] ?? null;
    const appHelp = /\bhow\s+(?:do|can|should)\s+i\s+(?:list|search|find|post)\b/.test(text);
    if (appHelp) {
      if (isLastTurn) return { kind: "not-needed" };
      continue;
    }
    const initialCriteria = new RegExp(`\\b(?:under|below|less than|up to|ubos|budget)\\s*${amount}.*\\b(?:in|near|around|sa)\\s+`, "i").test(text);
    const explicitSearch = /\b(?:list|find|search|show|looking for|available|rentals?|rooms?|kwarto|apartments?|bedspaces?|studios?|houses?|condos?|property|properties|listings?|places?)\b/.test(text) || initialCriteria || Boolean(bareArea) || supportedAmenity.test(text) || occupantIntent.test(text);
    if (explicitSearch) searching = true;
    if (!searching) {
      lastTurnIsSearch = false;
      continue;
    }
    let turnIsSearch = explicitSearch;
    let turnClarify: string | null = null;
    if (pendingUnsupported && /^\s*(?:yes|yeah|yep|sure|okay|ok)\s*[.!]?\s*$/.test(text)) {
      pendingUnsupported = null;
      turnIsSearch = true;
    } else if (pendingUnsupported && /^\s*(?:no|nope)\s*[.!]?\s*$/.test(text)) {
      turnIsSearch = true;
    }
    if (/\b(?:villas?|townhouses?|dormitories|dorms?)\b/.test(text)) {
      turnIsSearch = true;
      turnClarify ??= "Which supported rental type should I search?";
    }
    const range = text.match(new RegExp(`${amount}\\s*(?:to|[-–])\\s*${amount}`, "i"));
    const maximum = text.match(new RegExp(`(?:under|below|less than|up to|ubos(?:\\s+(?:sa|ug))?|budget(?:\\s+(?:of|to|is))?|(?:increase|raise|change|make)(?:\\s+(?:my|the))?(?:\\s+budget)?(?:\\s+it)?(?:\\s+to)?)\\s*${amount}`, "i"));
    const currency = text.match(new RegExp(`(?:₱|php\\s*)\\s*([0-9][0-9,]*(?:\\.[0-9]+)?\\s*k?)`, "i"));
    const bareFollowUp = text.match(/^\s*([0-9][0-9,]*(?:\.[0-9]+)?\s*k?)\s*$/i);
    const budgetReset = /\b(?:no\s+budget\s+limit|(?:remove|clear)(?:\s+(?:my|the))?\s+budget|any\s+(?:price|budget))\b/.test(text);
    if (budgetReset) {
      criteria.minPrice = null;
      criteria.maxPrice = null;
      turnIsSearch = true;
    } else if (range) {
      criteria.minPrice = price(range[1]);
      criteria.maxPrice = price(range[2]);
      remaining = remaining.replace(range[0], " ");
      turnIsSearch = true;
    } else if (maximum || currency || bareFollowUp) {
      criteria.minPrice = null;
      criteria.maxPrice = price((maximum || currency || bareFollowUp)![1]);
      remaining = remaining.replace((maximum || currency || bareFollowUp)![0], " ");
      turnIsSearch = true;
    } else if (/\b(?:under|below|less than|up to|ubos|budget)\b/.test(text)) {
      turnIsSearch = true;
      turnClarify ??= "What is your monthly budget in pesos?";
    }
    if (turnIsSearch && criteria.maxPrice !== null && (!Number.isFinite(criteria.maxPrice) || criteria.maxPrice <= 0 || (criteria.minPrice !== null && criteria.minPrice > criteria.maxPrice))) {
      turnClarify ??= "What monthly budget range should I use?";
    }
    const areaReset = remaining.match(/\b(?:anywhere\s+in\s+cebu|any\s+area|all\s+areas)\b/);
    if (areaReset) {
      criteria.area = null;
      remaining = remaining.replace(areaReset[0], " ");
      turnIsSearch = true;
    }
    const location = remaining.match(/\b(?:in|near|around|sa)\s+([a-z-]+(?:\s+(?:city|park))?)/);
    if (location) {
      const normalizedArea = areaAliases[location[1]] ?? location[1];
      if (supportedAreas.includes(normalizedArea)) {
        criteria.area = normalizedArea === "cebu" ? null : normalizedArea;
        turnIsSearch = true;
      } else if (explicitSearch || /^\s*(?:in|near|around|sa)\s+[a-z-]+(?:\s+(?:city|park))?\s*$/.test(remaining)) {
        turnIsSearch = true;
        turnClarify ??= "Which Cebu area should I search?";
      }
    } else if (bareArea) {
      criteria.area = bareArea === "cebu" ? null : bareArea;
      turnIsSearch = true;
    }
    if (/\bwi-?fi\b/.test(text)) criteria.wifi = true;
    if (/\b(?:air ?con|air ?conditioning|air-conditioned)\b/.test(text)) criteria.aircon = true;
    if (/\bparking\b/.test(text)) criteria.parking = true;
    if (/\b(?:can cook|cooking allowed|allow cooking|kitchen)\b/.test(text)) criteria.cooking = true;
    if (/\blaundry\b/.test(text)) criteria.laundry = true;
    if (/\bwater included\b/.test(text)) criteria.waterIncluded = true;
    if (/\b(?:electricity included|power included|electric bill included)\b/.test(text)) criteria.electricityIncluded = true;
    if (/\b(?:no|without) curfew\b/.test(text)) criteria.curfew = "none";
    if (/\bfemale[ -]?only\b/.test(text)) criteria.tenantPolicy = "female_only";
    if (/\bmale[ -]?only\b/.test(text)) criteria.tenantPolicy = "male_only";
    if (supportedAmenity.test(text)) turnIsSearch = true;
    const familyMatch = remaining.match(/\bfamily\s+of\s+(\d+)\b/i);
    const occupantMatch = familyMatch ?? remaining.match(/\b(\d+)\s*(?:persons?|people|pax|occupants?)\b/i);
    if (occupantMatch) {
      const count = Number(occupantMatch[1]);
      if (Number.isFinite(count) && count > 0) {
        criteria.minOccupants = count;
        turnIsSearch = true;
      }
    } else if (/\bsolo\b/.test(text)) {
      criteria.minOccupants = 1;
      turnIsSearch = true;
    } else if (/\bcouple\b/.test(text)) {
      criteria.minOccupants = 2;
      turnIsSearch = true;
    } else if (/\bfamily\b/.test(text)) {
      criteria.minOccupants = Math.max(criteria.minOccupants ?? 0, 3);
      turnIsSearch = true;
    }
    const type = remaining.match(/\b(rooms?|kwarto|apartments?|bedspaces?|studios?|houses?|condos?|boarding houses?)\b/);
    if (type) {
      const value = type[1];
      criteria.propertyType = /^(room|kwarto)/.test(value) ? "room" : /^apartment/.test(value) ? "apartment" : /^bedspace/.test(value) ? "bedspace" : /^studio/.test(value) ? "studio" : /^house/.test(value) ? "house" : /^condo/.test(value) ? "condo" : "boarding_house";
      turnIsSearch = true;
    }
    if (/\bverified\b/.test(remaining)) {
      criteria.verifiedOnly = !/\b(?:no need to be|not necessarily|not required to be|need not be|not|un)\s+verified\b/.test(remaining);
      turnIsSearch = true;
    }
    const unsupportedConstraint = /\b(?:\d+\s*(?:bedrooms?|br)|student|students|workers?|short[- ]?term|daily|weekly|monthly\s+only|near\s+school|near\s+mall|pool|gym|balcony|furnished|unfurnished|pets?)\b/.test(text);
    if (unsupportedConstraint) {
      turnIsSearch = true;
      turnClarify ??= "I can filter chat searches by budget, Cebu area, rental type, and verified status. Should I search with those criteria only?";
      pendingUnsupported = turnClarify;
    }
    lastTurnIsSearch = turnIsSearch;
    if (isLastTurn) {
      if (!turnIsSearch) return { kind: "not-needed" };
      if (turnClarify) return { kind: "clarify", question: turnClarify };
      if (pendingUnsupported) return { kind: "clarify", question: pendingUnsupported };
    }
  }
  return searching && lastTurnIsSearch ? criteria : { kind: "not-needed" };
}
