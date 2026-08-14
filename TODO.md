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
- Update dependencies across major-version bumps (not done automatically — each needs its own review/testing pass, likely breaking changes):
    - [ ] `eslint` 9 → 10 + `@eslint/js` 9 → 10 (flat config format may have changed again)
    - [ ] `stylelint` 16 → 17 + `stylelint-config-standard` 39 → 40
    - [ ] `@babel/core`/`@babel/preset-env`/`@babel/preset-react`/`@babel/register` 7 → 8 (used by `@fractality/react` and `@fractality/mandelbrot`)
    - [ ] `lerna` 9 → 10
    - [ ] `chalk` 5 → 6 (check ESM-only requirements against `@fractality/fractality`'s CLI usage)
    - [ ] `execa` 9 → 10
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
