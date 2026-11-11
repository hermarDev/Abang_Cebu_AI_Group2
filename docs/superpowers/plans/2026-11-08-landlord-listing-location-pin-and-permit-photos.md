# Landlord Listing Map Pin-Picker & Multi-Photo Permit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive MapLibre pin-drop/drag location picker with reverse geocoding to Step 1, and replace typed permit inputs in Step 3 with a multi-photo upload component (up to 5 permit documents/photos), keeping draft serialization and existing saved drafts backwards-compatible.

**Architecture:**
- Step 1 (Location): Embed dynamic `MapCanvas` alongside `MapSearch`. Searching flies map and sets pin; clicking on map or dragging marker updates `[lng, lat]` coordinates and queries a lightweight `/api/places/reverse` endpoint to autofill address/barangay/city while keeping inputs editable.
- Step 3 (Business Permit): Replace typed inputs (`permitNumber`, `permitLgu`, `permitExpiresOn`) with a multi-file uploader (`permitPhotos: File[]`, up to 5 files, 10 MB each, JPEG/PNG/WebP/PDF).
- Storage & DB: Relax `draft-payload.ts` to allow arbitrary pin coordinates without OSM place IDs and make legacy permit strings optional/defaulted to `""`. Add Supabase migration to raise permit media quota from 1 to 5 in `prepare_property_draft_media` and allow `image/webp`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, MapLibre GL, Tailwind CSS v4, Supabase (PostgreSQL + PostGIS + Storage), Photon (Komoot OSM Geocoder).

---

## Global Constraints

- Preserve all existing form validation rules and leave confirmation leave warning (`beforeunload`).
- Preserve Metro Cebu geographical envelope (`PLACE_BOUNDS`: `west: 123.29, south: 9.41, east: 124.58, north: 11.53`).
- File uploads: max 10 MB per file, client SHA-256 integrity checks, supported types: JPEG, PNG, WebP, PDF.
- Backward compatibility: existing drafts in `public.property_drafts` with legacy permit fields must restore without throwing validation code `22023`.
- Strict preview safety: keep listing submission stubbed (`HTTP 503`) until authorized.

---

## Review Focus

1. **Dropped pin outside Cebu**: Click/drag outside `PLACE_BOUNDS` must be rejected or clamped, showing a friendly warning banner.
2. **Reverse geocode failure / rate limit**: If Photon reverse fails, coordinates must still be preserved and manual address entry remains functional.
3. **Legacy draft restore**: A draft containing old typed permit numbers/LGU/expiry must safely restore without throwing `"Unsupported property draft"`.
4. **Permit photo quota**: Uploading more than 5 permit photos or duplicate files must be rejected gracefully with user-visible notice.
5. **Permit applicability toggle**: Switching between `"required"` and `"not_required"` must preserve selected photo attachments and declaration checkbox state.

---

## Tasks

### Task 1: Photon Reverse Geocoding API (`/api/places/reverse`)

**Files:**
- Create: `src/server/places/reverse-places.ts`
- Create: `src/app/api/places/reverse/route.ts`
- Test: `src/app/api/places/reverse/route.test.ts`

**Interfaces:**
- Produces: `reverseGeocode(coordinates: [number, number]): Promise<{ address: string; barangay: string; city: string } | null>`
- Route: `GET /api/places/reverse?lat=10.3157&lon=123.8854` -> `{ place: { address: string, barangay: string, city: string } }`

- [ ] **Step 1: Write failing test for reverse places API**

```typescript
// src/app/api/places/reverse/route.test.ts
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/places/reverse", () => {
  it("rejects coordinates outside Cebu bounds", async () => {
    const request = new Request("http://localhost/api/places/reverse?lat=14.5995&lon=120.9842"); // Manila
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns address details for valid Cebu coordinates", async () => {
    const request = new Request("http://localhost/api/places/reverse?lat=10.3157&lon=123.8854");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.place).toHaveProperty("city");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/places/reverse/route.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Implement `src/server/places/reverse-places.ts` and `src/app/api/places/reverse/route.ts`**

Implement reverse geocode with `PLACE_BOUNDS` validation, 1000ms request throttle, and fallback to empty strings if specific OSM fields are missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/places/reverse/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/places/reverse-places.ts src/app/api/places/reverse/
git commit -m "feat(places): add reverse geocoding API endpoint"
```

---

### Task 2: Backward-Compatible Draft Payload Serialization

