# AbangCebuAI Mobile Map-First UI/UX & Wireframe Specifications
**Sprint 1 System Architecture Specification**  
*Document Version:* 1.0.0  
*Viewport Standard:* Mobile Small to Standard (375px – 412px, 100dvh)  
*Interaction Reference:* Google Maps Mobile (v11+), Apple Maps (iOS 17/18), MapLibre GL  
*Target Platforms:* Mobile WebKit (iOS Safari), Chrome Android, PWA Mobile  
*Accessibility Standard:* WCAG 2.2 Level AA / Level AAA Target Sizing (44×44px)  
*Status:* Approved & Production-Ready Reference  

---

## 1. Executive Summary & Mobile Architecture Principles

AbangCebuAI is engineered around an **uncompromising mobile map-first paradigm**. Property seekers in Metro Cebu—predominantly university students (CIT-U, USC-Talamban, UP Cebu, UC) and BPO professionals (Cebu IT Park, Cebu Business Park)—conduct rapid search sessions on mobile handheld devices while commuting on jeepneys (routes 04L, 17B, 13C), Modern PUVs, or navigating humid streets.

```
+--------------------------------------------------------------------------+
|                       CORE MOBILE PILLARS                                |
+--------------------------------------------------------------------------+
| 1. Full-Bleed 100dvh Viewport: Zero rubber-band clipping or bar shifting |
| 2. Google Maps-Style 3-Snap Bottom Sheet: Collapsed / Half / Full Feed   |
| 3. High-Contrast Price Pins: Immediate rental price recognition on map   |
| 4. Ergonomic Thumb-Zone Floating Controls: Docked above bottom sheet     |
| 5. Strict 44x44px Touch Targets: Zero mis-taps on bustling map surface   |
| 6. Anti-Zoom 16px Input Rule: Prevents iOS Safari destructive auto-zoom  |
+--------------------------------------------------------------------------+
```

---

## 2. 100dvh Full-Bleed Map Viewport Specification

### 2.1 The Mobile Viewport Height Problem: 100vh vs 100dvh

On mobile browsers (iOS Safari, Android Chrome), the browser navigation chrome (top address bar, bottom toolbar) expands and contracts dynamically based on user scroll gestures.

```
       100vh Hazard (Classic CSS)             100dvh Solution (Modern WebKit/Blink)
  +--------------------------------+       +--------------------------------+
  | [ URL Bar (56px)             ] |       | [ URL Bar (56px)             ] |
  +================================+ <0    +================================+ <0
  |                                |       |                                |
  | Map Surface                    |       | Map Surface                    |
  |                                |       |                                |
  |                                |       |                                |
  | Bottom Sheet Peek (Visible)    |       | Bottom Sheet Peek (Docked)     |
  + - - - - - - - - - - - - - - - -+       +--------------------------------+ <100dvh
  | Bottom Sheet Clipped by Chrome |       | [ Bottom Safari Bar (44px)   ] |
  +--------------------------------+ <100vh+--------------------------------+
  | [ Bottom Safari Bar (44px)   ] |
  +--------------------------------+
   RESULT: Bottom Sheet & FABs             RESULT: Exact alignment, bottom sheet
   get hidden beneath Safari bar           rests perfectly above Home Indicator
```

- **`100vh`**: Evaluates to the large viewport height (assuming address bar is retracted). When the address bar is visible, content overflows the visible screen by 56px–88px, burying bottom action bars, floating GPS buttons, and the bottom sheet peek bar.
- **`100dvh` (Dynamic Viewport Height)**: Dynamically computes the exact visible viewport between top and bottom browser chrome.
- **Viewport Lock**: To prevent canvas re-rendering thrashing and rubber-banding during map dragging, the root viewport container is locked with `fixed inset-0 w-full h-[100dvh] overflow-hidden overscroll-none touch-none`.

### 2.2 Edge-to-Edge MapLibre GL Surface Architecture

```html
<!-- Root Full-Bleed Map Viewport Wrapper -->
<div class="fixed inset-0 w-full h-[100dvh] overflow-hidden overscroll-none bg-background">
  <!-- MapLibre WebGL Canvas Container (Full Bleed) -->
  <div 
    id="map-libre-canvas"
    class="absolute inset-0 w-full h-full z-map-canvas pointer-events-auto"
    style="touch-action: pan-x pan-y pinch-zoom;"
  />

  <!-- Map Attributions (Relocated to avoid sheet obstruction) -->
  <div class="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] left-2 z-map-vector text-[10px] text-muted-foreground/60 select-none pointer-events-none">
    © OpenStreetMap contributors | © MapLibre
  </div>
</div>
```

---

