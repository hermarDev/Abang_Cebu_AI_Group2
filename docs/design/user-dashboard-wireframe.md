# AbangCebu AI — User Dashboard Wireframe & Layout Architecture Specification

**Sprint 1 System Architecture Specification**  
**Document Version:** 1.0.0  
**Status:** Approved & Active Design Specification  
**Jira Ticket Reference:** [SCRUM-67](https://abangcebuai.atlassian.net/browse/SCRUM-67) — *Design User Dashboard Wireframe / Mockup*  
**Sprint:** Sprint 1 (Foundations & Core Infrastructure)  
**Author:** Neah Moneva (UI/UX Designer)  
**Reviewed & Audited by:** Hermar Centillas (Lead / Scrum Master)  
**Design Reference Standard:** Balsamiq / Figma Grayscale Blueprint Architecture, Apple Human Interface Guidelines, Supabase RLS Security Model, WCAG 2.2 AA Ergonomics  
**Companion Assets:**
- Desktop Vector Blueprint: [`docs/assets/wireframes/user-dashboard-desktop.svg`](../assets/wireframes/user-dashboard-desktop.svg)
- Desktop High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_User_Dashboard_Desktop_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_User_Dashboard_Desktop_Wireframe_Blueprint.png)
- Mobile Vector Blueprint: [`docs/assets/wireframes/user-dashboard-mobile.svg`](../assets/wireframes/user-dashboard-mobile.svg)
- Mobile High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_User_Dashboard_Mobile_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_User_Dashboard_Mobile_Wireframe_Blueprint.png)
- Formal Engineering PDF: [`docs/pdf/AbangCebu_User_Dashboard_Wireframe_Specification.pdf`](../pdf/AbangCebu_User_Dashboard_Wireframe_Specification.pdf)
- Specification Sheet Previews:
  - Page 1 (Desktop Dual-View Architecture & Component Matrix): [`docs/assets/wireframes/AbangCebu_User_Dashboard_Specification_Sheet_Page1.png`](../assets/wireframes/AbangCebu_User_Dashboard_Specification_Sheet_Page1.png)
  - Page 2 (Mobile Viewport & 4 Interactive Operational States): [`docs/assets/wireframes/AbangCebu_User_Dashboard_Specification_Sheet_Page2.png`](../assets/wireframes/AbangCebu_User_Dashboard_Specification_Sheet_Page2.png)
  - Page 3 (Accessibility, Route Architecture & Sign-Off): [`docs/assets/wireframes/AbangCebu_User_Dashboard_Specification_Sheet_Page3.png`](../assets/wireframes/AbangCebu_User_Dashboard_Specification_Sheet_Page3.png)
- Related Specifications:
  - Styling Tokens & Guidelines: [`docs/design/styling-guidelines.md`](./styling-guidelines.md)
  - Renter Persona & Capabilities: [`docs/design/renter-persona.md`](./renter-persona.md)
  - Users and Profiles Schema: [`docs/database/users-and-profiles-schema.md`](../database/users-and-profiles-schema.md)
  - Database ERD Architecture: [`docs/database/database-erd.md`](../database/database-erd.md)
  - Row-Level Security Policies: [`docs/security/rls-policies.md`](../security/rls-policies.md)
  - RBAC Permission Matrix: [`docs/security/rbac-matrix.md`](../security/rbac-matrix.md)
  - Landing Page Wireframes: [`docs/design/landing-page-wireframe.md`](./landing-page-wireframe.md)
  - Login Page Wireframes: [`docs/design/login-page-wireframe.md`](./login-page-wireframe.md)
  - Registration Page Wireframes: [`docs/design/registration-page-wireframe.md`](./registration-page-wireframe.md)
  - Mobile Map Wireframes: [`docs/design/mobile-map-wireframes.md`](./mobile-map-wireframes.md)

---

## 1. Executive Summary & Dual-View Dashboard Philosophy

The authenticated user dashboard serves as the operational command center of AbangCebu AI. Departing from monolithic portal designs that treat renters and property owners identically, AbangCebu AI implements a **Dual-View Operational Architecture** with dedicated contextual routes:
- **Renter Operational View (`/dashboard/renter`)**: Tailored to students and working professionals seeking boarding houses, bedspaces, and apartments near Metro Cebu educational and employment corridors (CIT-U, USC, Cebu IT Park, Urgello, Banilad). Focuses on bookmark management, live landlord inquiry tracking, ocular visit scheduling, and commute transit times.
- **Landlord Operational View (`/dashboard/landlord`)**: Tailored to boarding house owners, property managers, and unit hosts managing room inventory, tracking tenant ocular inquiries, toggling unit vacancy status, and maintaining verified identity compliance via Anti-Scam KYC verification.

```
+---------------------------------------------------------------------------------------------------+
|                        ABANGCEBU AI DUAL-VIEW DASHBOARD ARCHITECTURE                              |
+---------------------------------------------------------------------------------------------------+
| 1. Spatial Context Continuity:                                                                    |
|    Discovery originates on the Metro Cebu map canvas. The dashboard preserves spatial metadata     |
|    across saved units and inquiries, displaying walking distances to CIT-U / USC and jeepney       |
|    corridor badges (04L, 17B, 12L) alongside direct triggers to return to the interactive map.    |
|                                                                                                   |
| 2. Security & RLS Perimeter Boundaries:                                                           |
|    All dashboard data queries execute against Supabase PostgreSQL under strict Row-Level Security   |
|    (RLS). Renters can only read their own saved rentals and inquiry threads; Landlords can only   |
|    manage their owned property inventory and view incoming applicant dossiers.                      |
|                                                                                                   |
| 3. Anti-Scam KYC Trust Verification Pipeline:                                                     |
|    Unverified landlords are gated from direct tenant phone contact and public verified badges     |
|    until submitting legitimate government ID documents, reducing rental deposit fraud across Cebu.|
|                                                                                                   |
| 4. Rapid Direct Triage & Zero Brokerage:                                                           |
|    Landlords can accept ocular tours, propose alternate viewing windows, or launch direct chats   |
|    with one tap. Zero intermediaries, zero broker cuts, and 100% verified utility submeters.      |
+---------------------------------------------------------------------------------------------------+
```

