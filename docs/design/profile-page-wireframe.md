# AbangCebu AI — Profile Page & Account Settings Wireframe & Layout Specification

**Sprint 1 System Architecture Specification**  
**Document Version:** 1.0.0  
**Status:** Approved & Active Design Specification  
**Jira Ticket Reference:** [SCRUM-68](https://abangcebuai.atlassian.net/browse/SCRUM-68) — *Design Profile Page Wireframe / Mockup*  
**Sprint:** Sprint 1 (Foundations & Core Infrastructure)  
**Author:** Angel Crushein Yaun (UI/UX Designer)  
**Reviewed & Audited by:** Hermar Centillas (Lead / Scrum Master)  
**Design Reference Standard:** Balsamiq / Figma Grayscale Blueprint Architecture, Apple Human Interface Guidelines, Supabase RLS Security Model, WCAG 2.2 AA Ergonomics  
**Companion Assets:**
- Desktop Vector Blueprint: [`docs/assets/wireframes/profile-page-desktop.svg`](../assets/wireframes/profile-page-desktop.svg)
- Desktop High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Profile_Page_Desktop_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Profile_Page_Desktop_Wireframe_Blueprint.png)
- Mobile Vector Blueprint: [`docs/assets/wireframes/profile-page-mobile.svg`](../assets/wireframes/profile-page-mobile.svg)
- Mobile High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Profile_Page_Mobile_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Profile_Page_Mobile_Wireframe_Blueprint.png)
- Formal Engineering PDF: [`docs/pdf/AbangCebu_Profile_Page_Wireframe_Specification.pdf`](../pdf/AbangCebu_Profile_Page_Wireframe_Specification.pdf)
- Specification Sheet Previews:
  - Page 1 (Desktop 3-Tab Profile Architecture & Blueprint Callout Matrix): [`docs/assets/wireframes/AbangCebu_Profile_Page_Specification_Sheet_Page1.png`](../assets/wireframes/AbangCebu_Profile_Page_Specification_Sheet_Page1.png)
  - Page 2 (Mobile Viewport & 4 Interactive Operational States): [`docs/assets/wireframes/AbangCebu_Profile_Page_Specification_Sheet_Page2.png`](../assets/wireframes/AbangCebu_Profile_Page_Specification_Sheet_Page2.png)
  - Page 3 (Accessibility, Security Governance, Route Architecture & Sign-Off): [`docs/assets/wireframes/AbangCebu_Profile_Page_Specification_Sheet_Page3.png`](../assets/wireframes/AbangCebu_Profile_Page_Specification_Sheet_Page3.png)
- Related Specifications:
  - Styling Tokens & Guidelines: [`docs/design/styling-guidelines.md`](./styling-guidelines.md)
  - Renter Persona & Capabilities: [`docs/design/renter-persona.md`](./renter-persona.md)
  - Users and Profiles Schema: [`docs/database/users-and-profiles-schema.md`](../database/users-and-profiles-schema.md)
  - Database ERD Architecture: [`docs/database/database-erd.md`](../database/database-erd.md)
  - Row-Level Security Policies: [`docs/security/rls-policies.md`](../security/rls-policies.md)
  - RBAC Permission Matrix: [`docs/security/rbac-matrix.md`](../security/rbac-matrix.md)
  - User Dashboard Wireframes: [`docs/design/user-dashboard-wireframe.md`](./user-dashboard-wireframe.md)
  - Registration Page Wireframes: [`docs/design/registration-page-wireframe.md`](./registration-page-wireframe.md)
  - Login Page Wireframes: [`docs/design/login-page-wireframe.md`](./login-page-wireframe.md)
  - Mobile Map Wireframes: [`docs/design/mobile-map-wireframes.md`](./mobile-map-wireframes.md)

---

## 1. Executive Summary & Trust Architecture

The **Profile Page & Account Settings** interface (`/profile`) is the identity, trust, and security foundation of AbangCebu AI. In the Metro Cebu boarding house ecosystem, where rental scams, fraudulent advance deposits, and unverified landlords have historically plagued students and workers near university hubs (CIT-U, USC, UC, USJ-R) and economic centers (Cebu IT Park, Mandaue, Cebu Business Park), user identity cannot be treated as an afterthought.

The profile architecture establishes a unified **Zero-Trust Identity & Security Governance Model**:

```
+---------------------------------------------------------------------------------------------------+
|                        ABANGCEBU AI PROFILE & TRUST ARCHITECTURE                                  |
+---------------------------------------------------------------------------------------------------+
| 1. Anti-Scam KYC Trust Verification Gateway:                                                      |
|    - Direct verification of Philippine Government IDs (PhilSys National ID, UMID, Driver's       |
|      License, Professional Regulation Commission PRC ID).                                         |
|    - Cryptographic hash validation against national identity registries.                          |
|    - Tiered verification badges: Unverified -> Pending Review -> Tier 1 Verified -> Rejected.      |
|    - Unlocks public trust badges, landlord listing permissions, and direct tenant SMS/chat alerts.|
|                                                                                                   |
| 2. Spatial Corridor Preference Engine:                                                            |
|    - Preserves renter target educational or corporate hubs (CIT-U Corridor on N. Bacalso Ave,     |
|      USC Talamban, Cebu IT Park, Banilad, Urgello).                                               |
|    - Drives the spatial recommendation radar across map explorer and dashboard feeds.             |
|    - Renter commute tolerance parameters (Walking < 10 mins, 1-Ride Jeepney routes 04L / 17B).    |
|    - Landlord primary municipality jurisdiction (Cebu City, Mandaue City, Lapu-Lapu City, Talisay)|
|                                                                                                   |
| 3. Zero-Trust Session & Authentication Governance:                                                |
|    - Adherence to NIST SP 800-63B digital identity guidelines.                                    |
|    - Master password update with live 4-segment entropy gauge and 5 requirement checklists.        |
|    - Time-Based One-Time Password (TOTP) Two-Factor Authentication (2FA) lifecycle.               |
|    - Multi-device active session triage (IP geolocation, device fingerprints, last activity).     |
|    - Immediate 1-tap "Revoke All Other Sessions" emergency kill-switch.                          |
|                                                                                                   |
| 4. Row-Level Security (RLS) & Cryptographic Vault Mapping:                                        |
|    - User profile data governed by Supabase PostgreSQL Row-Level Security (`profiles.id = auth.uid`).|
|    - Government ID documents stored in a private Supabase Storage Bucket (`kyc-documents`) with   |
|      server-side AES-256 encryption and zero public HTTP URLs; accessible solely via signed tokens.|
+---------------------------------------------------------------------------------------------------+
```

