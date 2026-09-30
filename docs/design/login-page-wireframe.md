# AbangCebu AI — Login Page Wireframe & Component Layout Specification

**Sprint 1 System Architecture Specification**  
**Document Version:** 1.0.0  
**Status:** Approved & Active Design Specification  
**Jira Ticket Reference:** [SCRUM-65](https://abangcebuai.atlassian.net/browse/SCRUM-65) — *Design Login Page Wireframe / Mockup*  
**Sprint:** Sprint 1 (Foundations & Core Infrastructure)  
**Author:** Neah Moneva (UI/UX Designer)  
**Reviewed & Audited by:** Hermar Centillas (Lead / Scrum Master)  
**Design Reference Standard:** Balsamiq / Figma Grayscale Blueprint Architecture, Apple Human Interface Guidelines, WCAG 2.2 AA Ergonomics  
**Companion Assets:**
- Desktop Vector Blueprint: [`docs/assets/wireframes/login-page-desktop.svg`](../assets/wireframes/login-page-desktop.svg)
- Desktop High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Login_Page_Desktop_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Login_Page_Desktop_Wireframe_Blueprint.png)
- Mobile Vector Blueprint: [`docs/assets/wireframes/login-page-mobile.svg`](../assets/wireframes/login-page-mobile.svg)
- Mobile High-Resolution Blueprint PNG: [`docs/assets/wireframes/AbangCebu_Login_Page_Mobile_Wireframe_Blueprint.png`](../assets/wireframes/AbangCebu_Login_Page_Mobile_Wireframe_Blueprint.png)
- Formal Engineering PDF: [`docs/pdf/AbangCebu_Login_Page_Wireframe_Specification.pdf`](../pdf/AbangCebu_Login_Page_Wireframe_Specification.pdf)
- Specification Sheet Previews:
  - Page 1 (Desktop Architecture & Split Layout): [`docs/assets/wireframes/AbangCebu_Login_Page_Specification_Sheet_Page1.png`](../assets/wireframes/AbangCebu_Login_Page_Specification_Sheet_Page1.png)
  - Page 2 (Mobile Viewport & 4 Interactive States): [`docs/assets/wireframes/AbangCebu_Login_Page_Specification_Sheet_Page2.png`](../assets/wireframes/AbangCebu_Login_Page_Specification_Sheet_Page2.png)
  - Page 3 (Accessibility, Component Contracts & Sign-Off): [`docs/assets/wireframes/AbangCebu_Login_Page_Specification_Sheet_Page3.png`](../assets/wireframes/AbangCebu_Login_Page_Specification_Sheet_Page3.png)
- Related Specifications:
  - Landing Page Wireframes: [`docs/design/landing-page-wireframe.md`](./landing-page-wireframe.md)
  - Mobile Map Wireframes: [`docs/design/mobile-map-wireframes.md`](./mobile-map-wireframes.md)
  - Styling Tokens & Guidelines: [`docs/design/styling-guidelines.md`](./styling-guidelines.md)
  - Auth Session Lifecycle Specification: [`docs/specifications/auth/auth-session-lifecycle.md`](../specifications/auth/auth-session-lifecycle.md)
  - Auth Error Handling Specification: [`docs/specifications/auth/auth-error-handling.md`](../specifications/auth/auth-error-handling.md)
  - Renter Persona & Capabilities: [`docs/design/renter-persona.md`](./renter-persona.md)

---

## 1. Executive Summary & Authentication Philosophy

AbangCebu AI rejects legacy rental portals that hide listings behind forced registration walls and aggressive paywalls. In our platform, **discovery is always map-first and public**. 

Authentication is an intentional, high-trust transition designed to preserve the seeker's context while unlocking secure, verified platform interactions.

