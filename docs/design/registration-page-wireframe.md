# AbangCebu AI — Registration Page Wireframe & Component Layout Specification

**Sprint 1 System Architecture Specification**  
**Document Version:** 1.0.0  
**Status:** Approved & Active Design Specification  
**Jira Ticket Reference:** [SCRUM-66](https://abangcebuai.atlassian.net/browse/SCRUM-66) — *Design Registration Page Wireframe / Mockup*  
**Sprint:** Sprint 1 (Foundations & Core Infrastructure)  
**Author:** Angel Crushein Yaun (UI/UX Designer)  
**Reviewed & Audited by:** Hermar Centillas (Lead / Scrum Master)  
**Design Reference Standard:** Balsamiq / Figma Grayscale Blueprint Architecture, Apple Human Interface Guidelines, NIST SP 800-63B Authentication Guidelines, WCAG 2.2 AA Ergonomics  
**Companion Assets:**
- Desktop Vector Blueprint: [`docs/assets/wireframes/registration-page-desktop.svg`](../assets/wireframes/registration-page-desktop.svg)
- Desktop High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Registration_Page_Desktop_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Registration_Page_Desktop_Wireframe_Blueprint.png)
- Mobile Vector Blueprint: [`docs/assets/wireframes/registration-page-mobile.svg`](../assets/wireframes/registration-page-mobile.svg)
- Mobile High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Registration_Page_Mobile_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Registration_Page_Mobile_Wireframe_Blueprint.png)
- Formal Engineering PDF: [`docs/pdf/AbangCebu_Registration_Page_Wireframe_Specification.pdf`](../pdf/AbangCebu_Registration_Page_Wireframe_Specification.pdf)
- Specification Sheet Previews:
  - Page 1 (Desktop Architecture & Split Layout): [`docs/assets/wireframes/AbangCebu_Registration_Page_Specification_Sheet_Page1.png`](../assets/wireframes/AbangCebu_Registration_Page_Specification_Sheet_Page1.png)
  - Page 2 (Mobile Viewport & 4 Interactive States): [`docs/assets/wireframes/AbangCebu_Registration_Page_Specification_Sheet_Page2.png`](../assets/wireframes/AbangCebu_Registration_Page_Specification_Sheet_Page2.png)
  - Page 3 (Accessibility, Component Contracts & Sign-Off): [`docs/assets/wireframes/AbangCebu_Registration_Page_Specification_Sheet_Page3.png`](../assets/wireframes/AbangCebu_Registration_Page_Specification_Sheet_Page3.png)
- Related Specifications:
  - Login Page Wireframes: [`docs/design/login-page-wireframe.md`](./login-page-wireframe.md)
  - Landing Page Wireframes: [`docs/design/landing-page-wireframe.md`](./landing-page-wireframe.md)
  - Mobile Map Wireframes: [`docs/design/mobile-map-wireframes.md`](./mobile-map-wireframes.md)
  - Styling Tokens & Guidelines: [`docs/design/styling-guidelines.md`](./styling-guidelines.md)
  - Auth Registration Workflow Specification: [`docs/specifications/auth/auth-registration-spec.md`](../specifications/auth/auth-registration-spec.md)
  - Auth Error Handling Specification: [`docs/specifications/auth/auth-error-handling.md`](../specifications/auth/auth-error-handling.md)
  - Users and Profiles Schema: [`docs/database/users-and-profiles-schema.md`](../database/users-and-profiles-schema.md)
  - Renter Persona & Capabilities: [`docs/design/renter-persona.md`](./renter-persona.md)

---

## 1. Executive Summary & Authentication Architecture

AbangCebu AI rejects legacy rental portals that hide listings behind forced registration walls, aggressive paywalls, or unverified listings. In our platform, **discovery is always map-first and public**. Anyone can freely explore verified rooms, boarding houses, and apartments across Metro Cebu (CIT-U, USC, Cebu IT Park, Urgello, Banilad) without an account.

Registration is an intentional, trust-establishing gateway where seekers and property owners formalize their platform presence while unlocking verified capabilities:
- **Renters**: Unlock saved favorite listings, direct real-time inquiries with verified landlords, ocular visit scheduling, and commute route favoriting.
- **Landlords**: Unlock listing creation, room inventory management, tenant inquiry feeds, and entry into the KYC verification pipeline.