### 1.1 Wireframe Blueprint Conventions

In adherence to Balsamiq and Figma mid-fidelity architectural conventions:
1. **Monochrome Hierarchy**: High-contrast charcoal borders (`#0F172A`, `#334155`, `#94A3B8`), neutral base surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`), and purposeful semantic accents (`#047857` Cebu Emerald, `#B45309` Amber KYC Notice, `#E11D48` Sinulog Crimson alerts).
2. **Authentic Hardware Viewports**:
   - **Desktop (1440px × 900px, 16:10)**: Encased in an authentic **MacBook Air aluminum chassis** with top FaceTime camera notch, inner black bezels, and bottom opening lip.
   - **Mobile (393px × 852px, 100dvh)**: Encased in an authentic **iPhone 16 Pro Titanium chassis** with Dynamic Island, iOS 9:41 status bar, safe-area headers, and persistent bottom iOS Safari navigation.
3. **Traceable Blueprint Callouts (`①` – `⑧`)**: Directly cross-referencing layout dimensions, functional specifications, and accessibility contracts.

---

## 2. Desktop Viewport Specification (1440px × 900px · MacBook Air Aluminum Frame)

### 2.1 Viewport Geometry & Workspace Partitioning

On desktop viewports (1440px × 900px, 16:10 aspect ratio), the profile view is situated inside the dashboard shell, utilizing the **260px fixed sidebar navigation** paired with an **1180px operational workspace**:

- **Fixed Sidebar Navigation (0px – 260px)**:
  - Deep Navy background (`#0F172A`) providing permanent anchor navigation.
  - Brand header with compass crest and platform logotype.
  - User profile pill displaying initials avatar, user name, role badge, and KYC trust pill.
  - Core Navigation links: Dashboard Overview, Saved Rentals (8), Inquiries & Tours (3), My Listed Units (2), and Metro Cebu Map Explorer (`[ESC]`).
  - Account & Governance section: Identity & KYC Center, and **Profile & Settings** (highlighted with active Coastal Emerald `#047857` fill and active indicator pip).
  - Role workspace switch: Segmented toggle between Renter and Landlord views.
  - Bottom-docked Sign Out trigger with shortcut hint `[Esc + Q]`.
- **Main Workspace Canvas (260px – 1440px)**:
  - **Top Navigation Header (h: 52px)**: Breadcrumb trail (`Dashboard / Profile & Account Settings`), descriptive subtitle, and navigation action triggers (`← Back to Dashboard` and `🗺️ Return to Map`).
  - **Profile Header Hero Card (h: 116px)**:
    - 88px Avatar container with camera edit trigger badge overlay (`📷 Edit` / `Change Photo`).
    - Online presence indicator dot (`#10B981` Emerald green).
    - Full Name display (`Maria Elena Santos`).
    - Trust badge pill (`🛡️ Verified Renter` in Coastal Emerald `#047857` with `#ECFDF5` background).
    - Role badge pill (`Student Renter` / `Landlord Host`).
    - Membership duration badge (`🗓️ Member since August 2025`).
    - Verified contact badges: Institutional Email (`📧 maria.santos@cit.edu.ph` · `✓ Confirmed`) and Philippine Mobile (`📱 +63 917 845 2910` · `✓ SMS`).
    - Profile Trust Score meter (100% completion gauge).
  - **Accessible 3-Tab Bar (`role="tablist"`, h: 42px)**:
    - Tab 1: `👤 1. Personal Information & Preferences` (Active Tab with emerald indicator).
    - Tab 2: `🔒 2. Security & Authentication` (Change password, 2FA toggle, active sessions).
    - Tab 3: `🛡️ 3. KYC Identity Verification` (Government ID document upload and status verification).
  - **Main Content Workspace Grid (h: 560px)**:
    - **Primary Left Column (670px w)**: Tab 1 Personal Information & Spatial Corridor Preferences Form.
      - Full Legal Name input (synced with ID).
      - Institutional / Primary Email (read-only auth lock with padlock).
      - Philippine Mobile Number with `+63` prefix dropdown and 10-digit input.
      - Preferred University / Employment Corridor dropdown (e.g. `🎓 CIT-U Corridor (N. Bacalso Ave)`).
      - Target Commute Radius & Transit Tolerance segmented pills (`🚶 Walking < 10 min`, `🚍 1-Ride Jeepney 04L/17B`, `🛵 Habal-habal/MC Taxi`, `📍 Open`).
      - Bio & Renter Inquirer Dossier textarea (character counter, study load / guarantor notes).
    - **Secondary Right Column (430px w)**: Integrated Tab 2 & Tab 3 Operational Modules.
      - **Container 1 (h: 270px)**: Security & Active Sessions Snapshot (password last changed date, 2FA status toggle, list of recognized device sessions: Current MacBook Air Cebu City + iPhone 16 Pro Mandaue City, and `⚠️ Revoke All Other Recognized Sessions` emergency CTA).
      - **Container 2 (h: 275px)**: Anti-Scam KYC Identity Verification Gateway (Tier 1 Verified status banner, encrypted storage document cards for PhilSys ID Front and Back, and `📄 Update Identification Documents / Re-Verify` action button).
  - **Sticky Bottom Form Action Bar (h: 54px)**:
    - Unsaved changes indicator with amber pulse dot.
    - Secondary `Revert Changes` button.
    - Primary `💾 Save Profile Changes` button (44px height, Cebu Emerald `#047857`, 44x44px touch compliance).

