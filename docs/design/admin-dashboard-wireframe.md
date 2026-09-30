# AbangCebu AI — Admin Dashboard Wireframe & Layout Architecture Specification

**Sprint 1 System Architecture Specification**  
**Document Version:** 1.0.0  
**Status:** Approved & Active Design Specification  
**Jira Ticket Reference:** [SCRUM-74](https://abangcebuai.atlassian.net/browse/SCRUM-74) — *Design Admin Dashboard Wireframe / Mockup*  
**Sprint:** Sprint 1 (Foundations & Core Infrastructure)  
**Author:** Neah Moneva (UI/UX Designer)  
**Reviewed & Audited by:** Hermar Centillas (Lead / Scrum Master)  
**Design Reference Standard:** Balsamiq / Figma Grayscale Blueprint Architecture, Apple Human Interface Guidelines, Supabase RLS Security Model, WCAG 2.2 AA Ergonomics  
**Companion Assets:**
- Desktop Vector Blueprint: [`docs/assets/wireframes/admin-dashboard-desktop.svg`](../assets/wireframes/admin-dashboard-desktop.svg)
- Desktop High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Admin_Dashboard_Desktop_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Admin_Dashboard_Desktop_Wireframe_Blueprint.png)
- Mobile Vector Blueprint: [`docs/assets/wireframes/admin-dashboard-mobile.svg`](../assets/wireframes/admin-dashboard-mobile.svg)
- Mobile High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Admin_Dashboard_Mobile_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Admin_Dashboard_Mobile_Wireframe_Blueprint.png)
- Formal Engineering PDF: [`docs/pdf/AbangCebu_Admin_Dashboard_Wireframe_Specification.pdf`](../pdf/AbangCebu_Admin_Dashboard_Wireframe_Specification.pdf)
- Specification Sheet Previews:
  - Page 1 (Desktop Admin Architecture & Component Matrix): [`docs/assets/wireframes/AbangCebu_Admin_Dashboard_Specification_Sheet_Page1.png`](../assets/wireframes/AbangCebu_Admin_Dashboard_Specification_Sheet_Page1.png)
  - Page 2 (Mobile Viewport & 4 Interactive Operational States): [`docs/assets/wireframes/AbangCebu_Admin_Dashboard_Specification_Sheet_Page2.png`](../assets/wireframes/AbangCebu_Admin_Dashboard_Specification_Sheet_Page2.png)
  - Page 3 (Accessibility, Route Architecture & Sign-Off): [`docs/assets/wireframes/AbangCebu_Admin_Dashboard_Specification_Sheet_Page3.png`](../assets/wireframes/AbangCebu_Admin_Dashboard_Specification_Sheet_Page3.png)
- Related Specifications:
  - Styling Tokens & Guidelines: [`docs/design/styling-guidelines.md`](./styling-guidelines.md)
  - Renter Persona & Capabilities: [`docs/design/renter-persona.md`](./renter-persona.md)
  - Users and Profiles Schema: [`docs/database/users-and-profiles-schema.md`](../database/users-and-profiles-schema.md)
  - Database ERD Architecture: [`docs/database/database-erd.md`](../database/database-erd.md)
  - Row-Level Security Policies: [`docs/security/rls-policies.md`](../security/rls-policies.md)
  - RBAC Permission Matrix: [`docs/security/rbac-matrix.md`](../security/rbac-matrix.md)
  - User Dashboard Wireframes: [`docs/design/user-dashboard-wireframe.md`](./user-dashboard-wireframe.md)
  - Profile Page Wireframes: [`docs/design/profile-page-wireframe.md`](./profile-page-wireframe.md)

---

## 1. Executive Summary & Trust Architecture Philosophy

The Admin Dashboard serves as the central command console for **Trust, Safety, and Verification Governance** across AbangCebu AI. Rental scams in Metro Cebu frequently target vulnerable university students (CIT-U, USC, UP Cebu, SWU) through deceptive online listings, fake GCash advance reservations, and duplicate room rentals. To combat this systemic challenge, the Admin Dashboard is architected around four core security pillars:

```
+---------------------------------------------------------------------------------------------------+
|                        ABANGCEBU AI ADMIN TRUST ARCHITECTURE PILLARS                              |
+---------------------------------------------------------------------------------------------------+
| 1. Anti-Scam KYC Verification Gateway:                                                            |
|    Landlords are strictly gated from receiving direct tenant contact details or publishing         |
|    listings with the official "Verified Landlord" badge until their submitted government ID        |
|    (PhilSys National ID, UMID, Driver's License) passes human and automated audit triage.          |
|                                                                                                   |
| 2. Immediate Account Lockout Mechanism:                                                           |
|    When an anomalous scam report is flagged (e.g. demanding advance GCash fees without oculars),   |
|    administrators can execute an immediate account freeze (`profiles.is_suspended = true`),        |
|    instantly invalidating active sessions and hiding all associated listings from the public map.  |
|                                                                                                   |
| 3. PostGIS Corridor Geofence Validation:                                                           |
|    Every landlord application is spatially cross-validated using PostGIS ST_Contains queries      |
|    against official Metro Cebu barangay corridor polygons (Sambag I, Urgello, Banilad, Lahug)     |
|    to prevent fictitious or out-of-boundary property listings.                                     |
|                                                                                                   |
| 4. Immutable Audit Trail Logging:                                                                 |
|    Every administrative action—approval, structured rejection code, document inspection, and      |
|    account lockout—is immutably committed to `audit_logs` with admin UUID, IP address, and delta.  |
+---------------------------------------------------------------------------------------------------+
```

