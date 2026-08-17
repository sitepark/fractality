# Measured payload weights for the CSR model

Measurements for [ticket 01](../issues/01-measure-payload-weights.md) · part of [the map](../map.md)

Date: 2026-08-17.

> **Method note.** Every number below was produced by running this repo's own code against a
> synthesised library, not estimated. Where a figure is computed from measured samples rather than
> read off a finished directory, it says so explicitly and gives the sample size and variance.

## Headline

**A detail page is 99.6% navigation tree.** In a 3797-handle library, one
`dist/components/detail/*.html` is 2,527,558 bytes, of which the `<nav>` element is 2,516,221. The
page's own content — head, Pen, Browser, the component itself — is **11,337 bytes**.

Today's build: **~9.01 GB**. The CSR model on the same library: **~33.7 MB**. That is **~267×**,
and it is larger than #419 reports (see the discrepancy section — #419's own two figures do not
reconcile with each other, and the real number is worse than either).

## Environment

|           |                                                          |
| --------- | -------------------------------------------------------- |
| CPU / RAM | Intel i7-13700H, 20 threads / 30 GB                      |
| OS / Node | Linux 7.0.0-29-generic / Node v24.12.0                   |
| Repo      | `78699be9` (`next-major`)                                |
| Packages  | `@fractality/mandelbrot` 1.12.3, `@fractality/web` 0.3.3 |
| Adapter   | handlebars                                               |
| Output FS | **tmpfs** — see the note on the truncated baseline build |

## The synthesised library

No library at #419's scale was to hand, so one was generated (`gen.mjs`, deterministic PRNG,
seed 20260817) to hit the reported item count exactly.

|                      |                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Components           | 1365                                                                                               |
| **Routable handles** | **3797** — matches #419's reported item count                                                      |
| Nav tree nodes       | 3810 (3797 handles + 12 root collections + 1 docs root)                                            |
| Root collections     | 12                                                                                                 |
| Distinct statuses    | 3                                                                                                  |
| Shape                | 60% of components default-variant-only, 30% with 3 variants, 10% with 6                            |
| Weight classes       | ~6% "heavy" (40 notes paragraphs, 60 context rows, 120 template lines), ~25% trivial, rest typical |

A handle is what mandelbrot's `getHandles()` enumerates: every component, plus every variant of a
component whose `variants()` size exceeds 1. **`variants()` includes the implicit default**, so a
component declaring N extra variants contributes N + 2 handles. This was verified against the
emitted detail-page count rather than reasoned about — the first attempt was off by one per
component.

## 1. Baseline — today's `fractality build`

| Route                | Pages |        Total |
| -------------------- | ----: | -----------: |
| `components/detail`  |  3797 |  **8.99 GB** |
| `components/preview` |  3797 |      6.05 MB |
| `components/render`  |  3797 |      6.05 MB |
| `index.html`         |     1 |      2.46 MB |
| `themes/`            |    29 |      0.68 MB |
| **Total**            |       | **~9.01 GB** |

Detail-page distribution, from **1651 pages actually written** (43% of 3797):

|    min |    p50 |   mean |    max |                 stdev |
| -----: | -----: | -----: | -----: | --------------------: |
| 2468 K | 2481 K | 2484 K | 2575 K | 23.5 K (0.9% of mean) |

Measured subtotal for those 1651 pages: 3.91 GB. The 8.99 GB figure is **mean × 3797**, not a
finished directory total.

> **Why the baseline build was stopped at 43%.** The scratch directory is on **tmpfs**, so the
> output was accumulating in RAM, not on disk — 3.9 GB of a 16 GB filesystem on a machine with
> 3.1 GB free memory, heading for ~9 GB. Continuing risked pushing the machine into swap for a
> number already determined to well under 1%: max/min spread across 1651 samples is 1.043 and the
> standard deviation is 0.9% of the mean, because every detail page contains the same tree and
> differs only in the ~11 KB that is not tree. The pages are near-identical by construction. If an
> exact directory total is ever wanted, rerun with `builder.dest` on real disk — the generator and
> measurement scripts are preserved in [`scripts/`](scripts/).

