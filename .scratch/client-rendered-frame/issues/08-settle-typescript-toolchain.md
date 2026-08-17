# Settle the TypeScript toolchain and the type boundary

Part of [the map](../map.md)

Type: grilling
Status: resolved
Blocked by: —

> **New 2026-08-17**, created when the map fixed "the new CSR code is written in TypeScript". The
> _whether_ is decided and is not this ticket's business. The _how_ is entirely unsettled, and the
> repo has zero TypeScript infrastructure today — no `typescript` dependency, no `tsconfig.json`
> anywhere, and no package that compiles anything except mandelbrot's Vite bundle.

## Question

Two of the answers are already fixed by the map and must not be relitigated here: `@fractality/web`
converts wholly and gains a build step, and the type boundary stops at the payload contract with
`@fractality/core` and the adapters staying JavaScript. Everything below is what those two decisions
leave open.

### 1. How `@fractality/web` compiles — the load-bearing choice

`tsc` alone, or a bundler (`tsdown`/rolldown, Vite library mode, esbuild) paired with
`tsc --emitDeclarationOnly`? It is a Node library, not a browser bundle, so bundling buys little and
`tsc` emits declarations natively. Weigh build time, whether output stays readable for debugging,
and how many tools the repo has to own.

Note: `packages/web/dist/` contains an **untracked, gitignored** rolled-up bundle. **Chased and
closed 2026-08-17:** it is a local experiment dated 2026-03-11, present for **7 of 8 packages**
(everything but mandelbrot, whose `dist/` is the real theme build), with no corresponding commit and
no surviving build config, so the tool is unknown. Its sourcemaps point at `../src/*.js` — it bundled
the **existing JavaScript** and emitted inferred declarations. It typed nothing and converted
nothing, so it is **not precedent** for this ticket. Safe to delete.

### 2. The ESM import-extension papercut

Under `module: nodenext`, relative imports must be written `./foo.js` while the file on disk is
`foo.ts`. Decide whether to accept that convention, or use `rewriteRelativeImportExtensions` so
source can say `./foo.ts`. Whichever way, write it down — it is the single most common thing to trip
a contributor coming to an ESM + TS package, and this repo has never had one.

### 3. tsconfig layout and strictness

`strict: true` for new code is the presumption; justify anything looser. Decide where config lives
in the pnpm workspace — a root base extended per package, or project references — and make sure
`@fractality/core` and the adapters are genuinely excluded rather than accidentally pulled in via
`allowJs`, which would walk straight into the `mixwith` layer the boundary exists to avoid.

### 4. ESLint — a silent gap, not a preference

`eslint.config.js` globs `files: ['**/*.{js,mjs,cjs,jsx}']`. **Add `.ts`/`.tsx` files without
touching it and they are silently unlinted** — no error, no warning, just no coverage. `typescript-eslint`
is not a dependency (`@typescript-eslint/utils` is present at the root, but that is a different
package and is not a config). Also: `eslint-plugin-react` is configured with `settings.react.version: '18'`
while the Frame is fixed at React 19 — decide whether that is now wrong or deliberately pinned to
the `@fractality/react` peer floor.

### 5. Gating

`pnpm run validate` is `eslint && stylelint` today, and `.lintstagedrc` runs Prettier over
everything on commit via a Husky `pre-commit` hook. Decide where `tsc --noEmit` goes: `validate`, CI,
pre-commit, or several. **This is what makes the types real** — Vite transpiles the Frame's TS
without checking a single type, so with no gate the Frame's annotations are decoration.

### 6. Published types as public API

`@fractality/web` will ship `.d.ts` for the payload contract, which makes the contract's _types_ a
breaking-change surface in their own right. Confirm the `types` export condition (the repo already
does this for `@fractality/react/components`) and hand the versioning consequence to **ticket 04** —
this ticket only owns the mechanics.

### 7. Source maps and stack traces

Errors thrown from `@fractality/web` currently point at real `src/` files a user can open, because
that is exactly what is published. After compilation they point into `dist/` instead. Decide whether
source maps ship in the `files` array, and check what it does to `WebError`'s output. Small, easy to
forget, and user-visible.

### 8. Tests

Vitest handles TS natively. Decide whether new specs are `.spec.ts` and whether existing `.spec.js`
files stay as they are. One thing is already safe: `vite.config.js` excludes `**/dist/**` (added
2026-08-14 for an unrelated reason), so `@fractality/web`'s new compiled output will not be collected
by the test run — worth knowing that trap is pre-closed rather than rediscovering it.

### 9. Does this earn its own ADR?

Recommended: **yes, a separate ADR** rather than a section inside the rendering-model ADR. "Why does
`@fractality/web` have a build step and publish `dist/`" is a distinct question from "why is the
Frame client-rendered", it is hard to reverse, and it will outlive the rendering decision. It should
record the Node `node_modules` type-stripping finding as the reason the build step is mandatory
rather than stylistic. Ticket 07 writes it if this ticket agrees.

## Verified facts — do not re-derive

- **Node refuses to strip types under `node_modules`.** `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`,
  reproduced on Node 24.12.0 with a `.ts` entrypoint in a fake package. Deliberate, not a bug.
  Publishing raw `.ts` is off the table; the failure would appear only for consumers.
- **No TypeScript infrastructure exists.** No `typescript` dependency at the root or in any package,
  no `tsconfig.json` anywhere, no `.ts`/`.tsx` source file in the repo.