### 1.1 Wireframe Blueprint Conventions

In adherence to Balsamiq and Figma mid-fidelity architectural conventions:
1. **Monochrome Hierarchy**: High-contrast charcoal borders (`#0F172A`, `#334155`, `#94A3B8`), neutral base surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`), and purposeful semantic accents (`#047857` Coastal Emerald actions, `#B45309` Amber SLA warnings, `#E11D48` Sinulog Crimson emergency alerts).
2. **Authentic Hardware Viewports**:
   - **Desktop (1440px × 900px, 16:10)**: Encased in an authentic **MacBook Air aluminum chassis** with top FaceTime camera notch, inner black bezels, and bottom thumb lip.
   - **Mobile (393px × 852px, 100dvh)**: Encased in an authentic **iPhone 16 Pro Titanium chassis** with Dynamic Island, iOS 9:41 status bar, safe-area headers, and persistent bottom iOS Safari navigation.
3. **Traceable Blueprint Callouts (`①` – `⑧`)**: Directly cross-referencing layout dimensions, functional specifications, and accessibility contracts.

---

## 2. Desktop Viewport Specification (1440px × 900px · MacBook Air Aluminum Frame)

### 2.1 Viewport Geometry & Workspace Partitioning

On desktop viewports (1440px × 900px, 16:10 aspect ratio), the dashboard implements a **260px fixed sidebar navigation** paired with an **1180px operational workspace**:
- **Fixed Dark Sidebar Navigation (0px – 260px)**:
  - Deep Navy background (`#0F172A`) providing permanent anchor navigation.
  - Admin brand crest with shield and compass logotype in Coastal Emerald (`#047857`).
  - System Health Indicator Pill: `System Status: 99.98% Operational · PostGIS Online`.
  - Administrator Profile Dossier Pill: initials avatar `[HC]`, "Hermar Centillas", role pill `[ 🛡️ System Admin ]`, online presence dot.
  - Primary navigation links:
    - **KYC Verification Queue** (with active badge count: `14 Pending`, Emerald accent highlight).
    - **Scam Moderation Feed** (with urgent badge count: `5 Urgent`, Sinulog Crimson highlight).
    - **Platform Analytics** (listing volume, rental velocity, verify ratio).
    - **User & Host Directory** (seeker & landlord account lookup).
    - **Immutable Audit Logs** (tamper-evident audit log ledger).
  - System & GIS section: PostGIS Corridors & Map, Admin Security Settings.
  - Bottom-docked Sign Out trigger with shortcut hint `[Esc + Q]`.
- **Main Operational Workspace (260px – 1440px)**:
  - **Top Workspace Header (h: 64px)**: Workspace title ("Trust & Safety Operations Command"), search field with shortcut hint `[⌘K]`, live sync indicator (`● Live Sync Active`), quick Audit Log CTA, and emergency alert counter (`🔔 5`).
  - **Executive KPI Metric Suite (4 cards, h: 82px)**: High-level operational indicators (Total Verified Listings, Pending KYC Queue, Reported Listings, Scam Interception Rate).
  - **Two-Column Operational Workspace**:
    - **Primary Left Column (720px w)**:
      - **KYC Verification Review Triage Table (h: 360px)**: Landlord name, submitted ID type, target property/barangay, submission age, SLA status badge, and action triggers (`[ 🔍 Inspecting → ]`, `[ ✕ Reject ]`).
      - **Reported Listings & Scam Moderation Feed (h: 338px)**: High-risk suspicious property cards (e.g. "₱1,800 Furnished Studio near CIT-U - Asks for GCash advance"), student notes, risk score (92%), and 1-click action: `[ 🚨 Suspend Listing & Freeze Landlord Account ]` (executing `profiles.is_suspended = true`).
    - **Secondary Right Column (414px w)**:
      - **Side-by-Side Document Inspection Drawer (h: 712px)**: High-res Philippine ID image preview (Front/Back) with zoom/rotate and OCR data overlay box; Landlord profile details, PhilSys registry query match (98.7% confidence), Proof of ownership (Barangay clearance, VECO bill); Action triggers: `[ ✓ Approve & Issue Verified Badge ]` (Coastal Emerald `#047857`) vs `[ ✕ Reject Document ]` (Sinulog Crimson `#E11D48`, triggers structured rejection reason modal).

---

### 2.2 Desktop ASCII Wireframe Blueprint

