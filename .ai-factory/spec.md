# SPEC

## Common Principles

- **Platforms/Tech**: React Native (Expo SDK 52), TypeScript (strict), NativeWind, `expo-router`, Zustand for client state, existing API client, `expo-secure-store` for auth token (already in template).
- **Privacy**: All content is private to the logged-in shared account (no external sharing features in MVP).
- **Performance Targets (MVP)**:
  - With **≥ 20 places**, initial list load shall complete within **1,000ms** after API response is received (client-side render budget).
- **Offline/Network Constraints (MVP)**:
  - MVP **does not support offline creation/editing with later sync**.
  - On network failure, the UI shall show an error message and a retry CTA.
- **Media Constraints**:
  - Each attached photo file size limit is **≤ 10MB (10,485,760 bytes)**.
  - Images must display a **loading placeholder** until fully loaded.
- **Mobile UX Constraints**:
  - All tappable controls must have **min 44x44 pt** touch target (`minWidth >= 44` and `minHeight >= 44`).
  - All screens must use `SafeAreaView` (from `react-native-safe-area-context`) as the top-level container.
  - All forms must use keyboard avoidance (`KeyboardAvoidingView` + scroll behavior so the submit button remains reachable).

---

## API (Dedicated)

### Common

- **Auth**: All endpoints require a valid auth session/token unless explicitly noted.
- **Error shape** (for all non-204 error responses):
  ```ts
  export interface ApiErrorResponse {
    error: string;
  }
  ```
- **Pagination contract (all list endpoints)**:
  - **Query params**:
    - `page`: number (1-based integer)
    - `pageSize`: number (positive integer)
  - **Response shape**:
    ```ts
    export interface PaginatedResponse<T> {
      items: T[];
      total: number; // total count across all pages for the query
      page: number;  // echoes the requested page
    }
    ```
  - **Errors**:
    - `400 { error: string }` when `page` or `pageSize` is missing/invalid (e.g., non-integer, <= 0).

### Places

1) **List Places**
- `GET /api/places?page=number&pageSize=number&tripId=string|undefined`
- Response `200`:
  ```ts
  export type GetPlacesResponse = PaginatedResponse<Place>;
  ```
- Errors: `400`, `401`

2) **Create Place**
- `POST /api/places`
- Request:
  ```ts
  export interface CreatePlaceRequest {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    visitedAt: string;
    review: string;
    rating: number;
    category: PlaceCategory;
    tripId: string | null;

    /**
     * REQUIRED. 1..20.
     * - If `photoIds` is missing OR `photoIds.length === 0`, server MUST return 400.
     * - If `photoIds.length > 20`, server MUST return 400.
     */
    photoIds: string[]; // 1..20
  }
  ```
- Response `201`: `PlaceDetail`
- Errors: `400`, `401`

3) **Get Place Detail**
- `GET /api/places/:id`
- Response `200`: `PlaceDetail`
- Errors: `401`, `404`

4) **Update Place**
- `PATCH /api/places/:id`
- Request:
  ```ts
  export interface UpdatePlaceRequest {
    name?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    visitedAt?: string;
    review?: string;
    rating?: number;
    category?: PlaceCategory;
    tripId?: string | null;

    /**
     * Full replacement semantics:
     * - When provided, replaces the entire attached photo set for the Place with this ordered list.
     * - The order of `photoIds` becomes `sortOrder` (0..n-1) in the returned PlaceDetail.photos.
     * - Can be an empty array to remove all photos.
     * - If `photoIds.length > 20`, server MUST return 400.
     */
    photoIds?: string[]; // 0..20
  }
  ```
- Response `200`: `PlaceDetail`
- Errors: `400`, `401`, `404`

5) **Delete Place**
- `DELETE /api/places/:id`
- Response `204` (no body)
- Errors: `401`, `404`

### Photos

1) **Create/Upload Photo**
- `POST /api/photos` (multipart/form-data)
- Form fields:
  - `file`: binary
  - `fileSizeBytes`: number
  - `takenAt`: string | "" (ISO-8601 or empty)
  - `latitude`: string | "" (number serialized or empty)
  - `longitude`: string | "" (number serialized or empty)
- Response `201`:
  ```ts
  export type CreatePhotoResponse = Photo;
  ```
- Errors: `400`, `401`, `413`

2) **Get Photo**
- `GET /api/photos/:id`
- Response `200`: `Photo`
- Errors: `401`, `404`

3) **Delete Photo**
- `DELETE /api/photos/:id`
- Response `204` (no body)
- Errors: `401`, `404`
- **Cascade / referential behavior (atomic)**:
  - On successful deletion, the deleted photo MUST no longer appear in any `GET /api/places/:id` response.
  - If the deleted photo was attached to a Place (i.e., it would have appeared in `PlaceDetail.photos`), then:
    - It MUST be removed from that Place’s photo set atomically as part of the deletion transaction.
    - Remaining photos for that Place MUST have `sortOrder` re-normalized to contiguous integers starting at `0` in ascending order (relative order preserved).
    - If `Place.representativePhotoThumbUrl` pointed to the deleted photo’s `thumbUrl`, the server MUST update it to:
      - the `thumbUrl` of the lowest-`sortOrder` remaining photo, OR
      - `null` if no photos remain.
  - If any `Trip.coverPhotoUrl` equals the deleted photo’s `storageUrl` OR `thumbUrl`, the server MUST set `Trip.coverPhotoUrl = null` atomically as part of the deletion transaction.

### Trips

1) **List Trips**
- `GET /api/trips?page=number&pageSize=number`
- Response `200`:
  ```ts
  export type GetTripsResponse = PaginatedResponse<Trip>;
  ```
- Errors: `400`, `401`

2) **Create Trip**
- `POST /api/trips`
- Request:
  ```ts
  export interface CreateTripRequest {
    name: string;
    startDate: string; // "YYYY-MM-DD"
    endDate: string;   // "YYYY-MM-DD"
    description: string | null;
  }
  ```
- Response `201`: `Trip`
- Errors: `400`, `401`

3) **Get Trip**
- `GET /api/trips/:id`
- Response `200`: `Trip`
- Errors: `401`, `404`

4) **Update Trip**
- `PATCH /api/trips/:id`
- Request:
  ```ts
  export interface UpdateTripRequest {
    name?: string;
    startDate?: string; // "YYYY-MM-DD"
    endDate?: string;   // "YYYY-MM-DD"
    description?: string | null;
    coverPhotoUrl?: string | null;
  }
  ```
- Response `200`: `Trip`
- Errors: `400`, `401`, `404`