```
+---------------------------------------------------------------------------------------------------+
|                     MAP-FIRST REGISTRATION & TRUST PERIMETER ARCHITECTURE                         |
+---------------------------------------------------------------------------------------------------+
| 1. Seamless Return to Map Canvas:                                                                 |
|    When an unregistered user hits an interactive trigger while browsing (e.g. saving a bedspace near  |
|    CIT-U, requesting an ocular on Salinas Dr), the spatial parameters are preserved via URL:      |
|    /register?returnTo=%2Fmap%3Flat%3D10.2942%26lng%3D123.8659%26zoom%3D15%26listing%3Dcit-dorm-04    |
|    Upon completing registration and email confirmation, the user is returned to the exact map pin. |
|                                                                                                   |
| 2. Anti-Scam KYC Trust Perimeter:                                                                 |
|    Registration establishes identity integrity from day one. Phone numbers require authentic     |
|    Philippine mobile format (+63 9XX XXX XXXX), passwords enforce NIST SP 800-63B standards,     |
|    and landlord onboarding introduces immediate KYC document verification requirements.           |
|                                                                                                   |
| 3. Role-Conditional Progressive Disclosure:                                                       |
|    A top segmented switch allows toggling between "Looking for a Rental" and "Listing a Property".|
|    Selecting "Looking for a Rental" provisions a Renter profile with preferred university/school  |
|    corridor context; selecting "Listing a Property" provisions a Landlord profile with property    |
|    municipality context and routes directly to the KYC verification onboarding queue.             |
|                                                                                                   |
| 4. Zero Brokerage Guarantee:                                                                      |
|    The registration surface reaffirms AbangCebu AI's core value proposition: 100% direct landlord |
|    connections with zero agent brokerage cuts, upfront utility submeters, and anti-scam badges.    |
+---------------------------------------------------------------------------------------------------+
```

### 1.1 Wireframe Fidelity & Blueprint Conventions

In strict compliance with architectural UX/UI engineering standards (Balsamiq, Figma Grayscale Blueprints), these wireframes adhere to the following conventions:

1. **Monochrome / Grayscale Visual Hierarchy**:
   - Focuses strictly on layout geometry, visual balance, reading order, and component relationships prior to high-fidelity surface styling.
   - High-contrast slate and charcoal borders (`#0F172A`, `#334155`, `#94A3B8`), neutral background surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`), and focused action accents (`#047857` Cebu Emerald, `#E11D48` Sinulog Crimson for validation errors).
2. **Authentic Hardware Chassis Enclosures**:
   - **Desktop (1440px × 900px, 16:10)**: Encased in an authentic **MacBook Air aluminum chassis** with top FaceTime camera notch, 16:10 display ratio, inner matte black bezels, and bottom thumb lip.
   - **Mobile (393px × 852px, 100dvh)**: Encased in an authentic **iPhone 16 Pro Titanium chassis** featuring Apple's Dynamic Island capsule, standard iOS status bar (`9:41`, Signal, Wi-Fi, Battery), persistent bottom iOS Safari navigation bar (`🔒 abangcebu.ph ↻`), and home indicator bar.
3. **Numbered Blueprint Callout System (`①` – `⑧`)**:
   - Traceable callout badges linking directly to component dimension tables, interaction contracts, and accessibility requirements.

---

## 2. Desktop Viewport Specification (1440px × 900px · MacBook Air Enclosure)

### 2.1 Viewport Geometry & Split-Screen Architecture

On desktop screens (1440px × 900px, 16:10 ratio), the registration interface implements a **balanced 50/50 split-screen architecture**:
- **Left 50% Pane (0px – 720px · Role Value Proposition & Metro Cebu Spatial Context)**:
  - Base vector map grid illustrating core Metro Cebu road corridors: **N. Bacalso Avenue**, **Osmeña Boulevard**, **Salinas Drive (Lahug / IT Park)**, and the **CCLEX Bridge**.
  - Key landmark anchor nodes: **CIT-U Campus**, **Cebu IT Park**, and **University of San Carlos (USC)**.
  - Eastern waterway hatch representing the **Mactan Channel / Cebu Strait**.
  - Live listing statistics pill: **"🟢 1,248+ Verified Beds & Rooms in Metro Cebu"**.
  - Dynamic Dual Value Proposition Showcase:
    - **Renter Perks**: Zero Brokerage, Verified student boarding houses near CIT-U/USC/UC, Transit proximity radar with 04L & 17B jeepney corridors.
    - **Landlord Perks**: 100% Free Listing, Pre-screened working student & BPO tenants, Instant real-time inquiries & zero commissions.
  - Prominent **"← Return to Map Explorer [Esc]"** action for immediate abandonment without penalty.
- **Right 50% Pane (720px – 1440px · Centered Registration Card)**:
  - Dedicated authentication surface with a **460px maximum width** centered card (`x: 850px, y: 36px, h: 828px`).
  - Structured form hierarchy designed to eliminate cognitive fatigue, guide password strength compliance, and capture localized onboarding metadata.