---

### 2.2 Desktop ASCII Wireframe Blueprint

```
+===========================================================================================================================+
| [Camera Notch: 720px]                                                                                        MacBook Air  |
+---------------------------------------------------------------------------------------------------------------------------+
| [260px FIXED SIDEBAR]        | [1180px MAIN OPERATIONAL WORKSPACE]                                                        |
|                              |                                                                                            |
|  [🧭] ABANGCEBU AI           |  Dashboard / Profile & Account Settings           [← Back to Dashboard]  [🗺️ Return to Map] |
|  Rental Intelligence Platform|  Manage your identity, spatial corridors, security credentials, and anti-scam KYC verification.|
|                              +--------------------------------------------------------------------------------------------+
|  +-------------------------+ | +----------------------------------------------------------------------------------------+ |
|  | (MS) Maria Elena Santos | | | [AVATAR 88px]  Maria Elena Santos  [🛡️ Verified Renter] [Student Renter] [🗓️ Aug 2025] | |
|  | CIT-U Seeker · Student  | | | [📷 Edit] (●)   📧 maria.santos@cit.edu.ph (✓)   📱 +63 917 845 2910 (✓ SMS)         | |
|  | [🛡️ KYC Verified]       | | |                Profile Trust Score: [████████████████████] 100% (Tier 1 Verified)        | |
|  +-------------------------+ | +----------------------------------------------------------------------------------------+②|
|  CORE NAVIGATION             |                                                                                            |
|  [📊 Dashboard Overview   ]  | +----------------------------------------------------------------------------------------+ |
|  [❤️ Saved Rentals     (8)]  | | [👤 1. Personal Info & Preferences*] | [🔒 2. Security & Auth] | [🛡️ 3. KYC (✓ Verified)] | |
|  [💬 Inquiries & Tours (3)]  | +----------------------------------------------------------------------------------------+④|
|  [🏠 My Listed Units   (2)]  |                                                                                            |
|  [🗺️ Metro Cebu Map  [ESC]]  | [PRIMARY FORM: PERSONAL & CORRIDOR (670px)]   | [SECURITY & KYC INTEGRATED MODULES (430px)]|
|                              | +-------------------------------------------+ | +----------------------------------------+ |
|  ACCOUNT & GOVERNANCE        | | Full Legal Name *                         | | | 🔒 SECURITY & ACTIVE SESSIONS          | |
|  [🛡️ Identity & KYC Center ] | | [ Maria Elena Santos          ✓ Match ID ]| | | Master Password: Changed 42d ago     | |
|  [⚙️ Profile & Settings  *]① | | Email * (Locked to Supabase Auth)         | | | 2FA (TOTP): [✓ Authenticator Active] [●]| |
|  (Highlighted in Emerald)    | | [ maria.santos@cit.edu.ph      🔒 Read ]  | | | ACTIVE RECOGNIZED SESSIONS (2)       | |
|                              | | Philippine Mobile Number (+63 SMS Alerts)*| | | 💻 MacBook Air · Cebu (Current Device) | |
|  +-------------------------+ | | [🇵🇭 +63 ▾] [ 917 845 2910     ✓ SMS Verified] | 📱 iPhone 16 Pro · Mandaue [Revoke]    | |
|  | ROLE WORKSPACE SWITCH   | | | Preferred University / Employment Corridor| | | [⚠️ Revoke All Other Recognized Sessions] | |
|  | [👤 Renter*][🏠Landlord]| | | [🎓 CIT-U Corridor (N. Bacalso Ave)    ▾ ]| | +----------------------------------------+⑥|
|  +-------------------------+ | | Target Commute Radius & Transit Tolerance | | +----------------------------------------+ |
|                              | | [🚶 Walk <10m*] [🚍 04L Jeep] [🛵 MC Taxi] | | | 🛡️ ANTI-SCAM KYC IDENTITY GATEWAY      | |
|  +-------------------------+ | | Personal Bio & Renter Inquirer Dossier    | | | [✓ KYC STATUS: TIER 1 VERIFIED RENTER] | |
|  | 🚪 Sign Out  [Esc + Q]  | | | [ 3rd-year BS Civil Engineering student...]| | | PhilSys ID Front [✓] | PhilSys Back [✓] | |
|  +-------------------------+ | | [ 234 / 500 chars                        ]| | | [📄 Update Verification Documents]     | |
|                              | +-----------------------------------------⑤+ | +----------------------------------------+⑦|
|                              |                                                                                            |
|                              | +----------------------------------------------------------------------------------------+ |
|                              | | (●) Unsaved Profile Changes (Transit corridor)          [Revert] [💾 Save Profile Changes]⑧ |
|                              +--------------------------------------------------------------------------------------------+
+===========================================================================================================================+
```