### 1.1 Wireframe Blueprint Conventions

In adherence to Balsamiq and Figma mid-fidelity architectural conventions:
1. **Monochrome Hierarchy**: High-contrast charcoal borders (`#0F172A`, `#334155`, `#94A3B8`), neutral base surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`), and purposeful semantic accents (`#047857` Cebu Emerald, `#B45309` Amber KYC Notice, `#E11D48` Sinulog Crimson alerts).
2. **Authentic Hardware Viewports**:
   - **Desktop (1440px × 900px, 16:10)**: Encased in an authentic **MacBook Air aluminum chassis** with top FaceTime camera notch, inner black bezels, and bottom thumb lip.
   - **Mobile (393px × 852px, 100dvh)**: Encased in an authentic **iPhone 16 Pro Titanium chassis** with Dynamic Island, iOS 9:41 status bar, safe-area headers, and persistent bottom iOS Safari navigation.
3. **Traceable Blueprint Callouts (`①` – `⑧`)**: Directly cross-referencing layout dimensions, functional specifications, and accessibility contracts.

---

## 2. Desktop Viewport Specification (1440px × 900px · MacBook Air Aluminum Frame)

### 2.1 Viewport Geometry & Workspace Partitioning

On desktop viewports (1440px × 900px, 16:10 aspect ratio), the dashboard implements a **260px fixed sidebar navigation** paired with an **1180px operational workspace**:
- **Fixed Sidebar Navigation (0px – 260px)**:
  - Deep Navy background (`#0F172A`) providing permanent anchor navigation.
  - Brand header with compass crest and platform logotype.
  - User profile pill displaying initials avatar, user name, role badge, and KYC trust pill.
  - Primary navigation links: Dashboard Overview, Saved Rentals (with badge count), Inquiries & Tours (with unread badge counter), My Listed Units, and Metro Cebu Map Explorer (`[ESC]`).
  - Account & Security section: Identity & KYC Center, Account Settings.
  - Role workspace switch: Segmented toggle between Renter and Landlord views.
  - Bottom-docked Sign Out trigger with shortcut hint `[Esc + Q]`.
- **Main Workspace Canvas (260px – 1440px)**:
  - **Top Workspace Header (h: 64px)**: Localized greeting (`Maayong adlaw, Mikaela! 👋`), active university corridor context, search field, dual-view toggle, notification bell with unread badge, and quick `[🗺️ Return to Map]` button.
  - **Anti-Scam KYC Trust Verification Banner (h: 42px)**: Amber callout reminding unverified or pending landlords to complete government ID verification.
  - **4-Card Metric Suite (h: 84px)**: High-level operational indicators (Saved Properties, Active Inquiries, Scheduled Oculars, Commute Radar).
  - **Two-Column Operational Workspace**:
    - **Primary Left Column (700px w)**: Saved Properties 2-column matrix with utility submeters, commute radar pills, and direct landlord action triggers; plus Landlord Active Inventory Table preview.
    - **Secondary Right Column (405px w)**: Inquiries & Ocular Timeline tracker with confirmed tour cards, chat quick-actions, and algorithmic recommendations matched to user budget and university routes.

---

### 2.2 Desktop ASCII Wireframe Blueprint — Renter View (`/dashboard/renter`)

