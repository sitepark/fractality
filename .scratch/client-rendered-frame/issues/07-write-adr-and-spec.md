# Write the rendering-model ADR and the `@fractality/web` spec

Part of [the map](../map.md)

Type: task
Status: resolved
Blocked by: 04, 05, 06, 08

> **Rewritten 2026-08-17** for the CSR reversal. The artefacts are the same two; what they record
> changed. Note the ADR now has to document a decision that was _reversed mid-effort_ — that is a
> feature, not an embarrassment, and it is the most useful thing the document can carry.

## Question

Nothing left to decide — this is the destination, written down. Produce the two artefacts the map
exists to reach, from the resolved tickets. Do not re-open settled decisions here; if something
genuinely cannot be written without reopening one, that is a signal the map is not finished.

**1. The ADR** — `docs/adr/0005-*.md`, following the format of the existing four. It earns an ADR on
all three counts: hard to reverse (a breaking major across every theme), surprising without context
(why a styleguide generator's own chrome is a React SPA), and a real trade-off. It must record:

- The rendering model: **pure CSR**, Frame client-owned in both modes, booting from a static shell,
  patterns engine-rendered behind the Preview iframe.
- **Deep links on dumb static hosts**, and how the shell-copied-per-route answer resolves them. This
  is the crux of the whole document — it is the property that originally ruled CSR out, and the ADR
  is only sound if it shows the property is preserved. Record why not hash routing (breaks every
  existing URL) and why not host-level SPA fallback (breaks `file://` and plain static servers).
- **Why not SSG + hydration**, written as the considered-and-rejected alternative it now is: it
  bought a better first paint for a _local developer tool_, at the cost of an SSR bundle, a
  prerender pass, hydration-mismatch discipline, and a far harder packaging story — and the one
  thing it bought that mattered structurally is bought just as well by copying a 2KB file. This is
  the section a future reader will actually need; the SSG design was researched in depth
  (`.scratch/client-rendered-frame/research/react-ssg-in-theme-package.md`) before being dropped, so
  the rejection is evidenced rather than assumed. Say so.
- **Why not stub-per-route with a server render**, likewise rejected.
- Why React over Preact — the `preact/compat` dual-package hazard and proven ESM interop in
  `packages/react/src/adapter.js` — and the bundled-not-peered rule that keeps the Frame's React
  clear of `@fractality/react`'s peer range. **Do not cite `react-dom/static`**: that reason lapsed
  with SSG, and reciting it would make the ADR wrong on its own terms.
- Ticket 01's **measured** numbers against #419's 921M — not the charting arithmetic.
- The consequences: breaking major, hard cutover, mandelbrot's views obsolete, and **no-JS is not
  supported** — stated plainly as a consequence rather than left implied.

**2. A second ADR for the TypeScript decision** — `docs/adr/0006-*.md`, if ticket 08 confirms it
earns one (it recommends yes). Separate from the rendering ADR on purpose: "why does
`@fractality/web` have a build step and publish `dist/`" is a different question from "why is the
Frame client-rendered", and it outlives the rendering decision. It must record that the build step
is **mandatory, not stylistic** — Node refuses to strip types under `node_modules`
(`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, reproduced on 24.12.0), so publishing raw `.ts` the
way the package publishes raw `.js` today is impossible — and that the type boundary deliberately
stops at the payload contract to keep `packages/core/src/mixins/` out of scope.

**3. The implementation spec** — the data contract from ticket 04, the packaging decision from
ticket 05, the TypeScript toolchain from ticket 08, the shell-copy build pass and the
middleware-mode dev server, in enough detail to hand to an implementation effort without it needing
to re-derive any of this. It must also carry ticket 03's two operational caveats, which are easy to
lose between a map and an implementation: register engine routes before `vite.middlewares` and the
Frame catch-all after, and pass the host's `http.Server` as `server.ws.server` or get a stray HMR
server on port 24678. And from ticket 08, the one that will otherwise be discovered the hard way:
Vite type-checks nothing, so the `tsc --noEmit` gate is load-bearing rather than hygiene.

**4. The domain docs** — ✅ **already done, 2026-08-17, as part of ticket 04.** `CONTEXT-MAP.md`
exists at the root and points at `CONTEXT.md` files for `core`, `fractality`, `web` and
`mandelbrot`, closing the gap `AGENTS.md` promised. Nothing to create here — but **review them
against whatever tickets 05, 06 and 08 settle** and add any terms those mint. Two things to keep
right when editing: "shell" is retired as a synonym for the Frame and now means only the static
HTML document it boots from (a live trip hazard when reading older notes in this tracker), and
`packages/web/CONTEXT.md` carries a note saying its payload terms are not yet in the code — **delete
that note once they are**.

**On completion**, note in the map that mandelbrot's rewrite is the follow-on effort, and that it
starts from this spec.

## Answer

Written 2026-08-17. All four artefacts exist; nothing needed reopening, which is the signal the map
was actually finished.

- **[ADR 0005 — Client-render the Frame instead of server-rendering every page](../../../docs/adr/0005-client-render-the-frame.md)**
  Records the measured 99.6%-of-a-page finding and the 9.01 GB → ~33.7 MB result, SSG + hydration as
  the considered-and-rejected alternative, hash routing and SPA fallback as the rejected deep-link
  options, React over Preact on the two reasons that survive CSR (the `react-dom/static` argument
  having lapsed), and the consequences including `file://` and no-JS. Written in the repo's house
  style — imperative title, one dense paragraph, ~250 words against the existing four's 150-180.

- **[ADR 0006 — Compile and publish `@fractality/web` from TypeScript](../../../docs/adr/0006-compile-and-publish-web-from-typescript.md)**
  Separate from 0005 on purpose: "why does this package have a build step" outlives "why is the Frame
  client-rendered". Records the Node `node_modules` type-stripping finding as the reason the build
  step is mandatory rather than stylistic, `tsc` over a bundler, and the type boundary stopping at
  the payload contract.

- **[Implementation spec](../../../docs/specs/client-rendered-frame.md)** — `docs/specs/`, a new
  directory, since this is an approved design that outlives the tracker and is meant to be handed
  over. Eleven sections covering the rendering model, the data contract, on-disk layout and
  addressing, the two-pass build, `window.frctl`, packaging, the dev server, everything removed, the
  TypeScript toolchain, and the known open items. It carries ticket 03's two operational caveats
  (route registration order, and `server.ws.server` or a stray HMR server on 24678) and the
  `gateOnIdle`-on-every-tree-reading-route requirement, all of which are easy to lose between a map
  and an implementation.

- **Domain docs** — already created under ticket 04 and reviewed here against what 05, 06 and 08
  settled. 06 and 08 minted no domain vocabulary (migration mechanics and toolchain); 05 minted
  **Plugin** and retired **Skin**, both already reflected in `packages/mandelbrot/CONTEXT.md`.
  `CONTEXT-MAP.md` now points at `docs/specs/` and carries a note that the next major changes several
  of its terms.

**Handoff.** Mandelbrot's rewrite is the follow-on effort and starts from the spec, not from this
tracker. [Ticket 09](09-design-the-plugin-api.md) travels with it.
