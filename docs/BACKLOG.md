# Backlog

Tracked follow-up work. Seeded from the Codex multi-agent review on 2026-06-20
(`reviews/review-20260620-225757-004c69.md`). These are pre-existing,
whole-repo findings — they were **out of scope** for the font/HEIC/hooks branch
that triggered the review, and are captured here rather than fixed inline.

Severity is the reviewer's; "✦" marks the highest-value, lowest-risk wins.

## High priority

- ✦ **Autosave failures are swallowed; project marked clean.**
  `core/managers/project-manager.ts` (`saveCurrentProject` ~189–209),
  `core/managers/save-manager.ts` (~93–103). Storage errors are caught and the
  save returns success; `SaveManager` clears `hasPendingSave` first, so failed
  writes are neither retried nor surfaced — users can lose work believing it
  saved. Propagate/return a typed failure, restore the dirty flag, retry with
  backoff, and expose save-failure state to the UI.
- ✦ **Drizzle config points at a nonexistent schema.**
  `apps/web/drizzle.config.ts` uses `./src/lib/db/schema.ts`, but the schema is
  at `./src/db/schema.ts`. DB generate/migrate are misconfigured. Fix the path
  and add a CI smoke check for `drizzle-kit generate`.
- ✦ **CI doesn't run the repo's actual checks.** `.github/workflows/bun-ci.yml`
  only prints "No tests implemented yet" (with `continue-on-error`), runs no
  ESLint/typecheck/`cargo test`/fmt/clippy, and hashes a nonexistent
  `apps/web/bun.lock` for its cache key. Run `bun test`, `bun run lint:web`,
  `bun run typecheck`, `cargo test --workspace`, fmt/clippy; hash the root
  `bun.lock`; drop `continue-on-error`.
- **Web/CI don't consume the locally built WASM.** `rust/wasm/pkg` is built in
  CI, but the web app depends on published `opencut-wasm@^0.2.10` with no
  link/local-dep step, so Rust changes can pass CI while breaking the TS
  integration. Make the generated package a workspace/file dep (or link it)
  before building/testing; add an integration test against the bindings.
- **Platform-agnostic editor logic still lives in the web shell.** `AGENTS.md`
  declares Rust the home for non-UI logic, but animation/retime/ripple/timeline/
  commands/core remain in TypeScript (~91k TS vs ~4k Rust lines). Define a
  staged migration map; extract pure state transitions/calculations into Rust;
  add an architecture check preventing new platform-agnostic modules under
  `apps/`.
- **Marble CMS data can stay stale until redeploy.** `blog/query.ts:70` has no
  revalidation policy or cache tags. Add `next: { revalidate, tags }` and
  invalidate from a CMS webhook.
- **All asset tabs are eagerly bundled in the editor.**
  `components/editor/panels/assets/index.tsx` imports captions/sounds/stickers/
  effects/text/settings up front (captions pulls in transcription). Lazy-load
  non-default tabs with `next/dynamic`.
- **Barrel packages not configured for optimized imports.** `next.config.ts`:
  add `@hugeicons/core-free-icons` and `radix-ui` to
  `experimental.optimizePackageImports` (or use subpath imports). ~72 barrel
  imports today.

## Medium priority

- **Public and server-only env vars share one eagerly-parsed module.**
  `env/web.ts` requires `DATABASE_URL`, secrets, Redis creds; `auth/client.ts`
  imports it, so a Client Component import can fail. Split `publicEnv`/
  `serverEnv`; add a `server-only` guard.
- **Optional integrations are globally required at startup.** Docs call DB/Redis/
  Freesound optional for local editing, but the global schema (imported by
  `layout.tsx`) requires them. Validate per-subsystem; fail only when a feature
  is used.
- **Desktop doesn't exercise shared Rust crates.** `apps/desktop` only depends on
  `gpui` despite docs claiming it uses the core crates. Add a minimal native
  integration + compile test, or document desktop as an unintegrated scaffold.
- **Large multi-responsibility files.** e.g. `animation/keyframes.ts` (~1,361),
  `timeline/components/timeline-element.tsx` (~1,298), `app/projects/page.tsx`
  (~1,017), `core/managers/timeline-manager.ts` (~935). Split by responsibility
  behind stable entry points.
- **Insufficient production observability/health.** `next.config.ts` strips
  console in prod; telemetry is client-only; `app/api/health/route.ts` always
  returns 200 without checking DB/Redis (Docker uses it as healthcheck). Add
  structured server logging + readiness checks; keep a light liveness endpoint.
- **README/CONTRIBUTING status conflict.** README says archived/unmaintained then
  describes an active Rust migration and welcomes contributions; CONTRIBUTING
  rejects feature PRs then lists feature areas. Establish one status + policy.
- **Brand page hydrates as one Client Component.** `app/brand/page.tsx` — keep as
  a Server Component; extract only copy/download controls into small Client
  Components.
- **Sound search: `commercial_only` ignored end to end.**
  `app/api/sounds/search/route.ts:159` omits it from validation (and
  `z.coerce.boolean()` treats `"false"` as truthy); `sounds/use-sound-search.ts`
  omits it from the first-page request, effect deps, and cache key. Thread the
  flag through and reset/refetch on change.
- **Sound pagination sets count to `undefined`.** `sounds/use-sound-search.ts:65`
  calls `setTotalCount(number)` but the store expects `{ count }`. Use
  `setTotalCount({ count: data.count })`.
- ✦ **Project media and fonts load sequentially.**
  `core/managers/project-manager.ts:157` — run both with `Promise.all()` to
  shorten the blocking load screen.
- **Editor renders blank until a hydration effect runs.**
  `components/editor/mobile-gate.tsx:26` — render a stable loading shell, or
  resolve gate state before paint.
- **`motion/react` eagerly bundled for a minor header animation.**
  `components/header.tsx:5` — use CSS transitions or lazy-load the animated
  mobile menu.

## Low priority

- **Agent guidance sparse / no `CLAUDE.md`.** Add `CLAUDE.md` symlinks to the
  `AGENTS.md` files and domain-level notes for high-risk subsystems (Rust/WASM,
  renderer, storage, timeline, desktop).
- **Stale/self-referential workspace config.** `package.json`/`bun.lock`:
  `packages/*` and `@opencut/tools` scripts reference nonexistent content; root
  depends on `"opencut": "."` (self-reference). Remove stale entries and the
  self-dep.
- **Projects page recomputes IDs/selection per item.** `app/projects/page.tsx`
  (~130, ~543) — memoize `allProjectIds` and the selected-ID set in the parent.
- **Malformed feedback JSON returns 500.** `app/api/feedback/route.ts:19` —
  catch `request.json()` failures and return a 400 before Zod validation.
- **Sitemap advertises a missing route.** `app/sitemap.ts:48` lists
  `/why-not-capcut` with no matching route. Remove it or implement the route.

## Done (from the review, fixed in-branch)

- HEIC/MOV detection by extension on generic MIME types.
- HEIC storage check measures the converted JPEG, not the source.
- HEIC worker pending-callback leak on setup failure.
- Live Photo summary only reported when both halves persist.
