# Measure the payload weights the CSR model produces

Part of [the map](../map.md)

Type: task
Status: resolved
Blocked by: —

> **Rewritten 2026-08-17** for the CSR reversal. This ticket used to ask whether SSG + hydration was
> a big enough win to justify a breaking major. Under pure CSR that question answers itself — a
> detail page becomes a ~2KB shell copy — so the ticket now exists for two narrower reasons: the ADR
> needs a **measured** before/after rather than arithmetic, and the single-tree-payload decision
> still needs a number under it.

## Question

Produce real numbers for a library at #419's scale (znerol reported 3797 items, smallest page 782K,
921M total — synthesise a library of that size if no real one is to hand):

1. **Baseline** — today's `fractality build` output at that scale: per-page size distribution and
   directory total. This is the "before" half of the ADR's claim and the only part that must be
   measured against the current code.
2. **The tree payload — the number that actually decides something.** Serialise the nav-shaped
   fields only (id, handle, label, path, status, variant grouping) for all items. Raw and gzipped.
   The charting estimate was ~400KB raw / ~70KB gzipped; confirm or correct it.
3. **A representative entity payload.** Take a few components spanning the range — trivial, typical,
   and the heaviest thing in the library — and serialise what the Pen and Browser would need
   (notes, context, resources, references, preview URL, raw source per view). Raw and gzipped.
   Ticket 04 designs the shape; a rough hand-rolled approximation is enough here.
4. **The CSR total** — shell size × route count, plus the tree payload, plus all entity payloads.
   Compare against the 921M baseline.

Record measured sizes, not estimates. Note the machine, Node version and item count.

**What the answer must settle:**

- The measured before/after the ADR states, in place of the charting arithmetic.
- Whether the single-tree-payload decision survives at 3797 items or has to become lazy subtrees
  (currently parked in the map's fog). CSR raises the stakes: the tree fetch is now on the critical
  path for first paint, not just for navigation, so judge the gzipped number against _time to first
  usable Frame_, not just against transfer size.
- Whether copying the shell per route stays negligible at that item count, or whether the route
  table needs thinning.

## Answer

Findings: [research/payload-weights.md](../research/payload-weights.md). Scripts preserved in
[research/scripts/](../research/scripts/). Measured on Node 24.12.0 / i7-13700H against repo
`78699be9`, using a deterministic synthetic library of **3797 routable handles** (1365 components,
3810 nav nodes) — #419's reported item count, matched exactly.

**The headline is stronger than the map assumed: a detail page is 99.6% navigation tree.** Of
2,527,558 bytes, the `<nav>` element is 2,516,221; everything else — head, Pen, Browser, and the
component's own content — is **11,337 bytes**.

1. **Baseline: ~9.01 GB**, of which `components/detail` is 8.99 GB across 3797 pages (mean 2484 K,
   stdev 0.9%). `preview` and `render` are 6.05 MB each and are unaffected by any of this.
2. **CSR total: ~33.7 MB → a ~267× reduction.** Shell 998 B × 3797 = 3.61 MB; tree payload 0.20 MB;
   entity payloads 17.08 MB; preview + render 12.10 MB unchanged. The Frame's JS bundle is the one
   unmeasured item (no bundle exists yet) and is ~1% of the total at any plausible size.
3. **The tree payload survives comfortably — 22.6 K gzipped**, against a charting estimate of ~70 K.
   **Lazy subtree loading is not needed at this scale**; the map's fog entry is closed.
4. **Shell-copy-per-route is negligible** — 3.61 MB, 10.7% of the CSR total and 0.04% of today's
   output. No route-table thinning needed.

**Two findings that change ticket 04's priorities, neither of which was on its list:**

- **`id` is 77% of the gzipped tree payload.** It is a 32-char hex hash — incompressible by
  construction — and dropping it alone takes the tree from 96.7 K to 22.6 K gzipped, a 4.3×
  reduction from a 1.9× raw reduction. `handle` is already unique and already carries every URL and
  `data-*` attribute. This is the single highest-value field decision in the contract.
- **Entity payloads are 51% of the CSR total; the tree is 0.6%.** Ticket 04's Q2 (granularity) is
  therefore the question that governs size, and the tree fields it worried most about are nearly
  free. Related: hoisting shared view content out of variants saves 27.9% raw but **2.0% gzipped**,
  so it is not worth complicating the contract for unless `file://` is a first-class target.

⚠️ **#419's own numbers do not reconcile and should not be quoted.** It reports 3797 items, smallest
page 782 K, and 921 M total — but 782 K × 3797 = 2.90 GB, over triple the reported total. Our
measurement is internally consistent and is 3.2× larger per page and 9.8× larger in total. The
likeliest explanation is `navigation: 'split'` mode, unconfirmed. The ADR should cite the measured
figures and note the inconsistency; the direction is unaffected, and the bug is worse than reported.