5) **Delete Trip**
- `DELETE /api/trips/:id`
- Response `204` (no body)
- Errors: `401`, `404`
- **Cascade behavior**: On successful trip deletion, all `Place` records that referenced the deleted trip MUST have `tripId` set to `null` (places are **not** deleted).

### Reverse Geocoding

- `POST /api/geocode/reverse`
- Request:
  ```ts
  export interface ReverseGeocodeRequest {
    latitude: number;
    longitude: number;
  }
  ```
- Response `200`:
  ```ts
  export interface ReverseGeocodeResponse {
    name: string;
    address: string;
  }
  ```
- Errors: `400`, `401`, `500`

---

## Common Principles

- **Platforms/Tech**: React Native (Expo SDK 52), TypeScript (strict), NativeWind, `expo-router`, Zustand for client state, existing API client, `expo-secure-store` for auth token (already in template).
- **Privacy**: All content is private to the logged-in shared account (no external sharing features in MVP).
- **Performance Targets (MVP)**:
  - With **≥ 20 places**, initial list load shall complete within **1,000ms** after API response is received (client-side render budget).
- **Offline/Network Constraints (MVP)**:
  - MVP **does not support offline creation/editing with later sync**.
  - On network failure, the UI shall show an error message and a retry CTA.
- **Media Constraints**:
  - Each attached photo file size limit is **≤ 10MB (10,485,760 bytes)**.
  - Images must display a **loading placeholder** until fully loaded.
- **Mobile UX Constraints**:
  - All tappable controls must have **min 44x44 pt** touch target (`minWidth >= 44` and `minHeight >= 44`).
  - All screens must use `SafeAreaView` (from `react-native-safe-area-context`) as the top-level container.
  - All forms must use keyboard avoidance (`KeyboardAvoidingView` + scroll behavior so the submit button remains reachable).

### Screen Definitions

#### 1) Place List (Tab)
- **Screen / Route**: `PlaceListScreen` — `/list`
- **Layout / UI**
  - `SafeAreaView`
  - Header row: Title `"Places"` (left), plus button `"+"` (right, min 44x44)
  - Body: `FlatList` of place cards (visited date descending)
    - Card: representative photo (thumbnail), place name, one-line review, rating (1–5), visited date
    - Swipe action: one-direction swipe reveals `"Delete"` button (min 44x44)
  - **Pagination UI/behavior (infinite scroll)**
    - Initial fetch uses `page=1&pageSize=20`.
    - When user scrolls near the end (via `onEndReached`), the screen fetches the next page **only if**:
      - there is no in-flight pagination request AND
      - `places.length < total` from the most recent paginated response.
    - While fetching a subsequent page (`page >= 2`), render a list footer loading indicator (e.g., spinner) that is visible at the bottom of the `FlatList`.
    - When `places.length === total`, render a non-interactive end-of-list footer text: `"You're all caught up"` and do not call the list endpoint again due to scrolling.
- **States**
  - Loading: show 6 card skeleton placeholders (only for initial page load when list is empty)
  - Empty: show `"No places yet"` and a button `"Add a place"` navigating to `/places/new`
  - Error:
    - For initial load error: show inline banner `"Network error. Tap to retry."` + retry button (retry triggers `GET /api/places?page=1&pageSize=20`)
    - For load-more error: show footer error row with text `"Couldn't load more. Tap to retry."` and a retry button (retry triggers the failed next-page request again)
- **Gestures**
  - Pull-to-refresh triggers refetch of `page=1&pageSize=20` and replaces the list contents with the new page 1 items.
  - Swipe card to reveal delete; tapping delete opens confirm dialog
- **Acceptance Criteria (EARS)**
  - AC-PL-1 [E]: WHEN the user taps the `"+"` button THEN the app SHALL navigate to `/places/new` within 300ms.
  - AC-PL-2 [S]: WHILE the initial `GET /api/places?page=1&pageSize=20` request is in-flight AND the list has 0 items THEN the screen SHALL render exactly 6 skeleton placeholders.
  - AC-PL-3 [W]: IF the initial `GET /api/places?page=1&pageSize=20` request fails due to network error THEN the screen SHALL render the banner text `"Network error. Tap to retry."` AND a retry button; WHEN the retry button is tapped THEN the screen SHALL call `GET /api/places?page=1&pageSize=20` exactly 1 time.
  - AC-PL-4 [E]: WHEN the user swipes a place card and taps `"Delete"` THEN the app SHALL display a confirm dialog with a destructive action labeled `"Delete"`; WHEN the user taps the destructive `"Delete"` THEN the app SHALL call `DELETE /api/places/:id` exactly 1 time.
  - AC-PL-5 [W]: IF `DELETE /api/places/:id` returns `404 { "error": "Place not found" }` THEN the screen SHALL keep the card visible AND SHALL render a banner containing the exact text `"Place not found"`.

#### 2) Place Map (Tab)
- **Screen / Route**: `PlaceMapScreen` — `/map`
- **Layout / UI**
  - `SafeAreaView`
  - Full-screen map view with pins for all places
  - Bottom sheet (collapsed by default) used for pin summary
- **States**
  - Loading: show centered spinner over map container
  - Empty: show `"No places to show on the map"` overlay
  - Error: banner `"Network error. Tap to retry."`
- **Gestures**
  - Pull-to-refresh triggers refetch and re-render pins
  - Tap pin opens summary bottom sheet; tap sheet navigates to `/places/[id]`
- **Acceptance Criteria (EARS)**
  - AC-PM-1 [S]: WHILE `GET /api/places?page=1&pageSize=200` is in-flight THEN the screen SHALL display a centered spinner overlay on top of the map container.
  - AC-PM-2 [E]: WHEN the user taps a pin for place `pl_1` THEN the screen SHALL expand/open the bottom sheet and render a summary for `pl_1`.
  - AC-PM-3 [E]: WHEN the user taps the bottom-sheet summary card for `pl_1` THEN the app SHALL navigate to `/places/pl_1` within 300ms.
  - AC-PM-4 [W]: IF `GET /api/places?page=1&pageSize=200` fails due to network error THEN the screen SHALL render the banner text `"Network error. Tap to retry."`.
  - AC-PM-5 [W]: IF `GET /api/places?page=1&pageSize=200` returns `401` THEN the app SHALL navigate to `/login` within 300ms.

