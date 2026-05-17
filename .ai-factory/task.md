# TASKS (UPDATED to close PRD/SPEC/TASK gaps)

> Notes on gap fixes included here:
> - **PRD 30-second create goal** → add **dev-only stopwatch instrumentation** + UX defaults to minimize required input.
> - **PRD 1-second lookup goal** → add **in-list local search** (no network) + **dev-only search timing instrumentation**.
> - **EXIF extraction** → add a small EXIF extraction helper with explicit fallback/validation + wire into photo picking.
> - **Kakao reverse geocode quota/429** → add explicit **429 UI handling** + “manual entry remains editable” fallback.
> - **API client init concern** → add explicit error status extraction helper so screens can reliably branch on `401/404/429` without relying on ad-hoc error shapes.

---

## Epic 0. PRD goal verification + privacy guardrails (MVP-only, no analytics)

### Risk Analysis
- **Complexity:** Low
- **Risk factors:** PRD goals remain untestable without explicit measurement hooks; privacy assumptions drift.
- **Mitigation:** Add dev-only timers + a manual QA checklist; add a small privacy checklist doc.

---

### Task 0.1 PRD goals QA checklist doc (30s create + 1s lookup)
- **Description:** Add a lightweight manual checklist so QA can verify PRD time goals without additional tooling.
- **DoD (pass/fail):**
  - File `docs/prd-goals-qa.md` exists.
  - It contains headings exactly:
    - `## 30-second place creation check`
    - `## 1-second lookup check`
  - It contains a step mentioning dev overlay strings:
    - `"Create elapsed"`
    - `"Search compute"`
- **Files:**
  - `docs/prd-goals-qa.md`
- **Depends on:** none

### Task 0.2 Dev-only stopwatch helper (no runtime impact in production)
- **Description:** Add a tiny stopwatch utility used only under `__DEV__` to measure time-to-create and time-to-filter.
- **DoD (pass/fail):**
  - File `src/lib/perf/stopwatch.ts` exports:
    - `startStopwatch(): { elapsedMs: () => number }`
  - It contains **no** React components and **no** side effects (no timers created inside the helper).
  - TypeScript strict build passes.
- **Files:**
  - `src/lib/perf/stopwatch.ts`
- **Depends on:** none

### Task 0.3 Privacy guardrails checklist doc (shared private account)
- **Description:** Document MVP privacy boundaries (no sharing/export/public routes).
- **DoD (pass/fail):**
  - File `docs/privacy-guardrails.md` exists.
  - It contains a checklist section with the exact bullet strings:
    - `- No public/share links in UI`
    - `- No export (CSV/JSON) in UI`
    - `- All API calls require auth token`
- **Files:**
  - `docs/privacy-guardrails.md`
- **Depends on:** none

---

## Epic 1. TypeScript types + interfaces (`src/lib/types/`)

### Risk Analysis
- **Complexity:** Low
- **Risk factors:** Type mismatches vs SPEC (e.g., pagination shape) causing widespread TS errors.
- **Mitigation:** Define shared API primitives first, then entities, then endpoint contracts; keep all files **type-only** (no runtime code).

---

### Task 1.1 API primitives: `ApiErrorResponse` + pagination generics
- **Description:** Add shared API error + pagination contract types used by all endpoint wrappers.
- **DoD:**
  - `src/lib/types/api.ts` exports `ApiErrorResponse` and `PaginatedResponse<T>` matching SPEC shapes exactly.
  - No runtime code in this file (type exports only).
  - TypeScript strict build passes.
- **Covers:** [F1-AC-3, F4-AC-5, AC-PL-3]
- **Files:**  
  - `src/lib/types/api.ts`
- **Depends on:** none

### Task 1.2 Core entities + request/response contracts (Places/Trips/Photos/Geocode)
- **Description:** Add SPEC entity types and all API request/response interfaces.
- **DoD:**
  - `src/lib/types/entities.ts` exports: `PlaceCategory`, `Place`, `PlaceDetail`, `Photo`, `Trip`, `ReverseGeocodeResult`.
  - `src/lib/types/contracts.ts` exports:
    - Places: `GetPlacesResponse`, `CreatePlaceRequest`, `UpdatePlaceRequest`
    - Trips: `GetTripsResponse`, `CreateTripRequest`, `UpdateTripRequest`
    - Photos: `CreatePhotoResponse`
    - Geocode: `ReverseGeocodeRequest`, `ReverseGeocodeResponse`
  - No runtime code; TypeScript strict build passes.