```
+---------------------------------------------------------------------------------------------------+
|                        MAP-FIRST DEFERRED AUTHENTICATION ARCHITECTURE                             |
+---------------------------------------------------------------------------------------------------+
| 1. Seamless Return to Map Canvas:                                                                 |
|    When a renter hits an auth trigger while browsing (e.g. saving a bedspace near CIT-U, messaging |
|    a verified landlord on Salinas Dr), the system captures the exact spatial state via URL:       |
|    /login?returnTo=%2Fmap%3Flat%3D10.2942%26lng%3D123.8659%26zoom%3D15%26listing%3Dcit-dorm-04     |
|    Upon successful authentication, the seeker returns instantly to the exact pinpointed location. |
|                                                                                                   |
| 2. High-Intent Trigger Threshold:                                                                 |
|    Browsing, panning, filtering, viewing commute routes, and inspecting utility submeters require  |
|    ZERO authentication. Login is prompted strictly when performing high-intent actions:           |
|    • Saving a listing to personal bookmarks                                                       |
|    • Initiating a direct real-time chat with a KYC-verified landlord                              |
|    • Scheduling an in-person or virtual ocular visit                                              |
|    • Accessing landlord listing management or KYC submission portals                              |
|                                                                                                   |
| 3. Dual-Identity Context Switching (Renter vs. Landlord):                                         |
|    A single unified login surface with an accessible role-segmented tab control clarifies user   |
|    intent, sets security expectations, and configures post-auth routing deterministically.        |
|                                                                                                   |
| 4. Spatial Trust & Anti-Scam Reassurance:                                                         |
|    The login screen integrates authentic Metro Cebu cartographic visual anchors and explicit      |
|    trust pillars (100% KYC Verified Landlords, Direct Map Discovery, Direct Inquiries).          |
+---------------------------------------------------------------------------------------------------+
```

### 1.1 Wireframe Fidelity & Blueprint Conventions

In strict compliance with professional architectural UX/UI engineering standards (Balsamiq, Figma Grayscale Blueprints), these wireframes adhere to the following principles:

1. **Monochrome / Grayscale Visual Hierarchy**:
   - Focuses strictly on layout geometry, visual balance, reading order, and component relationships prior to high-fidelity surface styling.
   - High-contrast slate and charcoal borders (`#0F172A`, `#334155`, `#94A3B8`), neutral background surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`), and focused action accents (`#047857` Cebu Emerald, `#E11D48` Sinulog Crimson for validation errors).
2. **Authentic Hardware Chassis Enclosures**:
   - **Desktop (1440px × 900px, 16:10)**: Encased in an authentic **MacBook Air aluminum chassis** with top FaceTime camera notch, 16:10 display ratio, inner matte black bezels, and bottom thumb lip.
   - **Mobile (393px × 852px, 100dvh)**: Encased in an authentic **iPhone 16 Pro Titanium chassis** featuring Apple's Dynamic Island capsule, standard iOS status bar (`9:41`, Signal, Wi-Fi, Battery), persistent bottom iOS Safari navigation bar (`🔒 abangcebu.ph ↻`), and home indicator bar.
3. **Numbered Blueprint Callout System (`①` – `⑥`)**:
   - Traceable callout badges linking directly to component dimension tables, interaction contracts, and accessibility requirements.

---

## 2. Desktop Viewport Specification (1440px × 900px · MacBook Air Enclosure)

### 2.1 Viewport Geometry & Split-Screen Architecture

On desktop screens (1440px × 900px, 16:10 ratio), the login interface implements a **balanced 50/50 split-screen architecture**:
- **Left 50% Pane (0px – 720px · Spatial Trust & Metro Cebu Branding)**:
  - Base vector map grid illustrating core Metro Cebu road corridors: **N. Bacalso Avenue**, **Osmeña Boulevard**, **Salinas Drive (Lahug / IT Park)**, and the **CCLEX Bridge**.
  - Key landmark anchor nodes: **CIT-U Campus**, **Cebu IT Park**, and **University of San Carlos (USC)**.
  - Eastern waterway hatch representing the **Mactan Channel / Cebu Strait**.
  - Live listing statistics pill: **"🟢 1,248+ Verified Beds & Rooms in Metro Cebu"**.
  - 3 Core Platform Trust Guarantees:
    1. *100% KYC Verified Landlords (Anti-Scam Tier)*
    2. *Direct Map-First Spatial Discovery & Transit Walking Lines*
    3. *Direct Landlord Inquiries & Zero Broker Fees*
  - Prominent **"← Return to Map Explorer [Esc]"** action for immediate abandonment without penalty.
- **Right 50% Pane (720px – 1440px · Centered Login Card)**:
  - Dedicated authentication surface with a **440px maximum width** centered card.
  - Structured form hierarchy designed to eliminate cognitive fatigue and maximize input speed.