```
+===========================================================================================================================+
| [Camera Notch: 720px]                                                                                        MacBook Air  |
+---------------------------------------------------------------------------------------------------------------------------+
| [260px FIXED SIDEBAR]        | [1180px MAIN OPERATIONAL WORKSPACE]                                                        |
|                              |                                                                                            |
|  [🧭] ABANGCEBU AI           |  Maayong adlaw, Mikaela! 👋             [🔍 Search properties] [ 👤 Renter | 🏠 Landlord ] |
|  Rental Intelligence Platform|  CIT-U Corridor (N. Bacalso) · 8 Saved · 1 Tour   [🔔 3]  [🗺️ Return to Map]                |
|                              +--------------------------------------------------------------------------------------------+
|  +-------------------------+ | [⚠️ ANTI-SCAM NOTICE: Landlord KYC Pending Review. Submit valid ID. [Submit Docs →]]     ④ |
|  | (MS) Mikaela Santos     | |                                                                                            |
|  | CIT-U Seeker · Student  | | +-------------------+ +-------------------+ +-------------------+ +-------------------+  |
|  | [✓ KYC Verified]       | | | SAVED PROPERTIES  | | ACTIVE INQUIRIES  | | SCHEDULED OCULAR  | | CIT-U COMMUTE RADAR |  |
|  +-------------------------+ | | 8 Units           | | 3 Ongoing         | | 1 Upcoming        | | 8 - 14 Mins         |  |
|  CORE NAVIGATION           ② | | 📈 +2 this week   | | 💬 1 reply waiting| | 📅 Sat, Oct 3 2pm | | 🚍 04L / 17B Jeep   |  |
|  [📊 Overview (Active)    ]  | +-------------------+ +-------------------+ +-------------------+ +-------------------+ ③|
|  [❤️ Saved Rentals     (8)]  |                                                                                            |
|  [💬 Inquiries & Tours (3)]  | SAVED PROPERTIES NEAR CIT-U & IT PARK (8)         | INQUIRIES & TOUR TIMELINE (3)          |
|  [🏠 My Listed Units   (2)]  | +-----------------------------------------------+ | +------------------------------------+ |
|  [🗺️ Metro Cebu Map  [ESC]]  | | [PHOTO] Green Dormitory Room 3A               | | | [✓ OCULAR CONFIRMED] Sat Oct 3 2pm | |
|                              | | 📍 N. Bacalso Ave, Punta Princesa (CIT-U)     | | | Green Dormitory Room 3A            | |
|  --------------------------- | | ₱4,500/mo  [⚡ Submeter] [💧 Water] [🛡️ KYC]  | | | Host: Kuya Jun Abellanosa (KYC)    | |
|  SECURITY & SETTINGS         | | 🚶 8 min walk to CIT-U · 🚍 04L Corridor       | | | "Kuya Jun: Kitakits sa gate."      | |
|  [🛡️ Identity & KYC Center ] | | [💬 Message Landlord] [📅 Ocular] [❤️ Saved]  | | | [💬 Open Live Chat (1 Unread)]     | |
|  [⚙️ Account Settings      ] | +-----------------------------------------------+ | +------------------------------------+ |
|                              | +-----------------------------------------------+ | +------------------------------------+ |
|  +-------------------------+ | | [PHOTO] Salinas Studio Pad                    | | | [⏳ PENDING REVIEW] Today 9:15 AM   | |
|  | ROLE WORKSPACE SWITCH   | | | 📍 Salinas Dr, Lahug (Near IT Park Gate 2)    | | | Salinas Studio Pad — Lahug         | |
|  | [👤 Renter*][🏠Landlord]| | | ₱7,200/mo  [⚡ Submeter] [📶 Fiber] [🛡️ KYC]   | | | Host: Ma'am Elena Ramos (Verified) | |
|  +-------------------------+ | | 🚍 12 min via 04L to CIT-U · 🚶 4m to IT Park  | | | "Mikaela: Submeter ba ni?"         | |
|                              | | [💬 Message Landlord] [📅 Ocular] [❤️ Saved] ⑤ | | | [View Inquiry Details →]         ⑦ | |
|  +-------------------------+ | +-----------------------------------------------+ | +------------------------------------+ |
|  | 🚪 Sign Out  [Esc + Q]  | |                                                   | 🧭 COMMUTE MATCH RECOMMENDATIONS       |
|  +-------------------------+ | 🏠 LANDLORD INVENTORY PREVIEW (2 Active)          | • San Antonio Boarding (₱3,800/mo)     |
|                            ① | Salinas Studio #2B · ₱6,500/mo · [● Occupied] [Edit]| • Tres de Abril Pad (₱5,200/mo)        |
+===========================================================================================================================+
```

---

### 2.3 Desktop ASCII Wireframe Blueprint — Landlord View (`/dashboard/landlord`)

```
+===========================================================================================================================+
| [Camera Notch: 720px]                                                                                        MacBook Air  |
+---------------------------------------------------------------------------------------------------------------------------+
| [260px FIXED SIDEBAR]        | [1180px MAIN OPERATIONAL WORKSPACE]                                                        |
|                              |                                                                                            |
|  [🧭] ABANGCEBU AI           |  Landlord Management Center            [🔍 Search units or tenants] [ 👤 Renter | 🏠 Landlord*]|
|  Property Host Portal        |  Properties: Lahug & Punta Princesa · 4 Listed Units                  [🔔 7]  [+ Add Listing]|
|                              +--------------------------------------------------------------------------------------------+
|  +-------------------------+ | [⚠️ ANTI-SCAM NOTICE: Complete KYC verification to publish listings with Verified Badge]   |
|  | (JR) Jun Abellanosa     | |                                                                                            |
|  | Verified Host · 4 Units | | +-------------------+ +-------------------+ +-------------------+ +-------------------+  |
|  | [✓ KYC Tier 1 Verified] | | | ACTIVE UNITS      | | MONTHLY VIEWS     | | PENDING INQUIRIES | | OCCUPANCY RATE      |  |
|  +-------------------------+ | | 4 Units Listed    | | 1,420 Pageviews   | | 7 Inquiries       | | 85% Occupied        |  |
|  CORE NAVIGATION             | | ✓ All Published   | | 📈 +18% this mo   | | 📩 2 Tour requests| | 3 of 4 Units Leased |  |
|  [📊 Overview (Active)    ]  | +-------------------+ +-------------------+ +-------------------+ +-------------------+    |
|  [🏠 My Listed Units   (4)]  |                                                                                            |
|  [📩 Inquiries & Tours (7)]  | ACTIVE LISTINGS INVENTORY MANAGEMENT (4)          | APPLICANT INQUIRIES & TOUR TRIAGE FEED |
|  [❤️ Saved References (2)]  | +-----------------------------------------------+ | +------------------------------------+ |
|  [🗺️ Metro Cebu Map  [ESC]]  | | [PHOTO] Salinas Dr Studio Unit #2B            | | | [📅 TOUR REQUEST] 10m ago          | |
|                              | | Lahug, Cebu City · ₱6,500/mo                  | | | Mikaela Santos (CIT-U Student)     | |
|  --------------------------- | | Status: [● Occupied] toggle · 4 applicants    | | | Unit: Green Dorm Room 3A (₱4.5k/mo)| |
|  SECURITY & SETTINGS         | | Actions: [✏️ Edit Unit] [Triage Applicants →] | | | Date: Sat, Oct 3 · 2:00 PM         | |
|  [🛡️ Identity & KYC Center ] | +-----------------------------------------------+ | | "Kitakits sa main gate Mikaela."   | |
|  [⚙️ Payout & Settings     ] | +-----------------------------------------------+ | | [✓ Accept Tour] [✕ Reschedule]     | |
|                              | | [PHOTO] Punta Princesa Bed #1A                | | | [💬 Chat with Mikaela]             | |
|  +-------------------------+ | | Near CIT-U Main Campus · ₱3,800/mo            | | +------------------------------------+ |
|  | ROLE WORKSPACE SWITCH   | | | Status: [○ Vacant] toggle · 3 applicants      | | +------------------------------------+ |
|  | [👤 Renter][🏠Landlord*]| | | Actions: [✏️ Edit Unit] [Triage Applicants →] | | | [💬 INQUIRY MESSAGE] 1h ago        | |
|  +-------------------------+ | +-----------------------------------------------+ | | Carlos Tan (BPO IT Park)           | |
|                              |                                                   | | Unit: Salinas Studio #2B (₱6.5k/mo)| |
|  +-------------------------+ | QUICK METRICS & UTILITY BILLING SUMMARY           | | "Separate ba ang electric meter?"  | |
|  | 🚪 Sign Out  [Esc + Q]  | • Electric Submeter Cycle: 25th of month        | | [💬 Reply to Carlos Now]           | |
|  +-------------------------+ | • MCWD Water Submeter Cycle: End of month         | +------------------------------------+ |
+===========================================================================================================================+
```