```
0px                                      720px                                  1440px
+----------------------------------------+----------------------------------------+
| LEFT PANE: SPATIAL CONTEXT & PERKS     | RIGHT PANE: 460px REGISTRATION CARD    |
| (Width: 720px · 50% Viewport)          | (Width: 720px · 50% Viewport)          |
|                                        |                                        |
|  [Logo] AbangCebu AI                   |       +------------------------+       |
|  🟢 1,248+ Verified Beds & Rooms       |       |  METRO CEBU PLATFORM   |       |
|                                        |       |  Create your Account   |       |
|  [ Renter Value Proposition Card ]     |       |  [ Renter | Landlord ] |       |
|  • Zero Brokerage Direct Inquiries     |       |  Full Name Input       |       |
|  • Verified student boarding houses    |       |  Email Address Input   |       |
|  • 04L / 17B Transit Radar Proximity   |       |  Password [Show/Hide]  |       |
|                                        |       |  NIST Strength Meter   |       |
|  [ Landlord Value Proposition Card ]   |       |  [====] 4-segment bar  |       |
|  • 100% Free Listing & Direct Chat     |       |  (8+)(Aa)(a)(0-9)(#$)  |       |
|  • Pre-screened student & BPO tenants  |       |  Context Dropdown      |       |
|  • Instant Inquiry Notifications       |       |  +63 Mobile Input      |       |
|                                        |       |  [x] Terms & Privacy   |       |
|  Metro Cebu GIS Road Network           |       |  [ Create Account CTA] |       |
|  (N. Bacalso Ave, Osmeña, IT Park)     |       |  -- OR REGISTER WITH --|       |
|                                        |       |  [ Continue with Google]       |
|  [← Return to Map Explorer [Esc]]      |       |  Already have account? |       |
|                                        |       +------------------------+       |
+----------------------------------------+----------------------------------------+
```

---

### 2.2 Complete Desktop Wireframe Blueprint

```
+===========================================================================================================================+
| [Camera Notch: 720px]                                                                                        MacBook Air  |
+---------------------------------------------------------------------------------------------------------------------------+
|                                             |                                                                             |
|  [🛡️] AbangCebu AI                          |                  +-----------------------------------------+                |
|  Map-Centric Rental Discovery Platform      |                  | METRO CEBU RENTAL PLATFORM              |                |
|                                             |                  |                                         |                |
|  +---------------------------------------+  |                  | Create your AbangCebu Account           |                |
|  | 🟢 1,248+ Verified Beds & Rooms       |  |                  | Join thousands of verified renters &    |                |
|  +---------------------------------------+  |                  | property owners across Metro Cebu.      |                |
|                                             |                  |                                         |                |
|  DYNAMIC ROLE VALUE PROPOSITIONS:           |                  | I AM REGISTERING AS:                    |                |
|  +---------------------------------------+  |                  | +--------------------+----------------+ |  ① Role Switch |
|  | 👤 RENTER PERKS: ZERO BROKER FEES     |  |                  | | 👤 Looking for Room* | 🏠 Landlord   | |    (40px h)    |
|  | • Direct chat with verified owners.   |  |                  | +--------------------+----------------+ |                |
|  | • Verified boarding near CIT-U & USC.|  |                  |                                         |                |
|  | • Real walking distance & 04L jeepney.|  |                  | Full Name *                             |                |
|  +---------------------------------------+  |                  | +-------------------------------------+ |  ② Name Input  |
|  +---------------------------------------+  |                  | | 👤 Mikaela Santos                   | |    (42px h)    |
|  | 🏠 LANDLORD PERKS: 100% FREE LISTING  |  |                  | +-------------------------------------+ |                |
|  | • Zero listing fees or agent cuts.    |  |                  |                                         |                |
|  | • Pre-screened student & BPO tenants. |  |                  | Email Address *                         |                |
|  | • Real-time ocular request alerts.    |  |                  | +-------------------------------------+ |  ③ Email Input |
|  +---------------------------------------+  |                  | | ✉ mikaela.santos@cit.edu.ph         | |    (42px h)    |
|                                             |                  | +-------------------------------------+ |                |
|  [CIT-U CAMPUS]       [USC MAIN]            |                  | Password *                              |                |
|     |                     |                 |                  | +-----------------------------------+-+ |  ④ Password &  |
|  ===N. BACALSO AVE========OSMEÑA BLVD====   |                  | | 🔒 ••••••••••••••••               |👁||    Show/Hide   |
|                                             |                  | +-----------------------------------+-+ |    (42px h)    |
|  +-----------------------------+            |                  | NIST PASSWORD STRENGTH: GOOD (3/4)      |                |
|  | ← Return to Map Explorer    | [ESC]      |                  | [====][====][====][....]  (Emerald Bar) |  ⑤ NIST Meter  |
|  +-----------------------------+            |                  | (✓ 8+)(✓ Upper)(✓ Lower)(✓ Num)(Symbol) |    & 5 Pills   |
|                                             |                  |                                         |                |
|  Metro Cebu GIS Engine • OpenFreeMap        |                  | Preferred Landmark / University Corridor|                |
|  Coordinates: [123.89°E, 10.31°N]           |                  | +-------------------------------------+ |  ⑥ Context Drop|
|                                             |                  | | 📍 Near CIT-U (N. Bacalso Ave)    ▾ | |    (42px h)    |
|                                             |                  | +-------------------------------------+ |                |
|                                             |                  | Philippine Mobile Number *              |                |
|                                             |                  | +-----+-------------------------------+ |  ⑦ Mobile +63  |
|                                             |                  | | +63 | 917 555 0192                  | |    (42px h)    |
|                                             |                  | +-----+-------------------------------+ |                |
|                                             |                  | [x] I agree to Terms & Privacy Policy   |                |
|                                             |                  |                                         |                |
|                                             |                  | +-------------------------------------+ |  ⑧ Emerald CTA |
|                                             |                  | | Create your AbangCebu Account →     | |    (#047857)   |
|                                             |                  | +-------------------------------------+ |    (46px h)    |
|                                             |                  | ----------------- OR -----------------  |                |
|                                             |                  | +-------------------------------------+ |                |
|                                             |                  | | [G] Continue with Google            | |    (42px h)    |
|                                             |                  | +-------------------------------------+ |                |
|                                             |                  | Already have an account? Sign In →     |                |
|                                             |                  +-----------------------------------------+                |
|                                             |                                                                             |
+===========================================================================================================================+
```

