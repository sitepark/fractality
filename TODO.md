## Maintanance

- [ ] Write Changelog & Migration Guide
- [x] replace imports of `package.json` for better support
- [x] Figure out how to deal with `__dirname`
- [ ] Re-implement beautify filter
- [ ] Figure out browsersync + react or maybe replace with vite?
- Migrate Packages to ESM
    - [x] core
    - [x] fractal
    - [x] handlebars
    - [x] mandelbrot
    - [x] nunjucks
    - [x] react
    - [x] twig
    - [x] web
- [x] Update all dependencies within their existing semver ranges (2026-08-14)
- [x] Dependency-declaration + monorepo-setup audit (2026-08-14) — every bare import in all 8 packages was checked against that package's published dependency closure by packing each tarball and resolving its specifiers. Fixed:
    - **`@fractality/mandelbrot` shipped two undeclared runtime imports** (same failure class as the `link:` bug below, and hidden the same way): `src/theme.js` imports `fs-extra` (declared nowhere) and `@fractality/web` (declared only as a devDependency), while the published closure was `{lodash}` alone. npm's flat hoisting masked it; pnpm/Yarn-PnP consumers would get `ERR_MODULE_NOT_FOUND`. `@fractality/web` was made a **peerDependency**, not a plain dependency — `packages/web/src/web.js` does `instanceof Theme` against the `Theme` mandelbrot constructs at `src/theme.js:126`, so a duplicate copy would throw "Fractality themes must inherit from the base Theme class"
    - **The private root declared 5 unused runtime `dependencies`** (`anymatch`, `fs-extra`, `js-yaml`, `lodash`, `vinyl`) that no root-level code imported. Their only effect was populating root `node_modules` and masking phantom deps like the one above — removing them makes that class of bug fail locally instead of only for published consumers
    - **`files` allowlists added to all 8 packages** — tarballs previously shipped `test/`, and mandelbrot additionally shipped `assets/` (build-time SCSS/JS), `vite.config.js` and `.npmignore`. The old mandelbrot tarball contained **10** unresolvable bare imports (2 real runtime, 8 from those build-time files); it is now 0. mandelbrot 220 KB/150 files → 190 KB/84 files, core 24 KB/41 files → 16 KB/28 files. mandelbrot's `.npmignore` was deleted (superseded by `files`)
    - **`exports` maps added to all 8 packages** (only `core` had one). This also fixed a latent bug: `@fractality/react/components` — used by `examples/react/components/path/path.jsx` — failed under real ESM with `ERR_UNSUPPORTED_DIR_IMPORT` and only worked because the react adapter routes JSX through `@babel/register`'s CJS resolution. Note this is the one semver-relevant change in the batch: it closes off deep-importing package internals
    - **pnpm pinned via `packageManager: pnpm@11.21.0`** and the hardcoded `version:` inputs dropped from both workflows so the manifest is the single source of truth. CI was on pnpm `^9` while local dev was on a `12.0.0-rc`; `pnpm-workspace.yaml`'s `allowBuilds`/`minimumReleaseAgeExclude` are pnpm 10+/11+ keys that pnpm 9 silently ignored, so the configured supply-chain policy was not actually being enforced in CI
    - **`release.yml` ran Node 20** despite `engines.node >= 22` and execa 10 requiring it — raised to 22, added pnpm caching, and removed a duplicate bare `pnpm install` step that ran after (and defeated) the `--frozen-lockfile` one
    - Dead `bootstrap` script removed (`lerna bootstrap` was removed in lerna 7 and errors out); unused `marked-highlight` dependency dropped from `@fractality/core`; 4 stray near-empty npm `package-lock.json` files removed (2 of them under `packages/*/src/`, so they were being published); examples switched from `link:` to `workspace:*` to match the packages; mandelbrot's misleading `"test": "pnpm run build"` removed (root `vitest run` is the single test entrypoint, and `test/dist.spec.js` builds its own dist in `beforeAll`)
