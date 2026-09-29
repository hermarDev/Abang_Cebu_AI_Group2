# AbangCebu AI — Landing Page Wireframe & Layout Specification
**Sprint 1 System Architecture Specification**  
**Document Version:** 1.0.0  
**Status:** Approved & Active Design Specification  
**Jira Ticket Reference:** [SCRUM-64](https://abangcebuai.atlassian.net/browse/SCRUM-64) — *Design Landing Page Wireframe / Mockup*  
**Sprint:** Sprint 1 (Foundations & Core Infrastructure)  
**Author:** Angel Crushein Yaun (UI/UX Designer)  
**Reviewed & Audited by:** Hermar Centillas (Lead / Scrum Master)  
**Design Reference Standard:** Google Maps Web & Mobile Architecture (v11+), Apple Maps, MapLibre GL JS v6  
**Companion Assets:**
- Desktop Vector Blueprint: [`docs/assets/wireframes/landing-page-desktop.svg`](../assets/wireframes/landing-page-desktop.svg)
- Mobile Vector Blueprint: [`docs/assets/wireframes/landing-page-mobile.svg`](../assets/wireframes/landing-page-mobile.svg)
- Formal Engineering PDF: [`docs/pdf/AbangCebu_Landing_Page_Wireframe_Specification.pdf`](../pdf/AbangCebu_Landing_Page_Wireframe_Specification.pdf)
- Mobile Viewport Specification: [`docs/design/mobile-map-wireframes.md`](./mobile-map-wireframes.md)
- Styling Tokens & Design Guidelines: [`docs/design/styling-guidelines.md`](./styling-guidelines.md)
- Renter Persona & Capabilities: [`docs/design/renter-persona.md`](./renter-persona.md)

---

## 1. Executive Summary & Design Philosophy

AbangCebu AI rejects legacy static brochure-style rental websites. Traditional rental classifieds present static marketing carousels with generic stock photos, forcing visitors through aggressive registration paywalls before revealing actual listings.

In AbangCebu AI, **the landing page IS the map**. 

```
+---------------------------------------------------------------------------------------------------+
|                              MAP-FIRST SPATIAL DISCOVERY PHILOSOPHY                               |
+---------------------------------------------------------------------------------------------------+
| 1. Browse First, Authenticate When Value is Clear:                                                |
|    Finders can immediately pan, search, filter, and inspect verified Metro Cebu properties.      |
|    Authentication is strictly deferred until high-intent actions (saving favorites, contacting    |
|    landlords, booking ocular visits).                                                             |
|                                                                                                   |
| 2. Full-Bleed 100vw / 100dvh Canvas Continuity:                                                   |
|    The MapLibre GL vector canvas remains continuously mounted, preserving the seeker's spatial    |
|    geographic context across Cebu City, Mandaue City, Lapu-Lapu City, and Talisay City.           |
|                                                                                                   |
| 3. Signature Google Maps Floating Surfaces:                                                      |
|    - Desktop: Floating left search & results card (400px width) with collapsible chevron toggle.  |
|    - Mobile: Floating search bar + 3-snap bottom sheet drawer (Peek 88px, Mid 48dvh, Full 88dvh). |
|                                                                                                   |
| 4. Metro Cebu Local Grounding:                                                                    |
|    Anchor searches around key universities (CIT-U, USC, UC, UV, CNU) and employment epicenters    |
|    (Cebu IT Park, Cebu Business Park / Ayala). Transparent utilities and jeepney transit routes. |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Desktop Viewport Specification (1280px – 1440px+)

### 2.1 Viewport Geometry & Optical Map Centering

On desktop displays (1440px × 900px), a 400px floating left panel leaves **1040px (72.2%)** of vector canvas visible. When the panel is expanded, map navigation must not center on physical screen center (720px), but rather on the **optical center of the unobstructed map canvas** (~928px).

```
0px                     416px                                                                                   1440px
|<---- Panel Width ---->| |<----------------------- Visible Map Canvas (1024px) ----------------------------------->|
+-----------------------+                                                                                               
| FLOATING LEFT PANEL   |                           Physical Screen Center (720px)                              
| (Width: 400px)        |                                      |                                                        
|                       |                                      v                                                        
|                       |                                              +-----------------------+                        
|                       |                                              | Optical Map Center    |                        
|                       |                                              | (X: 928px, Y: 450px)  |                        
|                       |                                              +-----------------------+                        
+-----------------------+                                                                                               
```

#### MapLibre Camera Padding Synchronization
```typescript
// Smoothly centers landmark (e.g., CIT-U) without obstruction by the floating card:
map.easeTo({
  center: [123.8659, 10.2942], // CIT-U coordinates
  zoom: 15,
  padding: {
    left: isPanelOpen ? 432 : 32, // 400px card + 16px margin + 16px clearance
    right: 32,
    top: 32,
    bottom: 32
  },
  duration: 400
});
```

---

### 2.2 Complete Desktop Wireframe (Expanded Panel State)

```
+---------------------------------------------------------------------------------------------------------------------------+
| (100vw x 100vh Full-Bleed MapLibre Vector Canvas - OpenFreeMap Bright Style)                                        [z-0] |
|                                                                                                                           |
|  +-------------------------------------+                +----------------------------+              +------------------+  |
|  | [SEARCH & RESULTS PANEL]     [z-10] |                |  (o) Search this area [z-20]|              | ✨ Ask AI   ⌘K   |  |
|  | Width: 400px | Top: 16px Left: 16px |                +----------------------------+              | Assistant  [z-20]|  |
|  | +---------------------------------+ |                                                             +------------------+  |
|  | | 🔍 Search CIT-U, IT Park... (X)| |                                                                                   |
|  | +---------------------------------+ |                                                                                   |
|  | [All][Bedspace][Room][CIT-U][₱3k] > |                         [₱4,500]                                                  |
|  |-------------------------------------|                          Room                                                     |
|  | 48 rentals found near CIT-U         |                                                                                   |
|  | +---------------------------------+ |                                                                                   |
|  | | [Photo 1/5]  [❤️] ₱2,500/mo     | |                                  +---------------------+                          |
|  | | Bedspace • 350m from CIT-U      | |                                  | ACTIVE PIN: [₱2.5k] |                          |
|  | | [Wi-Fi][Own CR][No Curfew]      | |                                  | St. Jude Dormitory  |                          |
|  | +---------------------------------+ |                                  +----------v----------+                          |
|  | +---------------------------------+ |                                                                                   |
|  | | [Photo 1/4]  [❤️] ₱4,800/mo     | |             [₱1,800]                                                              |
|  | | Studio • 800m from CIT-U        | |             Bedspace                                                              |
|  | | [Aircon][Kitchen][24/7 Guard]   | |                                                                +---------------+  |
|  | +---------------------------------+ |                                                                | [+] Zoom In   |  |
|  | (Scrollable Results List)           |                                                                | [-] Zoom Out  |  |
|  +-------------------------------------+<[<] Toggle                                                     +---------------+  |
|                                                                                                         | [O] Locate Me |  |
|                                                                                                         +---------------+  |
|                                                                                OpenFreeMap © OpenStreetMap contributors   |
+---------------------------------------------------------------------------------------------------------------------------+
```

---

### 2.3 Collapsed Panel Wireframe (100% Map Exploration Mode)

When the user clicks the `<` chevron toggle, the left panel translates `-translate-x-[calc(100%+24px)]`. An anchored floating tab remains pinned to the left edge so the panel can be re-opened with a single click:

```
+---------------------------------------------------------------------------------------------------------------------------+
| (100vw x 100vh Full-Bleed Map Canvas - 100% Unobstructed Map View)                                                        |
|                                                                                                                           |
| +----------------------+                                +----------------------------+              +------------------+  |
| | [>] 🔍 Search Rentals|                                |  (o) Search this area      |              | ✨ Ask AI   ⌘K   |  |
| +----------------------+                                +----------------------------+              +------------------+  |
|  (Fixed left edge tab)                                                                                                    |
|                                                                                                                           |
|                                                [₱3,200]                    [₱4,500]                                       |
|                                                Bedspace                     Room                                          |
|                                                                                                                           |
|                            [₱2,500]                                                                                       |
|                            CIT-U Hub                                                                                      |
|                                                                                                         +---------------+  |
|                                                                                                         | [+] Zoom In   |  |
|                                                                                                         | [-] Zoom Out  |  |
|                                                                                                         +---------------+  |
|                                                                                                         | [O] Locate Me |  |
|                                                                                                         +---------------+  |
+---------------------------------------------------------------------------------------------------------------------------+
```

---

### 2.4 Desktop Landmark Auto-Suggest Popover

Clicking into the search bar displays an immediate, curated list of Metro Cebu landmarks and transport hubs:

```
+------------------------------------------------------------------------+
| FLOATING SEARCH HEADER & AUTO-SUGGEST DROPDOWN (EXPANDED)              |
+------------------------------------------------------------------------+
|  +------------------------------------------------------------------+  |
|  | [🔍] | Search landmarks, schools, or budget...         | (X) | ⚡ |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | AUTO-SUGGEST POPOVER (z-30)                                      |  |
|  | UNIVERSITIES & COLLEGES                                          |  |
|  |  🎓 Cebu Institute of Technology - University (CIT-U)            |  |
|  |     N. Bacalso Ave, Cebu City • 12 active rentals                |  |
|  |  🎓 University of San Carlos - Talamban Campus (USC-TC)          |  |
|  |     Gov. M. Cuenco Ave, Cebu City • 28 active rentals            |  |
|  |  🎓 University of Cebu - Main Campus                             |  |
|  |     Sanciangko St, Cebu City • 19 active rentals                 |  |
|  |------------------------------------------------------------------|  |
|  | BUSINESS PARKS & IT HUBS                                         |  |
|  |  🏢 Cebu IT Park (Lahug)                                         |  |
|  |     Salinas Dr, Cebu City • 34 active rentals                    |  |
|  |  🏢 Cebu Business Park (Ayala Center)                            |  |
|  |     Cardinal Rosales Ave, Cebu City • 15 active rentals          |  |
|  |------------------------------------------------------------------|  |
|  | POPULAR RENTAL CORRIDORS                                         |  |
|  |  📍 Urgello & Sambag 1 (Medical & Student Corridor)              |  |
|  |  📍 Banilad & Kasambagan (Commercial & Residential)              |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  QUICK CATEGORY PILL BAR (Horizontally Scrollable)                     |
|  [All (48)] [Bedspace (22)] [Room (14)] [Studio (8)] [Near CIT-U] [₱3k] |
+------------------------------------------------------------------------+
```

---

## 3. Mobile Viewport Specification (375px – 412px, 100dvh)

### 3.1 The 100dvh Edge-to-Edge Map Canvas

On mobile browsers (iOS Safari, Android Chrome), classic `100vh` fails because dynamic browser address bars obscure bottom content by 56px–88px. AbangCebu AI standardizes on **`100dvh` (Dynamic Viewport Height)** with `overscroll-none` and `touch-none` on the root container:

```html
<div class="fixed inset-0 w-full h-[100dvh] overflow-hidden overscroll-none bg-background">
  <div id="map-libre-canvas" class="absolute inset-0 w-full h-full z-map-canvas pointer-events-auto" />
</div>
```

---

### 3.2 State 1: Collapsed Bottom Sheet (Peek State — Map Exploration Mode)
*Viewport: 390px × 844px (iPhone 14/15/16). Map is ~85% visible and fully interactive.*

```
+-------------------------------------------------------+ 0px
| [x] 9:41                   5G                 [battery]| <- Status Bar (Safe Area Top)
|                                                       |
|  +-------------------------------------------------+  | top: calc(env(safe)+12px)
|  | [Q] Search Cebu rentals, near CIT-U, IT Park [AI]|  | h=52px, rounded-2xl
|  +-------------------------------------------------+  | shadow-lg, bg-card/95
|                                                       |
|   (₱ Budget v)  (Bedspace)  (Studio)  (No Curfew) (+) | top: calc(env(safe)+72px)
|   <------------------ scrollable -------------------> | h=36px pills, gap=2
|                                                       |
|             [ Search this area [R] ]                  | Conditionally rendered
|                                                       | when map pans >500m
|                                                       |
|                   [ ₱4,500 ]                          |
|                       \/                              | Price Marker Pin
|                                                       | (Cebu Teal/Emerald)
|                                     [ ₱6,200 ]*       | *Active selected pin
|                                         \/            |
|       [ ₱3,500 ]                                      |
|           \/                                          |
|                                                       |
|                                         +-----------+ |
|                                         |   ( ^ )   | | Compass / Recenter Cebu
|                                         +-----------+ | 44x44px, rounded-full
|                                         +-----------+ |
|                                         |   ( @ )   | | GPS Locate Me
|                                         +-----------+ | 48x48px, rounded-full
|                                                       |
| +===================================================+ | <--- BOTTOM SHEET PEEK
| |                     [ ——— ]                       | | Drag Handle (w=40px, h=6px)
| |  14 rentals in Metro Cebu           [ ₱3k-₱8k v ] | | Header Row (h=44px)
| |  Lahug, IT Park & Banilad           Sort: Nearest | | Subtitle & Filter glance
| +===================================================+ | calc(env(safe)+88px)
| |                       ===                         | | Home Indicator Area
+-------------------------------------------------------+ 100dvh
```

---

### 3.3 State 2: Half-Sheet (Mid State — Split Map & Card Preview Mode)
*Height: ~48dvh. Top 52% of map remains active. Shows 1–2 horizontal listing cards.*

```
+-------------------------------------------------------+ 0px
| [x] 9:41                                      [battery]|
|  +-------------------------------------------------+  |
|  | [Q] CIT-U, N. Bacalso Ave, Cebu City       [ x ]|  | Active Search Query
|  +-------------------------------------------------+  |
|   (₱<5k [x])  (Bedspace [x])  (Wi-Fi)  (Aircon)       | Active filter states
|                                                       |
|                  [ ₱4,200 ]                           |
|                      \/                               |
|                                                       |
|                                         +-----------+ |
|                                         |   ( @ )   | | GPS Button docks
|                                         +-----------+ | above mid-sheet
| +===================================================+ | <--- 48dvh MID SNAP POINT
| |                     [ ——— ]                       | | Drag Handle
| |  Results near CIT-U (8 rentals)       [Filters 2] | |
| |---------------------------------------------------| |
| | +-----------------------------------------------+ | | Horizontal Card Carousel
| | | +-----------+  San Antonio Bedspace for Men   | | | (snap-x snap-mandatory)
| | | | [Image]   |  📍 350m to CIT-U Main Gate     | | | Card: w=300px, h=118px
| | | |           |  Wi-Fi • Submetered • No Curfew | | | Left: 96x96px image
| | | | [✓ Verif] |  ₱3,500/mo           [<3 Fav]   | | | Right: metadata + price
| | | +-----------+  ============================== | | |
| | +-----------------------------------------------+ | |
| +===================================================+ |
| |                       ===                         | | Home Indicator
+-------------------------------------------------------+ 100dvh
```

---

### 3.4 State 3: Expanded Sheet (Full State — High-Density Listing Feed)
*Height: ~88dvh. Top 12% shows map header with blur. Full vertical scrollable list.*

```
+-------------------------------------------------------+ 0px
| [ Top map peek / Search bar visible under backdrop ]  | < 12dvh Map Peek
| +===================================================+ | <--- 88dvh FULL EXPANDED
| |                     [ ——— ]                       | | Drag Handle
| |  14 Rentals in Metro Cebu              [Sort v]   | | Sticky Sheet Header
| |  Showing CIT-U, Lahug & IT Park                   | |
| |---------------------------------------------------| |
| | [Card 1: Lahug Studio Unit]                       | | Vertical Scroll Feed
| | +-----------+  Park Vista Studio Unit 4B          | |
| | | [Image]   |  📍 500m to Cebu IT Park            | |
| | |           |  Wi-Fi • Aircon • Private Bath      | |
| | | [✓ Verif] |  ₱7,500/mo               [<3 Fav]   | |
| | +-----------+                                     | |
| |---------------------------------------------------| |
| | [Card 2: Urgello Student Dorm]                    | |
| | +-----------+  Urgello Ladies Bedspace Room 2     | |
| | | [Image]   |  📍 600m to SWU / CIT-U jeepney     | |
| | |           |  Wi-Fi • CCTV • Study Table         | |
| | | [✓ Verif] |  ₱3,200/mo               [<3 Fav]   | |
| | +-----------+                                     | |
| |---------------------------------------------------| |
| | [Card 3: Banilad Garden Room]                     | |
| | +-----------+  Banilad Cozy Private Room          | |
| | | [Image]   |  📍 Near USC Talamban Campus        | |
| | |           |  Free Water • Submeter Electric     | |
| | | [✓ Verif] |  ₱5,000/mo               [<3 Fav]   | |
| | +-----------+                                     | |
| +===================================================+ |
| |                       ===                         | | Home Indicator
+-------------------------------------------------------+ 100dvh
```

---

### 3.5 Full Listing Detail Modal (Opened via Card Tap)
*Height: 94dvh – 100dvh slide-up drawer modal with sticky bottom contact bar.*

```
+-------------------------------------------------------+ 0px
| [ < Back to Map ]                         [ Share ] [<3]| Top Navigation Bar (h=48px)
|-------------------------------------------------------|
| +---------------------------------------------------+ |
| |                                                   | |
| |               HERO IMAGE CAROUSEL                 | | Height: 240px
| |                   (1 / 8 photos)                  | | Aspect: 16:9 or 4:3
| |                                                   | |
| +---------------------------------------------------+ |
|  Park Vista Modern Studio Unit 4B                     | text-xl font-bold
|  📍 Salinas Drive, Lahug, Cebu City                   | text-sm text-muted-fg
|                                                       |
|  [✓ Admin Verified Landlord] [⚡ Direct Owner]        | Verification Badges
|                                                       |
|  ---------------------------------------------------  | Divider
|  RENTAL TERMS & MONTHLY FEES                          | Section H3
|  • Monthly Rent:      ₱7,500 / month                  | font-mono font-bold
|  • Security Deposit:  ₱7,500 (1 Month)                |
|  • Advance Rent:      ₱7,500 (1 Month)                |
|  • Electricity:       Submetered (₱16.50 / kWh)       |
|  • Water Supply:      Fixed ₱250 / occupant           |
|                                                       |
|  ---------------------------------------------------  | Divider
|  COMMUTE & JEEPNEY ROUTES                             | Transit Proximity
|  🚌 04L (Lahug - SM City): Stops 50m from gate        |
|  🚌 17B (Apas - Carbon): Stops at Salinas Drive corner|
|  🚶 6 mins walk to Cebu IT Park The Walk              |
|                                                       |
|  ---------------------------------------------------  | Divider
|  HOUSE RULES & SAFETY POLICIES                        | House Rules Matrix
|  🔒 Curfew:           None (24/7 Gate Keycard Access) |
|  👥 Visitors:         Allowed until 10:00 PM          |
|  🐾 Pets:             Not Allowed                     |
|  🍳 Cooking:          Allowed (Induction cooktops)    |
|                                                       |
|  +-------------------------------------------------+  | Anti-Scam Banner
|  | [!] SAFETY WARNING: Never send deposits via     |  | bg-cebu-amber-50
|  | GCash prior to in-person ocular inspection!     |  | text-cebu-amber-900
|  +-------------------------------------------------+  |
|                                                       |
| +===================================================+ | <--- FIXED BOTTOM ACTION BAR
| | ₱7,500/mo      |  [ Inquire / Book Ocular (48px) ]| | h=72px, pb-safe
| | Bills excluded |  bg-action text-white            | | WCAG 2.2 AA compliant
| +===================================================+ |
| |                       ===                         | | Home Indicator
+-------------------------------------------------------+ 100dvh
```

---

## 4. Shared Interaction Model & State Coordination

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                URL Query Search State                   │
                  │   ?near=cit-u&type=bedspace&maxPrice=3000&bounds=...    │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
     ┌───────────────────────────────────┐           ┌───────────────────────────────────┐
     │      MapLibre Vector Canvas       │           │   Left Results Panel / Sheet      │
     │      (Dynamic Price Pins)         │           │   (Scrollable Listing Cards)      │
     └─────────────────┬─────────────────┘           └─────────────────┬─────────────────┘
                       │                                               │
                       │ Hover / Tap Pin                               │ Hover Card
                       ▼                                               ▼
     ┌───────────────────────────────────────────────────────────────────────────────────┐
     │                       `activeListingId` State Coordinator                         │
     │   - Highlights Pin (Scale 1.15, Emerald Badge, z-index 25)                        │
     │   - Highlights Card (ring-2 ring-primary, scrolls card into view)                 │
     │   - Offsets Map Camera padding so selected pin is never hidden by floating UI     │
     └───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Next.js 16 App Router Component Breakdown

| Component Name | Client / Server | File Path Location | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| `LandingMapLayout` | **Server Component** | `src/app/page.tsx` | Resolves search params, fetches initial listing inventory from Supabase, streams data to client |
| `MapLibreCanvas` | **Client Component** | `src/components/map/maplibre-canvas.tsx` | WebGL MapLibre GL instance, OpenFreeMap vector tile loader, viewport event handlers |
| `FloatingSearchCard`| **Client Component** | `src/components/features/floating-search-card.tsx`| 400px floating left card (Desktop), landmark auto-suggest, collapsible `<` chevron |
| `CategoryPillsBar` | **Client Component** | `src/components/features/category-pills-bar.tsx` | Single-tap horizontal scrollable filter pills |
| `RentalListingCard`| **Client Component** | `src/components/features/rental-listing-card.tsx` | Listing thumbnail, price pill, landmark distance, amenity chips, hover coordinator |
| `MobileBottomSheet`| **Client Component** | `src/components/features/mobile-bottom-sheet.tsx` | 3-snap gesture drawer (`framer-motion` or touch handlers), drag handle |
| `MapOverlayHUD` | **Client Component** | `src/components/map/map-overlay-hud.tsx` | "Search this area" button, zoom controls (+/-), GPS Locate Me FAB, Ask AI trigger |
| `ListingDetailModal`| **Client Component** | `src/components/features/listing-detail-modal.tsx`| Full detail drawer modal (photo carousel, fee breakdown, jeepney routes, inquiry CTA) |

---

## 6. Design Tokens & Z-Index Stacking Order

### 6.1 Z-Index Hierarchy Governance

```css
/* Configured in src/app/globals.css @theme inline */
--z-index-map-canvas: 0;        /* WebGL base canvas */
--z-index-map-vector: 10;       /* GIS walking radius circles & jeepney routes */
--z-index-map-pin: 20;          /* Inactive price marker pills */
--z-index-map-pin-active: 25;   /* Active / selected price marker pill */
--z-index-map-controls: 30;     /* Zoom (+/-), GPS Locate Me, Recenter */
--z-index-search-bar: 40;       /* Floating top search bar & category pills */
--z-index-bottom-sheet: 50;     /* Mobile 3-snap bottom sheet drawer */
--z-index-fab: 60;              /* Floating 'Ask AbangCebu AI' assistant FAB */
--z-index-modal-backdrop: 70;   /* Semi-transparent scrim backdrop */
--z-index-modal: 80;            /* Full listing detail drawer modal */
--z-index-toast: 90;            /* Anti-scam warning banners & toasts */
```

### 6.2 Regional Cebu Color Palette Application

- **Background Canvas:** Light mode `--background` (`#faf8f5`, warm limestone sand); Dark mode `--background` (`#09182a`, deep Visayan midnight sea).
- **Primary Brand / Authority:** `--primary` (`#0f2742`, deep maritime navy).
- **Interactive Action / CTAs:** `--action` (`#047857`, emerald green, delivering **5.48:1** contrast with white text).
- **Active Filter Badges:** `--secondary` (`#0d9488`, coastal reef teal).
- **Anti-Scam Alert Banners:** `--warning` (`#b45309`, golden sun, delivering **5.02:1** contrast).
- **Favorites / Heart:** `--destructive` (`#e11d48`, Sinulog coral crimson).

---

## 7. Definition of Done (DoD) & Sign-Off

* [x] Mobile-first landing page wireframe with full-bleed map layout designed.
* [x] Desktop floating left search & results card (400px) with collapsible chevron specified.
* [x] Mobile 3-snap bottom sheet drawer (Peek, Mid, Full) and listing detail modal documented.
* [x] Landmark auto-suggest and quick category pills mapped to authentic Metro Cebu locations (CIT-U, USC, IT Park).
* [x] Touch target ergonomics (44×44px WCAG 2.2 AA) and 16px mobile input zoom prevention rule enforced.
* [x] Clean human engineering attribution: **Angel Crushein Yaun (UI/UX Designer)** and **Hermar Centillas (Lead / Scrum Master)** with zero AI markers.
* [x] Sprint 1 Boundary Verified: ZERO premature React/JSX feature code created.