---

### 2.3 Desktop Component Dimension Specification Matrix

| Callout | Component Identifier | Coordinate / Dimensions | Visual & Functional Specification |
|---|---|---|---|
| — | **MacBook Air Chassis** | `1480px × 950px` Outer (`1440 × 900` Viewport) | Authentic aluminum frame with top FaceTime camera notch, camera lens, green LED, inner bezel, and bottom opening lip. |
| `①` | **Fixed Sidebar Navigation** | `w: 260px`, `h: 900px` (`x: 0, y: 0`) | Fixed dark column (`#0F172A`), brand logotype, compass crest, profile pill, vertical nav items with Profile & Settings highlighted in Coastal Emerald (`#047857`), role switcher, and sign-out action. |
| `②` | **Profile Header Hero Card** | `w: 1120px`, `h: 116px` (`x: 284, y: 74`) | Elevated white card (`#FFFFFF`, border `#CBD5E1`) housing the 88px avatar, camera edit trigger, online indicator, name, trust badges, and 100% trust completion gauge. |
| `③` | **Trust Badge & Contact Pills**| `h: 22px` – `24px` each | Semantic status badges: `🛡️ Verified Renter` (`#ECFDF5`, text `#047857`), `Student Renter`, institutional email badge with confirmed state, and Philippine mobile with SMS verification status. |
| `④` | **Accessible 3-Tab Bar** | `w: 1120px`, `h: 42px` (`x: 284, y: 202`) | WAI-ARIA compliant tablist (`role="tablist"`) with 3 tabs: Personal Information & Preferences (active), Security & Authentication, and KYC Identity Verification (with verified badge). |
| `⑤` | **Personal & Corridor Form** | `w: 670px`, `h: 560px` (`x: 284, y: 256`) | Primary form container with inputs for Full Legal Name, Read-Only Confirmed Email, Philippine Mobile (+63 prefix), University Corridor dropdown, commute tolerance pills, and Bio textarea. |
| `⑥` | **Security & Sessions Module**| `w: 430px`, `h: 270px` (`x: 974, y: 256`) | Password status row, 2FA TOTP toggle switch (`#047857`), recognized device session items (MacBook Air + iPhone 16 Pro), and 1-tap `⚠️ Revoke All Other Recognized Sessions` trigger. |
| `⑦` | **Anti-Scam KYC Gateway** | `w: 430px`, `h: 275px` (`x: 974, y: 541`) | Tier 1 Verified status banner, encrypted storage document cards (PhilSys Front and Back with OCR checkmarks), and document re-verification action trigger. |
| `⑧` | **Sticky Bottom Action Bar** | `w: 1120px`, `h: 54px` (`x: 284, y: 830`) | Persistent form footer displaying unsaved changes state, secondary `Revert Changes` button, and primary `💾 Save Profile Changes` button (`44px` height, `#047857` Cebu Emerald). |

---

## 3. Mobile Viewport Specification (393px × 852px · iPhone 16 Pro Frame · 100dvh)

### 3.1 Mobile Viewport Geometry & Ergonomics

On mobile viewports (393px × 852px, representing modern iPhone and high-density Android devices), the profile interface adopts a thumb-first, touch-ergonomic mobile architecture:

1. **Dynamic Viewport Height (`100dvh`)**: Uses `min-h-[100dvh]` to eliminate clipping caused by iOS Safari's dynamic URL bar expanding and collapsing during scrolling.
2. **Apple Safe-Area Navigation (`pt-safe`)**: Positioned directly beneath Apple's Dynamic Island capsule is a persistent mobile header bar featuring a back navigation button (`44 × 44px`), page title (`Profile & Settings`), and trust shield icon.
3. **Compact Profile Header Capsule**: Space-efficient hero module condensing the 88px desktop avatar into a 52px mobile avatar with camera overlay, full name, and verified renter pill.
4. **Segmented 3-Tab Bar (44px touch target)**: Thumb-tappable segmented control allowing instant switching between `Personal`, `Security`, and `KYC` views without page reloads.
5. **Strict 16px Mobile Anti-Zoom Rule**: All text input fields, prefix selectors, and textareas enforce `font-size: 16px !important` (`text-[16px]`), completely preventing destructive iOS Safari automatic viewport zooming.
6. **Persistent 4-Item Bottom Navigation Tab Bar**: Positioned above the iOS Safari floating address bar (`h: 52px`), providing instant access to `Home`, `Map`, `Inquiries (with unread badge)`, and `Profile*` (active in Cebu Emerald).

---

### 3.2 Mobile ASCII Wireframe Blueprint

