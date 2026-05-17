## Task: Repository helpers (pure): sort + merge pagination
Add small pure helper functions for client-side list handling: stable sort places by visitedAt desc and merge paginated results without duplicates (by id). These helpers are reused by list/map screens to meet 1,000ms render budget.

## Acceptance Criteria


## Definition of Done


## Files to create/modify
src/lib/repos/listHelpers.ts


### Mobile Design Reference: Professional Mobile App
**Visual Identity**
- Clean, modern dark theme with accent color
- Bottom tab navigation (3-5 tabs max)
- Generous spacing and clear visual hierarchy
- Touch-first: all interactive elements ≥ 48px

**Key Patterns**
- Use pre-built components: Button, Input, Card, Badge, Avatar, Skeleton, Modal, Toggle, BottomSheet
- FlatList for all scrollable lists with pull-to-refresh
- SafeAreaView on every screen
- Loading (Skeleton), empty state, error state on every data screen

Use these patterns as inspiration — adapt to the specific app's needs. The goal is a polished, professional UI that feels like a real product, not a prototype.

IMPORTANT: Read `.ai-factory/shared-context.md` for shared types, existing codebase exports, and already-implemented packets. Do NOT duplicate what's listed there.

## BEFORE writing code
1. Read CLAUDE.md for ALL project rules (TDD protocol, code quality, verification gates, UI components, design system)
2. Read `.ai-factory/spec.md` for full SPEC context (features, API contracts, DB schema)
3. If `.ai-factory/shared-context.md` exists, read it for shared types and existing codebase exports
4. Check existing files in src/lib/, src/components/, src/store/, app/ — do NOT recreate what exists

CRITICAL: CLAUDE.md contains the TDD protocol, code quality rules, and verification gates — follow them strictly.
The test file `src/__tests__/packet-0000.test.ts` has been pre-written. Make ALL tests pass.

## Available exports from existing files (IMPORT, do NOT recreate)
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends Component<Props, State> {

// src/components/ui/avatar.tsx
export function Avatar({ src, name, size = "md", className, ...props }: AvatarProps) {

// src/components/ui/badge.tsx
export function Badge({ label, variant = "default", className, ...props }: BadgeProps) {

// src/components/ui/bottom-sheet.tsx
export function BottomSheet({ open, onClose, children, className, ...props }: BottomSheetProps) {

// src/components/ui/button.tsx
export function Button({ label, variant = "default", loading, className, disabled, ...props }: ButtonProps) {

// src/components/ui/card.tsx
export function Card({ title, description, icon, className, children, ...props }: CardProps) {

// src/components/ui/image.tsx
export function AppImage({ uri, fallbackColor = "var(--bg-card)", className, style, ...props }: AppImageProps) {

// src/components/ui/input.tsx
export function Input({ className, error, ...props }: InputProps) {

// src/components/ui/modal.tsx
export function Modal({ open, onClose, children, className, ...props }: ModalProps) {

// src/components/ui/skeleton.tsx
export function Skeleton({ width, height, rounded, className, style, ...props }: SkeletonProps) {

// src/components/ui/textarea.tsx
export function Textarea({ className, error, ...props }: TextareaProps) {

// src/components/ui/toggle.tsx
export function Toggle({ label, description, value, onValueChange, disabled, className, ...props }: ToggleProps) {

// src/lib/api.ts
export class ApiError extends Error {
export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {

// src/lib/asyncStorage.ts
export async function getItem(key: string): Promise<string | null> {
export async function setItem(key: string, value: string): Promise<void> {
export async function removeItem(key: string): Promise<void> {
export async function getJSON<T>(key: string): Promise<T | null> {
export async function setJSON<T>(key: string, value: T): 

## 선행 패킷 (이미 완료된 것으로 가정)
다음 패킷들이 이 패킷보다 먼저 실행되었습니다. 이 패킷들이 생성한 파일과 export를 사용할 수 있습니다:
- Packet 0002: "Entity + contract + UI-only types (Places/Trips/Photos/Geocode)" (files: src/lib/types/entities.ts, src/lib/types/contracts.ts, src/lib/types/ui.ts)
이 패킷들의 코드가 워킹 디렉토리에 이미 존재합니다. 기존 파일을 확인하고 활용하세요.

## TDD Workflow (MANDATORY — follow this order)

You MUST follow Test-Driven Development for this packet. Do NOT skip the red phase.

### Step 1: Write Tests FIRST (Red Phase)
Create `src/__tests__/packet-0005.test.ts` with tests for the Acceptance Criteria above.
- Each AC = at least 1 test (name them "AC-1: should ...")
- Write 4-8 focused tests total
- Tests must describe expected behavior with concrete values (not just "truthy")
- Error cases included (invalid input, missing data, etc.)
- Do NOT write any source code yet
- Commit: `git add src/__tests__/packet-0005.test.ts && git commit -m "test: TDD red phase — packet 0005"`

### Step 2: Verify Red (tests should FAIL)
```bash
pnpm test src/__tests__/packet-0005.test.ts
```
Tests MUST fail (source doesn't exist yet). This is intentional.

### Step 3: Implement to Pass (Green Phase)
Now write the source code in the files listed above. Goal: make ALL tests pass.

**절대 원칙: 테스트는 명세다. 테스트를 건드리지 말고 구현을 완성하라.**
- 테스트가 expect하는 값/동작을 소스 코드에서 실제로 구현하라
- 테스트를 수정해서 통과시키는 것은 버그를 숨기는 행위다 → 절대 금지
- 허용되는 테스트 수정: import 경로 오류, mock 구조 불일치만
- 금지: assertion 값 변경, 테스트 케이스 삭제, 조건 완화
- 구현이 어려우면 계속 구현하라 — 테스트를 약하게 만들지 마라
- Commit: `git add <source files> && git commit -m "feat: implement packet 0005"`

### Step 4: Verify Green
```bash
pnpm test src/__tests__/packet-0005.test.ts
```
All tests must pass with the ORIGINAL assertions. If any fail, fix the CODE (not the test).

## Quality Gates (MANDATORY — run before finishing)

After implementing all code, you MUST complete this quality loop. Do NOT finish until all gates pass.

### Gate 1: TypeScript Check
```bash
pnpm typecheck   # or: npx tsc --noEmit
```
If errors exist → fix ALL of them → re-run. Repeat until 0 errors.

### Gate 2: Tests
```bash
pnpm test
```
If tests fail → fix the code (NOT the tests) → re-run. Repeat until all pass.

### Gate 3: Build Verification
```bash
pnpm build   # or: npx next build
```
If build fails → fix the error → re-run.

### Gate 4: Self-Review Checklist
Before finishing, verify:
- [ ] No duplicate code — checked existing exports before creating new functions
- [ ] All imports resolve to real files (no phantom imports)
- [ ] Types match src/lib/types.ts — no inline re-definitions
- [ ] No hardcoded test data left in source files
- [ ] CLAUDE.md rules followed (check the file)

**If any gate fails, fix and re-run. Do NOT finish with known errors.**