```
+===========================================================================================================================+
| [FaceTime Camera Notch: 712px]                                                                               MacBook Air  |
+---------------------------------------------------------------------------------------------------------------------------+
| [260px FIXED SIDEBAR]        | [1180px MAIN OPERATIONAL WORKSPACE]                                                        |
|                              |                                                                                            |
|  [🛡️] ABANGCEBU AI           |  Trust & Safety Operations Command       [🔍 Search landlords, IDs... ⌘K]  [● Live Sync]  |
|  ADMIN CONSOLE               |  Metro Cebu Landlord Verification Gateway & Scam Interceptor   [Audit Log]  [🔔 5 Alerts]  |
|                              +--------------------------------------------------------------------------------------------+
|  +-------------------------+ |                                                                                            |
|  | STATUS: 99.98% · PostGIS| | +-------------------+ +-------------------+ +-------------------+ +-------------------+  |
|  +-------------------------+ | | VERIFIED LISTINGS | | PENDING KYC QUEUE | | REPORTED LISTINGS | | SCAM INTERCEPT RATE |  |
|  +-------------------------+ | | 1,248 Units       | | 14 Landlords      | | 5 Active Reports  | | 99.4%               |  |
|  | (HC) Hermar Centillas   | | | 📈 +34 this week  | | ⚠️ 3 near 24h SLA | | 🚨 2 High-Risk    | | ₱412k fraud averted |  |
|  | [🛡️ System Admin]   ●   | | +-------------------+ +-------------------+ +-------------------+ +-------------------+ ③|
|  +-------------------------+ |                                                                                            |
|  TRUST & SAFETY TRIAGE     ② | KYC REVIEW QUEUE (14 Pending) [All (14)] [Urgent (3)] [PhilSys (8)] [UMID (3)]             |
|  [🪪 KYC Queue (14) Active ]  | +----------------------------------------------------------------------------------------+ |
|  [🚨 Scam Moderation   (5) ]  | | APPLICANT        | ID TYPE SUBMITTED | CORRIDOR / BARANGAY | SLA STATUS    | ACTION      | |
|  [📊 Platform Analytics    ]  | |------------------+-------------------+---------------------+---------------+-------------| |
|  [👥 User & Host Directory ]  | |*Rodrigo "Digong" | PhilSys ID (98.7%)| Sambag I (CIT-U)    | ⚠️ 3h SLA Left| [🔍 Inspect]| |
|  [📜 Immutable Audit Logs  ]  | | Maria Socorro L. | UMID Card         | Urgello (SWU)       | ⏳ In Queue   | [Inspect][✕]| |
|                              | | Danilo "Kuya D." | Driver's License  | Banilad (USC-TC)    | ⏳ In Queue   | [Inspect][✕]| |
|  SYSTEM & GIS GOVERNANCE     | | Lourdes "Nanay L"| Postal ID         | Lahug (IT Park)     | ⏳ In Queue   | [Inspect][✕]| |
|  [🗺️ PostGIS Corridors     ]  | +----------------------------------------------------------------------------------------+ |
|  [⚙️ Admin Security        ]  | Showing 1-4 of 14 Pending · 24h SLA Compliance: 97.8%                      [← Prev] [Next →]|
|                              |                                                                                            |
|  +-------------------------+ | REPORTED LISTINGS & SCAM RADAR (5 Active Cases)                       [⚡ BATCH ACTIONS (5)]|
|  | ↗ Open Cebu Map   [ESC] | | +----------------------------------------------------------------------------------------+ |
|  +-------------------------+ | | 🚨 92% SCAM RISK: "₱1,800 Furnished Studio near CIT-U - Asks for GCash advance"        | |
|  +-------------------------+ | | Target: Karlo Dizon (Unverified Landlord · Registered 2d ago · IP: 112.198.*)          | |
|  | 🚪 Sign Out    [Esc + Q]| | | Note: "Refused ocular visit unless ₱1,000 reservation is transferred to GCash."       | |
|  +-------------------------+ | | [🚨 Suspend Listing & Freeze Account]  [Inspect Dossier]  [Dismiss False Positive]     | |
|                            ① | +----------------------------------------------------------------------------------------+ ⑤|
+===========================================================================================================================+
```

---

### 2.3 Desktop Side-by-Side Inspection Drawer ASCII Blueprint

```
+===================================================================================================+
| [414px SIDE-BY-SIDE DOCUMENT INSPECTION DRAWER]                                                   |
+---------------------------------------------------------------------------------------------------+
| SIDE-BY-SIDE DOCUMENT INSPECTION                                                             [ ⛶ ]|
| Reviewing: Rodrigo "Digong" Tan · Landlord Application                                             |
+---------------------------------------------------------------------------------------------------+
| APPLICANT DOSSIER & PROPERTY BINDING                                                              |
| • Target Unit: Green Dormitory Sambag I (CIT-U Corridor) · ₱4,500/mo                              |
| • Declared Phone: +63 917 842 9912 (SMS OTP Confirmed)                                            |
| • Supporting Proof: Sambag I Barangay Clearance + VECO Bill #8194-20 [VECO MATCH: RODRIGO TAN]   |
+---------------------------------------------------------------------------------------------------+
| PHILIPPINE NATIONAL ID (FRONT SPECIMEN)                                [ 🔍+ ] [ 🔍- ] [ ⟲ 90° ]   |
| +-----------------------------------------------------------------------------------------------+ |
| | REPUBLIKA NG PILIPINAS — PHILIPPINE IDENTIFICATION SYSTEM (PhilSys)                           | |
| | +-----------+  Apelyido / Last Name:       TAN                                                | |
| | | [PHOTO]   |  Mga Pangalan / Given Names: RODRIGO "DIGONG"                                   | |
| | | VALID     |  PhilSys Card Number (PCN):  9104 - 5821 - 4921 - 0319                          | |
| | |           |  Tirahan / Address:          Sambag I, Cebu City 6000     [QR: PSA-VAL]         | |
| | +-----------+  =======================================================                        | |
| |                [OCR BOUNDING BOX: 98.7% CONFIDENCE · ALL CORNERS DETECTED]                    | |
| +-----------------------------------------------------------------------------------------------+ |
+---------------------------------------------------------------------------------------------------+
| AUTOMATED TRUST & REGISTRY AUDIT                                                                  |
| [✓] PhilSys PSA Registry Query Match: PCN 9104-***-0319 verified against national database         |
| [✓] PostGIS Corridor Geofence Validation: Declared coordinates lie inside Sambag I polygon        |
| [✓] Proof of Ownership Cross-Check: VECO Electricity Bill name matches landlord profile 100%      |
| [✓] Face Liveness Match Confidence: 96.4% biometric similarity score between selfie and ID card   |
+---------------------------------------------------------------------------------------------------+
| DECISION ACTION TRIGGERS                                                                          |
| +-----------------------------------------------------------------------------------------------+ |
| | [ ✓ Approve & Issue Verified Landlord Badge ]                              (Coastal Emerald)  | |
| +-----------------------------------------------------------------------------------------------+ |
| | [ ✕ Reject Document (Triggers Structured Reason Modal) ]                   (Sinulog Crimson)  | |
| +-----------------------------------------------------------------------------------------------+ |
|   💬 Request Higher-Resolution Image from Host                                                  ⑧ |
+===================================================================================================+
```