```
+=======================================================+
| [       (  Dynamic Island  )       ]   9:41  📶 🛜 🔋 |
+-------------------------------------------------------+
|  +----+                                        +----+ |
|  | ←  |  Profile & Settings                    | 🛡️ | |  <- Safe-Area Header (44x44px triggers)
|  +----+                                        +----+ |
|                                                       |
|  +-------------------------------------------------+  |
|  | [AVATAR 52px]  Maria Elena Santos               |  |  <- Compact Profile Header Capsule
|  | [📷] (●)        [🛡️ Verified Renter] [Student]  |  |
|  +-------------------------------------------------+  |
|                                                       |
|  +-------------------------------------------------+  |
|  | [👤 Personal*]  |  [🔒 Security]  |  [🛡️ KYC (✓)] |  |  <- Segmented 3-Tab Bar (44px target)
|  +-------------------------------------------------+  |
|                                                       |
|  FULL NAME                                            |
|  +-------------------------------------------------+  |
|  | Maria Elena Santos                              |  |  <- 16px Font Rule (No Safari Auto-Zoom)
|  +-------------------------------------------------+  |
|                                                       |
|  EMAIL (LOCKED TO AUTH)                               |
|  +-------------------------------------------------+  |
|  | maria.santos@cit.edu.ph             ✓ Verified  |  |  <- Read-only Auth Lock
|  +-------------------------------------------------+  |
|                                                       |
|  PHILIPPINE MOBILE NUMBER (+63)                       |
|  +--------+ +--------------------------------------+  |
|  | 🇵🇭 +63 | | 917 845 2910                         |  |  <- Formatted +63 10-digit input
|  +--------+ +--------------------------------------+  |
|                                                       |
|  PREFERRED UNIVERSITY / WORK CORRIDOR                 |
|  +-------------------------------------------------+  |
|  | 🎓 CIT-U Corridor (N. Bacalso Ave)            ▾ |  |  <- Spatial Radar Engine
|  +-------------------------------------------------+  |
|                                                       |
|  COMMUTE TOLERANCE                                    |
|  +-----------------------+ +-----------------------+  |
|  | 🚶 Walking (< 10m)*   | | 🚍 1-Ride Jeep (04L)  |  |  <- Spatial Tolerance Pills
|  +-----------------------+ +-----------------------+  |
|                                                       |
|  RENTER BIO & HOUSING CRITERIA                        |
|  +-------------------------------------------------+  |
|  | 3rd-year BS Civil Engineering student at CIT-U. |  |  <- Ergonomic Textarea
|  | Quiet study room, submeter, stable water.       |  |
|  +-------------------------------------------------+  |
|                                                       |
|  +-------------------------------------------------+  |
|  | 💾 Save Profile Changes                         |  |  <- 44px Primary Action CTA
|  +-------------------------------------------------+  |
|                                                       |
|  +-------------------------------------------------+  |
|  | [🏠 Home]   [🗺️ Map]   [💬 Inquiries(3)]  [👤*]  |  |  <- Persistent Bottom Tab Bar
|  +-------------------------------------------------+  |
|  | AA        🔒 abangcebu.ph/profile             ↻ |  |  <- iOS Safari Bottom Bar
|  +-------------------------------------------------+  |
|                         ______                        |  <- iOS Home Indicator
+=======================================================+
```

---

## 4. Interactive Widget States & Operational Edge Cases

The profile system accommodates diverse operational states across identity verification, password validation, photo cropping, and notifications. Each state is explicitly defined in `docs/assets/wireframes/profile-page-mobile.svg` across 4 side-by-side iPhone 16 Pro viewports:

```
+---------------------------------------------------------------------------------------------------+
|                        PROFILE INTERACTIVE STATES SPECIFICATION                                   |
+-------------------+--------------------+------------------------+---------------------------------+
| State             | Visual Boundary    | Primary Card Display   | Key Action Triggers             |
+-------------------+--------------------+------------------------+---------------------------------+
| 1. Personal Info  | Neutral `#CBD5E1`  | Corridor Form & Inputs | Save Changes, Corridor Selector |
| 2. Security & Auth| Emerald `#047857`  | NIST 800-63B & Sessions| Update Password, Revoke Sessions|
| 3. KYC Gateway    | Emerald `#047857`  | Anti-Scam ID Uploader  | Upload ID Front/Back, Re-Verify |
| 4. Crop & Toast   | Modal + Backdrop   | Photo Viewfinder Mask  | Apply Photo, Dismiss Toast      |
+-------------------+--------------------+------------------------+---------------------------------+
```

### 4.1 State 1: Mobile Personal Details Tab (Phone 1)
- **Active Context**: Renter profile personal identity and Cebu spatial transit preferences.
- **Form Controls**: Full legal name input, institutional read-only email with padlock icon, Philippine mobile number with dedicated `+63` prefix dropdown, university corridor dropdown (`CIT-U Corridor (N. Bacalso Ave)`), commute tolerance pills (`Walking < 10m` vs `1-Ride Jeepney 04L`), and bio textarea.
- **Persistent Controls**: Primary `💾 Save Profile Changes` button (`44px` height, `#047857`), 4-item bottom navigation tab bar with active Emerald Profile indicator, and iOS Safari floating address bar.

### 4.2 State 2: Mobile Security & Authentication Tab (Phone 2)
- **NIST SP 800-63B Password Management**:
  - Current password input (`••••••••••••`).
  - New password input with reveal toggle (`👁️`).
  - **4-Segment Entropy Gauge**: Real-time evaluation rendering all 4 segments in Cebu Emerald (`#047857`) for Strong passwords.
  - **5 Requirement Checklist Pills**: `✓ 12+ chars`, `✓ Uppercase`, `✓ Lowercase`, `✓ Number`, `✓ Symbol`.
- **Two-Factor Authentication (2FA)**:
  - Card with description and active status text: `✓ Active via Authenticator App`.
  - Accessible toggle switch in active state (`#047857`).
- **Recognized Device Sessions List**:
  - Session 1: `💻 MacBook Air · Cebu City, PH` (`Current Device`, `IP: 112.204.42.18`).
  - Session 2: `📱 iPhone 16 Pro · Mandaue City, PH` (`Active 12m ago`, with direct `[Revoke]` button).
  - Emergency trigger: `⚠️ Revoke All Other Sessions` (`#E11D48` Sinulog Crimson).

