# Client-rendered Frame

> ## ✅ Destination reached — 2026-08-17
>
> All nine tickets are resolved or deliberately deferred. The artefacts this map existed to produce:
>
> - [ADR 0005 — Client-render the Frame](../../docs/adr/0005-client-render-the-frame.md)
> - [ADR 0006 — Compile and publish `@fractality/web` from TypeScript](../../docs/adr/0006-compile-and-publish-web-from-typescript.md)
> - [Implementation spec](../../docs/specs/client-rendered-frame.md)
> - [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) and four per-package `CONTEXT.md` files, closing the gap
>   `AGENTS.md` promised
>
> **Mandelbrot's rewrite is the follow-on effort and starts from the spec, not from this tracker.**
> [Ticket 09 (plugin API)](issues/09-design-the-plugin-api.md) travels with it, as does the skin
> removal, which this effort decided but deliberately did not perform.
>
> This map and its tickets are now history: they record _why_, and the spec records _what_. Prefer
> the spec.

## Destination

An ADR fixing Fractality's rendering model — **pure client-side rendering**, with the Frame booting
from a static shell and patterns engine-rendered inside an iframe — plus an implementation spec for
`@fractality/web`'s public data contract and its Vite-based dev/build pipeline, sharp enough to hand
to a separate implementation effort.

Mandelbrot's view-by-view rewrite is **not** part of reaching this destination.

## Notes

**Domain.** Fractality is a component-library / styleguide generator. `@fractality/core` models the
library; `@fractality/web` turns it into a browsable site (dev server + static builder);
`@fractality/mandelbrot` is the default theme; `nunjucks`/`handlebars`/`twig`/`react` are template
**adapters** that render the user's patterns.

**Tracker.** This effort uses the local-markdown tracker (`.scratch/client-rendered-frame/`), not
the repo's default GitHub issues — see `docs/agents/issue-tracker.md` for the GitHub conventions
that apply everywhere else.

**Skills every session should consult.** `/grilling` and `/domain-modeling` by default.
`/research` for the AFK research tickets, `/prototype` for spikes.

**Vocabulary (from charting).**

- **Frame** — the tool's own chrome: header, sidebar navigation, main panel.
  `layouts/frame.nunj`, `#frame`, `.Frame-*`, `components/frame.js`. Canonical term.
  "Shell" is **retired** as a synonym for the Frame — do not reintroduce it in that sense.
- **Shell HTML** — the static, contentless HTML document the Frame boots from. Distinct from the
  Frame itself (the running UI). Only ever used in this narrow sense.
- **Pen** — the component workbench inside the Frame (`layouts/pen.nunj`).
- **Preview** — the iframe showing the rendered pattern (`partials/pen/preview.nunj`).
- **Browser** — the tabbed source/context/notes panel beneath the Preview.
- **Adapter** — renders the _user's_ patterns. Distinct from the Frame's own rendering.
- **Tree payload / entity payload / panel payload / ext slot** — the contract's own terms, settled
  by ticket 04.

**These terms are now minted in the repo**, not just here: `CONTEXT-MAP.md` at the root points at
`CONTEXT.md` files for `core`, `fractality`, `web` and `mandelbrot`, closing the gap `AGENTS.md`
promised. Prefer those files as the source of truth; this list is a summary.

**Decided during charting — treat as fixed constraints, not open questions.**

- **Frame is client-owned in both modes.** Today client-side shell persistence exists only in
  server mode, gated at `packages/mandelbrot/assets/js/mandelbrot.js:24`
  (`if (frctl.env == 'server')`). Static builds get none of it. Both modes converge on one model.
- **Pure CSR. No prerender, no hydration.** _(Reversed 2026-08-17 — the map previously fixed
  SSG + hydration.)_ The Frame ships as one contentless shell HTML document plus a client bundle;
  everything it displays is fetched as data and rendered in the browser. No `react-dom/static`, no
  SSR bundle, no build-time render of the Frame, no hydration-mismatch discipline. The whole
  isomorphic pipeline — the single largest source of complexity in this map — is deleted rather
  than specified. First paint costs a bundle plus a fetch; this is a developer tool, and that is an
  acceptable price for the simplification.