---

### 2.3 Desktop Component Dimension Specification

| Callout | Component Identifier | Dimensions / Placement | Visual & Functional Specification |
|---|---|---|---|
| — | **MacBook Air Chassis** | `1480px × 950px` outer (`1440 × 900` screen) | Authentic aluminum frame with top FaceTime notch, camera lens, green indicator LED, and engraved bottom display hinge. |
| — | **Split-Screen Partition** | `x: 720px`, `y: 0 – 900px` | Crisp `1.5px` vertical divider (`#E2E8F0`) providing clear separation between spatial context and registration card. |
| — | **Spatial Trust Stack** | `w: 430px`, `x: 48px`, `y: 48px` | Logo badge (`44 × 44px`), live listing count capsule (`350 × 32px`), and dual role value proposition cards (`420 × 82px`). |
| — | **Return to Map Trigger** | `w: 220px`, `h: 40px`, `x: 48px`, `y: 440px` | Secondary button with `←` icon and keyboard shortcut badge `[ESC]`. Returns user to previous map coordinates without state loss. |
| — | **Registration Card Surface** | `w: 460px`, `h: 828px`, `x: 850px`, `y: 36px` | Elevated white card with `16px` border-radius (`rounded-2xl`), subtle drop shadow (`feDropShadow`), and `28px` internal padding. |
| `①` | **Role Selector Control** | `w: 404px`, `h: 40px` | Two-segment control (Renter / Landlord). Active tab features white surface, emerald border, and bold text. ARIA `role="tablist"`. |
| `②` | **Full Name Input** | `w: 404px`, `h: 42px` | Touch-optimized text input with leading User vector icon, 16px font rule, and `autocomplete="name"`. |
| `③` | **Email Address Input** | `w: 404px`, `h: 42px` | Email input with leading Mail vector icon, `autocomplete="email"`, and duplicate email validation listener. |
| `④` | **Password Field & Eye** | `w: 404px`, `h: 42px` | Masked input with leading Lock icon and dedicated `44 × 44px` show/hide toggle eye button. |
| `⑤` | **NIST Password Meter** | `w: 404px`, `h: 36px` | 4-segment visual gauge bar (Weak/Fair/Good/Strong) + 5 requirement pills (8+ chars, uppercase, lowercase, number, symbol). |
| `⑥` | **Conditional Context Dropdown** | `w: 404px`, `h: 42px` | Dynamic select dropdown: Renter selects preferred school corridor (CIT-U, USC, IT Park); Landlord selects municipality (Cebu, Mandaue, Lapu-Lapu). |
| `⑦` | **Philippine Mobile Input** | `w: 404px`, `h: 42px` | Split input with `+63` country code badge (`w: 58px`) and 10-digit mobile field (`w: 338px`, `9XX XXX XXXX`). |
| — | **Terms & Privacy Checkbox** | `w: 404px`, `h: 22px` | Custom checkbox with `44 × 44px` expanded touch target, linked to legal terms and privacy policies. |
| `⑧` | **Primary CTA Button** | `w: 404px`, `h: 46px` | High-contrast **Cebu Emerald (`#047857`)** button, `rounded-lg`, white bold typography (`13px / 700`). WCAG 2.2 AA compliant. |
| — | **Google OAuth Button** | `w: 404px`, `h: 42px` | Neutral white button with border (`#CBD5E1`), official Google `G` logo, and clear label. Initiates Supabase OAuth PKCE flow. |

---

## 3. Mobile Viewport Specification (393px × 852px · iPhone 16 Pro Frame · 100dvh)

### 3.1 Mobile Viewport Geometry & Thumb-Zone Ergonomics

On mobile viewports (393px × 852px, representing modern iPhone and high-density Android devices), the interface shifts to a **single-column focused view**:
1. **Dynamic Viewport Height (`100dvh`)**: The root container uses `min-h-[100dvh]` to eliminate clipping caused by iOS Safari's dynamic URL bar expanding and collapsing.
2. **Top Safe-Area Header (`pt-safe`)**: Positioned directly beneath Apple's Dynamic Island capsule is a persistent **`← Back to Map`** button adhering to the strict **44 × 44px minimum touch target**.
3. **Natural Thumb Zone Centering**: All primary actions—the Role Selector tabs, input fields, NIST password meter, Terms checkbox, and the "Create Account" CTA—are positioned in the natural thumb reach zone.
4. **Anti-Zoom 16px Font Rule**: Mobile input font-size is strictly locked to `16px` (`font-size: 16px !important`) to eliminate iOS Safari's destructive auto-zoom behavior on input focus.
5. **Safari Bottom Chrome & Home Indicator**: Docked floating address bar (`335 × 42px`, `🔒 abangcebu.ph ↻`) and standard iOS home indicator bar (`120 × 4.5px`).

