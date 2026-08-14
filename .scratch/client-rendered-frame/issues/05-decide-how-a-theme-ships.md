# Decide how a theme ships: prebuilt bundle, or built in the consumer's project

Part of [the map](../map.md)

Type: grilling
Status: open
Blocked by: 02, 03

## Question

Mandelbrot ships a prebuilt `dist/` today — `prepack` runs `vite build`, and the output is served
as static assets via `theme.addStatic(..., '/themes/mandelbrot')`
(`packages/mandelbrot/src/theme.js:130`). SSG + hydration may not survive that arrangement, because
the prerender needs to run in the _consumer's_ project where the actual component library lives.

Decide between:

- **(a) Prebuilt.** The theme ships client + SSR bundles; `fractality build` loads the SSR bundle
  and walks the route table. Vite never runs in the consumer's project. Fast installs, no
  toolchain leakage — but theme config (skins, panels, nav sections, labels) must be entirely
  runtime data, never build-time.
- **(b) Built in the consumer's project.** `fractality build` runs Vite over the theme's source.
  User config compiles in, custom panels are real components — at the cost of putting Vite, React
  and a compile step into every consumer's build.
- **(c) Hybrid.** Prebuilt by default; a consumer opts into a local build when they need
  compiled-in customisation.

Ticket 02 establishes what is technically possible for the packaging inversion, and ticket 03 what
dev mode needs; this ticket makes the call.

**Pressure it against what already exists:**

- Skins are user-selectable strings resolved to prebuilt CSS URLs
  (`packages/mandelbrot/src/theme.js:80-97`), and ADR 0004 documents a Rollup dedup hazard in how
  they are compiled. Under (a), can a user still ship a _custom_ skin?
- `theme.get('panels')` and `theme.get('nav')` are arrays of partial names resolved at render time.
  Under (a) these must become component registrations rather than template includes.
- Does (a) force the Frame's React version on every consumer, and is that acceptable given the map
  fixes it as bundled-not-peered?

## Inputs from tickets 02 and 03 (both resolved)

**Option (a) is technically proven, so this is a decision about extension points, not
possibility.** Ticket 02 did not answer from documentation — it built and ran the inverted case
with this repo's own Vite 8.2.1 / React 19.2.8: a theme-side SSR build with `ssr.noExternal: true`
prerendered correctly from a consumer directory containing no `node_modules` at all. Decide (a) vs
(b) vs (c) on ergonomics and extensibility; do not relitigate feasibility.

**The one real cost, flagged independently by both research tickets — treat the corroboration as
significant.** Under (a) the theme lives in the consumer's `node_modules`, and Vite's watcher
ignore list is hardcoded and unwatchable there. So **a consumer gets no Frame HMR**, and in a
consumer's project Vite's dev server transforms almost nothing — middleware mode's value there
narrows to "we get a WebSocket". Frame HMR stays real only for theme development in this repo.

Ticket 02 argues this is the right trade (consumers edit patterns, not Frame components; Storybook
makes the same call). **This ticket owns that call.** If it goes the other way — the consumer's dev
server must run Vite over theme source — then (a) dies for dev mode and only (c) hybrid survives.

Two smaller carried findings: `base: './'` is mandatory under (a), or the runtime-configurable
`static.mount` in `src/theme.js:24-26` breaks for any consumer who changes it (a bug that would
never surface in this repo's own testing). And **custom skins do not regress** — mandelbrot's
`files` array never shipped `assets/` in the first place, so the skin question below is narrower
than it looked at charting.

**Flagged at charting as sneakily large** — this reshapes the packaging story for every theme, not
just mandelbrot. If it turns out to sit past the destination, rule it out of scope rather than
resolving it on the route.