---

### 2.4 Desktop Component Dimension Specification Matrix

| Callout | Component Identifier | Coordinate / Dimensions | Visual & Functional Specification |
|---|---|---|---|
| — | **MacBook Air Chassis** | `1480px × 950px` Outer (`1440 × 900` Viewport) | Authentic aluminum frame with top FaceTime camera notch, camera lens, green LED, inner bezel, and bottom opening lip. |
| `①` | **Fixed Sidebar Navigation** | `w: 260px`, `h: 900px` (`x: 0, y: 0`) | Fixed dark column (`#0F172A`), brand logotype, compass crest, profile pill, vertical nav items, role switcher, and sign-out action. |
| `②` | **User Profile & KYC Badge** | `w: 228px`, `h: 62px` (`x: 16, y: 76`) | Initials avatar circle (`34px`), full name, academic/professional subtitle, and KYC trust verification pill (`✓ KYC Verified`). |
| `③` | **4-Card Metric Suite** | `w: 265px`, `h: 84px` each (`y: 134`) | High-level metrics: Saved Properties, Active Inquiries, Scheduled Oculars, and Commute Transit Radar to CIT-U. |
| `④` | **Anti-Scam KYC Notice Banner** | `w: 1120px`, `h: 42px` (`x: 290, y: 80`) | Amber warning banner (`#FFFBEB`, border `#FCD34D`) alerting landlords of pending KYC document verification requirements. |
| `⑤` | **Saved Rental Cards** | `w: 695px`, `h: 154px` each | Horizontal cards featuring photo blueprint crosshatch, monthly rent in Cebu Emerald (`#047857`), submeter badges, and commute radar. |
| `⑥` | **Submeter & Transit Badges** | `h: 18px` – `24px`, padding `3px 8px` | Badges for Own Electric Meter, Water Submeter, KYC Verified Host, and Walking / Jeepney route times (04L, 17B). |
| `⑦` | **Inquiries & Tour Timeline** | `w: 405px`, `h: 320px` (`x: 1005, y: 268`) | Vertical inquiry status feed with confirmed tour cards, pending review alerts, landlord chat snippets, and direct live chat triggers. |
| `⑧` | **Landlord Inventory Table & CTA** | `w: 695px`, `h: 196px` (`y: 604`) | Property management unit rows with occupancy switch toggle (Occupied/Vacant), applicant counters, edit unit buttons, and `+ Add New Listing` CTA (`#047857`). |

---

## 3. Mobile Viewport Specification (393px × 852px · iPhone 16 Pro Frame · 100dvh)

### 3.1 Mobile Viewport Geometry & Ergonomics

On mobile viewports (393px × 852px, representing modern iPhone and high-density Android devices), the dashboard shifts into an ergonomic, touch-first mobile architecture:
1. **Dynamic Viewport Height (`100dvh`)**: Uses `min-h-[100dvh]` to eliminate clipping caused by iOS Safari's dynamic URL bar expanding and collapsing.
2. **Top Safe-Area Header (`pt-safe`)**: Positioned directly beneath Apple's Dynamic Island capsule is a persistent mobile header bar featuring a hamburger drawer trigger (`44 × 44px`), platform logotype, and notification bell with unread badge counter.
3. **2x2 Metric Cards Matrix**: Compact grid condensing the 4 primary operational indicators into quick thumb-tappable summaries.
4. **Persistent 4-Item Bottom Navigation Tab Bar**: Positioned above the iOS Safari floating address bar (`h: 56px`), providing instant access to `Home`, `Map Explorer`, `Inquiries (with unread badge)`, and `Saved / My Units`.
5. **Thumb-Zone Optimization**: All primary buttons (Message Landlord, Schedule Tour, Accept Tour, Propose New Time, + Add Listing) enforce the strict **44 × 44px minimum touch target**.
6. **Mobile Anti-Zoom Rule**: All input fields and text controls strictly enforce `font-size: 16px !important` to eliminate destructive iOS Safari auto-zooming.