### Where the bytes are

For `components/detail/card-0251.html` (2,527,558 B):

| Region                                                  |     Bytes |     Share |
| ------------------------------------------------------- | --------: | --------: |
| `<nav class="Navigation">…</nav>`                       | 2,516,221 | **99.6%** |
| Everything else (head, Pen, Browser, component content) |    11,337 |      0.4% |
| `<head>` alone                                          |       777 |     0.03% |

Cost per nav item in rendered HTML: **660 bytes**. 3292 `Tree-entityLink` anchors per page.

## 2. The tree payload

All 3810 nav nodes, carrying exactly the fields mandelbrot's
`views/macros/navigation.nunj` and `views/partials/navigation/*.nunj` actually read — the field list
is taken from the templates, not invented.

| Shape                                                                                   |         Raw |    gzip -9 |     brotli |
| --------------------------------------------------------------------------------------- | ----------: | ---------: | ---------: |
| **A** — naive: every field, `status` inlined as `{label, color}`                        |    1118.6 K |    126.0 K |     99.9 K |
| **B** — `status` as a key into a 3-entry table, short field names, empty values dropped |     395.0 K |     96.7 K |     79.9 K |
| **C** — B minus the `id` field                                                          | **209.0 K** | **22.6 K** | **16.3 K** |

**The charting estimate (~400 KB raw / ~70 KB gzipped) was right on raw and wrong on gzip.** Shape B
lands at 395 K raw — essentially exact — but 96.7 K gzipped, 38% worse than estimated. Shape C beats
the estimate on both.

### The finding that matters: `id` is 77% of the gzipped tree

B and C differ by **one field**. Dropping `id` takes the payload from 96.7 K to 22.6 K gzipped — a
**4.3× reduction from a 1.9× raw reduction**. The asymmetry is the whole point:

`id` is a 32-character hex hash (`0ba678099fec5a386a8410b3b61be3ef`) — 16 bytes of genuine entropy
per item, incompressible by construction. Handles and labels share prefixes and compress well; ids
cannot. At 3810 items that is ~61 KB of gzipped payload that no amount of compression will touch.

**`handle` already uniquely identifies every item**, and it is what every URL, `data-handle` and
`data-test` attribute uses. The only thing `id` does in the nav today is the `current.id == item.id`
comparison at `navigation.nunj:40`, which `handle` serves equally well.

→ **Ticket 04 should drop `id` from the tree payload.** It is the single highest-value field
decision available, and nothing else in the contract comes close.

## 3. Entity payloads

Per-component payloads for the Pen and Browser: notes, context, resources, references, preview URL,
raw source per view. 1365 components.

|                            |      Raw |  gzip |
| -------------------------- | -------: | ----: |
| Total                      | 17.08 MB | 962 K |
| Smallest (`menu-0337`)     |    1.0 K | 439 B |
| p50 (`dialog-1095`)        |    4.8 K | 604 B |
| p90 (`field-0930`)         |   22.7 K | 884 B |
| Largest (`accordion-0852`) |  209.9 K | 3.2 K |

### View-content deduplication is worth much less than it looks

All variants of a component share one view source. Serialising `content` per variant duplicates it;
hoisting it to the component and referencing by index removes that:

|                                |       Raw |     gzip |
| ------------------------------ | --------: | -------: |
| Content duplicated per variant |  10.92 MB |  0.66 MB |
| Content hoisted + referenced   |   7.87 MB |  0.64 MB |
| **Saving**                     | **27.9%** | **2.0%** |

gzip already collapses the repetition, so this is worth 28% on disk and over `file://`, and
**essentially nothing over a gzipping server**. → Ticket 04 should not complicate the contract for
it unless `file://` is a first-class target.

