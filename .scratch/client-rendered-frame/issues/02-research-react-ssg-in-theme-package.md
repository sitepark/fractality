# Research: React 19 SSG + hydration inside a distributable theme package

Part of [the map](../map.md)

Type: research
Status: resolved — **partly superseded**, see `## Standing after the CSR reversal` below
Blocked by: —

## Question

The usual Vite SSG guides assume the thing being built is _a site_. Fractality themes are **npm
packages** consumed by other projects, and `fractality build` runs in the _consumer's_ project.
That inversion is the whole difficulty, and it is what this ticket has to resolve.

Establish, against primary sources (Vite docs, React 19 docs, `react-dom/static`, and real
projects doing this):

1. **The prerender API.** `react-dom/static`'s `prerender` / `prerenderToNodeStream` versus
   `renderToString`. Which suits walking a route table and emitting one HTML file per route, and
   what does each require of the component tree (Suspense boundaries, async data)?
2. **Two builds.** How `vite build` client + `vite build --ssr` compose: the client manifest, CSS
   emitted by the SSR pass, and how prerendered HTML references hashed client assets.
3. **The packaging inversion — the crux.** Can a theme ship a prebuilt SSR bundle _and_ a prebuilt
   client bundle that the consumer's `fractality build` drives, without running Vite in the
   consumer's project? What breaks — user-configured skins, custom panels, `theme.get()` config
   baked at the wrong time? Document the constraint precisely; ticket 05 decides on it.
4. **Hydration payload.** Convention for inlining the current route's data for hydration
   (`<script type="application/json">` vs `window.__DATA__`), and escaping/CSP consequences.
5. **Hydration mismatch discipline.** React 19 is strict. What patterns provoke mismatches when
   the same components render in Node and the browser, given syntax highlighting is deliberately
   deferred to after hydration?

**Known-good starting facts** (verified during charting, do not re-derive): React is 19.2.8;
`react-dom` exposes `./static`; `packages/react/src/adapter.js` already imports `react-dom/server`
successfully from a `"type": "module"` package under Node 22/24.

**Deliverable:** findings captured as a Markdown file in the repo per the `/research` skill, with a
pointer added to this ticket's `## Answer`. Flag anything that contradicts the map's fixed
constraints rather than quietly working around it.

## Answer

Findings: [research/react-ssg-in-theme-package.md](../research/react-ssg-in-theme-package.md)

1. **Prerender API.** `prerenderToNodeStream` (Node), not `renderToString` — the latter emits a
   client-render-fallback marker that silently discards a suspended boundary from the HTML
   (verified against 19.2.8). Docs say `reactNode` "is expected to represent the entire document";
   **verified empirically that a subtree prerenders fine**, so the Vite template-with-placeholder
   pattern works. Fractality needs no Suspense at all: builder.js resolves data before the tree exists.
2. **Two builds.** `vite build --manifest` + `vite build --ssr entry-server.js`. The SSR pass emits
   no CSS (`build.ssrEmitAssets` false by default) — all CSS comes from the client build and is
   referenced via `manifest.json`. `builder`/`vite build --app` gives the map's "one command".
   Skins are untouched by the split; ADR 0004's hack is client-build-only.
3. **Packaging inversion — POSSIBLE, and proven, not reasoned.** A prebuilt SSR bundle built with
   `ssr.noExternal: true` prerendered correctly in a consumer directory containing **no
   `node_modules` at all** (bare `react` → `ERR_MODULE_NOT_FOUND`, bundle reports React 19.2.8).
   Storybook's prebuilt manager is the exact architectural precedent. What breaks: `addLoadPath()`
   view overriding, user-authored panel/nav _components_, and consumer-side Frame HMR. Custom skins
   do **not** regress (mandelbrot never shipped its SCSS). New hard constraint for 05:
   **`base: './'` is mandatory** — default `base: '/'` bakes `url(/css/…)` into built CSS and breaks
   the runtime-configurable `static.mount`. Measured.
4. **Hydration payload.** `<script type="application/json">`, not `window.__DATA__`. HTML spec
   step 13 returns before the CSP check at step 21, so a data block is never subject to `script-src`.
   Decisive because React documents that **`nonce` is unavailable when prerendering** — a static
   build has no per-request nonce. Escape `<` → `<`; that alone covers all three forbidden
   sequences. Never use `bootstrapScriptContent`.