- **Covers:** [F1-AC-1, F1-AC-2, F1-AC-7, F1-AC-8, F1-AC-9, F1-AC-10, F2-AC-4, F3-AC-1]
- **Files:**
  - `src/lib/types/entities.ts`
  - `src/lib/types/contracts.ts`
- **Depends on:** Task 1.1

### Task 1.3 Local UI state types for photo selection/upload
- **Description:** Define local-only types for selected photo items and upload state.
- **DoD:**
  - `src/lib/types/ui.ts` exports:
    - `PhotoUploadStatus = "pending" | "uploading" | "uploaded" | "failed"`
    - `SelectedLocalPhoto` (must include `uri: string`; may include `fileSizeBytes?: number`, `takenAt?: string | null`, `latitude?: number`, `longitude?: number`)
    - `SelectedPhotoItem` (includes `local: SelectedLocalPhoto`, `status: PhotoUploadStatus`, optional `serverPhotoId?: string`, optional `errorMessage?: string`)
  - TypeScript strict build passes.
- **Covers:** [F2-AC-6, AC-PPK-2, AC-PPK-4]
- **Files:**
  - `src/lib/types/ui.ts`
- **Depends on:** Task 1.2

### Task 1.4 EXIF extraction result type (explicit fallback semantics)
- **Description:** Add a type used by the EXIF helper so fallback behavior is explicit.
- **DoD (pass/fail):**
  - `src/lib/types/ui.ts` additionally exports:
    - `ExtractedPhotoMetadata` with fields:
      - `takenAt: string | null`
      - `latitude?: number`
      - `longitude?: number`
      - `source: "exif" | "assetLocation" | "none"`
  - No runtime code in `ui.ts`.
  - TypeScript strict build passes.
- **Files:**
  - `src/lib/types/ui.ts`
- **Depends on:** Task 1.3

---

## Epic 2. Data storage + repositories (`src/lib/db/`, `src/store/`)

*(unchanged from prior version)*

### Task 2.1 SQLite table creation + migration (DB init only; unused in MVP)
- **(unchanged)**

### Task 2.2 Places Zustand store (in-memory cache for list + details)
- **(unchanged)**

### Task 2.3 Trips Zustand store (in-memory cache)
- **(unchanged)**

### Task 2.4 Repository helpers (pure functions): sort + merge
- **(unchanged)**

---

## Epic 3. API integration (`src/lib/api/`)

### Risk Analysis
- **Complexity:** Medium
- **Risk factors:** Multipart upload FormData field mismatches; inconsistent error parsing; mishandling 204 responses; inability to detect 429/quota.
- **Mitigation:** Implement small domain modules; centralize error normalization incl. **status extraction**; keep each endpoint wrapper’s behavior explicit (including 204 handling).

---

### Task 3.1 API error helpers (network vs server error) + status extractor
- **Description:** Add utilities to normalize errors for screens (network banner vs server error string) and reliably branch on HTTP status (401/404/429).
- **DoD:**
  - `src/lib/api/errors.ts` exports:
    - `isNetworkError(e: unknown): boolean`
    - `getApiErrorMessage(e: unknown): string | null` (extracts `{ error: string }` when present)
    - `getApiStatus(e: unknown): number | null`
  - Pass/fail: `getApiStatus(...)` returns `401` when provided an error object containing a numeric `status=401` at any of:
    - `e.status`
    - `e.response.status`
  - TypeScript strict build passes.
- **Covers:** [F1-AC-6, F2-AC-5, F3-AC-3, F4-AC-8, F5-AC-4, AC-PL-3, AC-PM-4, AC-PC-5, AC-PD-4, AC-PE-3, AC-TL-3, AC-TCE-4, AC-TD-4, AC-PP-4]
- **Files:**
  - `src/lib/api/errors.ts`
- **Depends on:** Task 1.1

### Task 3.2 Places API: list + detail
- **(unchanged)**

### Task 3.3 Places API: create/update/delete (extend `src/lib/api/places.ts`)
- **(unchanged)**

### Task 3.4 Trips API module
- **(unchanged)**

### Task 3.5 Photos upload API (multipart) — explicit empty-string fallbacks
- **Description:** Implement `POST /api/photos` multipart uploader with explicit fallback behavior for missing metadata.
- **DoD:**
  - `src/lib/api/photos.ts` exports `uploadPhoto(params): Promise<CreatePhotoResponse>` building `FormData` fields:
    - `file`, `fileSizeBytes`, `takenAt`, `latitude`, `longitude`
  - Pass/fail:
    - if `takenAt` is missing, FormData field `takenAt` is sent as `""` (empty string), not `undefined`
    - if `latitude` is missing, FormData field `latitude` is sent as `""`
    - if `longitude` is missing, FormData field `longitude` is sent as `""`
  - TypeScript strict build passes.