- **Deep links: the shell is copied to every route path.** This is what pure CSR owed an answer
  for, and it is the reason CSR was originally rejected. `fractality build` emits the same shell
  HTML at each path in the route table — `dist/components/detail/button.html` and friends keep
  existing, byte-identical to each other. It is a file copy, not a render pass, so #419 still goes
  away. URLs are unchanged from today, existing bookmarks survive, and it works on any dumb static
  host including `file://`. Explicitly **not** hash routing (breaks every existing URL) and
  explicitly **not** host-level SPA fallback (breaks `file://` and plain static servers).
- **React 19, bundled — never a peer.** The Frame's React is bundled into the theme's output by
  Vite. `@fractality/react`'s React stays a peer of the _user's_ project (`>= 18.0.0 < 20`) and
  runs inside the Preview iframe. A user pinning React 18 for their patterns must not collide with
  the Frame on 19; that only holds while the Frame's copy is never peered.
  Chosen over Preact: ESM interop is already proven in `packages/react/src/adapter.js`, and
  `preact/compat` aliasing would repeat the dual-package hazard that already cost this repo twice
  (jQuery 4 in `packages/mandelbrot/vite.config.js:20-32`; `instanceof Theme` in `TODO.md`).
  Note the `react-dom/static` argument for React over Preact **no longer applies** under CSR — the
  remaining two reasons carry the decision on their own, and the ADR must say so rather than
  reciting a rationale that has lapsed.
- **The new CSR code is written in TypeScript.** _(Added 2026-08-17, maintainer's call.)_ Applies to
  the Frame's client code and to `@fractality/web`. It does **not** start a monorepo conversion —
  see the type boundary below. Four consequences, all settled:
    - **The Frame's client code is near-free.** Vite transpiles `.ts`/`.tsx` with no config. But it is
      **transpile-only** — Vite type-checks nothing — so a separate `tsc --noEmit` gate is not
      optional, it is the only thing that makes the types real.
    - **`@fractality/web` converts wholly and gains a build step.** It publishes raw `src/*.js` today
      (`exports: ./src/index.js`, `files: [src, views, CHANGELOG.md]`) with no compile anywhere. Under
      TS it must publish compiled `dist/` plus `.d.ts`, and `exports`/`files`/`main` change with it.
      Converting the whole package rather than only the new modules is the smaller job in practice:
      the hard cutover already deletes the nunjucks engine, its filters and the views, so much of the
      existing JS is being removed rather than translated. Precedent exists in-repo — mandelbrot
      already does `prepack: vite build`, and `@fractality/react` already ships a hand-written
      `components/index.d.ts` behind a `types` export condition.
    - **Publishing raw `.ts` is not an option.** Verified, not assumed: Node refuses to strip types
      for any file under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, deliberate,
      reproduced on Node 24.12.0). It fails for the consumer and only for the consumer — precisely the
      class of bug the 2026-08-14 audit was about, and the reason the compile step is mandatory rather
      than stylistic.
    - **The type boundary stops at the payload contract.** `@fractality/core` and the adapters stay
      JavaScript. The data contract is a serialisation seam, which makes it the natural place for
      hand-written types, and stopping there avoids dragging in `packages/core/src/mixins/` — the
      `mixwith` class-factory layer TODO.md flags as the highest-risk part of any TS conversion,
      because mixin factories do not type without heavy generics.

- **The payload carries source of truth, not presentation.** Markdown, file reads and
  `getPreviewContent()` resolve at build time — they need filesystem access — and are written out
  as static data. Syntax highlighting happens client-side, lazily, for the visible panel only.
- **Vite in middleware mode inside a thin Express host.** The host keeps the engine-rendered
  routes (`/components/preview/:handle`, `/components/render/:handle`) as ordinary middleware, and
  adds the JSON endpoints. browser-sync and most chokidar wiring in `packages/web/src/server.js`
  go away.
