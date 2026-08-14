# Design the public data contract for the component tree

Part of [the map](../map.md)

Type: grilling
Status: open
Blocked by: 01

## Question

With the Frame rendering from data, something must define that data's shape. The map fixes it as a
**documented, versioned public contract** owned by `@fractality/web` — because the cutover removes
`theme.addRoute(url, { view: 'pages/doc.nunj' })`, and a break with no replacement is an eviction,
not a migration. This is the single most consequential thing the map decides and the core of the
ADR.

Settle:

1. **The tree payload.** Exactly which fields the navigation needs — id, handle, label, path,
   status, tags, variant grouping, hidden/visible — and nothing more. Every field costs 3797×.
   Ticket 01's measurement bounds this.
2. **The entity payload.** What a component/variant/doc/asset carries for the Pen and Browser
   panels: notes, context, resources, references, preview URL, raw source per view. Which parts
   are inlined into the SSG page versus fetched on navigation.
3. **Versioning.** How the contract is versioned and how a theme declares which version it needs.
   What counts as breaking.
4. **Extensibility.** Custom panels and custom nav sections exist today via `theme.get('panels')`
   and `theme.get('nav')` (`packages/mandelbrot/src/theme.js:117-118`). How does a theme add its
   own data to the payload without forking `@fractality/web`?
5. **What replaces `addRoute`.** Routes still drive the prerender walk
   (`packages/web/src/builder.js:103-126`) and that model is worth preserving. Does the route table
   survive as-is, minus `view`?
6. **Where server-side filters land.** `markdown`, `render`, `async`, `linkRefs` and
   `getPreviewContent()` (`packages/web/src/engine/filters/`) currently run in nunjucks. Per the
   map, filesystem-bound work resolves at build time into the payload. Confirm each filter's
   destination — and whether `linkRefs`, which rewrites cross-component links, still works when its
   output is data rather than HTML.

**Validate against mandelbrot as the proving case** — walk its real panels and nav sections and
confirm the contract serves them. That is the only reason mandelbrot is in scope here.

Use `/grilling` and `/domain-modeling`; the terms this settles belong in a `CONTEXT.md`.