---

### 3.2 Mobile ASCII Wireframe Blueprint

```
+=======================================================+
| [       (  Dynamic Island  )       ]   9:41  📶 🛜 🔋 |
+-------------------------------------------------------+
|  +----+                                        +----+ |
|  | ☰  |  ABANGCEBU AI                          |🔔 3| |  <- Safe-Area Header (44x44px triggers)
|  +----+                                        +----+ |
|                                                       |
|  Maayong adlaw, Mikaela! 👋                           |
|  [🎓 CIT-U Seeker · ✓ KYC Verified]                   |
|                                                       |
|  +--------------------+   +--------------------+      |
|  | SAVED PROPERTIES   |   | ACTIVE INQUIRIES   |      |
|  | 8 Units            |   | 3 Active           |      |
|  | 📈 +2 this week    |   | 💬 1 awaiting      |      |
|  +--------------------+   +--------------------+      |
|  +--------------------+   +--------------------+      |  <- 2x2 Metric Cards Grid
|  | OCULAR TOUR        |   | CIT-U TRANSIT      |      |
|  | 1 Scheduled        |   | 8 - 14 Mins        |      |
|  | 📅 Sat, Oct 3      |   | 🚍 04L & 17B       |      |
|  +--------------------+   +--------------------+      |
|                                                       |
|  Saved Units Near CIT-U (8)               View All →  |
|  +-------------------------------------------------+  |
|  | [PHOTO: BEDSPACE INTERIOR]                  ❤️  |  |
|  |                                                 |  |
|  | Green Dormitory Room 3A                         |  |
|  | 📍 Punta Princesa, N. Bacalso Ave (CIT-U)       |  |
|  | ₱4,500 / mo   [⚡ Submeter]  [🚶 8 min walk]    |  |
|  |                                                 |  |
|  | +---------------------+ +---------------------+ |  |  <- Touch Ergonomics (44px)
|  | | 💬 Message Owner    | | 📅 Schedule Tour    | |  |
|  | +---------------------+ +---------------------+ |  |
|  +-------------------------------------------------+  |
|                                                       |
|  +-------------------------------------------------+  |
|  | 📅 UPCOMING OCULAR TOUR CONFIRMED               |  |  <- Tour Countdown Alert Card
|  | Green Dormitory Room 3A · Sat, Oct 3, 2:00 PM   |  |
|  | Kuya Jun: "Kitakits sa gate." → Open Chat       |  |
|  +-------------------------------------------------+  |
|                                                       |
|  +-------------------------------------------------+  |
|  | [🏠 Home*]    [🗺️ Map]    [💬 Inquiries(3)]  [❤️] |  |  <- Persistent Bottom Tab Bar
|  +-------------------------------------------------+  |
|  | AA        🔒 abangcebu.ph/dashboard           ↻ |  |  <- iOS Safari Bottom Bar
|  +-------------------------------------------------+  |
|                         ______                        |  <- iOS Home Indicator
+=======================================================+
```

---

## 4. Interactive Widget States & Operational Edge Cases

The user dashboard accommodates diverse user states, role toggles, and data conditions. Each state is explicitly defined in `docs/assets/wireframes/user-dashboard-mobile.svg` across 4 side-by-side iPhone 16 Pro viewports:

```
+---------------------------------------------------------------------------------------------------+
|                        DASHBOARD INTERACTIVE STATES SPECIFICATION                                 |
+-------------------+--------------------+------------------------+---------------------------------+
| State             | Visual Boundary    | Primary Card Display   | Key Action Triggers             |
+-------------------+--------------------+------------------------+---------------------------------+
| 1. Renter Active  | Neutral `#CBD5E1`  | Saved Units & Metrics  | Message Landlord, Schedule Tour |
| 2. Landlord Mode  | Emerald `#047857`  | Inventory Table & KYC  | + Add Listing, Occupancy Switch |
| 3. Inquiry Triage | Blue / Emerald     | Tour Request Cards     | Accept Tour, Decline, Live Chat |
| 4. Empty / Drawer | Drawer Overlay     | Zero Saved Map Invite  | Slide Drawer, Explore Map CTA   |
+-------------------+--------------------+------------------------+---------------------------------+
```

### 4.1 State 1: Mobile Renter Dashboard (Phone 1)
- **Active User**: Mikaela Santos (Student Seeker).
- **Core Elements**: 2x2 metrics grid (8 Saved, 3 Inquiries, 1 Ocular, 12m Transit); high-density Saved Unit card with photo crosshatch, utility submeter badges, 8-minute walking distance pill; upcoming ocular tour alert card with Kuya Jun's latest message snippet.
- **Persistent Controls**: 4-item bottom navigation bar with active Emerald Home indicator and Safari floating address bar.

### 4.2 State 2: Mobile Landlord Dashboard (Phone 2)
- **Active User**: Jun Abellanosa (Verified Landlord).
- **Core Elements**: Amber Anti-Scam KYC Notice Banner; 2x2 operational metrics (4 Units Listed, 1,420 Monthly Views, 7 Pending Inquiries, 85% Occupancy); prominent **"+ Add New Rental Listing"** action button (`44px` height, `#047857` Cebu Emerald); active unit management cards with reactive Occupancy toggle switches (`Occupied` vs `Vacant`).