---

### 2.4 Desktop Component Dimension Specification Matrix

| Callout | Component Identifier | Coordinate / Dimensions | Visual & Functional Specification |
|---|---|---|---|
| — | **MacBook Air Chassis** | `1480px × 950px` Outer (`1440 × 900` Viewport) | Authentic aluminum frame with top FaceTime camera notch, camera lens, green LED, inner bezel, and bottom opening lip. |
| `①` | **Fixed Dark Sidebar Navigation** | `w: 260px`, `h: 900px` (`x: 0, y: 0`) | Fixed dark column (`#0F172A`), Admin brand crest, profile pill, vertical nav items (KYC Queue, Scam Moderation, Analytics, Audit Logs), and bottom sign-out. |
| `②` | **Admin Profile & System Health** | `w: 228px`, `h: 66px` (`x: 16, y: 110`) | Initials avatar circle (`36px`), full name (`Hermar Centillas`), role badge (`🛡️ System Admin`), online dot, and PostGIS connection indicator. |
| `③` | **4-Card Executive KPI Suite** | `w: 270px – 288px`, `h: 82px` each (`y: 76`) | Key metrics: Total Verified Listings (1,248), Pending KYC Queue (14), Reported Listings (5), Scam Interception Rate (99.4% · ₱412k prevented). |
| `④` | **KYC Review Triage Table** | `w: 720px`, `h: 360px` (`x: 280, y: 172`) | Landlord application rows with segmented filter pills, SLA countdown badge (`⚠️ 3h SLA Left`), and active inspection row indicator (`#047857`). |
| `⑤` | **Scam Moderation Feed & Freeze CTA** | `w: 720px`, `h: 338px` (`x: 280, y: 546`) | High-risk scam alerts (92% risk, advance fee) with student report notes and 1-click emergency lockout: `[ 🚨 Suspend Listing & Freeze Landlord Account ]`. |
| `⑥` | **Side-by-Side Inspection Drawer** | `w: 414px`, `h: 712px` (`x: 1012, y: 172`) | High-res Philippine ID image viewer with zoom/rotate HUD (`🔍+`, `🔍-`, `⟲ 90°`), photo box, PhilSys header, and OCR bounding overlay (98.7%). |
| `⑦` | **Automated Registry Audit Panel** | `w: 386px`, `h: 170px` (internal drawer) | Trust check pills: PSA PhilSys API record match, PostGIS Sambag I geofence match, VECO bill name match, and 96.4% biometric selfie liveness. |
| `⑧` | **Decision Action Triggers** | `w: 386px`, `h: 120px` (internal drawer) | Primary `[ ✓ Approve & Issue Badge ]` in Coastal Emerald (`#047857`, 42px), Secondary `[ ✕ Reject Document ]` in Crimson (`#E11D48`, 36px), and tertiary request. |

---

## 3. Mobile Viewport Specification (393px × 852px · iPhone 16 Pro Frame · 100dvh)

### 3.1 Mobile Viewport Geometry & Ergonomics

On mobile viewports (393px × 852px, representing modern iPhone and high-density Android devices), the admin dashboard shifts into a rapid, touch-first mobile triage workflow:
1. **Dynamic Viewport Height (`100dvh`)**: Uses `min-h-[100dvh]` to eliminate clipping caused by iOS Safari's dynamic URL bar expanding and collapsing.
2. **Top Safe-Area Header (`pt-safe`)**: Positioned directly beneath Apple's Dynamic Island capsule is a persistent mobile header bar featuring the Admin console badge (`[ 🛡️ System Admin ]`) and emergency alert counter (`🔔 5`).
3. **Urgent Scam Alert Banner**: High-priority alert banner with an emergency **1-Tap Account Freeze** button (`⚡ 1-Tap Freeze Landlord Account`), enabling rapid mitigation from anywhere.
4. **Mobile Rapid Triage Swiper (1-Card-at-a-Time)**: Instead of wide desktop data tables, landlords are reviewed one at a time with full-width preview cards, document thumbnails, ownership proof indicators, and swipe/button actions (`Approve`, `Reject`, `Skip`).
5. **Persistent 4-Item Bottom Admin Tab Bar**: Positioned above the iOS Safari floating address bar (`h: 56px`), providing instant access to `Overview`, `KYC (14)`, `Scam (5)`, and `Audit Logs`.
6. **Thumb-Zone Optimization**: All primary buttons (Approve, Reject, Skip, Freeze, Modal triggers) enforce the strict **44 × 44px minimum touch target**.
7. **Mobile Anti-Zoom Rule**: All input fields, reason textareas, and search bars strictly enforce `font-size: 16px !important` to eliminate destructive iOS Safari auto-zooming.