- **Covers:** [F2-AC-4, F2-AC-5, AC-PPK-3]
- **Files:**
  - `src/lib/api/photos.ts`
- **Depends on:** Task 1.2, Task 3.1

### Task 3.6 Reverse geocode API module
- **(unchanged)**

### Task 3.7 EXIF/asset metadata extraction helper (runtime)
- **Description:** Add a small helper to extract `takenAt/coords` from ImagePicker asset EXIF and/or asset location, with validation + fallback.
- **DoD (pass/fail):**
  - File `src/lib/media/extractPhotoMetadata.ts` exports:
    - `extractPhotoMetadata(input): ExtractedPhotoMetadata`
  - Pass/fail cases (unit-like, can be verified by calling function in dev):
    - If input provides **no EXIF and no location**, return `{ takenAt: null, source: "none" }` and **do not** set `latitude/longitude`.
    - If latitude is `< -90` or `> 90`, returned `latitude` is `undefined`.
    - If longitude is `< -180` or `> 180`, returned `longitude` is `undefined`.
  - TypeScript strict build passes.
- **Files:**
  - `src/lib/media/extractPhotoMetadata.ts`
- **Depends on:** Task 1.4

---

## Epic 4. Core screens (`app/**` routes + shared components)

### Risk Analysis
- **Complexity:** High
- **Risk factors:** Many UI states; permission flows; quota edge cases; keyboard avoidance regressions.
- **Mitigation:** Keep helpers small; implement EXIF + geocode fallback paths explicitly; add dev-only timers for PRD goal verification.

---

### Task 4.1 Banner component
- **(unchanged)**

### Task 4.2 Skeleton placeholders
- **(unchanged)**

### Task 4.3 RemoteImage with loading placeholder
- **(unchanged)**

---

### Task 4.4 Place List scaffold (`/list`)
- **(unchanged)**

### Task 4.5 Place List initial fetch + 6 skeletons + initial load error retry
- **(unchanged)**

### Task 4.6 Place List sort by `visitedAt desc` before render
- **(unchanged)**

### Task 4.6a Place List local search (1-second lookup enabler; no network)
- **Description:** Add a local search input that filters already-loaded places by `name` or `address` without new API calls.
- **DoD (pass/fail):**
  - `app/(tabs)/list.tsx` renders an input with placeholder text exactly `"Search places"`.
  - When user types `"cafe"`:
    - the screen performs **0** calls to `listPlaces(...)` due to the typing event
    - rendered list shows only items whose `name` **or** `address` contains `"cafe"` case-insensitively.
  - Clearing the input restores the full in-memory list (no network call triggered by clearing).
  - TypeScript strict build passes.
- **Files:**
  - `app/(tabs)/list.tsx`
- **Depends on:** Task 4.5

### Task 4.6b Dev-only search timing overlay (“Search compute”) for PRD 1s verification
- **Description:** In `__DEV__`, measure compute time for filtering and display it so QA can validate the “1-second lookup” goal manually.
- **DoD (pass/fail):**
  - In `__DEV__ === true`, `app/(tabs)/list.tsx` renders visible text starting with exactly `"Search compute: "` whenever the search query is non-empty.
  - In `__DEV__ === false`, that text is not rendered.
  - TypeScript strict build passes.
- **Files:**
  - `app/(tabs)/list.tsx`
- **Depends on:** Task 0.2, Task 4.6a

### Task 4.7 Place List 401 handling → redirect to `/login`
- **Update:** Use `getApiStatus(e)` to detect 401 (instead of ad-hoc checks).
- **DoD (pass/fail):**
  - When `listPlaces` fails with a 401 response, call `router.replace("/login")`.
  - Implementation uses `getApiStatus(e) === 401` in the branch.
  - TypeScript strict build passes.
- **Files:**
  - `app/(tabs)/list.tsx`
- **Depends on:** Task 4.5, Task 3.1

### Task 4.8 Place List pull-to-refresh refetches first page
- **(unchanged)**

### Task 4.9 Place List infinite scroll pagination + footer states
- **(unchanged)**

### Task 4.10 Place List swipe-to-delete UI + confirm dialog (no API yet)
- **(unchanged)**

### Task 4.11 Place List delete API call + success remove + 404 banner
- **(unchanged)**

---

### Task 4.12 Place Map scaffold (`/map`)
- **(unchanged)**

### Task 4.13 Place Map fetch (pageSize=200) + network banner + 401 redirect
- **Update:** Use `getApiStatus(e)` to detect 401.
- **DoD (pass/fail):**
  - On mount/focus: call `listPlaces({page:1,pageSize:200})`.
  - If network error: render banner text `"Network error. Tap to retry."`.
  - If `getApiStatus(e) === 401`: call `router.replace("/login")`.
  - TypeScript strict build passes.