5. **Mismatch discipline.** Top risks here specifically: whitespace inside the hydration container
   (string-concatenated HTML makes this easy to cause); `theme.js:99-116`'s `new Date()` +
   `toLocaleDateString` (format at build time); surviving `frctl.env == 'server'` branches; and
   `identifierPrefix` symmetry if the page grows a second root. Deferred highlighting is
   mismatch-_safe_ provided it runs in an Effect, not during render.

**Contradictions with the map's Notes: NONE.** Two constraints come out strengthened — "React 19,
bundled, never a peer" turns out to be structurally _required_ by the prebuilt model rather than
merely permitted, and "SSG + hydration" is confirmed viable. One unstated boundary needs 03's
confirmation: under prebuilt, "Vite in middleware mode" applies to the _theme author's_ repo, not
the consumer's, so consumers get no Frame HMR (Storybook's same trade). Ticket 05 should not be
decided before 03 lands.

## Standing after the CSR reversal

On 2026-08-17 the map dropped SSG + hydration for pure CSR. This ticket was researched against the
old constraint, so the answer above and
[the findings document](../research/react-ssg-in-theme-package.md) are **not wholesale valid any
more**. Neither was rewritten — the research was sound for the question it was asked, and it is
cheaper to read it with this filter than to re-derive it. Nothing below was re-run; it is a
re-reading of what the ticket already established.

**Still standing, and load-bearing:**

- **The packaging inversion works.** §3.2's probe stands on its own: prebuilt theme output drove a
  build from a consumer directory containing no `node_modules` at all. CSR needs _strictly less_
  than what was proven — a client bundle and a shell, with no SSR bundle to ship or load — so the
  proof covers the easier case a fortiori. This is what keeps ticket 05 a question about extension
  points rather than about feasibility.
- **`base: './'` is mandatory.** Measured, not inferred: default `base: '/'` bakes `url(/css/…)`
  into built CSS and breaks the runtime-configurable `static.mount` at `src/theme.js:24-26`. Under
  CSR this gets _more_ important, not less — a shell copied to `dist/components/detail/button.html`
  resolves its own relative asset URLs from a different depth than one at `dist/index.html`, so
  either the shell's asset URLs are root-absolute against a known mount or the copies are not in
  fact byte-identical. **That tension is new and unresolved; it belongs to ticket 05.**
- **`theme.addLoadPath()` view overriding dies**, and it dies to the hard cutover rather than to
  anything about rendering. Ticket 06 owns it.
- **Custom skins do not regress** — mandelbrot's `files` array never shipped `assets/`.
- **Storybook's prebuilt manager (#18550) is the architectural precedent**, Frame/Preview mapping
  one-to-one. Storybook's manager is itself client-rendered, so the precedent fits the CSR model
  better than it fit the SSG one.
- **Consumers get no Frame HMR** (node_modules is unwatchable). Unchanged by CSR; still ticket 05's
  call, corroborated independently by ticket 03.

**Lapsed — do not carry into the ADR or the spec:**

- Everything about the prerender API: `prerender` / `prerenderToNodeStream` vs `renderToString`,
  the client-render-fallback marker, Suspense requirements. There is no prerender.
- The two-build client + SSR split, `vite build --ssr`, `ssr.noExternal: true`, and the question of
  which pass emits CSS. There is one Vite build, the client one.
- The hydration payload convention (`<script type="application/json">` vs `window.__DATA__`, the
  CSP step-13/step-21 argument, `nonce` unavailability). Nothing is inlined for hydration; data
  arrives by `fetch`. The CSP reasoning may still be worth a glance if anything is ever inlined into
  the shell, but nothing currently is.
- All of Q5's hydration-mismatch discipline. One item survives in changed form and must not be lost
  with the rest: `theme.js:99-116`'s `new Date()` + `toLocaleDateString` still needs formatting at
  **build time**, not because of mismatch but because the payload carries source of truth, not
  presentation — and the client has no filesystem to re-derive it from. Route that to ticket 04.
- `react-dom/static` as a reason to choose React over Preact. The remaining reasons (ESM interop
  proven in `packages/react/src/adapter.js`; the `preact/compat` dual-package hazard) carry that
  decision by themselves — the ADR must say so rather than reciting a lapsed rationale.