- [ ] Follow-ups from that audit, deliberately not done:
    - `author` is missing on `@fractality/core`, `@fractality/react` and `@fractality/web` (the other 5 credit Mark Perkins) — left alone because attribution is a call for the maintainers, not a mechanical fill-in. No package has `keywords`
    - `nunjucks@3.2.4` wants `chokidar@^3.3.0` but the workspace is on `chokidar@^5.0.0` (`pnpm peers check` reports it; pnpm currently installs both copies). Pre-existing, not introduced by the audit, but chokidar 4 dropped glob support so nunjucks' watch mode is worth a look
    - Local dev now needs pnpm 11: with `packageManager` pinned, a system pnpm that disagrees will fail any script that shells out to `pnpm` (e.g. mandelbrot's `prepack`) with `ERR_PNPM_BAD_PM_VERSION`. `corepack enable` is the fix
- Update dependencies across major-version bumps (not done automatically — each needs its own review/testing pass, likely breaking changes):
    - [ ] `eslint` 9 → 10 + `@eslint/js` 9 → 10 (flat config format may have changed again)
    - [ ] `stylelint` 16 → 17 + `stylelint-config-standard` 39 → 40
    - [ ] `@babel/core`/`@babel/preset-env`/`@babel/preset-react`/`@babel/register` 7 → 8 (used by `@fractality/react` and `@fractality/mandelbrot`)
    - [ ] `lerna` 9 → 10
    - [ ] `chalk` 5 → 6 (check ESM-only requirements against `@fractality/fractality`'s CLI usage)
    - [x] `execa` 9 → 10 (2026-08-14) — no code changes needed: the only call site is `execa('npm', ['install'])` in `packages/fractality/src/cli/commands/new.js`, and none of v10's breaking changes apply to it (removed `execaCommand`/`execaCommandSync`, subprocess no longer a `ChildProcess` — Node APIs moved to `subprocess.nodeChildProcess`, `stdio: [..., 'ipc']` replaced by `ipc: true`, `input`/`inputFile` now takes priority over inherited stdin). v10 requires Node >= 22, which `@fractality/fractality` already declares and CI already matches (22, 24)
    - [ ] `js-yaml` 4 → 5
    - [ ] `sass` in `@fractality/mandelbrot` is pinned with `~1.79.6` (currently 5+ minor versions behind latest `1.102.0`) — check if the `~` pin was deliberate (Sass has made breaking changes to `@import`/legacy JS API around this range) before loosening it
- Migrate Examples
    - [x] adapter-tests
    - [x] handlebars
    - [x] nunjucks
    - [x] react
    - [x] twig
- Make tests pass
    - packages
        - [x] core
        - [x] fractal
        - [x] handlebars
        - [x] mandelbrot
        - [x] nunjucks
        - [x] react
        - [x] twig
        - [x] web
    - examples
        - [x] handlebars
        - [x] nunjucks
        - [x] react
        - [x] twig
- [x] migrate test runner to vitest
- [x] migrate `@fractality/mandelbrot`'s bundler from webpack to vite (2026-08-14) — see `docs/adr/0002` (explicit jQuery global shim, since Vite doesn't auto-expose it any more than webpack did without expose-loader), `docs/adr/0003` (dropped Babel/corejs, verified as a no-op for this codebase's actual browserslist targets), and `docs/adr/0004` (several skins compile to byte-identical CSS, e.g. `default`/`blue`; Rollup silently deduped them onto one file with no filename hashing to fall back on — fixed by injecting a per-skin-unique custom property)
    - [ ] follow-up: remove jQuery/`jquery-pjax`/`jquery-resizable-dom` from the theme entirely (deliberately deferred out of the bundler migration — no behavioral test coverage exists for pjax navigation, resizable panels, or search highlighting today; needs its own characterization-test-first plan before touching it)
- [x] fix `link:../x` inter-package dependencies silently breaking published packages — `link:` is never rewritten on `pnpm pack`/`publish` (verified via a pack dry-run), so every published `@fractality/*` package except `web` would have failed to resolve its `@fractality/*` deps for external consumers. Switched all inter-package deps to `workspace:*`, which pnpm correctly rewrites to the real version at pack/publish time (2026-08-14)
    - Note: this surfaced a pre-existing cyclic workspace dependency between `@fractality/fractality` and `@fractality/handlebars` (fractality depends on handlebars as its default engine; handlebars depends on fractality as a dev/peer dependency for its example-based tests). pnpm tolerates it but warns on install — worth a deliberate look at whether this is the intended shape or should be broken up (e.g. moving the shared example-testing scaffolding out of the peer relationship)
- [ ] `@fractality/react`'s `react`/`react-dom` are listed as direct `dependencies` (bundling a copy) AND as `peerDependencies` with a stale range (`>= 16.8.0 < 18`, fixed to `>= 18.0.0 < 20` on 2026-08-14) — worth deciding deliberately whether an adapter package like this should depend on react directly at all, or purely as a peer (letting the consuming project supply its own copy)
- Architecture: the mixin system in `packages/core/src/mixins/` (built on `mixwith`, `mix(A).with(B, C)`) is needlessly indirect for this codebase's size and will make the planned TypeScript conversion significantly harder (mixin class-factories don't type well without heavy generics). Consider migrating to plain composition/classes before or during a TS conversion, rather than extending the mixin pattern further.
- Test coverage: `packages/handlebars`, `packages/nunjucks`, `packages/react`, `packages/twig` still have zero package-level unit tests (only the shared example-fixture specs under `examples/*` exercise them indirectly). `packages/core/src/resolver.js` and the watch/rebuild pipeline in `packages/core/src/mixins/source.js` gained their first unit tests on 2026-08-14 (see `packages/core/test/resolver.spec.js`, `packages/core/test/mixins/source-idle.spec.js`) but are still thin relative to how load-bearing they are. `packages/mandelbrot` gained its first package-level tests on 2026-08-14 (`test/theme.spec.js` for config/routing, `test/dist.spec.js` as a build-output smoke test) as a safety net for its webpack→vite migration — still no behavioral/DOM-interaction coverage (pjax navigation, resizable panels, search highlighting).

## Features

- [ ] Convert to Typescript
    - Not realistic as a single pass. Recommended path: enable `allowJs`/`checkJs` with JSDoc types first (catches real bugs without a syntax rewrite — this is how several bugs fixed on 2026-08-14 would have been caught statically, e.g. an undefined variable inside a `catch` block, and `module.exports` used inside an ESM-only file). Convert leaf modules with no mixin dependency first (`utils.js`, `resolver.js`, `data.js`). Convert or hand-write `.d.ts` for the `packages/core/src/mixins/` layer last — it's the highest-effort, highest-risk part (see the mixin-system note above).
- [ ] Provide Types for Component-Data
    ```ts
    import { defineComponent } from '@fractality/fractal';
    export default defineComponent({
        name: 'button',
    });
    ```
- [ ] Multiple Adapters at once - eg. using react with handlebars
