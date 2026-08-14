# Client-rendered Frame

## Destination

An ADR fixing Fractality's rendering model — isomorphic SSG + hydration, with the Frame
client-owned and patterns engine-rendered inside an iframe — plus an implementation spec for
`@fractality/web`'s public data contract and its Vite-based dev/build pipeline, sharp enough to
hand to a separate implementation effort.

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
  "Shell" is **retired** — do not reintroduce it.
- **Pen** — the component workbench inside the Frame (`layouts/pen.nunj`).
- **Preview** — the iframe showing the rendered pattern (`partials/pen/preview.nunj`).
- **Browser** — the tabbed source/context/notes panel beneath the Preview.
- **Adapter** — renders the _user's_ patterns. Distinct from the Frame's own rendering.

**Decided during charting — treat as fixed constraints, not open questions.**

- **Frame is client-owned in both modes.** Today client-side shell persistence exists only in
  server mode, gated at `packages/mandelbrot/assets/js/mandelbrot.js:24`
  (`if (frctl.env == 'server')`). Static builds get none of it. Both modes converge on one model.
- **SSG + hydration**, not pure CSR and not stub-per-route. The build server-renders each route's
  HTML minus the navigation tree; the client hydrates.
- **React 19, bundled — never a peer.** The Frame's React is bundled into the theme's output by
  Vite. `@fractality/react`'s React stays a peer of the _user's_ project (`>= 18.0.0 < 20`) and
  runs inside the Preview iframe. A user pinning React 18 for their patterns must not collide with
  the Frame on 19; that only holds while the Frame's copy is never peered.
  Chosen over Preact: `react-dom/static` gives a purpose-built prerender API, ESM interop is
  already proven in `packages/react/src/adapter.js`, and `preact/compat` aliasing would repeat the
  dual-package hazard that already cost this repo twice (jQuery 4 in
  `packages/mandelbrot/vite.config.js:20-32`; `instanceof Theme` in `TODO.md`).
- **The payload carries source of truth, not presentation.** Markdown, file reads and
  `getPreviewContent()` resolve at build time — they need filesystem access. Syntax highlighting
  happens client-side after hydration, lazily, for the visible panel only.
- **Vite in middleware mode inside a thin Express host.** The host keeps the engine-rendered
  routes (`/components/preview/:handle`, `/components/render/:handle`) as ordinary middleware.
  browser-sync and most chokidar wiring in `packages/web/src/server.js` go away.
- **Two build passes, one command.** Vite builds and prerenders the Frame; a separate async pass
  renders Previews per component through the adapters — the user's templates are not Vite modules.
- **Hard cutover.** `@fractality/web` drops view-based server rendering at the major. No dual
  rendering path. Migration is documentation plus mandelbrot as a worked reference.
- **One tree payload, fetched once and cached.** Nav-shaped fields only. The current route's own
  detail data is inlined into its SSG page, so first paint needs zero fetches; only subsequent
  navigations fetch.

**Motivating bug.** Issue #419 — `dist/components/detail/*.html` inlines the whole navigation tree
into every page. Reported: 3797 items, smallest page 782K, 921M total. Note the ADR's size
justification currently rests on arithmetic, not measurement — hence ticket 01.

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- [Research: React 19 SSG + hydration inside a distributable theme package](issues/02-research-react-ssg-in-theme-package.md)
  — **the packaging inversion works, proven by experiment, not inference.** A theme-side Vite SSR
  build with `ssr.noExternal: true` prerendered correctly when loaded from a consumer directory
  holding one `package.json` and no `node_modules` at all. The SSR bundle is hermetic, which also
  makes "React bundled, never peered" the _mechanism_ rather than merely a preference. Storybook's
  prebuilt-manager (#18550) is the precedent, Frame/Preview mapping one-to-one. `renderToString` is
  disqualified outright — use `react-dom/static`'s `prerender`. `base: './'` becomes mandatory for
  a prebuilt theme or runtime-configurable `static.mount` breaks. No contradictions with this map.

- [Research: Vite middleware mode alongside per-request adapter rendering](issues/03-research-vite-middleware-adapter-rendering.md)
  — viable. `appType: 'custom'`; engine routes register _before_ `vite.middlewares`, the Frame
  catch-all _after_ (`'*path'` matches `/@vite/client`). Calling `transformIndexHtml` on the Frame's
  HTML and never on the Preview's is the whole mechanism keeping the user's patterns out of Vite's
  graph. Preview reloads via a namespaced HMR event + `contentWindow.location.reload()`, so Frame
  state survives by construction. ADR 0001 preserved. **Two caveats carried forward:** no Frame HMR
  inside a consumer's project (input to _Decide how a theme ships_), and a stray HMR server on port
  24678 unless the host's `http.Server` is passed as `server.ws.server`.

## Not yet specified

- **Search architecture.** `mark.js` marks the DOM today. Once the tree is data, search becomes
  data-driven — but the shape depends on the data contract.
- **Skins and the CSS pipeline under Vite.** Skins are user-configurable
  (`packages/mandelbrot/src/theme.js:80-97`) and currently compiled ahead of time with a
  uniqueness hack for Rollup dedup (ADR 0004). How that survives depends on how a theme ships.
- **Where i18n labels live.** `theme.get('labels.*')` is injected server-side into templates
  today. In a CSR payload they need a home.
- **The no-JS floor.** What degrades to what, and whether that is a supported claim at all.
- **Lazy subtree loading.** Rejected for now (~70KB gzipped once, cached). Revisit only if
  ticket 01's measurement contradicts that.

## Out of scope

- **Mandelbrot's view-by-view rewrite into React components** — ~30 `.nunj` files, plus Pen,
  Browser tabs, resizable panels, tree and search. Its own effort. Mandelbrot is still walked
  through here as the _proving case_ for the data contract, so that contract is not designed in a
  vacuum; the UI construction itself is not.
- **Removing jQuery from mandelbrot** — falls out of the rewrite above, not of this map.
- **Changes to the template adapters** (nunjucks / handlebars / twig / react). They keep rendering
  patterns exactly as they do now, behind the Preview iframe.
