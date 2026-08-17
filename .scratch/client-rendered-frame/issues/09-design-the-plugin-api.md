# Design the plugin API for custom panels and nav sections

Part of [the map](../map.md)

Type: grilling
Status: **deferred** — explicitly not blocking the ADR or the spec
Blocked by: —

> **New 2026-08-17**, created by [ticket 05](05-decide-how-a-theme-ships.md). Ticket 05 committed to
> consumers extending the Frame through a defined plugin API and deferred designing it. This ticket
> is where that lives so it does not evaporate.

## Why it is deferred rather than open

The packaging decision needed only two properties of a plugin API, and both are already fixed:
plugins **load at runtime as ES modules** rather than being bundled into the theme, and the Frame
**hands them their React**. Everything else about the API — its surface, its lifecycle, how a plugin
is discovered and configured — can be designed after the ADR ships, because none of it changes the
rendering model, the data contract or the packaging decision.

It belongs with **mandelbrot's rewrite**, since a plugin API is an API _onto a component surface_
that does not exist yet. Designing it before the Frame's components exist would be inventing against
a vacuum.

## Fixed constraints, carried from ticket 05

Do not relitigate these; they fall out of decisions made elsewhere.

- **Plugins load at runtime as ES modules.** Bundling them would put a compile step into every
  consumer's build and kill the prebuilt packaging decision.
- **A plugin cannot `import React` and get the Frame's copy.** The map fixes the Frame's React as
  bundled and never peered, so it lives inside the theme's bundle with no shared module to resolve
  against. The Frame must _hand_ plugins React and a small component/hook surface at registration
  time. **Plugins therefore inherit React 19 with no say in it** — worth stating in the plugin
  documentation rather than letting someone discover it.
- **A plugin's panel data is already solved.** [Ticket 04](04-design-public-data-contract.md) fixed
  it: build-time contributor hooks write into a namespaced `ext` slot, addressed as
  `button.ext.<theme>.<panel>.json` and fetched lazily exactly like a built-in panel's data. This
  ticket owns the _component_ that renders it, not the data that feeds it.
- **`ext` sits outside the contract's compatibility guarantee**, so a plugin's own data shape is its
  own problem.

## What this ticket has to settle

1. **Registration.** How a plugin declares itself, and how the Frame discovers it — consumer config
   naming a URL or module specifier, a convention, or something else.
2. **The handed surface.** Exactly what the Frame passes a plugin at registration: React, which
   hooks, which components, which parts of the tree and entity payloads. This is a public API
   surface and versioning it is a real question — see ticket 04's contract versioning for the
   precedent.
3. **Placement.** How a plugin says _where_ it goes: a Browser panel, a nav section, something else.
4. **Failure.** What happens when a plugin throws, fails to load, or targets an incompatible Frame
   version. A dev tool that white-screens because a third-party panel threw is worse than one
   without plugins.
5. **The migration story for `theme.addLoadPath()`.** Ticket 06 lists it as dying with no
   equivalent. If this API is its eventual replacement, ticket 06's wording should point here rather
   than saying "no equivalent" flatly — check what ticket 06 ended up saying and reconcile.

## What replaced it in the meantime

Consumers can select and reorder the **built-in** panels and nav sections through runtime config,
which is pure data and needs no API. Only _new_ panels require this ticket.