## 3. Comprehensive ASCII Wireframes (375px – 412px Viewport)

### 3.1 State 1: Collapsed Bottom Sheet (Peek State — Map Exploration Mode)
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
|                                                       |
|                                     [ ₱6,200 ]*       | *Active selected pin
|                                         \/            |
|       [ ₱3,500 ]                                      |
|           \/                                          |
|                                                       |
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

### 3.2 State 2: Half-Sheet (Mid State — Split Map & Card Preview Mode)
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

### 3.3 State 3: Expanded Sheet (Full State — High-Density Listing Feed)
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

### 3.4 Full Listing Detail Modal (Opened via Card Tap)
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

## 4. Component Layout Specifications & Touch Ergonomics

### 4.1 Floating Top Search Bar Pill
- **Container Positioning**:
  - `fixed top-[calc(env(safe-area-inset-top,0px)+12px)] inset-x-4 z-search-bar max-w-md mx-auto`
  - Bounding dimensions: `h-[52px]` (exceeds 44px minimum target).
  - Shape & Shadow: `rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-lg shadow-cebu-navy-950/10`
- **Internal Elements**:
  - Left Search Icon: `w-5 h-5 text-muted-foreground ml-3.5 mr-2.5 shrink-0`
  - Input Trigger Button:
    - `flex-1 h-full text-left flex items-center pr-2`
    - Label: `"Search Cebu rentals, near CIT-U, IT Park..."`
    - Font: `text-base` (16px strictly enforced to prevent iOS WebKit auto-zoom)
    - Color: `text-muted-foreground font-normal truncate`
  - Divider: `h-6 w-px bg-border mx-1 shrink-0`
  - Right Action Trigger (AI Sparkles or Filter Count):
    - `w-11 h-11 rounded-full flex items-center justify-center text-primary hover:bg-muted active:scale-95 touch-target mr-1`
    - When active filters exist: Display `bg-action text-action-foreground text-[10px] font-bold rounded-full w-5 h-5 absolute -top-1 -right-1`.

### 4.2 Horizontal Filter Pills Row
- **Container Positioning**:
  - `fixed top-[calc(env(safe-area-inset-top,0px)+72px)] inset-x-0 z-search-bar flex items-center gap-2 px-4 overflow-x-auto no-scrollbar py-1`
- **Pill Geometry & Touch Target Enforcement**:
  - Visual Height: `h-9 (36px)`
  - Padding: `px-3.5 py-1.5`
  - Utility Class: `touch-target-expanded` (invisible `::after` element expands hit target to `44×44px` per WCAG 2.2 AA).
  - Border Radius: `rounded-full`
- **Filter States & Styling**:
  - Inactive State: `bg-card/90 backdrop-blur-xs text-foreground border border-border shadow-xs hover:bg-muted active:scale-95`
  - Active State: `bg-secondary text-secondary-foreground border-secondary font-semibold shadow-xs active:scale-95`
- **Default Cebu Filter Items**:
  1. `₱ Budget` (Toggles preset ceilings: `Under ₱4k`, `₱4k-₱7k`, `₱7k-₱12k`)
  2. `Bedspace` (Single tap category toggle)
  3. `Studio` (Single tap category toggle)
  4. `No Curfew` (Crucial tag for BPO night-shift workers)
  5. `Aircon` (High priority comfort tag)
  6. `+ Filters` (Opens comprehensive multi-filter bottom drawer)

---

### 4.3 Google Maps Style Bottom Sheet Drawer (3 Snap Points)

| Snap Point | Height Token | CSS Height Rule | Screen Real Estate | Primary Interaction State |
| :--- | :--- | :--- | :--- | :--- |
| **A. Collapsed (Peek)** | `--sheet-collapsed-height` | `calc(env(safe-area-inset-bottom, 0px) + 88px)` | ~15% screen height | Full map exploration; shows summary count & drag handle |
| **B. Half-Sheet (Mid)** | `--sheet-mid-height` | `48dvh` | ~48% screen height | Coexistence: 52% map view + 1-2 horizontal listing cards |
| **C. Expanded (Full)** | `--sheet-expanded-height` | `calc(100dvh - env(safe-area-inset-top, 0px) - 24px)` | ~88% screen height | Immersive listing discovery; high-density vertical scroll feed |

#### Gesture Mechanics & Touch Transition Architecture
1. **Drag Handle**:
   - Hitbox: `w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none`
   - Visual Bar: `w-10 h-1.5 bg-muted-foreground/30 rounded-full`