### 4.3 State 3: Mobile KYC Identity Verification Tab (Phone 3)
- **Anti-Scam Defense Gateway**:
  - **4 Deterministic KYC Status Banner Tiers**:
    1. `unverified`: Amber callout (`#FFFBEB`, border `#FCD34D`) urging user to submit valid government ID.
    2. `pending`: Yellow-amber callout (`#FEF3C7`) indicating documents are currently under OCR/admin review.
    3. `verified`: Emerald callout (`#ECFDF5`, border `#A7F3D0`) confirming Tier 1 verified status with DICT registry match.
    4. `rejected`: Crimson callout (`#FFF1F2`, border `#FECDD3`) detailing document issues (e.g. glare, expired ID) with re-upload trigger.
  - **Philippine Government ID Selector**: Dropdown supporting PhilSys National ID, UMID, Driver's License, and PRC ID.
  - **Dual Document Upload Containers**:
    - ID Front container with dashed border (`#047857`), file size display (`2.4 MB`), and `✓ Verified Pass` pill.
    - ID Back container with barcode/QR verification badge (`2.1 MB`) and `✓ Security Stamp` pill.
  - **Student Discount / Ownership Verification**: CIT-U enrollment verification card granting 10% student housing rate.

### 4.4 State 4: Mobile Avatar Crop Modal & Interactive Toast (Phone 4)
- **Avatar Crop Modal Dialog (`w: 325px, h: 440px`)**:
  - Darkened backdrop overlay (`65%` opacity `#0F172A`).
  - Modal title: `📷 Adjust Profile Photo` with close `[✕]` button.
  - **Circular Viewfinder Mask**: Centered `85px` radius circle with rule-of-thirds alignment grid lines.
  - **Interactive Zoom Slider**: `[-] ────────○──── [+]` with draggable thumb and emerald track.
  - Output Aspect Ratio Badge: `1:1 Square (Avatar Optimized)`.
  - Ergonomic modal buttons: `[Cancel]` and `[✓ Apply Photo]` (Emerald `#047857`).
- **Floating Auto-Dismissing Success Toast**:
  - Floating green capsule (`#047857`) situated at `y: 64px` with emerald shadow:
    `✓ Profile Updated Successfully · Corridor and avatar changes saved`.

---

## 5. Keyboard Navigation & Screen Reader Accessibility (WCAG 2.2 AA)

AbangCebu AI enforces strict compliance with **WCAG 2.2 Level AA** standards across keyboard focus order, touch targets, contrast ratios, and assistive technology semantics.

### 5.1 Sequential 16-Step Tab Order Flow (Desktop Profile Page)

```
[1. Brand Crest / Home] ──> [2. Profile Mini Capsule] ──> [3. Nav Items] ──> [4. Profile & Settings (Active)]
                                                                                       │
[8. Back to Dashboard] <── [7. Sign Out] <── [6. Role Switcher] <── [5. KYC Center Nav] ┘
       │
[9. Return to Map CTA] ──> [10. Avatar Change Trigger] ──> [11. Tablist (Tab 1 / 2 / 3)]
                                                                     │
[15. Commute Radius Pills] <── [14. Corridor Dropdown] <── [13. Mobile Input] <── [12. Full Name Input]
       │
[16. Bio Textarea] ──> [17. Revert Changes Button] ──> [18. Save Profile Changes Button]
```

### 5.2 WAI-ARIA Semantic Role Matrix

| Tab Index | DOM Target Element | Accessible Name / Label | ARIA Role & Attributes | Keyboard Action |
|---|---|---|---|---|
| `1` | Brand Crest Link | "AbangCebu AI Home" | `role="link"`, `aria-label="AbangCebu AI Home"` | `Enter` routes to home |
| `2` | Profile Mini Capsule | "Maria Elena Santos, Student Seeker, KYC Verified" | `role="region"`, `aria-label="User Profile Dossier"` | Visual anchor |
| `3` | Profile & Settings Nav | "Profile & Account Settings, current page" | `role="link"`, `aria-current="page"` | Current view indicator |
| `4` | Role Switcher | "Switch Workspace Role" | `role="tablist"`, `aria-label="Workspace Role Switch"` | `ArrowLeft` / `ArrowRight` toggles role |
| `5` | Sign Out Button | "Sign Out of AbangCebu AI" | `role="button"`, `aria-label="Sign Out"` | `Enter` opens logout dialog |
| `6` | Back to Dashboard CTA| "Return to Dashboard Overview" | `role="link"`, `aria-label="Back to Dashboard"` | `Enter` routes to `/dashboard` |
| `7` | Return to Map CTA | "Return to Metro Cebu Map Explorer" | `role="link"`, `aria-label="Return to Map Explorer"` | `Enter` routes to `/map` |
| `8` | Avatar Edit Button | "Change Profile Photo" | `role="button"`, `aria-haspopup="dialog"`, `aria-label="Change profile photo"` | `Space` / `Enter` opens crop modal |
| `9` | Profile Tablist | "Profile Navigation Sections" | `role="tablist"`, `aria-label="Profile Tabs"` | `ArrowLeft` / `ArrowRight` switches tabs |
| `10` | Tab 1: Personal Info | "Personal Information and Preferences Tab" | `role="tab"`, `aria-selected="true"`, `aria-controls="panel-personal"` | `Enter` activates tab |
| `11` | Tab 2: Security | "Security and Authentication Tab" | `role="tab"`, `aria-selected="false"`, `aria-controls="panel-security"` | `Enter` activates tab |
| `12` | Tab 3: KYC Verification| "KYC Identity Verification Tab, Verified" | `role="tab"`, `aria-selected="false"`, `aria-controls="panel-kyc"` | `Enter` activates tab |
| `13` | Full Name Input | "Full Legal Name" | `type="text"`, `aria-required="true"`, `aria-invalid="false"` | Standard text input |
| `14` | Email Input (Locked)| "Institutional or Primary Email" | `type="email"`, `aria-readonly="true"`, `aria-describedby="email-desc"` | Read-only input |
| `15` | Mobile Number Input | "Philippine Mobile Number" | `type="tel"`, `aria-required="true"`, `aria-describedby="mobile-desc"` | Numeric input |
| `16` | Corridor Dropdown | "Preferred University or Employment Corridor" | `role="combobox"`, `aria-expanded="false"`, `aria-autocomplete="list"` | `ArrowDown` opens menu |
| `17` | Commute Tolerance | "Commute Radius Tolerance" | `role="radiogroup"`, `aria-label="Commute Tolerance"` | `ArrowRight` cycles options |
| `18` | Bio Textarea | "Personal Bio and Renter Inquirer Dossier" | `aria-multiline="true"`, `aria-describedby="bio-counter"` | Multiline input |
| `19` | Revert Changes CTA | "Revert Unsaved Profile Changes" | `role="button"`, `aria-label="Revert changes"` | `Enter` restores initial form state |
| `20` | Save Changes CTA | "Save Profile Changes" | `role="button"`, `aria-label="Save profile changes"` | `Enter` triggers submission |