---

### 3.2 Mobile ASCII Wireframe Blueprint

```
+=======================================================+
| [       (  Dynamic Island  )       ]   9:41  📶 🛜 🔋 |
+-------------------------------------------------------+
|  ABANGCEBU  [🛡️ System Admin]                    🔔 5 |  <- Safe-Area Header
+-------------------------------------------------------+
| [🚨 URGENT SCAM REPORT (92% RISK)                    ] |
| Karlo Dizon · Asking GCash advance near CIT-U         |
| [⚡ 1-Tap Freeze Landlord Account                    ] |  <- Emergency Freeze Banner
+-------------------------------------------------------+
|  +--------------------+   +--------------------+      |
|  | VERIFIED LISTINGS  |   | PENDING KYC        |      |
|  | 1,248 Units        |   | 14 In Queue        |      |
|  | 📈 +34 this week   |   | ⚠️ 3 near SLA      |      |
|  +--------------------+   +--------------------+      |
|  +--------------------+   +--------------------+      |  <- 2x2 Metric Grid
|  | REPORTED LISTINGS  |   | SCAM INTERCEPT     |      |
|  | 5 Reports          |   | 99.4%              |      |
|  | 🚨 2 High-Risk     |   | ₱412k saved        |      |
|  +--------------------+   +--------------------+      |
|                                                       |
|  RAPID KYC REVIEW (1 of 14)           ⚠️ 3h SLA Left  |
|  +-------------------------------------------------+  |
|  | PHILSYS NATIONAL ID VERIFICATION     98.7% OCR  |  |
|  | +---------------------------------------------+ |  |
|  | | [PHOTO] TAN, RODRIGO "DIGONG"               | |  |
|  | | PCN: 9104-5821-4921-0319 · Sambag I, Cebu   | |  |
|  | | [🔍 Deep Inspect Document →]                | |  |
|  | +---------------------------------------------+ |  |
|  | Target: Sambag I Studio (CIT-U) · ₱4,500/mo     |  |
|  | ✓ Sambag I Clearance & VECO Bill Attached      |  |
|  | ✓ PSA Valid · ✓ PostGIS In-Zone · ✓ Liveness   |  |
|  +-------------------------------------------------+  |
|                                                       |
|  +-----------+ +------------+ +---------------------+ |  <- 44px Touch Targets
|  | ✕ Reject  | | ⏭️ Skip     | | ✓ Approve & Verify  | |
|  +-----------+ +------------+ +---------------------+ |
|       Swipe left to Reject · Swipe right to Approve   |
|                                                       |
|  +-------------------------------------------------+  |
|  | [📊 Overview] [🪪 KYC(14)*] [🚨 Scam(5)] [📜Audit]|  |  <- Persistent Admin Tab Bar
|  +-------------------------------------------------+  |
|  | AA        🔒 abangcebu.ph/admin/kyc            ↻ |  |  <- iOS Safari Bottom Bar
|  +-------------------------------------------------+  |
|                         ______                        |  <- iOS Home Indicator
+=======================================================+
```

---

## 4. Interactive Widget States & Operational Edge Cases

The admin console accommodates diverse operational states, queue volumes, and security escalations across mobile viewports, as modeled in [`docs/assets/wireframes/admin-dashboard-mobile.svg`](../assets/wireframes/admin-dashboard-mobile.svg):

