# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SmartBin — a shared React Native (Expo) codebase serving two coursework deliverables
(HCMC UTE, mobile dev course) at once:

- **Mid-term:** waste-classification AI app — graded mainly on model optimization
  (INT8 quantization, pruning) and real on-device benchmarking.
- **Final:** smart-bin management app with real hardware (ESP32 + servo) — AI is
  an optional bonus feature, **not required**.

The instructor grades **app completeness only**; hardware and AI are secondary.
When proposing solutions, prioritize finishing the app over expanding AI or
hardware scope. `src/ml/` and `src/core/` are written once and shared by both
projects.

## Read before starting any task

1. `docs/KIEN-TRUC.md` — directory tree and system diagram, with the reasoning
   behind the structure. Place new files according to this structure; don't
   create generic `screens/` or `components/` folders.
2. `supabase/schema.sql` — the real schema in use. Change schema here first;
   don't guess column names.
3. `README.md` — how to run the project, env vars, and suggested work order.

## Commands

```bash
npm install                    # install dependencies
cp .env.example .env           # fill in Supabase URL + anon key
npx expo prebuild --clean      # regenerate android/ and ios/
npm run android                # expo run:android — build and run on device/emulator
npm run ios                    # expo run:ios
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint src --ext .ts,.tsx
```

Cannot run under Expo Go — BLE (`react-native-ble-plx`) and TFLite
(`react-native-fast-tflite`) are native modules, so a dev build is required.