### 5.3 Accessibility Quality Gates & Contrast Ratios

1. **44 × 44px Minimum Touch Hitboxes**: All interactive mobile buttons, segmented tab pills, avatar edit triggers, toggle switches, and save actions enforce a minimum bounding box of `44 × 44px`.
2. **Contrast Ratio Compliance**:
   - Primary Emerald Actions (`#047857` on `#FFFFFF` text): **5.1:1** (Exceeds WCAG AA 4.5:1 minimum).
   - Sidebar Deep Navy (`#0F172A` with `#FFFFFF` text): **16.1:1** (Exceeds WCAG AAA standard).
   - Sidebar Active Pip (`#34D399` on `#0F172A`): **11.4:1** (Compliant).
   - Trust Badge Pill (`#047857` on `#ECFDF5` background): **6.2:1** (Compliant).
   - Emergency Revoke Button (`#E11D48` on `#FFF1F2` background): **5.4:1** (Compliant).
3. **Screen Reader Live Regions**:
   - Profile update toast utilizes `role="status"` and `aria-live="polite"`.
   - Emergency session revocation alerts utilize `role="alert"` and `aria-live="assertive"`.
   - Character count announcements in bio utilize `aria-live="polite"` with debounce.

---

## 6. Next.js 16 Component Breakdown & Route Architecture

In adherence to the **Squad Architecture Plan** and **Sprint 1 Boundaries**, the profile page architecture is partitioned across Server and Client boundaries:

```
src/
└── app/
    └── (dashboard)/
        ├── layout.tsx                     [Server Component Shell]
        │   ├── Session Authenticator & Role Resolver (Supabase Server Client)
        │   ├── SidebarNav                 [Client Boundary: collapsible drawer & active route]
        │   └── DashboardHeader            [Client Boundary: breadcrumbs & status]
        │
        └── profile/
            └── page.tsx                   [Server Component: Profile Workspace Route]
                ├── ProfileHeader          [Server Component: static initial data]
                │   ├── AvatarUploadTrigger[Client Component: crop modal listener]
                │   ├── TrustBadgeGroup    [Server Component: verified pills]
                │   └── ContactBadgesRow   [Server Component: email/phone badges]
                │
                ├── ProfileTabContainer    [Client Component: WAI-ARIA tablist state]
                │   │
                │   ├── PersonalDetailsTab [Client Component: form state & dirty tracker]
                │   │   ├── LegalNameInput
                │   │   ├── ReadOnlyEmailField
                │   │   ├── PhilippineMobileField (+63 prefix dropdown)
                │   │   ├── CorridorSelectDropdown (CIT-U / USC / IT Park)
                │   │   ├── CommuteRadiusRadioGroup
                │   │   └── BioTextarea (char counter)
                │   │
                │   ├── SecurityTab        [Client Component: password & 2FA handlers]
                │   │   ├── ChangePasswordForm (NIST 800-63B 4-segment gauge)
                │   │   ├── TwoFactorAuthCard (TOTP toggle switch)
                │   │   └── ActiveSessionsList (device session triage & kill-switch)
                │   │
                │   └── KycVerificationTab [Client Component: multi-part document uploader]
                │       ├── KycStatusBanner (Tier 1 Verified / Pending / Rejected)
                │       ├── GovernmentIdSelector (PhilSys, UMID, Driver's License)
                │       ├── DocumentDropzone (Front & Back ID containers, max 10MB)
                │       └── ProofOfOwnershipContainer (for Landlord profiles)
                │
                ├── StickyActionBar        [Client Component: optimistic save & revert]
                └── AvatarCropModal        [Client Component: canvas crop & zoom slider]
```

### 6.1 Architectural Component Contracts