- **Files:**
  - `app/(tabs)/map.tsx`
- **Depends on:** Task 3.2, Task 4.1, Task 3.1

### Task 4.14 Map pins + bottom summary + navigation to detail
- **(unchanged)**

### Task 4.15 Map pull-to-refresh refetch
- **(unchanged)**

---

### Task 4.16 Photo Permission Help screen (`/permissions/photos`)
- **(unchanged)**

---

### Task 4.17 Place Create scaffold (`/places/new`) + keyboard avoidance layout
- **(unchanged)**

### Task 4.17a Place Create defaults (reduce time-to-create)
- **Description:** Pre-fill non-required fields to reduce user input steps.
- **DoD (pass/fail):**
  - On first render of `app/places/new.tsx`:
    - `visitedAt` state is initialized to a non-empty ISO string (contains `"T"` and ends with `"Z"`).
    - `rating` state is initialized to a number (default `0` is acceptable).
    - `review` state is initialized to `""`.
  - TypeScript strict build passes.
- **Files:**
  - `app/places/new.tsx`
- **Depends on:** Task 4.17

### Task 4.17b Dev-only create stopwatch overlay (“Create elapsed”) for PRD 30s verification
- **Description:** In `__DEV__`, show elapsed time since entering the create screen.
- **DoD (pass/fail):**
  - In `__DEV__ === true`, `app/places/new.tsx` renders visible text starting with exactly `"Create elapsed: "`.
  - In `__DEV__ === false`, that text is not rendered.
  - TypeScript strict build passes.
- **Files:**
  - `app/places/new.tsx`
- **Depends on:** Task 0.2, Task 4.17

### Task 4.18 Place Create: photo picker entrypoint (permission handling + cancel behavior) + request EXIF
- **Description:** Implement `"Select photos"` button to request permission and open picker when granted; ensure picker requests EXIF metadata; navigate to help when denied; do nothing on cancel.
- **DoD (pass/fail):**
  - If permission is `"undetermined"` on tap: request permission; if granted, present system picker within 500ms.
  - If permission is `"denied"` on tap: navigate to `/permissions/photos`.
  - Picker request includes `exif: true`.
  - If user cancels picker: start **0** `uploadPhoto(...)` requests.
  - TypeScript strict build passes.
- **Covers:** [AC-PPK-1, AC-PPK-3, F2-AC-1, F2-AC-2]
- **Files:**
  - `app/places/new.tsx`
- **Depends on:** Task 4.17, Task 4.16

### Task 4.18a Place Create: populate selected photo metadata from EXIF/asset location (fallback rules)
- **Description:** When photos are selected, extract `takenAt/latitude/longitude` into `SelectedLocalPhoto` with explicit fallback + validation.
- **DoD (pass/fail):**
  - After selecting 1 photo asset:
    - the created `SelectedPhotoItem.local.takenAt` is either a string or `null` (never `undefined`).
  - If extracted latitude/longitude are out of bounds, they are stored as `undefined` (not stored as invalid numbers).
  - Implementation calls `extractPhotoMetadata(...)` for each selected asset.
  - TypeScript strict build passes.
- **Files:**
  - `app/places/new.tsx`
- **Depends on:** Task 3.7, Task 4.18, Task 1.4

### Task 4.19 Place Create: selected photo strip renders N items + image placeholders
- **(unchanged)**

### Task 4.20 Place Create: pre-upload file size validation (10MB) + mark failed + no upload
- **(unchanged)**

### Task 4.21 Place Create: upload selected photos + 413 handling + Save disabled while uploading
- **(unchanged)**

### Task 4.22 Place Create: map preview + instruction row + draggable pin state
- **(unchanged)**

### Task 4.23 Place Create: reverse geocode on pin drag end + success fills address + 500 retry banner
- **(unchanged)**

### Task 4.23a Place Create: reverse geocode quota handling (429) + manual fallback
- **Description:** Handle quota exceeded / too many requests by showing a specific banner and allowing manual address entry to continue.
- **DoD (pass/fail):**
  - If `reverseGeocode(...)` fails with `getApiStatus(e) === 429`:
    - render a banner containing exact text `"Too many reverse geocode requests. Try again later."`
    - do **not** overwrite the current Address input value
    - Address input remains editable (not disabled)
  - TypeScript strict build passes.
- **Files:**
  - `app/places/new.tsx`
- **Depends on:** Task 4.23, Task 3.1, Task 4.1