#### 3) Place Create
- **Screen / Route**: `PlaceCreateScreen` — `/places/new`
- **Layout / UI**
  - `SafeAreaView`
  - `KeyboardAvoidingView` wrapping a `ScrollView`
  - Sections:
    1. Photo picker row: button `"Select photos"` (min 44x44)
    2. Selected photo strip (horizontal list) with image placeholders while loading
    3. Map preview with draggable pin (only after coordinates exist or user sets)
       - If coordinates do not exist yet, the map preview section shows an instructional row: `"Set a location to enable the map pin"`
    4. Form fields:
       - Name (Input)
       - Address (Input)
       - Visited date (read-only text from EXIF; editable via date picker if available)
       - Category (segmented/select)
       - Rating (1–5)
       - One-line review (Input)
    5. Submit button `"Save"` (min 44x44)
- **Behavior**
  - Save is enabled only when:
    - there is no in-flight save request AND
    - there is no in-flight photo upload AND
    - required form validation passes (e.g., name is non-empty) AND
    - `photoIds.length >= 1` (to satisfy `CreatePlaceRequest.photoIds: 1..20`) AND
    - `photoIds.length <= 20`.
  - On submit:
    - The screen sends `POST /api/places` using the current form values and the uploaded `photoIds`.
    - On success (`201`), navigate to `/places/[id]` for the created place.
- **States**
  - Loading: disable Save button + show `"Saving..."` label
  - Error: inline field errors + banner for network/server errors
- **Gestures**
  - Drag pin; on drag end triggers reverse geocode
  - Tap Save submits
- **Acceptance Criteria (EARS)**
  - AC-PC-1 [S]: WHILE there is any in-flight photo upload THEN the `"Save"` button SHALL be rendered with `disabled=true`.
  - AC-PC-2 [W]: IF the user taps `"Save"` when `name === ""` THEN the screen SHALL NOT call `POST /api/places` AND SHALL render an inline field error containing the exact text `"Name is required"`.
  - AC-PC-3 [W]: IF the user taps `"Save"` when `photoIds.length === 0` THEN the screen SHALL NOT call `POST /api/places` AND SHALL render an inline error containing the exact text `"At least 1 photo is required"`.
  - AC-PC-4 [E]: WHEN `POST /api/places` returns `201` with `id=pl_1` THEN the app SHALL navigate to `/places/pl_1` within 300ms.
  - AC-PC-5 [W]: IF `POST /api/places` fails due to network error THEN the screen SHALL render the banner text `"Network error. Tap to retry."` AND SHALL render the `"Save"` button with `disabled=false`.

#### 4) Place Detail
- **Screen / Route**: `PlaceDetailScreen` — `/places/[id]`
- **Layout / UI**
  - `SafeAreaView`
  - Header: Back, Title (place name), overflow menu: `"Edit"`, `"Delete"` (each min 44x44)
  - Photo gallery carousel/grid (images with placeholders)
  - Metadata section: address, visited date, category, rating, review, trip association
- **States**
  - Loading: skeleton for gallery + text rows
  - Error: `"Place not found"` (404) OR `"Network error. Tap to retry."`
- **Gestures**
  - Swipe gallery images
  - Tap Edit navigates to `/places/[id]/edit`
- **Acceptance Criteria (EARS)**
  - AC-PD-1 [S]: WHILE `GET /api/places/:id` is in-flight THEN the screen SHALL render a skeleton for the gallery AND at least 1 skeleton text row.
  - AC-PD-2 [W]: IF `GET /api/places/:id` returns `404` THEN the screen SHALL render the exact text `"Place not found"` and SHALL NOT render the edit/delete actions.
  - AC-PD-3 [E]: WHEN the user taps `"Edit"` THEN the app SHALL navigate to `/places/:id/edit` within 300ms.
  - AC-PD-4 [W]: IF `GET /api/places/:id` fails due to network error THEN the screen SHALL render the banner text `"Network error. Tap to retry."`.
  - AC-PD-5 [E]: WHEN the user taps `"Delete"` THEN the screen SHALL display a confirm dialog with a destructive action labeled `"Delete"`.

#### 5) Place Edit
- **Screen / Route**: `PlaceEditScreen` — `/places/[id]/edit`
- **Layout / UI**
  - Same structure as create, prefilled fields + existing photos
  - Save button `"Save changes"`
- **States**
  - Loading: `"Saving..."` and disable inputs
  - Error: inline + banner
- **Gestures**
  - Drag pin to update coordinates + reverse geocode
- **Acceptance Criteria (EARS)**
  - AC-PE-1 [S]: WHILE `GET /api/places/:id` is in-flight THEN the screen SHALL render at least 1 skeleton input row AND SHALL render `"Save changes"` with `disabled=true`.
  - AC-PE-2 [E]: WHEN the user taps `"Save changes"` with valid inputs THEN the screen SHALL call `PATCH /api/places/:id` exactly 1 time.
  - AC-PE-3 [W]: IF `PATCH /api/places/:id` fails due to network error THEN the screen SHALL render the banner text `"Network error. Tap to retry."` AND SHALL render `"Save changes"` with `disabled=false`.
  - AC-PE-4 [W]: IF `PATCH /api/places/:id` returns `404` THEN the screen SHALL render the exact text `"Place not found"`.

#### 6) Trip List (Tab)
- **Screen / Route**: `TripListScreen` — `/trips`
- **Layout / UI**
  - `SafeAreaView`
  - Header: Title `"Trips"`, plus button `"+"` (min 44x44)
  - `FlatList` of trip cards: cover photo (placeholder), name, date range
- **States**
  - Loading: skeleton list
  - Empty: `"No trips yet"` + `"Create a trip"` button
  - Error: banner `"Network error. Tap to retry."`
- **Gestures**
  - Pull-to-refresh refetches trips
  - Tap card navigates to `/trips/[id]`
- **Acceptance Criteria (EARS)**
  - AC-TL-1 [E]: WHEN the user taps the `"+"` button THEN the app SHALL navigate to `/trips/new` within 300ms.
  - AC-TL-2 [S]: WHILE `GET /api/trips?page=1&pageSize=20` is in-flight AND there are 0 rendered items THEN the screen SHALL render a skeleton list.
  - AC-TL-3 [W]: IF `GET /api/trips?page=1&pageSize=20` fails due to network error THEN the screen SHALL render the banner text `"Network error. Tap to retry."`.
  - AC-TL-4 [W]: IF `GET /api/trips?page=1&pageSize=20` returns `401` THEN the app SHALL navigate to `/login` within 300ms.

#### 7) Trip Create / Edit
- **Screens / Routes**:
  - `TripCreateScreen` — `/trips/new`
  - `TripEditScreen` — `/trips/[id]/edit`
- **Layout / UI**
  - `SafeAreaView`
  - `KeyboardAvoidingView` + `ScrollView`
  - Inputs: name, start date, end date, description (optional)
  - Submit button `"Save"` (min 44x44)