```
+---------------------------------------------------------------------------------------------------+
|                        ADMIN DASHBOARD INTERACTIVE STATES SPECIFICATION                           |
+-------------------+--------------------+------------------------+---------------------------------+
| State             | Visual Boundary    | Primary Card Display   | Key Action Triggers             |
+-------------------+--------------------+------------------------+---------------------------------+
| 1. Admin Overview | Slate `#0F172A`    | 2x2 Metrics & Scam Alert| 1-Tap Freeze, Launch Swiper     |
| 2. Rapid Swiper   | Emerald `#047857`  | 1-at-a-Time KYC Card   | Approve, Reject, Skip Swipe     |
| 3. Deep Inspect   | Emerald Border     | Zoom ID & Registry Box | Zoom HUD, Rotate, Issue Badge   |
| 4. Rejection Modal| Crimson Modal      | Reason Radio Selector  | Confirm Rejection & Guidance    |
| 5. Zero State     | Emerald Surface    | All Cleared Trophy     | Queue Celebration, Refresh      |
+-------------------+--------------------+------------------------+---------------------------------+
```

### 4.1 State 1: Mobile Admin Overview & KPI Feed (Phone 1)
- **Active Admin**: Hermar Centillas (System Administrator).
- **Core Elements**: Safe-area header with Admin console badge and 5 pending alerts; Urgent Scam Alert Banner with 1-tap freeze; 2x2 operational metrics grid; Rapid KYC Triage Launcher card; and recent tamper-evident audit trail snippet.
- **Persistent Controls**: 4-item bottom admin navigation bar with active Overview indicator and Safari floating address bar.

### 4.2 State 2: Mobile Rapid KYC Triage Swiper (Phone 2)
- **Active Landlord Application**: Rodrigo "Digong" Tan (Application 1 of 14).
- **Core Elements**: Header with SLA countdown pill (`⚠️ 3h SLA Left`); high-density Landlord Card with simulated PhilSys ID thumbnail, OCR confidence score (`98.7%`), target unit details (Sambag I near CIT-U, ₱4,500/mo), and automated trust checklist (PSA registry, PostGIS geofence, VECO bill match, face liveness).
- **Ergonomic Controls**: 3-button touch bar (`[ ✕ Reject ]`, `[ ⏭️ Skip ]`, `[ ✓ Approve & Verify ]`) supporting one-handed thumb triage and gesture swipes (swipe right to approve, swipe left to reject).

### 4.3 State 3: Mobile Side-by-Side Document Inspection View (Phone 3)
- **Deep Inspection Mode**: Activated by tapping `[ 🔍 Deep Inspect Document ]`.
- **Core Elements**: Full-bleed document zoom container with floating HUD controls (`🔍+`, `🔍-`, `⟲ Rotate`); high-res specimen preview of Philippine National ID with OCR bounding box; automated registry validation checklist; and fixed bottom decision triggers (`[ ✓ Approve & Issue Verified Badge ]` vs `[ ✕ Reject Document ]`).

### 4.4 State 4: Mobile Rejection Reason Modal & Empty Queue State (Phone 4)
- **Rejection Reason Modal**:
  - Activated when administrator taps `[ ✕ Reject Document ]`.
  - Appears over a `65%` opacity dimmed backdrop.
  - Header: Warning icon, landlord name, and instruction to provide structured feedback.
  - Standardized Reason Selector:
    - `(●) Blurred / Low-Resolution ID` (Selected)
    - `(○) Landlord Name Mismatch`
    - `(○) Expired Government ID`
    - `(○) Unofficial / Unsupported Document`
  - Guidance Note Input: Enforces `font-size: 16px !important` to eliminate iOS auto-zoom: `"Please re-upload a clear photo of your PhilSys National ID. Ensure all 4 corners are visible without glare."`.
  - Action Triggers: `[ Confirm Rejection & Notify Landlord ]` in Sinulog Crimson (`#E11D48`) and `[ Dismiss & Return to Queue ]`.
- **Queue Completion (Zero State)**:
  - When all pending applications are triaged (`pending_kyc_count === 0`).
  - Displays celebratory trophy icon, title *"All KYC Reviews Cleared!"*, and subtext *"Zero pending reviews in queue · 100% SLA compliant"*.

### 4.5 State 5: Batch Moderation State (Scam Feed)
- Multi-select capability on the desktop and mobile scam feed.
- Administrators can select multiple suspicious listings originating from the same IP or fraudulent phone pattern and execute `Batch Suspend & Blacklist` with a single authenticated action.

---

## 5. Keyboard Navigation & Screen Reader Accessibility (WCAG 2.2 AA)

AbangCebu AI enforces strict compliance with **WCAG 2.2 Level AA** standards across keyboard focus order, touch targets, contrast ratios, and assistive technology semantics.

### 5.1 Sequential Tab Order Flow (Desktop Admin Console)

```
[1. Admin Crest] ──> [2. Profile Dossier] ──> [3. KYC Queue Nav] ──> [4. Scam Moderation Nav]
                                                                                │
[8. Metric: KYC] <── [7. Search (⌘K)] <── [6. Sign Out] <── [5. Audit Logs Nav] ┘
       │
[9. KYC Triage Row] ──> [10. Inspect & Review CTA] ──> [11. Approve Badge CTA]
                                                                  │
[14. Reason Code Radio] <── [13. Freeze Account CTA] <── [12. Reject Document CTA]
```

### 5.2 WAI-ARIA Semantic Role Matrix