### Task 4.23b Place Create: auto-set initial pin from first photo coordinates (speed path)
- **Description:** If the user selects photos that contain coordinates, auto-initialize the place location to speed up place creation.
- **DoD (pass/fail):**
  - If place latitude/longitude are currently missing and user selects photos where the first selected photo has `{latitude, longitude}`:
    - place latitude/longitude state is set to those values within the same tick (no additional user action required)
  - TypeScript strict build passes.
- **Files:**
  - `app/places/new.tsx`
- **Depends on:** Task 4.18a

### Task 4.24 Place Create: validation (name required + at least 1 photo) prevents POST
- **(unchanged)**

### Task 4.25 Place Create: submit POST + success navigation + network error banner
- **(unchanged)**

---

### Task 4.26 Place Detail fetch + loading skeletons
- **(unchanged)**

### Task 4.27 Place Detail 404 + network error states + hide actions on 404
- **(unchanged)**

### Task 4.28 Place Detail: Edit navigation + Delete confirm dialog
- **(unchanged)**

---

### Task 4.29 Place Edit scaffold + initial detail fetch + disabled Save changes while loading
- **(unchanged)**

### Task 4.30 Place Edit: photo picker + selection strip (mirrors Create) + request EXIF
- **Description:** Add `"Select photos"` flow to edit screen and ensure EXIF metadata is requested.
- **DoD (pass/fail):**
  - If permission granted: picker opens within 500ms.
  - Picker request includes `exif: true`.
  - If picker canceled: start **0** upload requests.
  - After selecting N photos: render exactly N thumbnail items on edit screen.
  - TypeScript strict build passes.
- **Files:**
  - `app/places/[id]/edit.tsx`
- **Depends on:** Task 4.29, Task 4.16, Task 4.3

### Task 4.30a Place Edit: populate selected photo metadata from EXIF/asset location
- **Description:** Mirror Create behavior so edit uploads also include extracted metadata.
- **DoD (pass/fail):**
  - After selecting a photo, the created selected item has `local.takenAt` set to either string or `null` (never `undefined`).
  - Implementation calls `extractPhotoMetadata(...)` for each selected asset.
  - TypeScript strict build passes.
- **Files:**
  - `app/places/[id]/edit.tsx`
- **Depends on:** Task 3.7, Task 4.30

### Task 4.31 Place Edit: validate photo size + upload photos + Save changes disabled while uploading
- **(unchanged)**

### Task 4.32 Place Edit: Save changes PATCH exactly once + network error banner + 404 not found
- **(unchanged)**

---

### Task 4.33 Trip List scaffold (`/trips`) + plus navigation
- **(unchanged)**

### Task 4.34 Trip List fetch + skeleton while empty + network banner + 401 redirect
- **Update:** Use `getApiStatus(e)` to detect 401.
- **DoD (pass/fail):**
  - While `listTrips({page:1,pageSize:20})` is in-flight and 0 items rendered: render a visible skeleton list.
  - If network error: render banner `"Network error. Tap to retry."`.
  - If `getApiStatus(e) === 401`: navigate to `/login` within 300ms (direct `router.replace`).
  - TypeScript strict build passes.
- **Files:**
  - `app/(tabs)/trips.tsx`
- **Depends on:** Task 3.4, Task 4.1, Task 2.3, Task 3.1

### Task 4.35 Trip Create (`/trips/new`) validation + POST exactly once + loading state
- **(unchanged)**

### Task 4.36 Trip Edit (`/trips/[id]/edit`) PATCH exactly once + 400 banner exact server error
- **(unchanged)**

### Task 4.37 Trip Detail (`/trips/[id]`) fetch + 404 state
- **(unchanged)**

### Task 4.38 Trip Detail pull-to-refresh calls trip + filtered places exactly once each
- **(unchanged)**

### Task 4.39 Trip Detail remove-from-trip PATCH + network error keeps row visible
- **(unchanged)**

---

## Epic 5. Integration + polish (navigation wiring, gesture handlers)

*(unchanged from prior version)*

### Task 5.1 Tabs wiring: ensure `/list`, `/map`, `/trips` are reachable from tab layout
- **(unchanged)**

### Task 5.2 Gesture handler root verification (for swipe rows)
- **(unchanged)**

---

## AC Coverage (SPEC)
- **Total ACs in SPEC:** 80  
- **Covered by tasks:** 80  
- **Additional PRD-gap tasks added (non-SPEC):**
  - Dev-only timing overlays + QA docs for **30s create** and **1s lookup**
  - EXIF extraction helper + explicit fallback/validation tasks
  - Reverse geocode **429/quota** UI handling task
  - Privacy guardrails doc task