- **States**
  - Loading: disable submit, show `"Saving..."`
  - Error: inline + banner
- **Gestures**
  - Tap Save submits
- **Acceptance Criteria (EARS)**
  - AC-TCE-1 [E]: WHEN the user taps `"Save"` on `/trips/new` with valid inputs THEN the screen SHALL call `POST /api/trips` exactly 1 time.
  - AC-TCE-2 [E]: WHEN the user taps `"Save"` on `/trips/:id/edit` with valid inputs THEN the screen SHALL call `PATCH /api/trips/:id` exactly 1 time.
  - AC-TCE-3 [W]: IF the user taps `"Save"` when `name === ""` THEN the screen SHALL NOT call the API AND SHALL render an inline error containing the exact text `"Trip name is required"`.
  - AC-TCE-4 [W]: IF the API returns `400` for invalid date order THEN the screen SHALL render the server `error` string in a visible banner (exact text match).
  - AC-TCE-5 [S]: WHILE a save request is in-flight THEN the screen SHALL render `"Save"` with `disabled=true` and label text `"Saving..."`.

#### 8) Trip Detail
- **Screen / Route**: `TripDetailScreen` — `/trips/[id]`
- **Layout / UI**
  - `SafeAreaView`
  - Header: back, title (trip name), `"Edit"` button (min 44x44)
  - Tabs/sections inside screen:
    - Places list (cards)
    - Map preview with pins for trip places
  - Place row action: `"Remove from trip"` (min 44x44)
- **States**
  - Loading: skeleton sections
  - Empty: `"No places in this trip"`
  - Error: `"Trip not found"` (404) OR network banner
- **Gestures**
  - Pull-to-refresh refetches trip + its places
- **Acceptance Criteria (EARS)**
  - AC-TD-1 [W]: IF `GET /api/trips/:id` returns `404` THEN the screen SHALL render the exact text `"Trip not found"`.
  - AC-TD-2 [E]: WHEN the user pulls to refresh THEN the screen SHALL call `GET /api/trips/:id` exactly 1 time AND SHALL call `GET /api/places?page=1&pageSize=20&tripId=:id` exactly 1 time.
  - AC-TD-3 [E]: WHEN the user taps `"Remove from trip"` for place `pl_1` THEN the screen SHALL call `PATCH /api/places/pl_1` with body `{ "tripId": null }` exactly 1 time.
  - AC-TD-4 [W]: IF `PATCH /api/places/:id` for removal fails due to network error THEN the screen SHALL keep the place row visible AND SHALL render a banner containing the exact text `"Network error. Tap to retry."`.

#### 9) Photo Permission Help
- **Screen / Route**: `PhotoPermissionScreen` — `/permissions/photos`
- **Layout / UI**
  - `SafeAreaView`
  - Text: `"Photo access is required to select pictures."`
  - Button `"Open Settings"` (min 44x44)
- **States**
  - N/A
- **Gestures**
  - Tap Open Settings deep-links to OS settings (via Expo APIs)
- **Acceptance Criteria (EARS)**
  - AC-PP-1 [U]: The screen SHALL render the exact text `"Photo access is required to select pictures."`.
  - AC-PP-2 [U]: The `"Open Settings"` button SHALL have `minWidth >= 44` AND `minHeight >= 44`.
  - AC-PP-3 [E]: WHEN the user taps `"Open Settings"` THEN the app SHALL invoke the Expo open-settings behavior exactly 1 time.
  - AC-PP-4 [W]: IF the device denies opening settings (API rejects/throws) THEN the screen SHALL render a visible error banner with exact text `"Unable to open settings"`.

#### 10) Photo Picker (System Modal / Flow)
- **Route**: N/A (OS-provided picker invoked from Create/Edit)
- **Definition**
  - Invoked from `"Select photos"` in `/places/new` and `/places/:id/edit`.
  - Allows multi-select of images.
- **Acceptance Criteria (EARS)**
  - AC-PPK-1 [E]: WHEN the user taps `"Select photos"` AND permission state is `"granted"` THEN the system photo picker modal SHALL be presented within 500ms.
  - AC-PPK-2 [E]: WHEN the user completes selection of N photos THEN the selected photo strip SHALL render exactly N thumbnail items.
  - AC-PPK-3 [W]: IF the user cancels the picker THEN the screen SHALL NOT start any `POST /api/photos` upload requests.
  - AC-PPK-4 [W]: IF any selected photo exceeds 10MB THEN that photo SHALL be marked `"failed"` in the selection strip AND SHALL NOT be uploaded.

---

## Data Models

### Place — fields, types, constraints

```ts
export type PlaceCategory =
  | "FOOD"
  | "CAFE"
  | "LODGING"
  | "ATTRACTION"
  | "ACTIVITY"
  | "OTHER";

export interface Place {
  id: string; // server-generated, e.g. "pl_123"
  name: string; // 1..80 chars
  latitude: number; // -90..90
  longitude: number; // -180..180
  address: string; // 0..200 chars
  visitedAt: string; // ISO-8601 datetime, e.g. "2026-05-01T12:34:56.000Z"
  review: string; // 0..140 chars
  rating: number; // integer 1..5
  category: PlaceCategory;
  tripId: string | null;
  representativePhotoThumbUrl: string | null;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface PlaceDetail extends Place {
  photos: Photo[]; // ordered by sortOrder asc
}
```

- **Storage method**: API (source of truth) + in-memory cache in Zustand (`placesStore`).
- **Sync strategy**: On screen focus and pull-to-refresh, refetch page 1. After create/edit/delete, update store optimistically then reconcile on next refetch.

### Photo — fields, types, constraints

```ts
export interface Photo {
  id: string; // e.g. "ph_123"
  placeId: string;
  storageUrl: string; // full-size image URL
  thumbUrl: string; // thumbnail URL
  takenAt: string | null; // ISO-8601 or null if EXIF missing
  sortOrder: number; // integer >= 0
  fileSizeBytes: number; // <= 10485760
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
```

- **Storage method**: API (source of truth). Client keeps selected local URIs during creation only.
- **Sync strategy**: Photos are fetched as part of `GET /api/places/:id`.

### Trip — fields, types, constraints

```ts
export interface Trip {
  id: string; // e.g. "tr_123"
  name: string; // 1..60 chars
  startDate: string; // ISO-8601 date, e.g. "2026-05-01"
  endDate: string; // ISO-8601 date, e.g. "2026-05-03"
  coverPhotoUrl: string | null;
  description: string | null; // 0..500 chars
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
```

- **Foreign key references**
  - `Place.tripId` is a foreign key reference to `Trip.id` (a Place may belong to at most one Trip).