```
0px                                      720px                                  1440px
+----------------------------------------+----------------------------------------+
| LEFT PANE: SPATIAL TRUST & BRANDING    | RIGHT PANE: CENTERED LOGIN CARD        |
| (Width: 720px · 50% Viewport)          | (Width: 720px · 50% Viewport)          |
|                                        |                                        |
|  [Logo] AbangCebu AI                   |       +------------------------+       |
|  🟢 1,248+ Verified Beds & Rooms       |       |  METRO CEBU DISCOVERY  |       |
|                                        |       |  Welcome back          |       |
|  [🛡️ 100% KYC Verified Landlords]      |       |  [ Renter | Landlord ] |       |
|  [🗺️ Direct Map Discovery]             |       |  Email Address         |       |
|  [💬 Direct Landlord Inquiries]        |       |  Password [Show/Hide]  |       |
|                                        |       |  [x] Remember  Forgot? |       |
|  Metro Cebu GIS Road Network           |       |  [ Sign In Button    ] |       |
|  (N. Bacalso Ave, Osmeña, IT Park)     |       |  -- OR CONTINUE WITH --|       |
|                                        |       |  [ Continue with Google]       |
|  [← Return to Map Explorer [Esc]]      |       |  Don't have account?   |       |
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
|  [🛡️] AbangCebu AI                          |                  +---------------------------------------+                  |
|  Map-Centric Rental Discovery Platform      |                  | METRO CEBU RENTAL DISCOVERY           |                  |
|                                             |                  |                                       |                  |
|  +---------------------------------------+  |                  | Welcome back                          |                  |
|  | 🟢 1,248+ Verified Beds & Rooms       |  |                  | Sign in to manage saved rooms or msgs.|                  |
|  +---------------------------------------+  |                  |                                       |                  |
|                                             |                  | SELECT ACCOUNT CONTEXT:               |                  |
|  PLATFORM TRUST GUARANTEES:                 |                  | +-------------------+---------------+ |                  |
|  +---------------------------------------+  |                  | | 👤 Renter/Seeker* | 🏠 Landlord   | |  ② Role Selector |
|  | 🛡️ 100% KYC Verified Landlords       |  |                  | +-------------------+---------------+ |                  |
|  | Zero anonymous or ghost listings. All |  |                  |                                       |                  |
|  | owners pass government ID check.      |  |                  | Email Address *                       |                  |
|  +---------------------------------------+  |                  | +-----------------------------------+ |                  |
|  +---------------------------------------+  |                  | | ✉ renter@cit.edu.ph               | |  ③ Form Inputs   |
|  | 🗺️ Direct Map Discovery & Commutes   |  |                  | +-----------------------------------+ |    (48px height) |
|  | Proximity to CIT-U, USC, IT Park with|  |                  |                                       |                  |
|  | 04L & 17B jeepney corridors.          |  |                  | Password *                            |                  |
|  +---------------------------------------+  |                  | +---------------------------------+-+ |                  |
|  +---------------------------------------+  |                  | | 🔒 ••••••••••••                 |👁||  ④ Show/Hide Eye |
|  | 💬 Direct Inquiries & Zero Middlemen  |  |                  | +---------------------------------+-+ |                  |
|  | Transparent submeters & deposits.     |  |                  |                                       |                  |
|  +---------------------------------------+  |                  | [x] Remember this device      Forgot? |                  |
|                                             |                  |                                       |                  |
|  [CIT-U CAMPUS]       [USC MAIN]            |                  | +-----------------------------------+ |                  |
|     |                     |                 |                  | | Sign In to AbangCebu →            | |  ⑤ Emerald CTA   |
|  ===N. BACALSO AVE========OSMEÑA BLVD====   |                  | +-----------------------------------+ |    (#047857)     |
|                                             |                  |                                       |                  |
|  +-----------------------------+            |                  | -------------- OR CONTINUE WITH ------|                  |
|  | ← Return to Map Explorer    | [ESC]      |                  |                                       |                  |
|  +-----------------------------+            |                  | +-----------------------------------+ |                  |
|                                             |                  | | [G] Continue with Google          | |  ⑥ OAuth PKCE    |
|  Metro Cebu GIS Engine • OpenFreeMap        |                  | +-----------------------------------+ |                  |
|  Coordinates: [123.89°E, 10.31°N]           |                  |                                       |                  |
|                                             |                  | Need an account? Sign up for free →   |                  |
|                                             |                  +---------------------------------------+                  |
|                                             |                                                                             |
+===========================================================================================================================+
```

---

### 2.3 Desktop Component Dimension Specification