- **Two build passes, one command.** Vite builds the Frame's client bundle and shell; a separate
  async pass emits the data payloads, renders Previews per component through the adapters, and
  copies the shell across the route table — the user's templates are not Vite modules.
- **Hard cutover.** `@fractality/web` drops view-based server rendering at the major. No dual
  rendering path. Migration is documentation plus mandelbrot as a worked reference.
- **One tree payload, fetched once and cached.** Nav-shaped fields only. Under CSR nothing is
  inlined into a page, so first paint fetches the tree and the current route's entity payload;
  subsequent navigations fetch entity payloads only.
- **No-JS is not supported.** Follows from pure CSR and is now settled rather than fogged: with
  scripting off there is no Frame at all. The ADR states this as a consequence, and the shell
  should carry a `<noscript>` saying so plainly.

**Motivating bug.** Issue #419 — `dist/components/detail/*.html` inlines the whole navigation tree
into every page. Reported: 3797 items, smallest page 782K, 921M total. Note the ADR's size
justification currently rests on arithmetic, not measurement — hence ticket 01.

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- **Rendering model reversed to pure CSR (2026-08-17, maintainer's call).** SSG + hydration is
  dropped in favour of client-side rendering with the shell copied per route. Rationale: the
  isomorphic pipeline bought a better first paint for a local developer tool at the cost of an SSR
  bundle, a prerender pass, hydration-mismatch discipline and a much harder packaging story — and
  the one thing it bought that mattered structurally, deep links on dumb static hosts, is bought
  just as well by copying a 2KB shell. Tickets 01, 04, 05 and 07 were rewritten against this;
  research tickets 02 and 03 are annotated for what it supersedes rather than rewritten.

- [Decide the migration path for third-party themes](issues/06-decide-third-party-theme-migration.md)
  — **`@fractality/web` goes to 1.0.0**, and that is load-bearing rather than cosmetic: it sits at
  0.3.3 today and mandelbrot peers `">= 0.3 < 1"`, so **0.4.0 would still satisfy the range** and let
  an old theme install against an incompatible `web` and fail at runtime. 1.0.0 makes the range
  reject the pairing — hard on npm (`ERESOLVE`), a warning only on pnpm, which is why
  `@fractality/web` **also crashes at theme registration** on a bad `contractVersion`, with a
  _separate_ diagnostic for the absent case since that is what every existing theme hits. **0.3.x is
  frozen, not supported.** A separate migration document per major, with `MIGRATION.md` reduced to an
  index — it currently carries the unrelated fractal → fractality story. The new guide leads with
  **ordinary users** (skins, `dist/` placement, `file://`) before theme authors, because ticket 05's
  breakage hits people who never wrote a theme. Two removed **export names** turned up beyond the
  running list: `Engine` and `AsyncNunjucksEnvironment`.

- [Decide how a theme ships](issues/05-decide-how-a-theme-ships.md) — **(a) prebuilt.** The theme
  ships a client bundle and a shell; Vite never runs in the consumer's project. The shell-depth
  problem is resolved by splitting the cases: `base: './'` stays for asset→asset references, while
  the shell's own `<link>`/`<script>` are root-absolute from `static.mount`, baked at _site_ build —
  so shells stay byte-identical and the mount stays runtime-configurable, at the cost of `dist/` no
  longer being relocatable after building. `window.frctl` carries all pre-JS global config: theme
  mount, site root, label overrides, theming properties. **Named skins are removed** in favour of the
  custom-property theming that `theme.js` already accepts — a constraint the mandelbrot rewrite
  inherits, and one that retires ADR 0004's subject. Panels stay extensible through a **deferred
  plugin API** ([ticket 09](issues/09-design-the-plugin-api.md)); plugins load at runtime and are
  handed React by the Frame, since bundled-not-peered leaves them nothing to import. No Frame HMR for
  consumers, accepted. Consumers' own React is untouched.

- [Design the public data contract for the component tree](issues/04-design-public-data-contract.md)
  — **settled in a five-round grilling.** Tree payload drops `id` (77% of its gzipped weight, and
  `handle` is already unique) → ~22.6 K gzipped. The entity payload splits **by panel**: a ~470 B
  core fetched every navigation, plus `notes` / `context` / `view` fetched only when their panel
  opens — measured, since splitting context alone would have left 78% of the weight in place.
  Payloads are siblings of the route they back, addressed by stripping `.html` and appending the
  panel segment, which is the same rule in dev and static. Build time does only filesystem-bound
  work; `markdown`, `highlight` and `linkRefs` all move client-side — the latter two because
  `linkRefs` consumes `highlight`'s output and `markdown()` already highlights internally, so
  splitting them would have created two highlighting paths. Route table survives minus `view`;
  integer `contractVersion` with type-level changes counting as breaking; theme data lives in a
  namespaced `ext` slot loaded like any other panel. **⚠️ `file://` is dropped** — browsers give it
  an opaque origin, so every fetch fails regardless of addressing. Four capabilities die with no
  equivalent, routed to ticket 06.

- [Measure the payload weights the CSR model produces](issues/01-measure-payload-weights.md) —
  **measured, and the case is stronger than charting assumed. A detail page is 99.6% navigation
  tree**: 2,516,221 of 2,527,558 bytes, leaving 11,337 bytes for everything else on the page.
  Baseline **9.01 GB** → CSR **~33.7 MB**, a **~267×** reduction, at #419's exact item count (3797
  handles). The tree payload lands at **22.6 K gzipped** against a ~70 K estimate, so
  **lazy subtree loading is not needed** — fog entry closed below. Two findings reprioritise ticket
  04: **`id` is 77% of the gzipped tree** (a 32-char hex hash, incompressible; `handle` is already
  unique), and **entity payloads are 51% of the CSR total while the tree is 0.6%**, so granularity
  governs size and tree fields are nearly free. ⚠️ **#419's figures are internally inconsistent**
  (782 K × 3797 = 2.90 GB ≠ the reported 921 M) — cite the measured numbers instead.