### 4.3 State 3: Mobile Tenant Inquiries & Triage (Phone 3)
- **Triage Workflow**: Landlord applicant management interface.
- **Filter Tabs**: Segmented control (`All (7)`, `Oculars (2)`, `Chats (5)`).
- **Applicant Card 1 (Ocular Request)**:
  - Header: `📅 OCULAR REQUEST · 10m ago`.
  - Applicant Dossier: Mikaela Santos (CIT-U Student, ID Verified).
  - Target Unit: Green Dormitory Room 3A (₱4,500/mo).
  - Requested Time: Saturday, Oct 3 · 2:00 PM.
  - Quick Triage Buttons: `[✓ Accept Tour]` (Emerald 700), `[✕ Propose New Time]` (Subtle Red), `[💬 Open Live Chat]`.
- **Applicant Card 2 (Inquiry Message)**:
  - Header: `💬 INQUIRY MESSAGE · 1h ago`.
  - Applicant Dossier: Carlos Tan (BPO Professional).
  - Message: *"Sir, separate ba ang electric submeter or fixed rate?"*.
  - Quick Action: `[💬 Reply to Carlos Now]`.

### 4.4 State 4: Mobile Navigation Drawer & Empty States (Phone 4)
- **Slide-Out Navigation Drawer**:
  - Width: `285px` slide-out menu extending from left over a `55%` opacity dimmed backdrop.
  - Header: Initials avatar, user email, KYC trust verification badge.
  - Role Switcher: `⇄ Switch to Landlord Mode` instant toggle.
  - Navigation links: Dashboard Overview, Saved Rentals (8), Inquiries & Tours (3), Explore Metro Cebu Map, Identity & KYC Center, Account Settings, and Sign Out.
- **Underlying Empty State**:
  - Displayed when user has zero saved properties (`saved_properties.length === 0`).
  - Illustrated bookmark heart icon, supportive copy: *"You haven't saved any boarding houses yet. Browse verified rooms near CIT-U, USC & IT Park."*.
  - Primary CTA: `[🗺️ Explore Metro Cebu Map →]` linking directly to `/map`.

### 4.5 Anti-Scam KYC Verification Notice Banner States
The KYC banner dynamically renders 4 deterministic security states based on `profiles.kyc_status`:

```
+---------------------------------------------------------------------------------------------------+
|                        ANTI-SCAM KYC VERIFICATION BANNER STATES                                   |
+-------------------+--------------------+------------------------+---------------------------------+
| Status Code       | Surface Tint       | Icon & Message         | Action Trigger                  |
+-------------------+--------------------+------------------------+---------------------------------+
| 1. `unverified`   | Amber `#FFFBEB`    | ⚠️ Identity unverified  | [Verify Identity Now →]         |
| 2. `pending`      | Amber `#FEF3C7`    | ⏳ Documents in review  | [View Submission Status →]      |
| 3. `verified`     | Emerald `#ECFDF5`  | ✓ KYC Verified Landlord| [Manage Verified Badge]         |
| 4. `rejected`     | Crimson `#FFF1F2`  | ❌ Document unreadable  | [Re-upload Government ID →]     |
+-------------------+--------------------+------------------------+---------------------------------+
```

---

## 5. Keyboard Navigation & Screen Reader Accessibility (WCAG 2.2 AA)

AbangCebu AI enforces strict compliance with **WCAG 2.2 Level AA** standards across keyboard focus order, touch targets, contrast ratios, and assistive technology semantics.

### 5.1 Sequential Tab Order Flow (Desktop Dashboard)

```
[1. Brand Crest / Home] ──> [2. Profile Pill] ──> [3. Overview Nav] ──> [4. Saved Rentals]
                                                                                │
[8. Sign Out] <── [7. Role Switcher] <── [6. KYC Center] <── [5. Inquiries Nav] ┘
       │
[9. Workspace Search] ──> [10. Header Role Switch] ──> [11. Bell Alerts] ──> [12. Return to Map]
                                                                                     │
[16. Ocular Tour CTA] <── [15. Message Host CTA] <── [14. Submeter Filter] <── [13. Metric Cards]
       │