- **Delete cascade behavior**
  - When a `Trip` is deleted, associated `Place` records are **not deleted**; their `tripId` fields MUST be set to `null`.
- **Storage method**: API + Zustand cache (`tripsStore`).
- **Sync strategy**: Pull-to-refresh and screen focus refetch. After create/edit, update store then reconcile.

### ReverseGeocodeResult — fields, types, constraints

```ts
export interface ReverseGeocodeResult {
  name: string; // 0..80 chars, may be "" if unknown
  address: string; // 0..200 chars
}
```

- **Storage method**: API (proxy to Kakao Local API) or direct external API (see Open Questions).
- **Sync strategy**: No persistence; per drag-end request.

---

## Database Schema (Explicit)

> 목적: 본 섹션은 서버 저장소(예: SQL DB)의 **명시적 엔티티 정의**를 제공한다. 앱은 API를 통해서만 접근한다. 아래 스키마는 **UUID 기반**이며, API의 `id/createdAt/updatedAt`는 각각 `uuid / timestamptz / timestamptz`에 대응한다.

### TypeScript entity shapes (server-side persistence layer)

```ts
// ISO-8601 string in API, stored as timestamptz/date in DB
export type IsoDateTimeString = string; // e.g. "2026-05-01T12:00:00.000Z"
export type IsoDateString = string;     // e.g. "2026-05-01"

// PlaceCategory persisted as enum / constrained text
export type PlaceCategoryDb =
  | "FOOD"
  | "CAFE"
  | "LODGING"
  | "ATTRACTION"
  | "ACTIVITY"
  | "OTHER";

export interface TripRow {
  id: string; // UUID
  name: string;
  startDate: IsoDateString; // stored as DATE
  endDate: IsoDateString;   // stored as DATE
  coverPhotoUrl: string | null;
  description: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface PlaceRow {
  id: string; // UUID
  name: string;
  latitude: number;  // stored as DOUBLE PRECISION
  longitude: number; // stored as DOUBLE PRECISION
  address: string;
  visitedAt: IsoDateTimeString; // stored as TIMESTAMPTZ
  review: string;
  rating: number; // stored as SMALLINT
  category: PlaceCategoryDb;
  tripId: string | null; // FK -> trips.id
  representativePhotoThumbUrl: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface PhotoRow {
  id: string; // UUID
  placeId: string; // FK -> places.id
  storageUrl: string;
  thumbUrl: string;
  takenAt: IsoDateTimeString | null;
  sortOrder: number; // stored as INTEGER
  fileSizeBytes: number; // stored as INTEGER
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/**
 * PlaceDetail is not a separate table.
 * It is a composed API response: Place + ordered Photos.
 */
export type PlaceDetailRecord = PlaceRow & { photos: PhotoRow[] };
```

### SQL schema (PostgreSQL-style DDL)

```sql
-- 1) Enum / Category
CREATE TYPE place_category AS ENUM (
  'FOOD',
  'CAFE',
  'LODGING',
  'ATTRACTION',
  'ACTIVITY',
  'OTHER'
);

-- 2) Trips
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cover_photo_url TEXT NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT trips_name_len CHECK (char_length(name) BETWEEN 1 AND 60),
  CONSTRAINT trips_date_order CHECK (start_date <= end_date)
);

CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- 3) Places
CREATE TABLE places (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address VARCHAR(200) NOT NULL DEFAULT '',
  visited_at TIMESTAMPTZ NOT NULL,
  review VARCHAR(140) NOT NULL DEFAULT '',
  rating SMALLINT NOT NULL,
  category place_category NOT NULL,
  trip_id UUID NULL,
  representative_photo_thumb_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT places_name_len CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT places_lat_range CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT places_lng_range CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT places_address_len CHECK (char_length(address) BETWEEN 0 AND 200),
  CONSTRAINT places_review_len CHECK (char_length(review) BETWEEN 0 AND 140),
  CONSTRAINT places_rating_range CHECK (rating >= 1 AND rating <= 5),

  CONSTRAINT fk_places_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_places_visited_at ON places(visited_at DESC);
CREATE INDEX idx_places_trip_id ON places(trip_id);

-- 4) Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  place_id UUID NOT NULL,
  storage_url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  taken_at TIMESTAMPTZ NULL,
  sort_order INTEGER NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT photos_sort_order_nonneg CHECK (sort_order >= 0),
  CONSTRAINT photos_file_size_limit CHECK (file_size_bytes >= 0 AND file_size_bytes <= 10485760),

  CONSTRAINT fk_photos_place
    FOREIGN KEY (place_id)
    REFERENCES places(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_photos_place_sort ON photos(place_id, sort_order ASC);
```

### Referential / cascade rules summary (pass/fail relevant)

- `places.trip_id → trips.id` with `ON DELETE SET NULL`
  - Deleting a Trip never deletes Places.
- `photos.place_id → places.id` with `ON DELETE CASCADE`
  - Deleting a Place deletes its Photos.
- **DELETE Photo application-level cascades (in addition to FK constraints)**:
  - When deleting a Photo row directly (via `DELETE /api/photos/:id`), the system MUST:
    - remove that photo from its Place’s photo set (row deletion),
    - re-normalize remaining `photos.sort_order` for that place (0..n-1),
    - update `places.representative_photo_thumb_url` if it referenced the deleted photo,
    - and null out `trips.cover_photo_url` if it equals the deleted photo `storage_url` or `thumb_url`,
    - all within a single transaction.

---

## Feature List

