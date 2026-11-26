export type AssistantSelection = {
  id: string;
  unitId: string | null;
  title: string;
  area: string;
  monthlyPricePHP: number;
  propertyType: string;
  verificationStatus: string | null;
  overBudgetPHP: number;
};

export type AssistantListingsPayload = {
  matches: AssistantSelection[];
  alternatives: AssistantSelection[];
  complete?: boolean;
};

export function formatPhp(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatListingLine(item: AssistantSelection, overBudget: boolean): string {
  const cleanTitle = item.title.replace(/[\r\n]+/g, " ").replace(/[*_`[\]()<>]/g, "").trim();
  const cleanArea = item.area.replace(/[\r\n]+/g, " ").replace(/[*_`[\]()<>]/g, "").trim();
  const status =
    item.verificationStatus === "property_verified" || item.verificationStatus === "fully_verified"
      ? " · Verified property"
      : "";
  const delta = overBudget && item.overBudgetPHP > 0 ? ` (${formatPhp(item.overBudgetPHP)} over budget)` : "";
  return `- ${cleanTitle} — ${cleanArea} · ${formatPhp(item.monthlyPricePHP)}/mo${delta}${status}`;
}

export function formatAssistantListingsReply(listings: AssistantListingsPayload): string {
  const sections: string[] = [];
  if (listings.matches.length > 0) {
    sections.push(`Matching rentals:\n${listings.matches.map((item) => formatListingLine(item, false)).join("\n")}`);
  } else if (listings.complete === false) {
    sections.push("No matching rentals were found in the listings checked so far.");
  } else {
    sections.push("I could not find a matching rental in the current listings.");
  }
  if (listings.alternatives.length > 0) {
    sections.push(`Above your budget:\n${listings.alternatives.map((item) => formatListingLine(item, true)).join("\n")}`);
  }
  if (listings.complete === false) {
    sections.push("Some listings could not be checked; results may be incomplete.");
  }
  return sections.join("\n\n");
}