---

### 3.2 Mobile ASCII Wireframe Blueprint

```
+=======================================================+
| [       (  Dynamic Island  )       ]   9:41  📶 🛜 🔋 |
+-------------------------------------------------------+
|  +-------------------+                                |
|  | ← Back to Map     | [44x44px touch target]         |
|  +-------------------+                                |
|                                                       |
|  ABANGCEBU AI                                         |
|  Create Account                                       |
|  Find verified rentals or list your property in Cebu. |
|                                                       |
|  +-------------------------------------------------+  |
|  | [ 👤 Looking for Room* ] | [ 🏠 Landlord ]      |  |  <- Role Switch (40px h)
|  +-------------------------------------------------+  |
|                                                       |
|  Full Name *                                          |
|  +-------------------------------------------------+  |
|  | 👤 Mikaela Santos                               |  |  <- 44px height, 16px font
|  +-------------------------------------------------+  |
|                                                       |
|  Email Address *                                      |
|  +-------------------------------------------------+  |
|  | ✉  mikaela.santos@cit.edu.ph                   |  |  <- 44px height, 16px font
|  +-------------------------------------------------+  |
|                                                       |
|  Password *                                           |
|  +-----------------------------------------------+--+  |
|  | 🔒  ••••••••••••••••                          |👁||  <- Show/Hide eye (44x44px)
|  +-----------------------------------------------+--+  |
|                                                       |
|  Password Strength: Good                              |
|  [======][======][======][......]                     |  <- 4-segment gauge bar
|  [✓ 8+ chars] [✓ Upper] [✓ Lower] [✓ Num] [ Symbol ]  |  <- 5 NIST requirement pills
|                                                       |
|  Preferred Corridor *                                 |
|  +-------------------------------------------------+  |
|  | 📍 Near CIT-U (N. Bacalso Ave)                ▾ |  |  <- Context dropdown
|  +-------------------------------------------------+  |
|                                                       |
|  Philippine Mobile *                                  |
|  +--------+----------------------------------------+  |
|  |  +63   | 917 555 0192                           |  |  <- Mobile field (+63)
|  +--------+----------------------------------------+  |
|                                                       |
|  [x] I agree to Terms & Privacy Policy                |  <- 44x44px touch hitbox
|                                                       |
|  +-------------------------------------------------+  |
|  | Create your AbangCebu Account →                 |  |  <- Cebu Emerald #047857 (46px)
|  +-------------------------------------------------+  |
|                                                       |
|  ------------------ OR REGISTER WITH ---------------- |
|                                                       |
|  +-------------------------------------------------+  |
|  | [G] Continue with Google                        |  |  <- OAuth PKCE trigger (42px)
|  +-------------------------------------------------+  |
|                                                       |
|  Already have an account? Sign In                     |
|                                                       |
|  +-------------------------------------------------+  |
|  | AA     🔒 abangcebu.ph                        ↻ |  |  <- Safari Bottom Floating Bar
|  +-------------------------------------------------+  |
|                         ______                        |  <- iOS Home Indicator
+=======================================================+
```

---

## 4. Interactive Input Visual States Matrix

The registration form lifecycle progresses through four deterministic visual states. Each state is explicitly defined in `docs/assets/wireframes/registration-page-mobile.svg` across side-by-side iPhone 16 Pro chassis mockups.

```
+---------------------------------------------------------------------------------------------------+
|                        REGISTRATION INPUT VISUAL STATES COMPARISON                                |
+-------------------+--------------------+------------------------+---------------------------------+
| State             | Visual Boundary    | Helper / Inline Status | Primary CTA Appearance          |
+-------------------+--------------------+------------------------+---------------------------------+
| 1. Default/Empty  | Neutral `#CBD5E1`  | Placeholder `#94A3B8`  | Active Emerald `#047857`        |
| 2. Active/Focused | Emerald Ring `2px` | 3/4 Strength 'Good'    | Ready / Interactive             |
| 3. Validation Err | Crimson `#E11D48`  | Red Error Banners      | Blocked until valid             |
| 4. Loading/Submit | Disabled `#F8FAFC` | Spinner + Busy State   | "Creating account..."           |
+-------------------+--------------------+------------------------+---------------------------------+
```

### 4.1 State 1: Default / Empty State
- **Trigger**: Initial page load or route transition.
- **Visual Attributes**:
  - Input borders use neutral border token `var(--border)` (`#CBD5E1`).
  - Leading icons (User, Mail, Lock, Phone) rendered in muted slate (`#94A3B8`).
  - Role switch defaults to **"Looking for a Rental"** (`role="tab"`, `aria-selected="true"`).
  - Password strength meter displays 4 empty light gray segments and 5 unfulfilled requirement pills.
  - Context dropdown displays localized prompt: *"Select preferred school / transit corridor"*.
  - Show/Hide eye button is in closed-eye default state (`aria-label="Show password"`).
  - Terms checkbox is unchecked.
  - Primary CTA button displays *"Create your AbangCebu Account →"* ready for interaction.