[17. Timeline Inquiries Feed] ──> [18. Open Chat CTA] ──> [19. Recommendations]
```

### 5.2 WAI-ARIA Semantic Role Matrix

| Tab Index | DOM Target Element | Accessible Name / Label | ARIA Role & Attributes | Keyboard Action |
|---|---|---|---|---|
| `1` | Brand Crest Link | "AbangCebu AI Home" | `role="link"`, `aria-label="AbangCebu AI Dashboard Home"` | `Enter` routes to `/dashboard` |
| `2` | User Profile Card | "Mikaela Santos, CIT-U Seeker, KYC Verified" | `role="region"`, `aria-label="User Profile Dossier"` | Visual anchor |
| `3` | Overview Nav Link | "Dashboard Overview, current page" | `role="link"`, `aria-current="page"` | `Enter` activates view |
| `4` | Saved Rentals Link | "Saved Rentals, 8 items" | `role="link"`, `aria-label="Saved Rentals, 8 saved listings"` | `Enter` routes to `/dashboard/saved` |
| `5` | Inquiries Nav Link | "Inquiries & Tours, 3 unread updates" | `role="link"`, `aria-label="Inquiries and Tours, 3 unread items"` | `Enter` routes to `/dashboard/inquiries` |
| `6` | KYC Center Link | "Identity & KYC Trust Center" | `role="link"` | `Enter` routes to `/dashboard/kyc` |
| `7` | Role Workspace Switch | "Switch Workspace Role" | `role="tablist"`, `aria-label="Workspace Role Switch"` | `ArrowRight` / `ArrowLeft` toggles role |
| `8` | Sign Out Button | "Sign Out of AbangCebu AI" | `role="button"`, `aria-label="Sign Out"` | `Enter` opens logout modal |
| `9` | Search Field | "Search saved listings or inquiries" | `type="search"`, `aria-label="Search dashboard properties"` | Standard text input |
| `10` | Notification Bell | "Notifications, 3 unread" | `role="button"`, `aria-haspopup="dialog"`, `aria-expanded="false"` | `Space` / `Enter` opens alert flyout |
| `11` | Return to Map Button | "Return to Metro Cebu Map Explorer" | `role="link"`, `aria-label="Return to Map Explorer"` | `Enter` or `Esc` navigates to `/map` |
| `12` | Metric Card (Saved) | "Saved Properties, 8 units, plus 2 this week" | `role="region"`, `aria-label="Saved Properties metric summary"` | Screen reader announcement |
| `13` | Saved Listing Card | "Green Dormitory Room 3A, 4,500 pesos monthly" | `role="article"`, `aria-label="Property card for Green Dormitory Room 3A"` | `Tab` navigates internal buttons |
| `14` | Message Landlord CTA | "Message landlord Kuya Jun" | `role="button"`, `aria-label="Message Landlord Kuya Jun Abellanosa"` | `Enter` opens real-time chat drawer |
| `15` | Schedule Ocular CTA | "Schedule ocular tour for Green Dormitory Room 3A" | `role="button"`, `aria-label="Schedule Ocular Tour"` | `Enter` opens tour modal |
| `16` | Tour Accept CTA (Landlord)| "Accept ocular tour request from Mikaela Santos" | `role="button"`, `aria-label="Accept Ocular Tour"` | `Enter` confirms booking |

### 5.3 Accessibility Quality Gates & Contrast Ratios

1. **44 × 44px Minimum Touch Hitboxes**: All interactive mobile buttons, drawer triggers, notification bells, tabs, and occupancy toggles enforce a minimum touch target bounding box of `44 × 44px`.
2. **Contrast Ratio Compliance**:
   - Primary Emerald CTA (`#047857` on `#FFFFFF` text): **5.1:1** (Exceeds WCAG AA 4.5:1 minimum).
   - Sidebar Dark Background (`#0F172A` with `#FFFFFF` text): **16.1:1** (Exceeds AAA standard).
   - Sidebar Muted Links (`#CBD5E1` on `#0F172A`): **10.2:1** (Compliant).
   - Amber KYC Alert (`#92400E` text on `#FFFBEB` background): **6.8:1** (Compliant).
   - Occupancy Toggle Active Text (`#047857` on `#ECFDF5` background): **4.8:1** (Compliant).
3. **Screen Reader Live Regions**:
   - Dynamic inquiry notifications utilize `aria-live="polite"`.
   - Occupancy toggle changes announce: *"Listing Salinas Studio #2B status updated to Occupied."* via polite live regions.
   - Tour confirmation alerts utilize `role="alert"` and `aria-live="assertive"`.

---

## 6. Next.js 16 Component Breakdown & Route Architecture

In adherence to the **Squad Architecture Plan** and **Sprint 1 Boundaries**, the dashboard system architecture is partitioned across Server and Client boundaries:

```
src/
└── app/
    └── (dashboard)/
        ├── layout.tsx                [Server Component Shell]
        │   ├── Session Authenticator & Role Resolver (Supabase Server Client)
        │   ├── SidebarNav            [Client Boundary: collapsible drawer state]
        │   │   ├── UserProfilePill
        │   │   ├── NavItemLinks
        │   │   └── RoleSwitcherToggle
        │   ├── DashboardHeader       [Client Boundary: search state & bell flyout]
        │   │   ├── SearchInput
        │   │   ├── ViewSwitchToggle
        │   │   └── NotificationBellFlyout
        │   └── BottomTabBar          [Client Boundary: active tab highlighter]
        │
        ├── renter/
        │   └── page.tsx              [Server Component: Renter Workspace]
        │       ├── RenterMetricsGrid [Server Component: cached counts]
        │       ├── KycAlertBanner    [Client Component: status action listener]
        │       ├── SavedPropertiesGrid [Client Component: optimistic unsave]
        │       │   └── PropertyCard  (Submeters, Commute Radar, Action CTAs)
        │       ├── InquiriesTimeline [Client Component: Supabase realtime listener]
        │       └── CommuteRecommendations [Server Component: spatial match query]
        │
        └── landlord/
            └── page.tsx              [Server Component: Landlord Workspace]
                ├── LandlordMetricsGrid [Server Component: aggregated stats]
                ├── KycVerificationBanner [Client Component: document uploader trigger]
                ├── ActiveListingsTable [Client Component: optimistic occupancy toggle]
                │   └── ListingRow    (Price, Occupancy Switch, Edit/Manage triggers)
                └── InquiriesTriageFeed [Client Component: Accept / Decline / Chat]
```

### 6.1 Architectural Component Contracts