Env vars (`.env`, see `.env.example`):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MOCK_BLE=1     # use simulated hardware when no ESP32 is available
```

There is no test runner configured — verification is `typecheck` + manual
on-device testing (see "Testing offline sync" below). `npm run lint` is
wired in `package.json` but there is no ESLint config file in the repo
(no `.eslintrc*` or `eslint.config.*`), so it will not run as-is; treat it
as aspirational until a config is added rather than a working check.

## Architecture

### Directory layout (`src/`)

- `app/` — expo-router routes, one file per route, grouped by role:
  `(auth)/`, `(user)/`, `(household)/`, `(collector)/`, `(admin)/`.
  `app/_layout.tsx` is the root provider (React Query, auth/sync init);
  `app/index.tsx` redirects to the right role group after `profile.role`
  loads. `(household)/` is the actively developed resident-facing flow
  (home/history/stats/profile + bottom tabs); `(user)/` is the older,
  thinner resident flow (sort/stats/profile) and is the `default:` fallback
  in `app/index.tsx`'s role switch. When touching resident-facing screens,
  check which group is actually intended before assuming `(user)/` is current.
- `core/` — infrastructure only, **must not** know about waste/bins/points:
  `config/` (env), `supabase/` (client + session storage), `storage/`
  (SQLite + migrations, `db.ts`), `sync/` (`queue.ts` + `engine.ts`), `ble/`
  (`binController.ts`, real + mock).
- `features/` — business logic, one folder per domain (`auth`, `sorting`,
  `devices`, `collection`, `stats`, `profile`), each owning its own screens'
  hooks/state/types. `src/features/sorting/useSortAction.ts` is the reference
  implementation for any write flow.
- `ml/` — TFLite wrapper (`classifier.ts`), model registry for benchmarking
  (`registry.ts`), `models/*.tflite`, camera hooks, viewfinder components.
  Nothing outside `ml/` imports TFLite/vision-camera directly; other features
  only ever receive `{ label, confidence }`.
- `shared/` — cross-feature UI primitives, hooks, types (mirroring the
  Supabase schema), constants (waste types, roles, thresholds).
- `theme/` — colors, typography, spacing.

### Required patterns

**Infrastructure/business separation.** `core/` talks to SQLite/BLE/Supabase
at a generic level only; waste/bin/points concepts live in `features/`.

**Write local first, sync later.** Every user write (dropping waste,
confirming collection, etc.) must: insert into SQLite (`core/storage/db.ts`)
→ call `enqueue()` (`core/sync/queue.ts`) → never call Supabase directly from
a screen. Follow `src/features/sorting/useSortAction.ts` as the template.

Sync mechanics (`core/sync/engine.ts`): each local record has a `local_id`
generated on-device, a `server_id` assigned after sync, and a `synced` flag.
`flush()` runs on network reconnect (`startAutoSync()` via NetInfo), pushes
queued rows from `sync_queue`, retries up to 5 attempts, then gives up on a
row so it doesn't block the rest of the queue. Conflict resolution is
last-write-wins by `created_at` (event data is append-only, so concurrent
edits of the same row are essentially impossible).

**AI module is self-contained.** Everything model-related lives in `src/ml/`.
Other features only consume `{ label, confidence }` and don't care whether it
came from manual selection or inference. Never import TFLite/vision-camera
outside `src/ml/`.

**BLE always has a fallback.** `core/ble/binController.ts` exports both
`BleBinController` (real) and `MockBinController` (simulated), selected via
`EXPO_PUBLIC_MOCK_BLE`. Any device-related feature must update both
implementations — an out-of-date mock breaks demos without hardware.

**Vietnamese in code.** Comments, user-facing display strings/labels, and
error messages: Vietnamese (this is submitted to a Vietnamese university and
read by a Vietnamese instructor). Variable/function/file names: English,
normal JS/TS convention.

### Database (Supabase, `supabase/schema.sql`)

Tables: `profiles` (role: user/collector/admin, points), `devices`,
`bins` (fill_level per device+waste_type), `sort_events` (has `local_id` for
dedup on re-sync), `collection_tasks`. A trigger (`create_task_when_full`)
auto-creates a `collection_tasks` row when `bins.fill_level >= 0.8`. RLS
policies gate access by role via `my_role()`; collectors can claim unassigned
pending tasks. Changing schema requires editing this file first — never
guess column names.

**Known drift to resolve, not to copy:** the Postgres enum `user_role` here is
still `('user', 'collector', 'admin')` — it does **not** include `'household'`.
But the app-level `Role` type (`src/shared/constants/waste.ts`) already lists
`'household'` as a fourth role, and `app/index.tsx` branches on
`profile?.role === 'household'`. Until the enum is migrated to add
`'household'`, no real profile can ever have that role in the database, so
that branch is currently unreachable in production and only exercisable by
manually forcing local state. Don't build further on the assumption this is
already wired end-to-end — flag it and ask before deciding whether to extend
the enum or fold `(household)/` back into `(user)/`.

## Do not do without asking

- Do not swap state management (Zustand) or data fetching (TanStack Query)
  for another library mid-project.
- Do not add tables or rename columns in Supabase without updating
  `supabase/schema.sql` in the same change.
- Do not delete `MockBinController` or the `EXPO_PUBLIC_MOCK_BLE` branch.
- Do not expand hardware scope (conveyor belts, multi-bin coordination,
  etc.) without asking first — minimal hardware scope is the team's own
  choice (easier to build and demo on time), not a requirement imposed by
  the advisor, so it can change if the team decides to, but confirm first
  since it's a large swing in remaining work.
- Do not add heavy new dependencies (Redux, MobX, Firebase, etc.) when the
  existing `package.json` libraries can already do the job.
- If a request seems to conflict with these rules (e.g. "drop SQLite, write
  straight to the server"), ask before proceeding instead of deciding
  unilaterally. These constraints are the team's own conventions for
  keeping the code consistent and shippable on time — the advisor only
  approved the topic, not the app design/architecture/hardware scope — so
  when the user wants to change direction, even a big one, just confirm
  their intent and update this file (and `docs/KIEN-TRUC.md`,
  `supabase/schema.sql`) to match; no need to check if "the advisor approved."

## Testing offline sync

This is the standout point when defending the project. Manual test procedure:

1. Enable airplane mode.
2. Perform 5 "drop waste" actions; confirm the UI stays responsive.
3. Check `sync_queue` has 5 pending rows (local SQLite).
4. Disable airplane mode.
5. Confirm the queue drains and data appears in Supabase.

## Work order (suggested, from README)

1. Run the schema, create a few test accounts across the three roles.
2. Sign in and verify role-based navigation branches correctly.
3. Waste-drop flow with `EXPO_PUBLIC_MOCK_BLE=1`.
4. ESP32 firmware, switch to real BLE.
5. Collection flow and push notifications.
6. Offline testing (see above).
7. Stats, charts, report export.
8. AI model integration and benchmark screen.