### F1. Places API Integration (Create / Read / Update / Delete + Pagination)
- Description: Implements API contracts and client state for creating, fetching, updating, and deleting Places. Ensures consistent error handling (401/404/validation) and predictable pagination for list views.
- Data: `Place`, `PlaceDetail`
- API: `GET /api/places` · `POST /api/places` · `GET /api/places/:id` · `PATCH /api/places/:id` · `DELETE /api/places/:id`
- Requirements:
  - **API Contract**
    - `GET /api/places?page=number&pageSize=number&tripId=string|undefined`
      - Response `200`:
        ```ts
        export interface GetPlacesResponse {
          items: Place[];
          total: number;
          page: number;
        }
        ```
      - Errors: `400 { error: string }`, `401 { error: string }`
    - `POST /api/places`
      - Request:
        ```ts
        export interface CreatePlaceRequest {
          name: string;
          latitude: number;
          longitude: number;
          address: string;
          visitedAt: string;
          review: string;
          rating: number;
          category: PlaceCategory;
          tripId: string | null;
          photoIds: string[]; // 1..20 (REQUIRED; missing/empty MUST 400)
        }
        ```
      - Response `201`: `PlaceDetail`
      - Errors: `400 { error: string }`, `401 { error: string }`
    - `GET /api/places/:id`
      - Response `200`: `PlaceDetail`
      - Errors: `401 { error: string }`, `404 { error: string }`
    - `PATCH /api/places/:id`
      - Request:
        ```ts
        export interface UpdatePlaceRequest {
          name?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
          visitedAt?: string;
          review?: string;
          rating?: number;
          category?: PlaceCategory;
          tripId?: string | null;
          photoIds?: string[]; // 0..20, full replacement semantics; empty valid
        }
        ```
      - Response `200`: `PlaceDetail`
      - Errors: `400 { error: string }`, `401 { error: string }`, `404 { error: string }`
    - `DELETE /api/places/:id`
      - Response `204` (no body)
      - Errors: `401 { error: string }`, `404 { error: string }`
  - **Acceptance Criteria**
  - AC-1 [E]: Scenario: Create place success
    - Given 로그인된 유저가 있을 때
    - When `POST /api/places` `{ "name": "Cafe Onion", "latitude": 37.5445, "longitude": 127.0557, "address": "Seoul, Seongdong-gu...", "visitedAt": "2026-05-01T12:00:00.000Z", "review": "Great coffee", "rating": 5, "category": "CAFE", "tripId": null, "photoIds": ["ph_1"] }`
    - Then `201` 반환 `{ "id": "pl_1", "name": "Cafe Onion", "latitude": 37.5445, "longitude": 127.0557, "address": "Seoul, Seongdong-gu...", "visitedAt": "2026-05-01T12:00:00.000Z", "review": "Great coffee", "rating": 5, "category": "CAFE", "tripId": null, "representativePhotoThumbUrl": "https://cdn.example.com/ph_1_thumb.jpg", "createdAt": "2026-05-01T12:00:05.000Z", "updatedAt": "2026-05-01T12:00:05.000Z", "photos": [{ "id": "ph_1", "placeId": "pl_1", "storageUrl": "https://cdn.example.com/ph_1.jpg", "thumbUrl": "https://cdn.example.com/ph_1_thumb.jpg", "takenAt": "2026-05-01T12:00:00.000Z", "sortOrder": 0, "fileSizeBytes": 500000, "createdAt": "2026-05-01T12:00:03.000Z", "updatedAt": "2026-05-01T12:00:03.000Z" }] }`
  - AC-2 [W]: Scenario: Reject invalid rating
    - Given 로그인된 유저가 있을 때
    - When `POST /api/places` `{ "name": "Cafe Onion", "latitude": 37.5445, "longitude": 127.0557, "address": "Seoul", "visitedAt": "2026-05-01T12:00:00.000Z", "review": "Ok", "rating": 6, "category": "CAFE", "tripId": null, "photoIds": ["ph_1"] }`
    - Then `400` 반환 `{ "error": "Rating must be an integer between 1 and 5" }`
  - AC-3 [W]: Scenario: Unauthorized place fetch
    - Given 로그인된 유저가 없을 때
    - When `GET /api/places?page=1&pageSize=20`
    - Then `401` 반환 `{ "error": "Unauthorized" }`
  - AC-4 [W]: Scenario: Place not found on detail
    - Given 로그인된 유저가 있을 때
    - When `GET /api/places/pl_missing`
    - Then `404` 반환 `{ "error": "Place not found" }`
  - AC-5 [S]: Scenario: Loading state while fetching places
    - Given 로그인된 유저가 있고 `/list` 화면에 진입했을 때
    - When `GET /api/places?page=1&pageSize=20` 요청이 진행 중일 때
    - Then 시스템은 `FlatList`에 카드 스켈레톤 6개를 렌더링한다
  - AC-6 [W]: Scenario: Network error handling on places fetch
    - Given 로그인된 유저가 있을 때
    - When `GET /api/places?page=1&pageSize=20` 가 네트워크 오류로 실패한다
    - Then 시스템은 `"Network error. Tap to retry."` 배너를 표시한다
  - AC-7 [E]: Scenario: Update place photos via PATCH replaces ordering
    - Given 로그인된 유저가 있고 `pl_1` 에 기존 사진이 `[ph_a, ph_b]` (sortOrder 0,1) 로 연결되어 있을 때
    - When `PATCH /api/places/pl_1` `{ "photoIds": ["ph_b", "ph_a"] }`
    - Then `200` 응답의 `photos[0].id` 는 `"ph_b"` 이고 `photos[0].sortOrder` 는 `0` 이며 `photos[1].id` 는 `"ph_a"` 이고 `photos[1].sortOrder` 는 `1` 이다
  - AC-8 [W]: Scenario: Update place photos rejects unknown photo id
    - Given 로그인된 유저가 있을 때
    - When `PATCH /api/places/pl_1` `{ "photoIds": ["ph_missing"] }`
    - Then `400` 반환 `{ "error": "Invalid photoIds" }`
  - AC-9 [W]: Scenario: Create place rejects missing/empty photoIds
    - Given 로그인된 유저가 있을 때
    - When `POST /api/places` 요청 바디에서 `"photoIds": []` 이거나 `photoIds` 필드가 누락된다
    - Then `400` 반환 `{ "error": "photoIds must contain 1 to 20 items" }`
  - AC-10 [E]: Scenario: Update place allows removing all photos
    - Given 로그인된 유저가 있고 `pl_1` 에 기존 사진이 `[ph_a]` 로 연결되어 있을 때
    - When `PATCH /api/places/pl_1` `{ "photoIds": [] }`
    - Then `200` 응답의 `photos.length` 는 `0` 이다

---