| Component | Dimensions / Placement | Visual & Functional Specification |
|---|---|---|
| **MacBook Air Chassis** | `1480px × 950px` outer (`1440 × 900` screen) | Authentic aluminum frame with top FaceTime notch, camera lens, green indicator LED, and engraved bottom display hinge. |
| **Split-Screen Partition** | `x: 720px`, `y: 0 – 900px` | Crisp `1.5px` vertical divider (`#E2E8F0`) providing clear separation between spatial context and authentication card. |
| **Branding & Trust Stack** | `w: 430px`, `x: 48px`, `y: 54px` | Logo badge (`46 × 46px`), live listing count capsule (`360 × 34px`), and 3 vertically stacked trust pillar cards (`430 × 84px`). |
| **Return to Map Trigger** | `w: 230px`, `h: 42px`, `x: 48px`, `y: 660px` | Secondary button with `←` icon and keyboard shortcut badge `[ESC]`. Returns user to previous map coordinates without state loss. |
| **Login Card Surface** | `w: 440px`, `h: 788px`, `x: 860px`, `y: 56px` | Elevated white card with `16px` border-radius (`rounded-2xl`), subtle drop shadow (`feDropShadow`), and `36px` internal padding. |
| **Role Selector Control** | `w: 368px`, `h: 42px` | Two-segment control (Renter / Landlord). Active tab features white surface, emerald border, and bold text. ARIA `role="tablist"`. |
| **Input Fields (Email / Pass)**| `w: 368px`, `h: 48px` | `48px` height touch targets with leading vector icons (Mail, Lock). Masked password with dedicated `44 × 44px` show/hide toggle eye button. |
| **Primary CTA Button** | `w: 368px`, `h: 48px` | High-contrast **Cebu Emerald (`#047857`)** button, `rounded-lg`, white bold typography (`13.5px / 700`). WCAG 2.2 AA contrast ratio 5.1:1. |
| **Google OAuth Button** | `w: 368px`, `h: 46px` | Neutral white button with border (`#CBD5E1`), official Google `G` logo, and clear label. Initiates Supabase OAuth PKCE flow. |
| **Security Advisory Box** | `w: 368px`, `h: 74px` | Soft emerald background (`#F0FDF4`), border (`#86EFAC`), 256-bit SSL encryption indicator, and cookie security notice. |

---

## 3. Mobile Viewport Specification (393px × 852px · iPhone 16 Pro Frame · 100dvh)

### 3.1 Mobile Viewport Geometry & Thumb-Zone Ergonomics

