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
  | { kind: "search"; minPrice: number | null; maxPrice: number | null; area: string | null; propertyType: string | null; verifiedOnly: boolean };


import type { RentalResult } from "@/contracts/preview";

export type AssistantSelection = { id: string; unitId: string | null; title: string; area: string; monthlyPricePHP: number; propertyType: string; verificationStatus: string | null; overBudgetPHP: number };

export function selectAssistantRentals(rentals: RentalResult[], criteria: Extract<AssistantSearch, { kind: "search" }>): { matches: AssistantSelection[]; alternatives: AssistantSelection[] } {
  const selected: AssistantSelection[] = [];
  const seen = new Set<string>();
  for (const rental of rentals) {
    const location = `${rental.locality} ${rental.address ?? ""}`.toLowerCase();
    if (!rental.available || (rental.availableUnitsCount !== undefined && rental.availableUnitsCount !== null && rental.availableUnitsCount <= 0) || (criteria.area && !location.includes(criteria.area)) || (criteria.verifiedOnly && rental.verificationStatus !== "property_verified" && rental.verificationStatus !== "fully_verified")) continue;
    const units = rental.units ? rental.units.filter((unit) => unit.isAvailable).map((unit) => ({ id: unit.id, price: unit.monthlyRent, type: unit.rentalType })) : [{ id: null, price: rental.price, type: rental.type }];
    for (const unit of units) {
      const type = unit.type === "private_room" ? "room" : unit.type === "shared_room" ? "room" : unit.type === "entire_place" ? (rental.propertyType ?? rental.type) : unit.type;
      if (!Number.isFinite(unit.price) || unit.price < 0 || (criteria.minPrice !== null && unit.price < criteria.minPrice) || (criteria.propertyType && type !== criteria.propertyType)) continue;
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
const supportedAreas = ["mandaue", "cebu city", "cebu", "lapu-lapu", "talisay", "lahug", "it park", "banilad", "talamban", "mabolo", "consolacion", "liloan", "minglanilla", "cordova"];
const areaAliases: Record<string, string> = { "mandaue city": "mandaue", "lapu-lapu city": "lapu-lapu", "talisay city": "talisay" };

export function parseAssistantSearch(userMessages: string[]): AssistantSearch {
  const criteria: Extract<AssistantSearch, { kind: "search" }> = { kind: "search", minPrice: null, maxPrice: null, area: null, propertyType: null, verifiedOnly: false };
  let searching = false;
  let lastTurnIsSearch = false;
  for (let index = 0; index < userMessages.length; index++) {
    const isLastTurn = index === userMessages.length - 1;
    const text = userMessages[index].toLowerCase();
    const explicitSearch = /\b(?:list|find|search|show|looking for|available|rentals?|rooms?|kwarto|apartment|bedspace|studio|house|condo|property|properties|listing|place)\b/.test(text);
    if (explicitSearch) searching = true;
    if (!searching) {
      lastTurnIsSearch = false;
      continue;
    }
    let turnIsSearch = explicitSearch;
    let turnClarify: string | null = null;
    if (/\b(?:villas?|townhouses?|dormitories|dorms?)\b/.test(text)) {
      turnIsSearch = true;
      turnClarify ??= "Which supported rental type should I search?";
    }
    if (/\b(?:pet[- ]?friendly|pets?|pool|gym|balcony|furnished|unfurnished|female[- ]?only|male[- ]?only|curfew|parking|aircon|wifi|wi-fi|cooking|laundry)\b/.test(text)) {
      turnIsSearch = true;
      turnClarify ??= "I can filter chat searches by budget, Cebu area, rental type, and verified status. Should I search with those criteria only?";
    }
    const range = text.match(new RegExp(`${amount}\\s*(?:to|[-–])\\s*${amount}`, "i"));
    const maximum = text.match(new RegExp(`(?:under|below|less than|up to|ubos(?:\\s+(?:sa|ug))?|budget(?:\\s+(?:of|to|is))?|(?:increase|raise|change|make)(?:\\s+(?:my|the))?(?:\\s+budget)?(?:\\s+it)?(?:\\s+to)?)\\s*${amount}`, "i"));
    const currency = text.match(new RegExp(`(?:₱|php\\s*)\\s*([0-9][0-9,]*(?:\\.[0-9]+)?\\s*k?)`, "i"));
    const bareFollowUp = text.match(/^\s*([0-9][0-9,]*(?:\.[0-9]+)?\s*k?)\s*$/i);
    const budgetReset = /\b(?:no\s+budget\s+limit|(?:remove|clear)(?:\s+(?:my|the))?\s+budget|any\s+(?:price|budget))\b/.test(text);
    let remaining = text;
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
        criteria.area = normalizedArea;
        turnIsSearch = true;
      } else if (explicitSearch || /^\s*(?:in|near|around|sa)\s+[a-z-]+(?:\s+(?:city|park))?\s*$/.test(remaining)) {
        turnIsSearch = true;
        turnClarify ??= "Which Cebu area should I search?";
      }
    }
    const type = remaining.match(/\b(rooms?|kwarto|apartments?|bedspaces?|studios?|houses?|condos?|boarding houses?)\b/);
    if (type) {
      const value = type[1];
      criteria.propertyType = /^(room|kwarto)/.test(value) ? "room" : /^apartment/.test(value) ? "apartment" : /^bedspace/.test(value) ? "bedspace" : /^studio/.test(value) ? "studio" : /^house/.test(value) ? "house" : /^condo/.test(value) ? "condo" : "boarding_house";
      turnIsSearch = true;
    }
    if (/\bverified\b/.test(remaining)) {
      criteria.verifiedOnly = true;
      turnIsSearch = true;
    }
    const unsupportedConstraint = /\b(?:\d+\s*(?:persons?|people|pax|occupants?|bedrooms?|br)|solo|couple|family|student|students|workers?|short[- ]?term|daily|weekly|monthly\s+only|near\s+school|near\s+mall)\b/.test(remaining);
    if (unsupportedConstraint) {
      turnIsSearch = true;
      turnClarify ??= "I can filter chat searches by budget, Cebu area, rental type, and verified status. Should I search with those criteria only?";
    }
    lastTurnIsSearch = turnIsSearch;
    if (isLastTurn) {
      if (!turnIsSearch) return { kind: "not-needed" };
      if (turnClarify) return { kind: "clarify", question: turnClarify };
    }
  }
  return searching && lastTurnIsSearch ? criteria : { kind: "not-needed" };
}