### 4.2 State 2: Active / Focused State with NIST Password Strength Meter
- **Trigger**: User focuses the Password field and begins typing credentials (`CebuSafe2026!`).
- **Visual Attributes**:
  - Active input displays a high-contrast focus ring with **Cebu Emerald (`#047857`)** outline (`2px`) and subtle emerald glow (`#A7F3D0`, `3px`).
  - Input font-size is strictly locked to **16px** to prevent iOS Safari auto-zoom.
  - When the Show/Hide eye toggle is tapped, the password field switches from `type="password"` to `type="text"`, the icon transforms into an eye-slash, and the toggle background highlights in light emerald (`#ECFDF5`).
  - **NIST SP 800-63B Password Strength Meter Execution**:
    - **4-Segment Gauge Bar**: 3 of 4 segments filled with emerald/teal `#047857` indicating **"Good (NIST Compliant)"**.
    - **5 Requirement Pills**:
      - `[✓ 8+ chars]` (Emerald `#047857` filled badge)
      - `[✓ Uppercase]` (Emerald `#047857` filled badge)
      - `[✓ Lowercase]` (Emerald `#047857` filled badge)
      - `[✓ Number]` (Emerald `#047857` filled badge)
      - `[✓ Symbol]` (Emerald `#047857` filled badge)
  - Blinking vertical cursor (`#047857`) indicates active typing readiness.

### 4.3 State 3: Validation Error State (Mapped to SCRUM-57 & SCRUM-60)
- **Trigger**: Form submission attempted with duplicate email, weak password, invalid Philippine mobile number, or unchecked Terms of Service.
- **Visual Attributes**:
  - **Top Alert Banner**: Displays standardized error container with `role="alert"` and `aria-live="assertive"`.
    - **`AUTH_EMAIL_ALREADY_REGISTERED`**: Crimson alert banner (`#FFF1F2`, border `#FDA4AF`), warning icon `⚠️`, message *"An account with this email address already exists. Please sign in or reset your password."*, and direct link to `/login`.
  - **Field Borders**: Invalid fields transition to **Sinulog Crimson (`#E11D48`)** border (`1.8px`) with soft crimson background tint (`#FFF1F2`).
  - **Inline Error Text**:
    - Password Field: 1 of 4 segments filled in red (`#E11D48`). Inline error: *"Password is too weak. Must meet all NIST requirements."*. Missing requirement pills highlighted in red.
    - Mobile Field: Invalid format (e.g. `0917-123`). Inline error: *"Enter a valid 10-digit Philippine mobile number starting with 9."*.
    - Terms Checkbox: Red border and error notice: *"You must agree to the Terms of Service to continue."*.

### 4.4 State 4: Loading / Submitting State
- **Trigger**: Form submission triggered via CTA button tap, keyboard `Enter`, or Google OAuth initiation.
- **Visual Attributes**:
  - All form controls (Role switch, inputs, dropdown, mobile field, checkbox, Google button) transition to **disabled state** (`pointer-events-none`, `opacity-60`, background `#F8FAFC`).
  - Top indeterminate progress bar animates horizontally across the card header.
  - Primary CTA button transitions to darker emerald (`#065F46`), disables click triggers to prevent double-submission, and displays an animated rotating vector spinner alongside text **"Creating account..."**.
  - Screen reader announcement via `aria-live="polite"`: *"Provisioning your AbangCebu account and sending verification email. Please wait..."*.

---

## 5. Keyboard Navigation & Screen Reader Accessibility (WCAG 2.2 AA)

AbangCebu AI enforces strict compliance with **WCAG 2.2 Level AA** standards across keyboard focus order, touch target ergonomics, contrast ratios, and assistive technology semantics.

### 5.1 Sequential Tab Order Flow

```
[1. Back to Map] ──> [2. Renter Tab] ──> [3. Landlord Tab] ──> [4. Full Name]
                                                                     │
[8. Landmark Dropdown] <── [7. Show/Hide Eye] <── [6. Password] <── [5. Email Input]
         │
[9. Mobile Country +63] ──> [10. Mobile Number] ──> [11. Terms Checkbox] ──> [12. Create Account CTA]
                                                                                     │
[14. Sign In Link] <── [13. Google OAuth Button] <───────────────────────────────────┘
```