On mobile viewports (393px × 852px, representing modern iPhone and high-density Android devices), the interface shifts to a **single-column focused view**:
1. **Dynamic Viewport Height (`100dvh`)**: The root container uses `min-h-[100dvh]` to eliminate clipping caused by iOS Safari's dynamic URL bar expanding and collapsing.
2. **Top Safe-Area Header (`pt-safe`)**: Positioned directly beneath Apple's Dynamic Island capsule is a persistent **`← Back to Map`** button adhering to the strict **44 × 44px minimum touch target**.
3. **Natural Thumb Zone Centering**: All primary actions—the Role Selector tabs, input fields, Remember Me checkbox, and the "Sign In to AbangCebu" CTA—are positioned in the lower two-thirds of the viewport for comfortable one-handed thumb interaction.
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
|  Sign In                                              |
|  Explore rooms, inquiries, and saved rentals.         |
|                                                       |
|  +-------------------------------------------------+  |
|  | [ 👤 Renter / Seeker* ] | [ 🏠 Property Owner ] |  |  <- Role Segmented Control (h: 42px)
|  +-------------------------------------------------+  |
|                                                       |
|  Email Address *                                      |
|  +-------------------------------------------------+  |
|  | ✉  renter@cit.edu.ph                            |  |  <- 48px height, 16px font
|  +-------------------------------------------------+  |
|                                                       |
|  Password *                                           |
|  +-----------------------------------------------+--+  |
|  | 🔒  ••••••••••••                              |👁||  <- Show/Hide eye button (44x44px)
|  +-----------------------------------------------+--+  |
|                                                       |
|  [x] Remember me                               Forgot?|  <- 44x44px touch-target-expanded
|                                                       |
|  +-------------------------------------------------+  |
|  | Sign In to AbangCebu →                          |  |  <- Cebu Emerald #047857 (48px)
|  +-------------------------------------------------+  |
|                                                       |
|  ----------------- OR CONTINUE WITH ----------------- |
|                                                       |
|  +-------------------------------------------------+  |
|  | [G] Continue with Google                        |  |  <- OAuth PKCE trigger (46px)
|  +-------------------------------------------------+  |
|                                                       |
|  Need an account? Sign up for free                    |
|                                                       |
|  +-------------------------------------------------+  |
|  | MOBILE ERGONOMIC CONTRACT                       |  |
|  | • 44×44px touch targets enforced on all items   |  |
|  | • 16px input font rule eliminates auto-zoom     |  |
|  +-------------------------------------------------+  |
|                                                       |
|  +-------------------------------------------------+  |
|  | AA     🔒 abangcebu.ph                        ↻ |  |  <- Safari Bottom Floating Bar
|  +-------------------------------------------------+  |
|                         ______                        |  <- iOS Home Indicator
+=======================================================+
```

---

## 4. Interactive Input Visual States Matrix

The login form lifecycle progresses through four deterministic visual states. Each state is explicitly defined in `docs/assets/wireframes/login-page-mobile.svg` across side-by-side iPhone 16 Pro chassis mockups.

```
+---------------------------------------------------------------------------------------------------+
|                           INPUT FIELD VISUAL STATES COMPARISON                                    |
+-------------------+--------------------+------------------------+---------------------------------+
| State             | Visual Boundary    | Helper / Inline Status | Primary CTA Appearance          |
+-------------------+--------------------+------------------------+---------------------------------+
| 1. Default/Empty  | Neutral `#CBD5E1`  | Placeholder `#94A3B8`  | Active Emerald `#047857`        |
| 2. Active/Focused | Emerald Ring `2px` | 16px Font Anti-Zoom    | Ready / Hover state             |
| 3. Validation Err | Crimson `#E11D48`  | Red Error + Lockout CT | Persistent retryable state      |
| 4. Loading/Submit | Disabled `#F8FAFC` | GoTrue Telemetry Hint  | Spinner + "Signing in..."       |
+-------------------+--------------------+------------------------+---------------------------------+
```

### 4.1 State 1: Default / Empty State
- **Trigger**: Initial page load or route transition.
- **Visual Attributes**:
  - Input borders use neutral border token `var(--border)` (`#CBD5E1`).
  - Leading icons (Mail, Lock) rendered in muted slate (`#94A3B8`).
  - Placeholder text provides authentic Metro Cebu contextual cues (`renter@cit.edu.ph`, `••••••••••••`).
  - Show/Hide eye button is in closed-eye default state (`aria-label="Show password"`).
  - Primary CTA button displays "Sign In to AbangCebu →" ready for interaction.

### 4.2 State 2: Active / Focused State
- **Trigger**: User focuses either the Email or Password input field via tap or keyboard navigation (`Tab`).
- **Visual Attributes**:
  - Active input displays a high-contrast focus ring with **Cebu Emerald (`#047857`)** outline (`2px`) and subtle emerald glow (`#A7F3D0`, `3px`).
  - Input font-size is strictly locked to **16px** to prevent iOS Safari auto-zoom.
  - When the Show/Hide eye toggle is clicked or tapped, the password field switches from `type="password"` to `type="text"`, the icon transforms into an eye-slash, and the toggle background highlights in light emerald (`#ECFDF5`).
  - A blinking vertical cursor (`#047857`) indicates active typing readiness.

### 4.3 State 3: Validation Error State (Mapped to SCRUM-57 & SCRUM-60)
- **Trigger**: Submission fails due to invalid credentials, unconfirmed email, or account suspension.
- **Visual Attributes**:
  - **Top Alert Banner**: Displays standardized error container with `role="alert"` and `aria-live="assertive"`.
    - **`AUTH_INVALID_CREDENTIALS`**: Crimson alert banner (`#FFF1F2`, border `#FDA4AF`), warning icon `⚠️`, message *"Incorrect email or password. Please verify your credentials or reset your password."*, and direct link to password recovery.
    - **`AUTH_EMAIL_NOT_CONFIRMED`**: Amber banner (`#FFFBEB`, border `#FDE68A`) with *"Your email address has not been confirmed yet"* and a *"Resend Confirmation Email"* action button.
    - **`AUTH_ACCOUNT_SUSPENDED`**: Deep crimson banner (`#FEF2F2`, border `#F87171`) citing terms of service enforcement and support contact link.
  - **Field Borders**: Invalid fields transition to **Sinulog Crimson (`#E11D48`)** border (`1.8px`) with soft crimson background tint (`#FFF1F2`).
  - **Inline Error Text**: Rendered directly below the offending input with `aria-describedby` linking (e.g. `❌ Incorrect password. 4 attempts remaining before lockout.`).