| Tab Index | DOM Target Element | Accessible Name / Label | ARIA Role & Attributes | Keyboard Action |
|---|---|---|---|---|
| `1` | Admin Brand Crest Link | "AbangCebu AI Admin Console Home" | `role="link"`, `aria-label="Admin Home"` | `Enter` routes to `/admin` |
| `2` | Admin Profile Card | "Hermar Centillas, System Admin, Online" | `role="region"`, `aria-label="Admin Profile Dossier"` | Visual anchor / Tab next |
| `3` | KYC Queue Nav Link | "KYC Verification Queue, 14 pending" | `role="link"`, `aria-current="page"` | `Enter` activates KYC queue |
| `4` | Scam Moderation Nav Link| "Scam Moderation Feed, 5 urgent alerts" | `role="link"`, `aria-label="Scam Moderation Feed"` | `Enter` routes to `/admin/moderation` |
| `5` | Audit Logs Nav Link | "Immutable Audit Logs" | `role="link"`, `aria-label="Audit Logs"` | `Enter` routes to `/admin/audit` |
| `6` | Sign Out Button | "Sign Out Administrator" | `role="button"`, `aria-label="Sign Out Admin"` | `Enter` opens logout dialog |
| `7` | Global Search Field | "Search landlords, IDs, or report tokens" | `type="search"`, `aria-label="Search Console"` | Standard typing / `⌘K` |
| `8` | Metric Card (KYC) | "Pending KYC Queue, 14 landlords, 3 near SLA" | `role="region"`, `aria-label="Pending KYC metric"` | Screen reader announcement |
| `9` | KYC Queue Triage Row | "Rodrigo Tan, PhilSys National ID, Sambag I" | `role="row"`, `aria-selected="true"` | `Enter` selects and inspects row |
| `10` | Inspect Document CTA | "Inspect document for Rodrigo Tan" | `role="button"`, `aria-label="Inspect Document"` | `Enter` opens inspection drawer |
| `11` | Approve Badge CTA | "Approve and issue verified landlord badge" | `role="button"`, `aria-label="Approve Landlord"` | `Enter` confirms verification |
| `12` | Reject Document CTA | "Reject document and open reason selector" | `role="button"`, `aria-label="Reject Document"` | `Enter` opens rejection modal |
| `13` | Emergency Freeze CTA | "Suspend listing and freeze landlord account" | `role="button"`, `aria-label="Emergency Freeze"` | `Enter` executes account freeze |
| `14` | Rejection Reason Radio | "Blurred or low-resolution image" | `role="radio"`, `aria-checked="true"` | `ArrowDown`/`ArrowUp` cycles codes |

### 5.3 Accessibility Quality Gates & Contrast Ratios

1. **44 × 44px Minimum Touch Hitboxes**: All interactive mobile buttons, swiper triggers, rejection radios, and drawer controls enforce a minimum touch target bounding box of `44 × 44px`.
2. **Contrast Ratio Compliance**:
   - Primary Emerald CTA (`#047857` on `#FFFFFF` text): **5.1:1** (Exceeds WCAG AA 4.5:1 minimum).
   - Sidebar Dark Background (`#0F172A` with `#FFFFFF` text): **16.1:1** (Exceeds AAA standard).
   - Sidebar Muted Links (`#CBD5E1` on `#0F172A`): **10.2:1** (Compliant).
   - Emergency Freeze Crimson CTA (`#E11D48` on `#FFFFFF` text): **4.6:1** (Compliant).
   - SLA Warning Notice (`#B45309` text on `#FEF3C7` background): **5.8:1** (Compliant).
3. **Screen Reader Live Regions**:
   - Real-time queue count updates utilize `aria-live="polite"`.
   - Emergency account lockout confirmations announce: *"Landlord Karlo Dizon suspended and listing frozen."* via `role="alert"` and `aria-live="assertive"`.
   - Document inspection zoom level changes announce: *"Zoom level 150%"* via polite live regions.

---

## 6. Next.js 16 Component Breakdown & Route Architecture

In adherence to the **Squad Architecture Plan** and **Sprint 1 Boundaries**, the admin console system architecture is partitioned across Server and Client boundaries:

```
src/
└── app/
    └── (admin)/
        ├── layout.tsx                [Server Component Shell]
        │   ├── Session Authenticator & Admin Role Guard (profiles.role === 'admin')
        │   ├── AdminSidebarNav       [Client Boundary: active route & live queue counters]
        │   │   ├── AdminProfilePill
        │   │   ├── NavItemLinks
        │   │   └── SystemHealthIndicator
        │   ├── AdminHeader           [Client Boundary: global search & live sync heartbeat]
        │   │   ├── SearchInput
        │   │   └── AlertNotificationBell
        │   └── AdminBottomTabBar     [Client Boundary: mobile persistent navigation]
        │
        ├── dashboard/
        │   └── page.tsx              [Server Component: Operations Command]
        │       ├── AdminMetricsGrid  [Server Component: cached KPI counts]
        │       ├── KycTriageTable    [Client Component: queue table & row selection]
        │       ├── InspectionDrawer  [Client Component: ID viewer, zoom HUD, registry audit]
        │       ├── ScamModerationFeed[Client Component: reported listings & freeze action]
        │       └── RejectionModal    [Client Component: structured reason codes & guidance]
        │
        ├── moderation/
        │   └── page.tsx              [Server Component: Deep Scam Moderation]
        │
        └── audit/
            └── page.tsx              [Server Component: Immutable Audit Ledger]
```

### 6.1 Architectural Component Contracts