| Component Identifier | Boundary | File Path Target (Sprint 2) | Architectural Contract & Responsibilities |
|---|---|---|---|
| `DashboardLayout` | **Server** | `src/app/(dashboard)/layout.tsx` | Enforces Supabase server session auth. Resolves user profile role (`renter` vs `landlord`). Injects persistent sidebar and header shell. |
| `SidebarNav` | **Client** | `src/components/dashboard/sidebar-nav.tsx` | Client navigation shell. Manages active route highlights, badge counts, mobile slide-out drawer state, and accessible keyboard traps. |
| `DashboardHeader` | **Client** | `src/components/dashboard/dashboard-header.tsx` | Sticky header with localized greeting, quick search debounce, notification bell dialog, and role workspace switcher. |
| `MetricCard` | **Server** | `src/components/dashboard/metric-card.tsx` | Reusable operational metric presentation container with label, value, trend badge, and semantic SVG icon bubble. |
| `KycAlertBanner` | **Client** | `src/components/dashboard/kyc-alert-banner.tsx` | Anti-Scam KYC verification notice banner. Reacts to `profiles.kyc_status` (unverified, pending, verified, rejected). |
| `SavedPropertiesGrid`| **Client**| `src/components/dashboard/saved-properties-grid.tsx`| 2-column responsive card matrix. Displays submeter badges, commute walk times, and fires optimistic unsave events. |
| `ActiveListingsTable`| **Client**| `src/components/dashboard/active-listings-table.tsx`| Landlord inventory management table. Handles instantaneous vacancy/occupancy toggle switches with optimistic state feedback. |
| `InquiriesTriageFeed`| **Client**| `src/components/dashboard/inquiries-triage-feed.tsx`| Landlord applicant triage inbox. Handles 1-tap tour acceptance (`POST /api/tours/accept`), reschedule modal, and live chat drawer. |
| `BottomTabBar` | **Client** | `src/components/dashboard/bottom-tab-bar.tsx` | Mobile persistent 4-tab bar (Home, Map, Inquiries, Saved/Units). Renders safe-area margins and unread notification pips. |

> [!IMPORTANT]
> **Sprint 1 Boundary Enforcement:** In strict accordance with Sprint 1 governance, no premature React/JSX UI components are to be created in `src/components/`. The component contracts and layout boundaries established here constitute the authoritative blueprint for Sprint 2 implementation.

---

## 7. Design Tokens & Styling Integration

All dashboard components, colors, and elevations map directly to the Tailwind CSS v4 design tokens configured in `src/app/globals.css`:

```css
/* Color Palette Integration (src/app/globals.css) */
--color-action: #047857;          /* Primary Actions: Cebu Emerald 700 */
--color-action-hover: #065f46;    /* Primary Action Hover: Cebu Emerald 800 */
--color-primary: #0f2742;         /* Deep Maritime Navy (Sidebar & High-Contrast Headers) */
--color-background: #faf8f5;      /* Base Page Surface: Coastal Sand */
--color-card: #ffffff;            /* Elevated Card Surfaces: Pure White */
--color-border: #e6decb;          /* Neutral Card Borders */
--color-ring: #047857;            /* Active Focus Rings: Cebu Emerald */
--color-warning: #b45309;         /* Anti-Scam KYC Notice: Golden Amber */
--color-destructive: #e11d48;     /* Danger / Unsave: Sinulog Crimson */

/* Ergonomic Utility Classes */
@utility touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@utility focus-ring {
  outline: 2px solid transparent;
  outline-offset: 2px;
  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
}

/* Mobile Anti-Zoom Rule */
@media (max-width: 768px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}
```

---

## 8. Definition of Done (DoD) & Sign-Off

### 8.1 Verification Checklist

- [x] **Jira Traceability**: Document explicitly linked to Jira ticket [SCRUM-67](https://abangcebuai.atlassian.net/browse/SCRUM-67).
- [x] **Balsamiq/Figma Blueprint Conventions**: Grayscale monochrome foundation, clean strokes, crossed `[X]` image placeholders, and authentic hardware device frames.
- [x] **Desktop Viewport Specification (1440 × 900 · 16:10)**: Authentic MacBook Air chassis, 260px fixed dark sidebar navigation, user profile pill with KYC status, 4 metric cards, saved properties 2-column grid, submeters & commute radar badges, and landlord inventory preview.
- [x] **Mobile Viewport Specification (393 × 852 · 100dvh)**: Authentic iPhone 16 Pro chassis, Dynamic Island, safe-area header with hamburger and notification bell, 2x2 metric grid, 4-tab persistent bottom bar, and iOS Safari floating address bar.
- [x] **Dual-View Dashboard Architecture**: Comprehensive mapping of Renter View (`/dashboard/renter`) and Landlord View (`/dashboard/landlord`) with role switching mechanics.
- [x] **Anti-Scam KYC Trust Verification Banner**: 4 deterministic states (Unverified, Pending, Verified, Rejected) with Amber callout and action links.
- [x] **Tenant Inquiries & Ocular Triage Workflows**: Detailed applicant cards with 1-tap Accept Tour, Decline, and Live Chat triggers.
- [x] **Empty States & Mobile Drawer Navigation**: Slide-out mobile drawer specification and zero-state map exploration CTAs.
- [x] **Accessibility (WCAG 2.2 AA)**: Strict 44 × 44px touch targets, contrast ratios >= 4.5:1, 16px mobile input font rule, full sequential keyboard tab order flow, and ARIA attributes.
- [x] **Component Hierarchy & Server/Client Boundaries**: Explicit mapping for Next.js 16 route layout, `SidebarNav`, `MetricCard`, `SavedPropertiesGrid`, `ActiveListingsTable`, `InquiriesTriageFeed`, and `KycAlertBanner`.
- [x] **Sprint 1 Iron Rule**: Zero premature React/JSX UI components created in `src/components/`.
- [x] **Vector & Rendered Assets**: High-resolution vector SVGs, PNG blueprints, and formal WeasyPrint PDF compiled and stored in repository.

### 8.2 Architectural Sign-Off

| Role | Name | Signature / Status | Date |
|---|---|---|---|
| **Author (UI/UX Designer)** | **Neah Moneva** | `Approved & Signed Off` | September 30, 2026 |
| **Reviewer & Scrum Master** | **Hermar Centillas** | `Approved & Audited` | September 30, 2026 |