> **Caveat, stated because it flatters the numbers.** The synthetic notes and context are repeated
> lorem, which compresses far better than real prose and real code. The **gzip** figures in this
> section are optimistic; the raw figures are sound. The tree-payload figures in §2 are unaffected —
> they are made of handles and labels, which are structurally realistic.

## 4. The CSR total

The shell was built concretely from the real `<head>` of a built page plus a root div, a module
script tag and a `<noscript>`: **998 bytes raw, 523 gzipped**.

| Component              |          Size | Note                                     |
| ---------------------- | ------------: | ---------------------------------------- |
| Shell × 3797 routes    |       3.61 MB | byte-identical copies                    |
| Tree payload (shape C) |       0.20 MB | fetched once, cached                     |
| Entity payloads        |      17.08 MB | **51% of the total — the dominant term** |
| `components/preview`   |       6.05 MB | unchanged, still engine-rendered         |
| `components/render`    |       6.05 MB | unchanged, still engine-rendered         |
| `themes/`              |       0.68 MB |                                          |
| Frame JS bundle        | 61 KB gzipped | **measured 2026-08-17** — see below      |
| **Total**              |  **~33.7 MB** | vs 9.01 GB → **~267×**                   |

**The one estimate, now measured.** At the time of writing this could not be measured because no bundle existed. The walking-skeleton Frame has since been built (React 19 + nav + Pen + Browser, Vite, production mode): **194 KB raw / 61 KB gzipped**, with a 410-byte Shell. That is comfortably inside the ~150–300 KB estimated here and remains well under 1% of the CSR total, so the conclusion is unchanged. Note it will grow as the Frame gains the features the skeleton omits — search, resizable panels, syntax highlighting — and highlight.js in particular is not in it yet.

**Note what CSR moves rather than deletes.** The entity payloads (17.08 MB) are new files; that
content lives inside the detail pages today. The saving is not "content removed", it is "the tree
stops being copied 3797 times".

## Discrepancy with #419 — read before quoting any number

#419 reports **3797 items, smallest page 782 K, 921 M total**. Those two figures cannot both be
right: 782 K × 3797 = **2.90 GB**, more than triple the reported 921 M total.

Our measurement is internally consistent — 8.99 GB ÷ 2468 K = 3822 ≈ 3797 pages — and is **3.2×
larger per page** and **9.8× larger in total** than #419 reports.

Unresolved, and not worth blocking on: the likeliest explanation is mandelbrot's
`navigation: 'split'` mode, which pulls variants out of the main tree and would cut nodes from 3810
to ~1377 — close to the 3.2× per-page gap. Hidden items or `du` block-size accounting could also
contribute.

→ **The ADR should cite these measured numbers and note that #419's are internally inconsistent.**
The direction is unaffected: the bug is real and larger than reported.

## What this settles

**1. The measured before/after for the ADR.** 9.01 GB → ~33.7 MB, ~267×. Replaces the charting
arithmetic. Cite #419 as the motivating report, not as the source of figures.

**2. The single tree payload survives — comfortably, in shape C.** At 22.6 K gzipped (16.3 K
brotli) it is on the critical path for first paint and costs less than a typical web font. Even the
unoptimised shape B at 96.7 K would be acceptable. **Lazy subtree loading is not needed at 3797
items** — the map's fog entry can be closed, with the caveat that shape C's margin depends on
dropping `id`.

**3. Shell-copy-per-route is negligible.** 3.61 MB of a 33.7 MB total (10.7%), and 0.04% of today's
output. No route-table thinning is needed; the map's "is it still a file copy" question can be
answered on design grounds alone.

**4. New input for ticket 04, not previously on its list.** The entity payloads are 51% of the CSR
total — the tree is 0.6%. Ticket 04's Q2 granularity question is therefore the one that governs
total size, and the tree fields it was most worried about are nearly free. The contract's attention
should follow the bytes.