### 4.4 State 4: Loading / Submitting State
- **Trigger**: Form submission triggered via CTA button tap, keyboard `Enter`, or Google OAuth initiation.
- **Visual Attributes**:
  - All form controls (Role Selector tabs, Email input, Password input, Show/Hide toggle, Remember Me checkbox, Google button) transition to **disabled state** (`pointer-events-none`, `opacity-60`, background `#F8FAFC`).
  - Top indeterminate progress bar animates horizontally across the card header.
  - Primary CTA button transitions to darker emerald (`#065F46`), disables click triggers to prevent double-submission, and displays an animated rotating vector spinner alongside text **"Signing in..."**.
  - Screen reader announcement via `aria-live="polite"`: *"Authenticating credentials. Please wait..."*.

---

## 5. Keyboard Navigation & Screen Reader Accessibility (WCAG 2.2 AA)

AbangCebu AI enforces strict compliance with **WCAG 2.2 Level AA** standards across keyboard focus order, touch target ergonomics, contrast ratios, and assistive technology semantics.

### 5.1 Sequential Tab Order Flow

```
[1. Back to Map] ──> [2. Renter Tab] ──> [3. Landlord Tab] ──> [4. Email Input]
                                                                      │
[8. Google Button] <── [7. Sign In CTA] <── [6. Forgot Pass] <── [5. Password & Eye]
        │
[9. Sign Up Link] ──> [10. Return to Map / ESC]
```

| Tab Index | DOM Target Element | Accessible Name / Label | ARIA Role & Attributes | Keyboard Action |
|---|---|---|---|---|
| `1` | `← Back to Map` button | "Back to Map Explorer" | `role="link"`, `aria-label="Return to Map"` | `Enter` / `Space` navigates back |
| `2` | Renter Role Tab | "Renter or room seeker account" | `role="tab"`, `aria-selected="true"`, `tabindex="0"` | `ArrowRight` moves to Landlord |
| `3` | Landlord Role Tab | "Property owner or landlord account" | `role="tab"`, `aria-selected="false"`, `tabindex="-1"` | `ArrowLeft` moves to Renter |
| `4` | Email Input | "Email Address, required" | `type="email"`, `autocomplete="email"`, `aria-required="true"` | Standard typing; `Tab` to next |
| `5a` | Password Input | "Password, required" | `type="password"`, `autocomplete="current-password"`, `aria-required="true"` | Standard typing |
| `5b` | Show/Hide Eye Button | "Show password in plaintext" | `role="button"`, `aria-pressed="false"`, `aria-label="Toggle password visibility"` | `Enter` / `Space` toggles visibility |
| `6a` | Remember Me Checkbox | "Remember this device for 30 days"| `role="checkbox"`, `aria-checked="true"` | `Space` toggles check state |
| `6b` | Forgot Password Link | "Forgot password?" | `role="link"` | `Enter` routes to `/forgot-password` |
| `7` | Sign In CTA Button | "Sign In to AbangCebu" | `type="submit"`, `aria-busy="false"` | `Enter` / `Space` submits form |
| `8` | Google OAuth Button | "Continue with Google" | `role="button"`, `aria-label="Sign in with Google OAuth"` | `Enter` triggers OAuth redirect |
| `9` | Sign Up Link | "Sign up for free" | `role="link"` | `Enter` routes to `/register` |

### 5.2 Accessibility Quality Gates

1. **44 × 44px Minimum Touch Targets**:
   - All interactive controls (buttons, links, toggles, checkboxes, segmented tabs) enforce a minimum touch bounding box of `44 × 44px`. Small inline links leverage `@utility touch-target-expanded` pseudo-element hitboxes.
2. **Contrast Ratio Compliance**:
   - Primary Emerald CTA (`#047857` on `#FFFFFF` text): **5.1:1** (Exceeds 4.5:1 WCAG AA minimum).
   - Input Text (`#0F172A` on `#FFFFFF` background): **15.8:1** (Exceeds 4.5:1).
   - Placeholder Text (`#64748B` on `#FFFFFF` background): **4.6:1** (Compliant).
   - Validation Error Text (`#E11D48` on `#FFF1F2` background): **5.8:1** (Compliant).