- **One shipped type file exists as precedent** — `packages/react/components/index.d.ts`,
  hand-written, exposed via a `types` export condition.
- **`@fractality/web` publishes `exports: { '.': './src/index.js' }` and `files: ['src', 'views', 'CHANGELOG.md']`.**
  Both change under compilation. The 2026-08-14 audit added `exports` maps to all 8 packages, which
  closed off deep imports into package internals — so moving the entrypoint from `src/` to `dist/`
  is invisible to consumers. That is a real piece of luck; without those maps this would be a
  second breaking change riding along.

## Answer

Settled 2026-08-17 in a two-round grilling. Every item above has an answer.

### 1. `tsc` alone compiles `@fractality/web`

No bundler. It emits declarations natively, preserves the file structure so stack traces point at
files a user can open, and adds no dependency beyond TypeScript itself. Build speed is irrelevant
here — this is a dev tool's own package, not a hot path. The 2026-03-11 experiment used a bundler,
but it was bundling JavaScript for unrelated reasons and is not precedent.

### 2. tsconfig layout, strictness, imports

- Root `tsconfig.base.json` with `strict: true`, extended by `packages/web/tsconfig.json`.
- **Not** project references — complexity with no payoff while exactly one package is TypeScript.
- `module` / `moduleResolution: nodenext`, correct for a Node ESM library.
- **The `./foo.js` import convention**, not `rewriteRelativeImportExtensions`. Relative imports are
  written with the `.js` extension while the file on disk is `.ts`. This is what every ESM+TS Node
  library does and every editor understands it; the rewriting flag is newer and surrounding tooling
  may not know about it. **Write this down for contributors** — it is the single most common thing
  to trip someone new to an ESM + TS package, and this repo has never had one.
- **`allowJs` stays off**, and `@fractality/core` and the adapters are excluded explicitly rather
  than merely unreferenced. Turning it on would pull core in and walk straight into the `mixwith`
  layer that the type boundary exists to avoid.

### 3. ESLint

Add `typescript-eslint` and widen `eslint.config.js`'s `files` glob, which is
`**/*.{js,mjs,cjs,jsx}` today — **`.ts`/`.tsx` files added without this change are silently
unlinted**, with no error and no warning.

`settings.react.version` is pinned to `'18'` globally while the Frame is fixed at React 19 and
`@fractality/react`'s peer range and `examples/react` are a different React. **Scope it per config
block** — 19 for the theme's Frame files, the peer floor for the adapter and examples. A single
global value silently mislints one of the two whichever number is chosen.

### 4. Tests

New specs are `.spec.ts`; existing `.spec.js` stay and are not converted. Vitest handles both with no
configuration. `vite.config.js` already excludes `**/dist/**` (added 2026-08-14 for an unrelated
reason), so `@fractality/web`'s new compiled output will not be collected by the test run — that trap
is pre-closed.

### 5. Gating

A root `typecheck` script (`tsc --noEmit`), included in `validate` and run in CI. **Not in
pre-commit** — lint-staged is file-scoped while type-checking is inherently project-scoped, so there
is no meaningful "just the staged files" version of it, and a full-project check on every commit is
the kind of friction people disable.

Note that with `tsc` as the compiler, `prepack` type-checks anyway; the `--noEmit` gate is a
fast-fail convenience rather than the only guard.

### 6. Published shape

|                | Today                              | After                                                        |
| -------------- | ---------------------------------- | ------------------------------------------------------------ |
| `main`         | `src/index.js`                     | `dist/index.js`                                              |
| `exports["."]` | `{ default: "./src/index.js" }`    | `{ types: "./dist/index.d.ts", default: "./dist/index.js" }` |
| `files`        | `["src", "views", "CHANGELOG.md"]` | `["dist", …]`                                                |
| build          | none                               | `prepack: tsc`                                               |

**`types` must be listed first** — export conditions resolve in order.

**Left open deliberately:** whether `views/` still ships. It holds four `__system` files that exist
for the nunjucks engine, and the hard cutover kills that engine, so it is ticket 06/07's call rather
than a packaging detail.

The entrypoint move from `src/` to `dist/` is **invisible to consumers**, because the 2026-08-14
audit added `exports` maps to all 8 packages and closed off deep imports into internals. Without
those maps this would have been a second breaking change riding along.

### 7. Source maps

`sourceMap: true` **with `inlineSources: true`**, maps included in `files`. Today the package
publishes its real `src/*.js`, so an error points at a file the user can open; after compilation it
would point into `dist/`. Inlining the sources makes the maps self-contained, so stack traces resolve
to real TypeScript without publishing a parallel `src/` tree. This preserves a property users have
today and would otherwise lose silently.

### 8. It earns its own ADR

**`docs/adr/0006-*.md`**, separate from the rendering ADR. "Why does `@fractality/web` have a build
step and publish `dist/`" is a different question from "why is the Frame client-rendered", and it
outlives the rendering decision. Ticket 07 writes it, in the repo's house style — title plus one
dense prose paragraph. It must record:

- The build step is **mandatory, not stylistic**: Node refuses to strip types under `node_modules`
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, reproduced on 24.12.0), so publishing raw `.ts`
  the way this package publishes raw `.js` today is impossible. The failure would appear only for
  consumers.
- The type boundary stops at the payload contract, keeping `packages/core/src/mixins/` out of scope.
- `tsc` over a bundler, and why.