### F2. Photo Selection, EXIF Extraction, and Upload (≤ 10MB)
- Description: Enables selecting multiple gallery photos, extracting EXIF GPS + taken time when available, and uploading photos to obtain server `photoIds`. Enforces the 10MB-per-photo constraint and permission handling for Photo Library access.
- Data: `Photo` (pre-upload local selection state), `CreatePlaceRequest.photoIds`
- API: `POST /api/photos` (upload) → `Photo` | errors
- Requirements:
  - **API Contract**
    - `POST /api/photos` (multipart/form-data)
      - Form fields:
        - `file`: binary
        - `fileSizeBytes`: number
        - `takenAt`: string | "" (ISO-8601 or empty)
        - `latitude`: string | "" (number serialized or empty)
        - `longitude`: string | "" (number serialized or empty)
      - Response `201`:
        ```ts
        export type CreatePhotoResponse = Photo;
        ```
      - Errors: `400 { error: string }`, `401 { error: string }`, `413 { error: string }`
  - **Acceptance Criteria**
  - AC-1 [E]: Scenario: Photo permission granted and picker opens
    - Given `/places/new` 화면에서 Photo Library 권한 상태가 `"undetermined"` 일 때
    - When 유저가 `"Select photos"` 버튼을 탭한다
    - Then 시스템은 Photo Library 권한을 요청하고, 권한이 `"granted"`이면 사진 선택 UI를 표시한다
  - AC-2 [E]: Scenario: Permission denied shows help screen
    - Given `/places/new` 화면에서 Photo Library 권한 상태가 `"denied"` 일 때
    - When 유저가 `"Select photos"` 버튼을 탭한다
    - Then 시스템은 `/permissions/photos` 로 이동하고 `"Open Settings"` 버튼을 표시한다
  - AC-3 [W]: Scenario: Reject photo larger than 10MB before upload
    - Given 유저가 로컬 사진 1장을 선택했고 해당 파일 크기가 `10485761` bytes 일 때
    - When 시스템이 업로드를 시작하려고 한다
    - Then 시스템은 업로드를 수행하지 않고 `"Photo must be 10MB or smaller"` 메시지를 표시한다
  - AC-4 [E]: Scenario: Upload photo success returns photo id
    - Given 로그인된 유저가 있을 때
    - When `POST /api/photos` multipart에 `fileSizeBytes=500000`, `takenAt="2026-05-01T12:00:00.000Z"`, `latitude="37.5445"`, `longitude="127.0557"` 로 업로드한다
    - Then `201` 반환 `{ "id": "ph_1", "placeId": "pl_pending", "storageUrl": "https://cdn.example.com/ph_1.jpg", "thumbUrl": "https://cdn.example.com/ph_1_thumb.jpg", "takenAt": "2026-05-01T12:00:00.000Z", "sortOrder": 0, "fileSizeBytes": 500000, "createdAt": "2026-05-01T12:00:03.000Z", "updatedAt": "2026-05-01T12:00:03.000Z" }`
  - AC-5 [W]: Scenario: Upload rejected by server for size
    - Given 로그인된 유저가 있을 때
    - When `POST /api/photos` 가 `413` 을 반환한다 그리고 응답이 `{ "error": "Photo exceeds 10MB limit" }` 이다
    - Then 시스템은 `"Photo exceeds 10MB limit"` 텍스트를 표시하고 해당 사진을 선택 목록에서 `"failed"` 상태로 표시한다
  - AC-6 [S]: Scenario: Upload loading state per photo
    - Given 로그인된 유저가 있고 2장의 사진을 선택했을 때
    - When 첫 번째 사진 업로드가 진행 중일 때
    - Then 시스템은 첫 번째 사진 썸네일 영역에 로딩 플레이스홀더를 표시하고 `"Save"` 버튼을 `disabled=true` 로 설정한다

---

### F3. Place Create/Edit Form with Map Pin Correction + Reverse Geocoding
- Description: Provides the place metadata form (name/address/review/rating/category/visited date) and a map pin that can be dragged to correct location. On pin drag end, the system requests reverse geocoding to suggest name/address defaults.
- Data: `Place`, `ReverseGeocodeResult`
- API: `POST /api/geocode/reverse` → `{name,address}` | errors; `POST /api/places`, `PATCH /api/places/:id`
- Requirements:
  - **API Contract**
    - `POST /api/geocode/reverse`
      - Request:
        ```ts
        export interface ReverseGeocodeRequest {
          latitude: number;
          longitude: number;
        }
        ```
      - Response `200`:
        ```ts
        export interface ReverseGeocodeResponse {
          name: string;
          address: string;
        }
        ```
      - Errors: `400 { error: string }`, `401 { error: string }`, `500 { error: string }`
  - **Acceptance Criteria**
  - AC-1 [E]: Scenario: Drag pin triggers reverse geocode and fills fields
    - Given 로그인된 유저가 있고 `/places/new` 화면에서 지도 핀이 표시되어 있을 때
    - When 유저가 핀을 `latitude=37.5665`, `longitude=126.9780` 위치로 드래그 후 손을 뗀다
    - Then 시스템은 `POST /api/geocode/reverse` `{ "latitude": 37.5665, "longitude": 126.978 }` 를 호출한다
  - AC-2 [E]: Scenario: Reverse geocode success sets address
    - Given 로그인된 유저가 있을 때
    - When `POST /api/geocode/reverse` `{ "latitude": 37.5665, "longitude": 126.978 }`
    - Then `200` 반환 `{ "name": "City Hall", "address": "110 Sejong-daero, Jung-gu, Seoul" }` 그리고 시스템은 Address 입력값을 `"110 Sejong-daero, Jung-gu, Seoul"` 로 설정한다
  - AC-3 [W]: Scenario: Reverse geocode server failure shows retry
    - Given 로그인된 유저가 있고 `/places/new` 화면에서 핀 드래그를 종료했을 때
    - When `POST /api/geocode/reverse` 가 `500` 반환 `{ "error": "Reverse geocoding failed" }`
    - Then 시스템은 `"Reverse geocoding failed"` 배너와 `"Retry"` 버튼을 표시한다
  - AC-4 [W]: Scenario: Prevent save without name
    - Given 로그인된 유저가 있고 `/places/new` 화면에서 `name=""` 일 때
    - When 유저가 `"Save"` 버튼을 탭한다
    - Then 시스템은 `POST /api/places` 를 호출하지 않고 `"Name is required"` 필드 오류를 표시한다
  - AC-5 [S]: Scenario: Keyboard avoidance keeps Save reachable
    - Given `/places/new` 화면에서 키보드가 표시된 상태일 때
    - When 유저가 `"review"` 입력창에 포커스한다
    - Then 시스템은 `KeyboardAvoidingView` 를 적용하고 `"Save"` 버튼이 화면 내에서 탭 가능(가려지지 않음) 상태로 유지된다
  - AC-6 [W]: Scenario: Network error on save shows retry CTA
    - Given 로그인된 유저가 있고 `/places/new` 화면에서 유효한 입력이 채워져 있을 때
    - When `POST /api/places` 요청이 네트워크 오류로 실패한다
    - Then 시스템은 `"Network error. Tap to retry."` 배너를 표시하고 `"Save"` 버튼을 `disabled=false` 로 되돌린다

---

