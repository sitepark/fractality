# Measure the real weight of an SSG'd detail page

Part of [the map](../map.md)

Type: task
Status: open
Blocked by: —

## Question

The whole #419 justification currently rests on arithmetic, not a measurement. Before the ADR
commits to SSG + hydration, establish what a detail page actually weighs once the navigation tree
is no longer inlined.

Produce real numbers for a library at #419's scale (znerol reported 3797 items, smallest page
782K, 921M total — synthesise a library of that size if no real one is to hand):

1. **Baseline** — today's `fractality build` output: per-page size distribution and directory total.
2. **Nav removed** — the same build with `partials/navigation/navigation.nunj` stripped from
   `layouts/frame.nunj`. This is the crude stand-in for a client-fetched tree, and the number that
   matters most.
3. **Nav removed, highlighting removed** — additionally strip the `| highlight(...)` call in
   `partials/browser/panel-view.nunj`, approximating the decision to highlight after hydration.
   Quantifies what that decision is actually worth.
4. **The tree payload itself** — serialise the nav-shaped fields only (id, handle, label, path,
   status, variant grouping) for all items. Raw and gzipped. The charting estimate was ~400KB raw
   / ~70KB gzipped; confirm or correct it.

Record measured sizes, not estimates. Note the machine, Node version and item count.

**What the answer must settle:** whether SSG + hydration delivers a large enough win over today's
921M to justify a breaking major — and whether the single-tree-payload decision survives at 3797
items or has to become lazy subtrees (currently parked in the map's fog).
