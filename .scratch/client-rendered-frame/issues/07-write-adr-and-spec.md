# Write the rendering-model ADR and the `@fractality/web` spec

Part of [the map](../map.md)

Type: task
Status: open
Blocked by: 04, 05, 06

## Question

Nothing left to decide — this is the destination, written down. Produce the two artefacts the map
exists to reach, from the resolved tickets. Do not re-open settled decisions here; if something
genuinely cannot be written without reopening one, that is a signal the map is not finished.

**1. The ADR** — `docs/adr/0005-*.md`, following the format of the existing four. It earns an ADR
on all three counts: hard to reverse (a breaking major across every theme), surprising without
context (why a styleguide generator carries an isomorphic React pipeline), and a real trade-off
(SSG + hydration was chosen over pure CSR and over stub-per-route, and React over Preact, each for
stated reasons). It must record:

- The rendering model: Frame client-owned in both modes, SSG + hydration, patterns engine-rendered
  behind the Preview iframe.
- Why not pure CSR (deep links on dumb static hosts) and why not stub-per-route (rejected in favour
  of real first paint).
- Why React over Preact, including the `preact/compat` dual-package hazard and the
  bundled-not-peered rule that keeps the Frame's React clear of `@fractality/react`'s peer range.
- Ticket 01's **measured** numbers against #419's 921M — not the charting arithmetic.
- The consequences: breaking major, hard cutover, mandelbrot's views obsolete.

**2. The implementation spec** — the data contract from ticket 04, the packaging decision from
ticket 05, the two-pass build and the middleware-mode dev server, in enough detail to hand to an
implementation effort without it needing to re-derive any of this.

**3. The domain docs** — `AGENTS.md` promises a root `CONTEXT-MAP.md` pointing at per-package
`CONTEXT.md` files; neither exists. This effort mints the vocabulary (Frame, Pen, Preview, Browser,
adapter, tree payload, entity payload), so create them here and close that gap. Glossary only —
no implementation detail, per `/domain-modeling`.

**On completion**, note in the map that mandelbrot's rewrite is the follow-on effort, and that it
starts from this spec.