### F4. Place List View (Visited Desc), Pull-to-Refresh, Swipe-to-Delete
- Description: Displays places as a visited-date-descending card list with representative photo and key metadata. Supports pull-to-refresh and swipe-to-delete with confirmation.
- Data: `Place`
- API: `GET /api/places` · `DELETE /api/places/:id`
- Requirements:
  - **Acceptance Criteria**
  - AC-1 [E]: Scenario: List fetch renders items in visitedAt desc
    - Given 로그인된 유저가 있을 때
    - When `GET /api/places?page=1&pageSize=20` 가 `200` 반환 `{ "items": [{ "id": "pl_1", "name": "A", "latitude": 37, "longitude": 127, "address": "", "visitedAt": "2026-05-02T00:00:00.000Z", "review": "", "rating": 5, "category": "FOOD", "tripId": null, "representativePhotoThumbUrl": null, "createdAt": "2026-05-02T00:00:00.000Z", "updatedAt": "2026-05-02T00:00:00.000Z" }, { "id": "pl_2", "name": "B", "latitude": 37, "longitude": 127, "address": "", "visitedAt": "2026-05-01T00:00:00.000Z", "review": "", "rating": 4, "category": "CAFE", "tripId": null, "representativePhotoThumbUrl": null, "createdAt": "2026-05-01T00:00:00.000Z", "updatedAt": "2026-05-01T00:00:00.000Z" }], "total": 2, "page": 1 }`
    - Then 시스템은 첫 번째 카드에 `"A"` 를, 두 번째 카드에 `"B"` 를 렌더링한다
  - AC-2 [E]: Scenario: Pull-to-refresh refetches first page
    - Given 로그인된 유저가 있고 `/list` 에서 목록이 표시되어 있을 때
    - When 유저가 리스트를 pull-to-refresh 한다
    - Then 시스템은 `GET /api/places?page=1&pageSize=20` 를 1회 호출한다
  - AC-3 [E]: Scenario: Swipe delete confirmation then delete
    - Given 로그인된 유저가 있고 `/list` 에서 `pl_1` 카드가 표시되어 있을 때
    - When 유저가 `pl_1` 카드를 오른쪽에서 왼쪽으로 스와이프하고 `"Delete"` 버튼을 탭한 뒤 확인 다이얼로그에서 `"Delete"` 를 탭한다
    - Then 시스템은 `DELETE /api/places/pl_1` 을 호출하고 `204` 를 받으면 `pl_1` 카드를 목록에서 제거한다
  - AC-4 [W]: Scenario: Delete fails with not found
    - Given 로그인된 유저가 있고 `/list` 에서 `pl_missing` 삭제를 시도할 때
    - When `DELETE /api/places/pl_missing` 가 `404` 반환 `{ "error": "Place not found" }`
    - Then 시스템은 `"Place not found"` 배너를 표시하고 리스트에서 아이템을 제거하지 않는다
  - AC-5 [W]: Scenario: Unauthorized list refresh forces re-auth
    - Given 로그인된 유저가 있을 때
    - When `GET /api/places?page=1&pageSize=20` 가 `401` 반환 `{ "error": "Unauthorized" }`
    - Then 시스템은 `/login` 화면으로 이동한다
  - AC-6 [U]: Scenario: Touch targets on list actions
    - Given `/list` 화면이 렌더링되었을 때
    - When 시스템이 `"+"` 버튼과 스와이프 `"Delete"` 버튼을 렌더링한다
    - Then 두 버튼은 각각 `minWidth=44` 그리고 `minHeight=44` 를 만족한다
  - AC-7 [E]: Scenario: Infinite scroll loads next page once
    - Given 로그인된 유저가 있고 `/list` 에서 현재 `page=1` 이 로드되었고 응답의 `total=25` 이며 현재 렌더된 아이템 수가 `20` 일 때
    - When 유저가 리스트 하단으로 스크롤하여 `onEndReached` 가 1회 발생한다
    - Then 시스템은 `GET /api/places?page=2&pageSize=20` 을 정확히 1회 호출한다
  - AC-8 [W]: Scenario: Load-more network error shows footer retry without losing existing items
    - Given 로그인된 유저가 있고 `/list` 에서 `page=1` 아이템 20개가 표시되어 있을 때
    - When `GET /api/places?page=2&pageSize=20` 가 네트워크 오류로 실패한다
    - Then 시스템은 기존 20개 아이템을 계속 표시하고, 리스트 footer에 `"Couldn't load more. Tap to retry."` 와 retry 버튼을 표시한다

---

### F5. Map View of All Places (Pins + Summary Popup + Refresh)
- Description: Shows all saved places as map pins and supports tap-to-view a summary popup that navigates to detail. Includes pull-to-refresh to refetch places and re-render pins.
- Data: `Place`
- API: `GET /api/places`
- Requirements:
  - **Acceptance Criteria**
  - AC-1 [E]: Scenario: Map loads and renders pin count
    - Given 로그인된 유저가 있을 때
    - When `GET /api/places?page=1&pageSize=200` 가 `200` 반환 `{ "items": [{ "id": "pl_1", "name": "Cafe Onion", "latitude": 37.5445, "longitude": 127.0557, "address": "", "visitedAt": "2026-05-01T12:00:00.000Z", "review": "", "rating": 5, "category": "CAFE", "tripId": null, "representativePhotoThumbUrl": null, "createdAt": "2026-05-01T12:00:00.000Z", "updatedAt": "2026-05-01T12:00:00.000Z" }], "total": 1, "page": 1 }`
    - Then `/map` 화면은 지도에 핀 1개를 렌더링한다
  - AC-2 [E]: Scenario: Tap pin shows summary then navigates to detail
    - Given `/map` 화면에서 `pl_1` 핀이 렌더링되어 있을 때
    - When 유저가 `pl_1` 핀을 탭한 뒤 요약 팝업에서 카드 영역을 탭한다
    - Then 시스템은 `/places/pl_1` 로 이동한다
  - AC-3 [E]: Scenario: Pull-to-refresh refetches and re-renders pins
    - Given 로그인된 유저가 있고 `/map` 화면이 표시되어 있을 때
    - When 유저가 pull-to-refresh 한다
    - Then 시스템은 `GET /api/places?page=1&pageSize=200` 를 1회 호출하고 핀을 재렌더링한다
  - AC-4 [W]: Scenario: Network error shows retry banner on map
    - Given 로그인된 유저가 있을 때
    - When `GET /api/places?page=1&pageSize=200` 가 네트워크 오류로 실패한다
    - Then 시스템은 `"Network error. Tap to retry."` 배너를 표시한다
  - AC-5 [S]: Scenario: Map loading overlay
    - Given `/map` 화면에 진입했을 때
    - When `GET /api/places?page=1&pageSize=200` 응답이 오기 전일 때
    - Then 시스템은 지도 컨테이너 위에 로딩 스피너를 표시한다
  - AC-6 [W