**Files:**
- Modify: `src/app/list-property/draft-payload.ts:10–78`
- Modify: `src/app/list-property/draft-payload.test.ts`

**Interfaces:**
- Consumes: `DraftValues`
- Changes: `location` can be arbitrary pin coordinates without OSM `id`; `permitNumber`, `permitLgu`, `permitExpiresOn` become optional in `DraftValues` and default to empty strings.

- [ ] **Step 1: Write failing tests in `draft-payload.test.ts`**

```typescript
it("accepts arbitrary pinned coordinates without osm place metadata", () => {
  const values = {
    title: "Pinned rental", description: "Nice location in Mabolo", propertyType: "apartment", rentalType: "entire_place",
    price: "15000", address: "Mabolo street", barangay: "Mabolo", city: "Cebu City", bathroomType: "private", maxOccupants: "2",
    amenities: ["wifi"], permitApplicability: "not_required", permitNumber: "", permitLgu: "", permitExpiresOn: "",
    permitNotRequiredConfirmed: true,
    location: { id: "pin-123.90-10.32", name: "Custom pin", detail: "", coordinates: [123.90, 10.32] as [number, number] },
  };
  expect(restoreDraftValues(createDraftPayload(values))).toEqual(values);
});

it("restores legacy drafts containing old typed permit fields without error", () => {
  const legacyPayload = {
    property: {
      title: "Legacy draft", property_type: "house", street_address: "Street", barangay: "Barangay", city: "Cebu City",
      permit_applicability: "required", permit_number: "OLD-123", permit_lgu: "Cebu City", permit_expires_on: "2027-01-01",
      permit_not_required_confirmed: "false", latitude: 10.31, longitude: 123.89, location_id: "osm-node-1", location_name: "Loc", location_detail: "Detail"
    },
    unit: { rental_type: "entire_place", monthly_rent: "10000" },
    amenities: ["wifi"]
  };
  expect(() => restoreDraftValues(legacyPayload)).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/list-property/draft-payload.test.ts`
Expected: FAIL if arbitrary pin throws "Unsupported property draft".

- [ ] **Step 3: Update `src/app/list-property/draft-payload.ts`**

Relax `locationParts` check so `p.latitude` and `p.longitude` alone are valid coordinates even if `location_id` is null or starts with `"pin-"`. Allow `permit_number`, `permit_lgu`, `permit_expires_on` to default to `""` if absent in newer drafts.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/list-property/draft-payload.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/list-property/draft-payload.ts src/app/list-property/draft-payload.test.ts
git commit -m "fix(draft): support arbitrary pin coordinates and optional permit text fields"
```

---

### Task 3: Interactive Location Pin-Picker UI

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`
- Modify: `src/components/map/MapCanvasLoader.tsx`
- Modify: `src/app/list-property/ListPropertyForm.tsx:317–326`
- Test: `src/app/list-property/ListPropertyForm.test.tsx` (or harness update)

**Interfaces:**
- `MapCanvasProps`: Add `pinCoordinates?: [number, number] | null`, `onPinChange?: (coords: [number, number]) => void`, `enablePinDrop?: boolean`.
- Interaction: Clicking map drops or repositions pin. Draggable pin updates coordinates on `dragend`.

- [ ] **Step 1: Add pin marker support to `MapCanvas.tsx`**

Initialize a dedicated MapLibre `Marker({ draggable: true, color: "#2563eb" })` when `enablePinDrop` is true. Listen to `map.on("click")` and `marker.on("dragend")` to invoke `onPinChange([lng, lat])`.

- [ ] **Step 2: Integrate into `ListPropertyForm.tsx` (Step 1 panel)**

Mount `<MapCanvasLoader>` in Step 1 with height `min-h-[320px] rounded-xl overflow-hidden`.
Wire `onPinChange`:
1. Update `location` state with coordinates.
2. Trigger reverse geocode call (`/api/places/reverse?lat=...&lon=...`).
3. Autofill `address`, `barangay`, and `city` without overwriting existing manually typed unit numbers.
4. Add a "Clear pin" button.

- [ ] **Step 3: Verify interaction and typing retention**

Ensure address inputs remain fully editable and entering custom text does not reset the pinned coordinates.