- **New CSR code is TypeScript (2026-08-17, maintainer's call).** Frame client code and
  `@fractality/web`, which converts wholly and gains its first build step. Existing JS packages are
  untouched and the type boundary stops at the payload contract.

- [Settle the TypeScript toolchain and the type boundary](issues/08-settle-typescript-toolchain.md)
  — **`tsc` alone**, no bundler: it emits declarations natively and keeps stack traces on real files.
  Root `tsconfig.base.json` with `strict`, `nodenext`, the `./foo.js` import convention, and
  **`allowJs` off** so core's `mixwith` layer stays out. `@fractality/web` publishes `dist/` with
  `types` first in `exports` and `prepack: tsc`; the entrypoint move is invisible to consumers thanks
  to the 2026-08-14 `exports` maps. **Source maps ship with `inlineSources`** so stack traces still
  land on real source — a property users have today and would otherwise lose silently. `typecheck` in
  `validate` and CI but **not** pre-commit, since type-checking is project-scoped and lint-staged is
  file-scoped. ⚠️ ESLint's glob is `{js,mjs,cjs,jsx}` — **TypeScript added without widening it is
  silently unlinted**. Earns its own **ADR 0006**. The stray `packages/*/dist/` bundles are a
  2026-03-11 local experiment over the existing JS, not precedent, and are safe to delete.

- [Research: React 19 SSG + hydration inside a distributable theme package](issues/02-research-react-ssg-in-theme-package.md)
  — **partly superseded by the CSR reversal; read the ticket's `## Standing after the CSR reversal`
  section first.** Still standing: the packaging inversion works (a theme can ship prebuilt output
  the consumer's `fractality build` drives with no Vite and no `node_modules` in the consumer's
  project — and CSR needs strictly less of this, since there is no SSR bundle to ship); `base: './'`
  is **mandatory** or the runtime-configurable `static.mount` breaks; `theme.addLoadPath()` view
  overriding dies; Storybook's prebuilt manager remains the architectural precedent. Lapsed:
  everything about `prerender`/`prerenderToNodeStream`, the two-build client+SSR split, the
  hydration payload convention, and hydration-mismatch discipline.

- [Research: Vite middleware mode alongside per-request adapter rendering](issues/03-research-vite-middleware-adapter-rendering.md)
  — viable, and **essentially unaffected by the CSR reversal.** `appType: 'custom'`; engine routes
  register _before_ `vite.middlewares`, the Frame catch-all _after_ (`'*path'` matches
  `/@vite/client`). Calling `transformIndexHtml` on the Frame's shell HTML and never on the
  Preview's is the whole mechanism keeping the user's patterns out of Vite's graph. Preview reloads
  via a namespaced HMR event + `contentWindow.location.reload()`, so Frame state survives by
  construction. ADR 0001 preserved; `gateOnIdle` must become a shared middleware across every
  tree-reading route. **Two caveats carried forward:** no Frame HMR inside a consumer's project
  (input to _Decide how a theme ships_), and a stray HMR server on port 24678 unless the host's
  `http.Server` is passed as `server.ws.server`. Only Q2 shifts: in dev there is no SSR entry to
  load, so `ssrLoadModule` / `environments.ssr.runner.import()` drops out entirely and dev serves
  the shell through `transformIndexHtml`.

## Not yet specified

- **Search architecture.** `mark.js` marks the DOM today. Once the tree is data, search becomes
  data-driven. **Unblocked as of 2026-08-17** — ticket 04 fixed the tree payload's fields, so the
  shape search works against now exists. Still unspecified, and worth noting the tree carries
  `handle`, `label`, `status` and `tags` only: anything search wants beyond those is a contract
  change, not a theme-side decision.
- ~~**Skins and the CSS pipeline under Vite.**~~ **Settled 2026-08-17 by ticket 05 — named skins are
  removed**, in favour of the custom-property theming `theme.js` already accepts. ADR 0004's subject
  disappears with them; the ADR carries a note saying so rather than being silently invalidated. The
  removal itself is inherited by the mandelbrot rewrite, not done here. One naming question left
  open on purpose: the config key stays `skin` while naming a concept that no longer exists.
- ~~**Where i18n labels live.**~~ **Settled 2026-08-17 by ticket 05.** Defaults compile into the
  theme's bundle — they are the theme's own strings — and consumer overrides ride in `window.frctl`
  alongside the other pre-JS global config. They never enter the payload contract, because they are
  theme config rather than library data.
- ~~**Lazy subtree loading.**~~ **Settled 2026-08-17 by ticket 01 — not needed.** Measured at 22.6 K
  gzipped (16.3 K brotli) for all 3810 nav nodes, well under the ~70 K the rejection was hedged
  against. Even the unoptimised shape measures 96.7 K and would be acceptable. The margin does
  depend on dropping `id` from the payload, which is ticket 04's to confirm.
- ~~**Whether the per-route shell copies stay byte-identical.**~~ **Settled 2026-08-17 by ticket 04
  — yes, byte-identical.** `document.title` is set client-side on route resolve. Costs a generic tab
  title until JS runs; keeps "it is a file copy, not a render pass" literally true.

## Out of scope

- **Mandelbrot's view-by-view rewrite into React components** — ~30 `.nunj` files, plus Pen,
  Browser tabs, resizable panels, tree and search. Its own effort. Mandelbrot is still walked
  through here as the _proving case_ for the data contract, so that contract is not designed in a
  vacuum; the UI construction itself is not.
- **Removing jQuery from mandelbrot** — falls out of the rewrite above, not of this map.
- **Changes to the template adapters** (nunjucks / handlebars / twig / react). They keep rendering
  patterns exactly as they do now, behind the Preview iframe.