2. **Velocity & Snap Physics**:
   - Touch drag tracks delta $d_y$ and velocity $v_y$.
   - Upward swipe ($v_y > 0.5\text{px/ms}$): Collapsed $\rightarrow$ Mid, or Mid $\rightarrow$ Expanded.
   - Downward swipe ($v_y < -0.5\text{px/ms}$): Expanded $\rightarrow$ Mid, or Mid $\rightarrow$ Collapsed.
   - Distance threshold: Dragging $>30\%$ of distance between snap points automatically snaps to the target state.
3. **Scroll Chaining Mitigation**:
   - In **Expanded state**, the internal listing list has `overflow-y-auto overscroll-contain`.
   - When the user scrolls down inside the list and `scrollTop > 0`, native list scrolling occurs.
   - When `scrollTop === 0` and the user drags downwards, scroll chaining is intercepted and sheet animates down to Mid state.

---

### 4.4 Mobile Map Floating Controls & FABs

All floating controls are positioned on the **natural right thumb zone** and dynamically dock relative to the bottom sheet height:

```
Floating Dock Equation:
bottom_offset = sheet_current_height + 16px
```

1. **Floating 'Locate Me' GPS Button**:
   - Sizing: `48×48px` (`w-12 h-12 rounded-full`)
   - Styling: `bg-card text-foreground border border-border shadow-md flex items-center justify-center hover:bg-muted active:scale-95 touch-target`
   - Icon: Navigation Crosshairs (`w-5 h-5`)
   - States: Inactive (neutral), Locating (radar ping animation), GPS Locked (`text-action fill-action/20`).
2. **Recenter Cebu / Reset View Button**:
   - Sizing: `44×44px` (`w-11 h-11 rounded-full`)
   - Styling: `bg-card text-foreground border border-border shadow-md flex items-center justify-center hover:bg-muted active:scale-95 touch-target`
   - Action: Resets camera center to Metro Cebu hub: `10.3157° N, 123.8854° E`, zoom level `13.5`.
3. **'Search This Area' Floating Button**:
   - Position: `fixed top-[calc(env(safe-area-inset-top,0px)+120px)] inset-x-0 mx-auto w-fit z-search-bar`
   - Trigger Condition: Map pan distance $> 500\text{m}$ from last query origin.
   - Sizing: `h-10 px-4 rounded-full bg-card/95 backdrop-blur-md text-foreground border border-border shadow-md flex items-center gap-2 text-xs font-semibold hover:bg-muted active:scale-95 touch-target-expanded`
   - Icon: Refresh / Pin icon (`w-3.5 h-3.5 text-action`).
4. **'Ask AbangCebu AI' Assistant FAB**:
   - Sizing: `h-12 px-4 rounded-full bg-action text-action-foreground shadow-lg shadow-cebu-emerald-950/25 flex items-center gap-2 text-sm font-semibold hover:bg-action-hover active:scale-95 touch-target`
   - Icon: Sparkles / Brain icon (`w-5 h-5 text-white`)
   - Text: `"Ask AI"` or `"Find via AI"`
   - Accessibility: `aria-label="Open AbangCebu AI rental search assistant"`

---

### 4.5 Mobile Rental Listing Card & Detail Modal

#### Compact Horizontal Listing Card (Peek / Mid Carousel)
- **Container**:
  - Dimensions: `w-[312px] h-[120px] shrink-0 snap-center bg-card text-card-foreground border border-border rounded-xl shadow-xs p-2.5 flex gap-3 cursor-pointer select-none active:scale-[0.98] transition-transform`
- **Left Media Thumbnail**:
  - Dimensions: `w-[96px] h-[96px] rounded-lg overflow-hidden relative shrink-0 bg-muted`
  - Badge Overlay: `absolute top-1.5 left-1.5 bg-action/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1` ("✓ Verified")
- **Right Details Flex Column**:
  - Title: `text-sm font-semibold text-foreground line-clamp-1` ("Lahug Studio near IT Park")
  - Distance / Landmark: `text-xs text-muted-foreground flex items-center gap-1` ("📍 400m from IT Park")
  - Amenities Checklist: `text-[11px] text-muted-foreground truncate` ("Wi-Fi • Submeter • Aircon • No Curfew")
  - Bottom Pricing & Action Row:
    - Price: `text-base font-bold text-action font-mono` ("₱5,500/mo")
    - Favorite Heart Button: `w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-cebu-crimson-600 active:scale-90 touch-target-expanded`

---

## 5. Mobile Z-Index Stacking Architecture

To prevent layering conflicts (e.g. MapLibre popups appearing above floating search bars, or bottom sheet dragging beneath FABs), the mobile application enforces the following strict tokenized z-index hierarchy:

```
+--------------------------------------------------------------------------+
| Z-INDEX STACKING ORDER (src/app/globals.css)                             |
+--------------------------------------------------------------------------+
|  z-toast (90)            Toast notifications, Anti-scam warning banners  |
|  z-modal (80)            Full listing detail drawer, Advanced filter modal|
|  z-modal-backdrop (70)   Semi-transparent backdrop scrim (bg-black/50)    |
|  z-fab (60)              Floating 'Ask AI' Assistant FAB                 |
|  z-bottom-sheet (50)     Google Maps Bottom Sheet Drawer (Peek/Mid/Full)  |
|  z-search-bar (40)       Top Search Pill, Horizontal Filter Pills        |
|  z-map-controls (30)     GPS Locate Me, Recenter Cebu, Compass Buttons   |
|  z-map-pin-active (25)   Active/Selected Rental Price Pin Marker         |
|  z-map-pin (20)          Standard Rental Price Pin Markers (₱4.5k, etc.) |
|  z-map-vector (10)       Walking radius circles, jeepney route polylines |
|  z-map-canvas (0)        WebGL MapLibre Canvas Surface                   |
+--------------------------------------------------------------------------+
```

### Complete Z-Index Reference Table

| Tailwind v4 Class | Numeric Z-Index | Component Application | Pointer Events Policy |
| :--- | :--- | :--- | :--- |
| `z-map-canvas` | `0` | MapLibre WebGL Canvas | `pointer-events-auto` |
| `z-map-vector` | `10` | GIS Polylines & Radius Circles | `pointer-events-none` |
| `z-map-pin` | `20` | Unselected Map Price Markers | `pointer-events-auto` |
| `z-map-pin-active` | `25` | Focused / Selected Price Pin | `pointer-events-auto` |
| `z-map-controls` | `30` | GPS Locate Me & Recenter FABs | `pointer-events-auto` |
| `z-search-bar` | `40` | Floating Search Pill & Filter Chips | `pointer-events-auto` |
| `z-bottom-sheet` | `50` | Bottom Sheet Drawer Container | `pointer-events-auto` |
| `z-fab` | `60` | Floating 'Ask AbangCebu AI' Button | `pointer-events-auto` |
| `z-modal-backdrop` | `70` | Modal Background Scrim | `pointer-events-auto` |
| `z-modal` | `80` | Full Listing Detail Modal Drawer | `pointer-events-auto` |
| `z-toast` | `90` | Toast Alerts & Anti-Scam Banners | `pointer-events-auto` |

---

## 6. Tailwind CSS v4 Layout Rules & Safe Area Tokens

### 6.1 Safe Area Insets for iOS & Android
Modern mobile displays feature top hardware cutouts (Dynamic Island, camera notches) and bottom Home Indicator bars. Layout rules must accommodate these insets:

```css
/* Safe Area Tokens (Registered in src/app/globals.css) */
@utility pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

@utility pt-safe {
  padding-top: env(safe-area-inset-top, 0px);
}

@utility no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### 6.2 Sheet Height Custom Properties
In `src/app/globals.css`, dynamic CSS variables govern drawer snap heights:

```css
:root {
  --sheet-collapsed-height: calc(env(safe-area-inset-bottom, 0px) + 88px);
  --sheet-mid-height: 48dvh;
  --sheet-expanded-height: calc(100dvh - env(safe-area-inset-top, 0px) - 16px);
}
```

---

## 7. Developer Implementation & Quality Verification Checklist

When constructing mobile map features in subsequent sprints, verify the following:

- [ ] **100dvh Full-Bleed Map**: The map root container is styled with `h-[100dvh]` (not `h-screen` or `100vh`) and prevents rubber-band viewport bounce via `overscroll-none`.
- [ ] **Mobile Input 16px Rule**: All text inputs inside the search pill or filter modals have computed `font-size: 16px` to prevent iOS auto-zoom.
- [ ] **WCAG 2.2 AA 44×44px Touch Targets**: All filter chips, map controls, heart buttons, and drag handles meet 44×44px hitboxes via `touch-target` or `touch-target-expanded`.
- [ ] **Adjacent Element Clearance**: Minimum 8px gutter (`gap-2`) between adjacent filter pills and map controls.
- [ ] **Safe-Area Accommodations**: Bottom sticky action bars utilize `pb-safe`; top search bar utilizes `pt-[calc(env(safe-area-inset-top)+12px)]`.
- [ ] **Z-Index Layer Compliance**: Every mobile overlay uses tokenized classes (`z-search-bar`, `z-bottom-sheet`, `z-fab`, `z-modal`) rather than arbitrary arbitrary z-indexes.
- [ ] **Sprint 1 Boundary**: Confirm zero premature feature pages or dummy components were committed to the production codebase.