3. **Screen Reader Live Regions**:
   - Dynamic error alerts utilize `role="alert"` and `aria-live="assertive"`.
   - Loading state transitions utilize `aria-live="polite"` with `aria-busy="true"` on the parent `<form>`.

---

## 6. Next.js 16 Component Breakdown & Route Architecture

In adherence to the **Squad Architecture Plan** and **Sprint 1 Boundaries**, the login system architecture is partitioned across Server and Client boundaries:

```
src/
└── app/
    └── (auth)/
        └── login/
            └── page.tsx              [Server Component Shell]
                ├── Metadata & SEO Header (Metro Cebu keywords)
                ├── Spatial Preservation Parser (searchParams.returnTo)
                └── LoginFormContainer  [Client Component Boundary]
                    ├── AuthAlertBanner (Accessible live error notices)
                    ├── RoleSelector (Renter / Landlord segmented tabs)
                    ├── EmailField & PasswordField (with Eye toggle)
                    ├── RememberMeCheckbox & ForgotPasswordLink
                    ├── SubmitCTAButton (Pending spinner state)
                    └── SocialAuthButtons (Google OAuth PKCE trigger)
```

### 6.1 Architectural Component Contracts

| Component Identifier | Boundary | File Path Target (Sprint 2) | Architectural Contract & Responsibilities |
|---|---|---|---|
| `LoginPage` | **Server** | `src/app/(auth)/login/page.tsx` | Validates `searchParams.returnTo` against open-redirect allowlists (SCRUM-60). Renders metadata, OpenGraph tags, and wraps client form in Suspense. |
| `LoginForm` | **Client** | `src/components/auth/login-form.tsx` | Client Component using React 19 `useActionState(loginAction, initialState)`. Manages visual states (Default, Active, Error, Loading) and ARIA attributes. |
| `RoleSelector` | **Client** | `src/components/auth/role-selector.tsx` | Accessible WAI-ARIA tablist toggle switching between `'renter'` and `'landlord'` identity contexts. |
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
--color-card: #ffffff;            /* Elevated Login Card: Pure White */
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

- [x] **Jira Traceability**: Document explicitly linked to Jira ticket [SCRUM-65](https://abangcebuai.atlassian.net/browse/SCRUM-65).
- [x] **Balsamiq/Figma Blueprint Conventions**: Grayscale monochrome foundation, clean strokes, crossed `[X]` placeholders, and authentic device frames.
- [x] **Desktop Viewport Specification (1440 × 900)**: Authentic MacBook Air chassis, 50/50 split-screen architecture, Metro Cebu spatial map grid (N. Bacalso, Osmeña, IT Park, CIT-U), 3 trust pillars, and 440px centered login card.
- [x] **Mobile Viewport Specification (393 × 852 · 100dvh)**: Authentic iPhone 16 Pro chassis, Dynamic Island, top safe-area `← Back to Map` button, single-column thumb zone ergonomics, and Safari bottom address bar.
- [x] **4 Interactive Input States Matrix**: Comprehensive coverage of State 1 (Default/Empty), State 2 (Active/Focused), State 3 (Validation Error mapped to `AUTH_INVALID_CREDENTIALS`), and State 4 (Loading/Submitting with animated spinner).
- [x] **Accessibility (WCAG 2.2 AA)**: Strict 44 × 44px touch targets, contrast ratios >= 4.5:1, 16px mobile input font rule, full keyboard tab order flow, and ARIA attributes.
- [x] **Component Hierarchy & Server/Client Boundaries**: Detailed mapping for `login/page.tsx`, `LoginForm`, `RoleSelector`, `SocialAuthButtons`, and `AuthAlertBanner`.
- [x] **Sprint 1 Iron Rule**: Zero premature React/JSX UI components created in `src/components/`.
- [x] **Vector & Rendered Assets**: High-resolution vector SVGs, PNG blueprints, and formal WeasyPrint PDF compiled and stored in repository.

### 8.2 Architectural Sign-Off

| Role | Name | Signature / Status | Date |
|---|---|---|---|
| **Author (UI/UX Designer)** | **Neah Moneva** | `Approved & Signed Off` | September 30, 2026 |
| **Reviewer & Scrum Master** | **Hermar Centillas** | `Approved & Audited` | September 30, 2026 |