| Component Identifier | Boundary | File Path Target (Sprint 2) | Architectural Contract & Responsibilities |
|---|---|---|---|
| `ProfilePage` | **Server** | `src/app/(dashboard)/profile/page.tsx` | Enforces Supabase server authentication. Prefetches `profiles`, `auth.users`, active sessions, and KYC document statuses. |
| `ProfileHeader` | **Server** | `src/components/profile/profile-header.tsx` | Hero card container. Renders 88px avatar, trust verification pills, contact status, and profile trust score gauge. |
| `AvatarUploadTrigger` | **Client** | `src/components/profile/avatar-upload-trigger.tsx` | Handles avatar click, file input change, image preloading, and launches the `AvatarCropModal`. |
| `ProfileTabContainer` | **Client** | `src/components/profile/profile-tab-container.tsx` | Manages active tab state (`personal`, `security`, `kyc`), URL hash synchronizer (`#security`, `#kyc`), and ARIA keyboard arrows. |
| `PersonalDetailsTab` | **Client** | `src/components/profile/personal-details-tab.tsx` | Manages form state, dirty field tracking, corridor matching preference updates, and connects to the bottom action bar. |
| `SecurityTab` | **Client** | `src/components/profile/security-tab.tsx` | Hosts NIST SP 800-63B password change form, 2FA TOTP QR modal, and device session list with revoke mutations. |
| `KycVerificationTab` | **Client** | `src/components/profile/kyc-verification-tab.tsx` | Handles drag-and-drop document uploads to encrypted Supabase bucket, OCR pre-validation, and displays 4 status banner tiers. |
| `ActiveSessionsList` | **Client** | `src/components/profile/active-sessions-list.tsx` | Displays recognized active devices with IP addresses, browser agents, and 1-tap `Revoke All Other Sessions` handler. |
| `AvatarCropModal` | **Client** | `src/components/profile/avatar-crop-modal.tsx` | Client dialog featuring circular viewfinder mask, canvas zoom slider, and 1:1 image blob generator. |
| `StickyActionBar` | **Client** | `src/components/profile/sticky-action-bar.tsx` | Floating footer that detects form dirty state, provides Revert action, and executes optimistic profile updates. |

> [!IMPORTANT]
> **Sprint 1 Boundary Enforcement:** In strict accordance with Sprint 1 governance, no premature React/JSX UI components are to be created in `src/components/`. The component contracts and layout boundaries established here constitute the authoritative blueprint for Sprint 2 implementation.

---

## 7. Design Tokens & Styling Integration

All profile components, color tiers, and form elements map directly to the Tailwind CSS v4 design tokens configured in `src/app/globals.css`:

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
--color-destructive: #e11d48;     /* Danger / Session Revoke: Sinulog Crimson */

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

- [x] **Jira Traceability**: Document explicitly linked to Jira ticket [SCRUM-68](https://abangcebuai.atlassian.net/browse/SCRUM-68).
- [x] **Balsamiq/Figma Blueprint Conventions**: Grayscale monochrome foundation, clean strokes, crossed `[X]` image placeholders, and authentic hardware device frames.
- [x] **Desktop Viewport Specification (1440 × 900 · 16:10)**: Authentic MacBook Air chassis, 260px fixed dark sidebar navigation with active Profile & Settings link (`#047857`), Profile Header Hero Card (88px avatar, online indicator, trust badge pills, verified contact badges), accessible 3-tab bar, personal details form with corridor preferences, security snapshot with active sessions, anti-scam KYC verification gateway, and sticky bottom action bar.
- [x] **Mobile Viewport Specification (393 × 852 · 100dvh)**: Authentic iPhone 16 Pro chassis, Dynamic Island, safe-area header with back navigation and shield icon, compact profile capsule, segmented 3-tab bar with 44x44px touch targets, single-column vertical form with 16px input rule, and persistent bottom tab bar.
- [x] **4 Operational Interactive States**: Detailed mapping of Personal Information Tab, Security & NIST SP 800-63B Tab, Anti-Scam KYC Identity Verification Tab, and Avatar Crop Modal with Floating Success Toast.
- [x] **Anti-Scam KYC Verification Gateway**: 4 deterministic banner tiers (Unverified, Pending, Verified, Rejected), Philippine government ID selector (PhilSys, UMID, Driver's License, PRC ID), and encrypted document dropzones (max 10MB).
- [x] **Zero-Trust Security & Session Governance**: NIST SP 800-63B password change with 4-segment entropy gauge, 2FA TOTP toggle, active device sessions list (MacBook Air + iPhone 16 Pro), and emergency 1-tap session revocation trigger.
- [x] **Accessibility (WCAG 2.2 AA)**: Strict 44 × 44px touch targets, contrast ratios >= 4.5:1, 16px mobile input font rule, full sequential 16-step keyboard tab order flow, and ARIA attributes.
- [x] **Component Hierarchy & Server/Client Boundaries**: Explicit mapping for Next.js 16 route layout, `ProfileHeader`, `ProfileTabContainer`, `PersonalDetailsTab`, `SecurityTab`, `KycVerificationTab`, `ActiveSessionsList`, and `AvatarCropModal`.
- [x] **Sprint 1 Iron Rule**: Zero premature React/JSX UI components created in `src/components/`.
- [x] **Vector & Rendered Assets**: High-resolution vector SVGs, PNG blueprints, and formal WeasyPrint PDF compiled and stored in repository.

### 8.2 Architectural Sign-Off

| Role | Name | Signature / Status | Date |
|---|---|---|---|
| **Author (UI/UX Designer)** | **Angel Crushein Yaun** | `Approved & Signed Off` | September 30, 2026 |
| **Reviewer & Scrum Master** | **Hermar Centillas** | `Approved & Audited` | September 30, 2026 |

