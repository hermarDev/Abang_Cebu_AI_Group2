export const SUPPORT_CATEGORIES = [
  { value: "account_access", label: "Account & sign-in" },
  { value: "rental_search", label: "Rental search & listings" },
  { value: "listing_submission", label: "Landlord listing submission" },
  { value: "messaging_safety", label: "Messaging & safety" },
  { value: "bug_report", label: "Technical issue or bug" },
  { value: "billing_or_policy", label: "Policies & verification" },
  { value: "other", label: "Other inquiry" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["value"];

export const SUPPORT_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export type SupportTicketStatus = (typeof SUPPORT_STATUSES)[number]["value"];

export const SUPPORT_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export type SupportTicketPriority = (typeof SUPPORT_PRIORITIES)[number]["value"];

export type SupportAttachmentMeta = {
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type SupportTicketRecord = {
  id: string;
  ticketNumber: string;
  userId: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  category: SupportCategory;
  subject: string;
  description: string;
  relatedListingId: string | null;
  attachments: SupportAttachmentMeta[];
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  reportedLandlordId?: string | null;
  reportedLandlordName?: string | null;
  landlordInquiryNote?: string | null;
  landlordInquirySentAt?: string | null;
  landlordResponse?: string | null;
  landlordRespondedAt?: string | null;
  adminResponse: string | null;
  assignedAdminId: string | null;
  assignedAdminName?: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const MAX_SUPPORT_FILES = 3;
export const MAX_SUPPORT_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SUPPORT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  account_access: "Account & sign-in",
  rental_search: "Rental search & listings",
  listing_submission: "Landlord listing submission",
  messaging_safety: "Messaging & safety",
  bug_report: "Technical issue or bug",
  billing_or_policy: "Policies & verification",
  other: "Other inquiry",
};

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export type HelpFaqCategoryId =
  | "all"
  | "finding_rentals"
  | "landlords"
  | "messaging_safety"
  | "account_security"
  | "policies";

export interface HelpFaqCategory {
  id: HelpFaqCategoryId;
  label: string;
  description: string;
}

export interface HelpFaqItem {
  id: string;
  category: Exclude<HelpFaqCategoryId, "all">;
  question: string;
  answer: string;
  keywords: string[];
  roles?: ("guest" | "renter" | "landlord" | "admin")[];
}

export const HELP_FAQ_CATEGORIES: HelpFaqCategory[] = [
  { id: "all", label: "All topics", description: "Browse every guide across AbangCebu." },
  { id: "finding_rentals", label: "Finding rentals", description: "Map search, filters, and saved homes." },
  { id: "landlords", label: "For landlords", description: "Publishing properties, permits, and revisions." },
  { id: "messaging_safety", label: "Messaging & safety", description: "Inquiries, reporting, and scam prevention." },
  { id: "account_security", label: "Account & security", description: "Sign-in, passwords, and profile updates." },
  { id: "policies", label: "Policies", description: "Verification, moderation, and platform standards." },
];

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    id: "search-map-filters",
    category: "finding_rentals",
    question: "How do I narrow down rentals on the Cebu map?",
    answer: "Use the top search bar to jump to a barangay, landmark, or city in Metro Cebu, then apply quick-filter chips for monthly budget, property type, or search radius. Open Filters for room type, occupants, and amenity options.",
    keywords: ["map", "search", "filters", "budget", "radius", "barangay", "cebu"],
  },
  {
    id: "save-compare-rentals",
    category: "finding_rentals",
    question: "How do I save rentals to compare later?",
    answer: "Sign in with a renter account and click the bookmark button on any listing card or details sheet. Open Saved rentals from the menu to review your shortlisted places and check current availability.",
    keywords: ["bookmark", "favorites", "saved", "shortlist", "compare"],
  },
  {
    id: "message-landlord",
    category: "finding_rentals",
    question: "How do I contact a landlord about an available unit?",
    answer: "Open a listing on the map and select Message landlord. You must be signed in with an active renter account to send an inquiry and view replies in your Messages inbox.",
    keywords: ["contact", "inquiry", "chat", "renter", "landlord"],
  },
  {
    id: "landlord-submit-property",
    category: "landlords",
    question: "How do I list a property as a landlord?",
    answer: "Register or sign in with a Landlord account, then go to Add property in your Landlord workspace. Complete the property details, pin the exact map location, upload clear photos and permit documents, and submit for admin moderation.",
    keywords: ["list", "publish", "add property", "landlord", "submit", "draft"],
  },
  {
    id: "landlord-review-statuses",
    category: "landlords",
    question: "What do Pending, Changes requested, Approved, and Archived statuses mean?",
    answer: "Pending means our moderation team is reviewing your submission. Changes requested includes a specific moderator note so you can edit and resubmit. Approved listings appear live on the public rental map, while Archived listings are hidden from search.",
    keywords: ["pending", "approved", "rejected", "changes requested", "archived", "review"],
  },
  {
    id: "landlord-edit-approved",
    category: "landlords",
    question: "Can I update an approved listing without taking it offline?",
    answer: "Yes. When you edit an approved property, your current live listing remains visible on the map while your revised draft is queued for admin review. Location coordinates stay locked on approved listings to prevent pin drift.",
    keywords: ["edit", "revision", "approved", "location", "coordinates"],
  },
  {
    id: "scam-prevention-payments",
    category: "messaging_safety",
    question: "How should I stay safe before paying a deposit or reservation fee?",
    answer: "Always visit the property in person, verify the landlord's identity and ownership documents, and never send reservation money before inspecting the unit and signing a written lease agreement. Report suspicious requests immediately.",
    keywords: ["scam", "fraud", "deposit", "payment", "safety", "visit"],
  },
  {
    id: "report-listing-or-user",
    category: "messaging_safety",
    question: "How do I report suspicious messages or inaccurate listings?",
    answer: "Inside any conversation, use the report action to flag harassment, off-platform payment pressure, or spam—you can also block the counterpart at the same time. For urgent safety concerns, submit a Messaging & safety support ticket.",
    keywords: ["report", "abuse", "block", "harassment", "spam"],
  },
  {
    id: "reset-account-password",
    category: "account_security",
    question: "I forgot my password or my reset link expired. What should I do?",
    answer: "Open the Log in dialog and choose Forgot password to request a fresh recovery link. Reset links expire for security; if you already signed in, you can also update your password anytime from Account settings.",
    keywords: ["password", "reset", "forgot", "expired", "recovery", "login"],
  },
  {
    id: "suspended-account-appeal",
    category: "account_security",
    question: "Why is my account suspended and how can I request a review?",
    answer: "Accounts may be suspended after confirmed policy violations or safety reports. You can submit an Account & sign-in support request on the Contact support page using your registered email so an administrator can review your case.",
    keywords: ["suspended", "locked", "appeal", "ban", "account"],
  },
  {
    id: "listing-verification-policy",
    category: "policies",
    question: "Why does AbangCebu require property photos and permit documents?",
    answer: "Document and photo review helps confirm that rentals exist at the pinned Cebu location and reduces duplicate or misleading listings. Permit files are stored privately and visible only to the submitting landlord and authorized moderators.",
    keywords: ["permit", "documents", "verification", "privacy", "moderation"],
  },
  {
    id: "support-response-times",
    category: "policies",
    question: "How long does it take to receive a response to a support ticket?",
    answer: "Most support requests are reviewed within one business day. Safety and account-access issues are prioritized first. Signed-in users receive in-app notifications and can track status updates on the Contact support page.",
    keywords: ["response time", "ticket", "sla", "support", "notification"],
  },
];