- [ ] **Step 4: Run unit and type checks**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/MapCanvas.tsx src/components/map/MapCanvasLoader.tsx src/app/list-property/ListPropertyForm.tsx
git commit -m "feat(list-property): add interactive map pin picker with reverse geocoding"
```

---

### Task 4: Multi-Photo Permit Uploader UI

**Files:**
- Modify: `src/app/list-property/ListPropertyForm.tsx:44–46, 82–97, 179–204, 344–359, 369`
- Modify: `src/app/list-property/draft-save-client.ts`
- Modify: `tests/notification-harness/listing-review.cjs`

**Interfaces:**
- `permitPhotos: File[]` replaces `permitDocument: File | null`.
- Up to 5 files; types: `image/jpeg,image/png,image/webp,application/pdf`.

- [ ] **Step 1: Update form state and file handling in `ListPropertyForm.tsx`**

1. Change `permitDocument` state to `permitPhotos: File[]`.
2. Remove `<input name="permitNumber">`, `<input name="permitLgu">`, `<input name="permitExpiresOn">`.
3. Render informative guide chips: "Mayor's Permit / BPLO", "Barangay Clearance", "Fire Safety (FSIC)", "Sanitary Permit", or "Occupancy / Tax Declaration".
4. Support selecting multiple photos up to 5, rendering thumbnails/file chips with an individual `(x)` remove button.
5. In `saveDraft()`, map all `permitPhotos` to `DraftSaveFile` entries with `kind: "permit"`.
6. Update `restoreDraftFiles()` to collect an array of permit files (removing the single permit restriction).

- [ ] **Step 2: Update Review step display**

In Step 4 (`Review`), display count and filenames of uploaded permit photos instead of the old permit number.

- [ ] **Step 3: Update `tests/notification-harness/listing-review.cjs`**

Update harness assertions to test multiple permit file attachments and ensure no regression in leave-warning or draft save pipeline.

- [ ] **Step 4: Run test harness**

Run: `node tests/notification-harness/listing-review.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/list-property/ListPropertyForm.tsx src/app/list-property/draft-save-client.ts tests/notification-harness/
git commit -m "feat(list-property): replace typed permit inputs with multi-photo uploader"
```

---

### Task 5: Database Media Quota & Remote Supabase Migration via CLI

**Files:**
- Create: `supabase/migrations/20261108000000_permit_photos_quota.sql`
- Modify: `src/app/api/property-drafts/media-validation.ts`
- Test: `src/app/api/property-drafts/media-validation.test.ts`
- CLI Action: `supabase db push`

**Interfaces:**
- RPC `prepare_property_draft_media`:
  - Change permit quota from `EXISTS (...)` (limit 1) to `(SELECT count(*) FROM property_draft_media WHERE kind = 'permit' AND released_at IS NULL) >= 5`.
  - Remove restriction disallowing `image/webp` for `p_kind = 'permit'`.
- `inspectDraftMedia()`: allow `image/webp` for `kind === "permit"`.

- [ ] **Step 1: Update `inspectDraftMedia()` and test**

Allow WebP for permits in `src/app/api/property-drafts/media-validation.ts`. Run `pnpm test src/app/api/property-drafts/media-validation.test.ts`.

- [ ] **Step 2: Write migration `supabase/migrations/20261108000000_permit_photos_quota.sql`**

Update `prepare_property_draft_media` to permit up to 5 permit documents/photos per draft and allow `image/webp`.

- [ ] **Step 3: Test migration dry-run and apply with Supabase CLI**

```bash
# 1. Verify connection and check pending migrations
supabase db push --dry-run

# 2. Push migration to remote Supabase database
supabase db push
```
Expected: `supabase db push` finishes cleanly and confirms migration `20261108000000_permit_photos_quota.sql` is applied to remote project `oekihxgobdsxeqgotfsh`.

- [ ] **Step 4: Run linter and typecheck**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS with 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261108000000_permit_photos_quota.sql src/app/api/property-drafts/media-validation*
git commit -m "feat(db): raise draft permit media quota to 5 files and push migration via supabase cli"
```

---

### Task 6: Full Verification Gate

- [ ] **Step 1: Run all unit tests**
  `pnpm test`
- [ ] **Step 2: Run type check**
  `pnpm exec tsc --noEmit`
- [ ] **Step 3: Run linter**
  `pnpm lint --max-warnings=0`
- [ ] **Step 4: Run build**
  `pnpm build`
- [ ] **Step 5: Review git diff**
  `git diff --stat HEAD~5` to verify no unrelated files were touched.