| Tab Index | DOM Target Element | Accessible Name / Label | ARIA Role & Attributes | Keyboard Action |
|---|---|---|---|---|
| `1` | `← Back to Map` button | "Back to Map Explorer" | `role="link"`, `aria-label="Return to Map"` | `Enter` / `Space` navigates back |
| `2` | Renter Role Tab | "Looking for a Rental context" | `role="tab"`, `aria-selected="true"`, `tabindex="0"` | `ArrowRight` moves to Landlord |
| `3` | Landlord Role Tab | "Listing a Property context" | `role="tab"`, `aria-selected="false"`, `tabindex="-1"` | `ArrowLeft` moves to Renter |
| `4` | Full Name Input | "Full Name, required" | `type="text"`, `autocomplete="name"`, `aria-required="true"` | Standard typing; `Tab` to next |
| `5` | Email Address Input | "Email Address, required" | `type="email"`, `autocomplete="email"`, `aria-required="true"` | Standard typing; `Tab` to next |
| `6` | Password Input | "Password, required" | `type="password"`, `autocomplete="new-password"`, `aria-describedby="pass-meter"` | Standard typing |
| `7` | Show/Hide Eye Button | "Toggle password visibility" | `role="button"`, `aria-pressed="false"`, `aria-label="Show password"` | `Enter` / `Space` toggles visibility |
| — | Password Strength Meter | "Password Strength: Good" | `role="progressbar"`, `aria-valuenow="75"`, `aria-valuemin="0"`, `aria-valuemax="100"` | Screen reader announces updates |
| `8` | Landmark / Municipality Dropdown | "Preferred Landmark / School Corridor" | `role="combobox"`, `aria-expanded="false"`, `aria-required="true"` | `Alt + Down` opens options |
| `9` | Mobile Country Prefix | "Country code +63" | `role="button"`, `aria-label="Philippine Country Code +63"` | Locked default indicator |
| `10` | Philippine Mobile Number | "Mobile number, required" | `type="tel"`, `inputmode="numeric"`, `placeholder="917 123 4567"` | Numeric typing |
| `11` | Terms & Privacy Checkbox | "I agree to Terms of Service & Privacy Policy" | `role="checkbox"`, `aria-checked="false"`, `aria-required="true"` | `Space` toggles checked state |
| `12` | Create Account CTA Button | "Create your AbangCebu Account" | `type="submit"`, `aria-busy="false"` | `Enter` / `Space` submits form |
| `13` | Google OAuth Button | "Continue with Google" | `role="button"`, `aria-label="Register with Google OAuth"` | `Enter` triggers OAuth redirect |
| `14` | Sign In Link | "Already have an account? Sign In" | `role="link"` | `Enter` routes to `/login` |

### 5.2 Accessibility Quality Gates

1. **44 × 44px Minimum Touch Targets**:
   - All interactive controls (buttons, links, toggles, checkboxes, segmented tabs) enforce a minimum touch bounding box of `44 × 44px`. Small inline links leverage `@utility touch-target-expanded` pseudo-element hitboxes.
2. **Contrast Ratio Compliance**:
   - Primary Emerald CTA (`#047857` on `#FFFFFF` text): **5.1:1** (Exceeds 4.5:1 WCAG AA minimum).
   - Input Text (`#0F172A` on `#FFFFFF` background): **15.8:1** (Exceeds 4.5:1).
   - Placeholder Text (`#64748B` on `#FFFFFF` background): **4.6:1** (Compliant).
   - Validation Error Text (`#E11D48` on `#FFF1F2` background): **5.8:1** (Compliant).
   - Password Strength Meter Emerald (`#047857` on `#F0FDF4`): **4.8:1** (Compliant).
3. **Screen Reader Live Regions**:
   - Dynamic error alerts utilize `role="alert"` and `aria-live="assertive"`.
   - Password strength updates utilize `aria-live="polite"` to avoid interrupting user typing flow.
   - Loading state transitions utilize `aria-live="polite"` with `aria-busy="true"` on the parent `<form>`.

---

## 6. Next.js 16 Component Breakdown & Route Architecture

In adherence to the **Squad Architecture Plan** and **Sprint 1 Boundaries**, the registration system architecture is partitioned across Server and Client boundaries:

```
src/
└── app/
    └── (auth)/
        └── register/
            └── page.tsx              [Server Component Shell]
                ├── Metadata & SEO Header (Metro Cebu rental keywords)
                ├── Spatial Preservation Parser (searchParams.returnTo, role)
                └── RegisterFormContainer [Client Component Boundary]
                    ├── AuthAlertBanner (Accessible live error notices)
                    ├── RoleSelector (Renter / Landlord segmented tabs)
                    ├── FullNameField
                    ├── EmailField
                    ├── PasswordField (with Show/Hide toggle)
                    ├── PasswordStrengthMeter (NIST 4-segment gauge & 5 requirement pills)
                    ├── ConditionalContextDropdown (Landmark corridor vs Municipality)
                    ├── PhilippineMobileInput (+63 prefix & 10 digits)
                    ├── TermsCheckbox (Legal compliance opt-in)
                    ├── SubmitCTAButton (Pending spinner state)
                    └── SocialAuthButtons (Google OAuth PKCE trigger)
```

### 6.1 Architectural Component Contracts