| Component Identifier | Boundary | File Path Target (Sprint 2) | Architectural Contract & Responsibilities |
|---|---|---|---|
| `AdminLayout` | **Server** | `src/app/(admin)/layout.tsx` | Enforces Supabase server auth and admin role gate (`profiles.role === 'admin'`). Rejects non-admin users with 403 Forbidden. |
| `AdminSidebarNav` | **Client** | `src/components/admin/admin-sidebar-nav.tsx` | Fixed 260px sidebar navigation. Subscribes to real-time KYC and moderation counters, manages active routes and collapse states. |
| `AdminHeader` | **Client** | `src/components/admin/admin-header.tsx` | Sticky operations header with global search debounce (`⌘K`), live sync heartbeat indicator, and quick alert notifications. |
| `MetricCard` | **Server** | `src/components/admin/metric-card.tsx` | Reusable operational metric presentation container with label, value, trend badge, and semantic SVG icon bubble. |
| `KycTriageTable` | **Client** | `src/components/admin/kyc-triage-table.tsx` | 730px review table. Manages sorting, SLA countdown filters, row selection, and emits selected landlord to `InspectionDrawer`. |
| `InspectionDrawer` | **Client** | `src/components/admin/inspection-drawer.tsx` | Side-by-side deep inspection drawer. Renders high-res ID viewer with zoom/rotate, OCR overlay boxes, and decision buttons. |
| `ScamModerationFeed`| **Client**| `src/components/admin/scam-moderation-feed.tsx`| Real-time reported listings feed. Executes 1-click emergency account lockout (`profiles.is_suspended = true`). |
| `RejectionModal` | **Client** | `src/components/admin/rejection-modal.tsx` | Standardized rejection reason capture modal with structured reason codes, guidance input (16px rule), and submit handler. |
| `AdminBottomTabBar`| **Client**| `src/components/admin/admin-bottom-tab-bar.tsx`| Mobile persistent 4-tab bar (Overview, KYC, Scam, Audit). Renders safe-area margins and unread notification pips. |

> [!IMPORTANT]
> **Sprint 1 Boundary Enforcement:** In strict accordance with Sprint 1 governance, no premature React/JSX UI components are to be created in `src/components/`. The component contracts and layout boundaries established here constitute the authoritative blueprint for Sprint 2 implementation.

---

## 7. Design Tokens & Styling Integration

All admin dashboard components, colors, and elevations map directly to the Tailwind CSS v4 design tokens configured in `src/app/globals.css`:

```css
/* Color Palette Integration (src/app/globals.css) */
--color-action: #047857;          /* Primary Actions / Approvals: Cebu Emerald 700 */
--color-action-hover: #065f46;    /* Primary Action Hover: Cebu Emerald 800 */
--color-primary: #0f172a;         /* Deep Administrative Slate (Sidebar & High-Contrast Headers) */
--color-background: #f8fafc;      /* Base Page Surface: Clean Slate Neutral */
--color-card: #ffffff;            /* Elevated Card Surfaces: Pure White */
--color-border: #cbd5e1;          /* Card & Table Borders */
--color-ring: #047857;            /* Active Focus Rings: Cebu Emerald */
--color-warning: #b45309;         /* SLA Notice & Medium Risk: Golden Amber */
--color-destructive: #e11d48;     /* Danger / Scam Lockout: Sinulog Crimson */

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

- [x] **Jira Traceability**: Document explicitly linked to Jira ticket [SCRUM-74](https://abangcebuai.atlassian.net/browse/SCRUM-74).
- [x] **Balsamiq/Figma Blueprint Conventions**: Grayscale monochrome foundation, clean strokes, crossed `[X]` image placeholders, and authentic hardware device frames.
- [x] **Desktop Viewport Specification (1440 × 900 · 16:10)**: Authentic MacBook Air chassis, 260px fixed dark sidebar navigation, admin profile dossier with health indicator, 4-metric executive bar, KYC review triage table, side-by-side inspection drawer, and scam moderation feed.
- [x] **Mobile Viewport Specification (393 × 852 · 100dvh)**: Authentic iPhone 16 Pro chassis, Dynamic Island, safe-area header with Admin console badge and alert counter, 2x2 metric grid, 4-tab persistent bottom bar, and iOS Safari floating address bar.
- [x] **Anti-Scam Trust Architecture**: Comprehensive mapping of KYC verification gateway, immediate account lockout (`profiles.is_suspended = true`), PostGIS corridor validation, and immutable audit logs.
- [x] **Side-by-Side Document Inspection Drawer**: High-res Philippine ID image preview (Front/Back) with zoom/rotate, OCR overlay boxes, automated registry checks (PSA, PostGIS, VECO, liveness), and approve/reject triggers.
- [x] **Interactive Widget States & Edge Cases**: Detailed mapping for active queue triage with SLA countdown, deep inspection modal, standardized rejection reason modal, zero pending queue state, and batch moderation.
- [x] **Accessibility (WCAG 2.2 AA)**: Strict 44 × 44px touch targets, contrast ratios >= 4.5:1, 16px mobile input font rule, full sequential keyboard tab order flow, and ARIA attributes.
- [x] **Component Hierarchy & Server/Client Boundaries**: Explicit mapping for Next.js 16 route layout, `AdminSidebarNav`, `MetricCard`, `KycTriageTable`, `InspectionDrawer`, `ScamModerationFeed`, `RejectionModal`, and `AdminBottomTabBar`.
- [x] **Sprint 1 Iron Rule**: Zero premature React/JSX UI components created in `src/components/`.
- [x] **Vector & Rendered Assets**: High-resolution vector SVGs, PNG blueprints, and formal WeasyPrint PDF compiled and stored in repository.

### 8.2 Architectural Sign-Off

| Role | Name | Signature / Status | Date |
|---|---|---|---|
| **Author (UI/UX Designer)** | **Neah Moneva** | `Approved & Signed Off` | September 30, 2026 |
| **Reviewer & Scrum Master** | **Hermar Centillas** | `Approved & Audited` | September 30, 2026 |