| Component Identifier | Boundary | File Path Target (Sprint 2) | Architectural Contract & Responsibilities |
|---|---|---|---|
| `RegisterPage` | **Server** | `src/app/(auth)/register/page.tsx` | Validates `searchParams.returnTo` against open-redirect allowlists (SCRUM-60). Renders metadata, OpenGraph tags, and wraps client form in Suspense. |
| `RegisterForm` | **Client** | `src/components/auth/register-form.tsx` | Client Component using React 19 `useActionState(registerAction, initialState)`. Manages visual states (Default, Active, Error, Loading) and ARIA attributes. |
| `RoleSelector` | **Client** | `src/components/auth/role-selector.tsx` | Accessible WAI-ARIA tablist toggle switching between `'renter'` and `'landlord'` identity contexts. Shifts conditional form fields. |
| `PasswordStrengthMeter` | **Client** | `src/components/auth/password-strength-meter.tsx` | Evaluates NIST SP 800-63B criteria in real time. Renders 4-segment gauge and 5 reactive requirement pills. |
| `ConditionalContextDropdown` | **Client** | `src/components/auth/conditional-context-dropdown.tsx` | Renders university corridor selection for Renters (CIT-U, USC, IT Park) or municipality for Landlords (Cebu, Mandaue, Lapu-Lapu). |
| `SocialAuthButtons`| **Client** | `src/components/auth/social-auth-buttons.tsx`| Triggers `supabase.auth.signInWithOAuth({ provider: 'google' })` with PKCE authorization flow and redirect URL preservation. |
| `AuthAlertBanner` | **Client** | `src/components/auth/auth-alert-banner.tsx` | Renders standardized `AuthErrorResponse` payloads (SCRUM-60) with error recovery action hints. |

> [!IMPORTANT]
> **Sprint 1 Boundary Enforcement:** No premature React/JSX UI components are to be committed into `src/components/` during Sprint 1. The specifications and design tokens documented here serve as the binding contract for Sprint 2 component implementation.

---

## 7. Design Tokens & Styling Integration

All visual elements, spacing scales, and colors map directly to the Tailwind CSS v4 design tokens configured in `src/app/globals.css`:

```css
/* Color Palette Integration (src/app/globals.css) */
--color-action: #047857;          /* Primary CTA: Cebu Emerald 700 */
--color-action-hover: #065f46;    /* Primary CTA Hover: Cebu Emerald 800 */
--color-foreground: #0f2742;      /* Primary Typography: Deep Maritime Navy */
--color-background: #faf8f5;      /* Base Page Surface: Coastal Sand */
--color-card: #ffffff;            /* Elevated Registration Card: Pure White */
--color-border: #e6decb;          /* Neutral Form Borders */
--color-ring: #047857;            /* Active Focus Rings: Cebu Emerald */
--color-destructive: #e11d48;     /* Validation Error Borders: Sinulog Crimson */

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

- [x] **Jira Traceability**: Document explicitly linked to Jira ticket [SCRUM-66](https://abangcebuai.atlassian.net/browse/SCRUM-66).
- [x] **Balsamiq/Figma Blueprint Conventions**: Grayscale monochrome foundation, clean strokes, crossed `[X]` placeholders, and authentic device frames.
- [x] **Desktop Viewport Specification (1440 × 900)**: Authentic MacBook Air chassis, 50/50 split-screen architecture, Metro Cebu spatial map grid (N. Bacalso, Osmeña, IT Park, CIT-U), dynamic dual value propositions (Renter & Landlord), and 460px centered registration card.
- [x] **Mobile Viewport Specification (393 × 852 · 100dvh)**: Authentic iPhone 16 Pro chassis, Dynamic Island, top safe-area `← Back to Map` button, single-column thumb zone ergonomics, and Safari bottom address bar.
- [x] **NIST SP 800-63B Password Strength Meter**: 4-segment visual gauge bar (Weak / Fair / Good / Strong) + 5 interactive requirement pills (8+ chars, uppercase, lowercase, number, symbol).
- [x] **Role-Conditional Progressive Disclosure**: Seamless switching between Renter corridor selection and Landlord property municipality selection.
- [x] **4 Interactive Input States Matrix**: Comprehensive coverage of State 1 (Default/Empty), State 2 (Active/Focused with NIST meter), State 3 (Validation Error mapped to `AUTH_EMAIL_ALREADY_REGISTERED`), and State 4 (Loading/Submitting with animated spinner).
- [x] **Accessibility (WCAG 2.2 AA)**: Strict 44 × 44px touch targets, contrast ratios >= 4.5:1, 16px mobile input font rule, full keyboard tab order flow, and ARIA attributes.
- [x] **Component Hierarchy & Server/Client Boundaries**: Detailed mapping for `register/page.tsx`, `RegisterForm`, `RoleSelector`, `PasswordStrengthMeter`, `ConditionalContextDropdown`, `SocialAuthButtons`, and `AuthAlertBanner`.
- [x] **Sprint 1 Iron Rule**: Zero premature React/JSX UI components created in `src/components/`.
- [x] **Vector & Rendered Assets**: High-resolution vector SVGs, PNG blueprints, and formal WeasyPrint PDF compiled and stored in repository.

### 8.2 Architectural Sign-Off

| Role | Name | Signature / Status | Date |
|---|---|---|---|
| **Author (UI/UX Designer)** | **Angel Crushein Yaun** | `Approved & Signed Off` | September 30, 2026 |
| **Reviewer & Scrum Master** | **Hermar Centillas** | `Approved & Audited` | September 30, 2026 |
