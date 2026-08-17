# Design the public data contract for the component tree

Part of [the map](../map.md)

Type: grilling
Status: resolved
Blocked by: 01

> **Rewritten 2026-08-17** for the CSR reversal. The inlined-into-the-SSG-page half of Q2 is gone —
> under CSR nothing is inlined and everything is fetched — but the ticket gets _larger_, not
> smaller: with no server render anywhere, this contract is now the **only** interface between
> `@fractality/web` and a theme. Everything the Frame ever displays passes through it.

## Question

With the Frame rendering entirely from data, something must define that data's shape. The map fixes
it as a **documented, versioned public contract** owned by `@fractality/web` — because the cutover
removes `theme.addRoute(url, { view: 'pages/doc.nunj' })`, and a break with no replacement is an
eviction, not a migration. This is the single most consequential thing the map decides and the core
of the ADR.

Settle:

1. **The tree payload.** Exactly which fields the navigation needs — id, handle, label, path,
   status, tags, variant grouping, hidden/visible — and nothing more. Every field costs 3797×.
   Ticket 01's measurement bounds this, and under CSR the tree fetch is on the critical path for
   first paint rather than only for navigation.
2. **The entity payload.** What a component/variant/doc/asset carries for the Pen and Browser
   panels: notes, context, resources, references, preview URL, raw source per view. All of it is
   fetched — the open question is **granularity**, not inlining: one payload per entity, or batched
   per collection? That is a real trade at 3797 items (3797 small files versus fewer large ones,
   against HTTP/2 and against `file://`).
3. **The on-disk layout in static mode.** This is new under CSR and has no precedent in the current
   code. Where do the payloads live in `dist/` (`dist/data/…`?), how does the client address them
   from a route path, and does that addressing survive a `static.mount` other than `/`? Interacts
   directly with ticket 02's `base: './'` finding — see the tension it flags.
4. **Symmetry between dev and static.** In dev the payloads come from Express JSON endpoints; in a
   static build they are files on disk. The client must not care which. Fix the URL shape that
   makes both work, including under `file://`.
5. **Versioning.** How the contract is versioned and how a theme declares which version it needs.
   What counts as breaking. **Under TypeScript this gets a second dimension** (map, 2026-08-17):
   `@fractality/web` will ship `.d.ts` for this contract, so the contract's _types_ become a
   breaking-change surface of their own — a field that narrows from `string` to a union breaks
   compilation for every theme author even though the runtime payload is unchanged. Decide whether
   the runtime version marker and the type shape version together, and what a theme author is
   expected to check. Mechanics live in
   [ticket 08](08-settle-typescript-toolchain.md); the policy is this ticket's.
   **This contract is now the type boundary**, too: the map fixes `@fractality/core` and the
   adapters as staying JavaScript, so the types written here are hand-written at the serialisation
   seam and deliberately do not reach back into core's `mixwith` layer. Where the payload is derived
   from a core model, the derivation is unchecked by construction — decide what guards that seam
   instead (runtime validation on emit? fixtures? nothing, stated deliberately?).
6. **Extensibility.** Custom panels and custom nav sections exist today via `theme.get('panels')`
   and `theme.get('nav')` (`packages/mandelbrot/src/theme.js:117-118`). How does a theme add its
   own data to the payload without forking `@fractality/web`?
7. **What replaces `addRoute`.** Routes still drive the static walk
   (`packages/web/src/builder.js:103-126`) and that model is worth preserving — under CSR the walk
   emits a shell copy plus a payload per route rather than a rendered page. Does the route table
   survive as-is, minus `view`?
8. **Where server-side filters land.** `markdown`, `render`, `async`, `linkRefs` and
   `getPreviewContent()` (`packages/web/src/engine/filters/`) currently run in nunjucks. Per the
   map, filesystem-bound work resolves at build time into the payload. Confirm each filter's
   destination — and whether `linkRefs`, which rewrites cross-component links, still works when its
   output is data rather than HTML.
9. **Anything else that must be formatted at build time because the client cannot re-derive it.**
   Carried from ticket 02: `theme.js:99-116` does `new Date()` + `toLocaleDateString`. That was
   flagged there as a hydration-mismatch risk; the mismatch concern lapsed with SSG but the
   underlying requirement did not — the client has no filesystem and no build clock. Sweep for
   others of the same class.

**Validate against mandelbrot as the proving case** — walk its real panels and nav sections and
confirm the contract serves them. That is the only reason mandelbrot is in scope here.

Also settle the small question the map parked: **do the per-route shell copies stay byte-identical**,
or does anything (a `<title>`, a canonical link, an og: tag) genuinely need to vary per route? If
nothing does, say so explicitly — "it is a file copy" is a property worth defending.

Use `/grilling` and `/domain-modeling`; the terms this settles belong in a `CONTEXT.md`.

## Answer

Settled 2026-08-17 in a five-round grilling session. All nine items above have answers, plus the
map's parked shell-copy question. Measured inputs throughout come from
[ticket 01](01-measure-payload-weights.md).

### The tree payload

One payload, three roots (components, docs, assets), fetched once and cached. Per node: `handle`,
`label`, `status` **as a key into a small table** rather than an inlined `{label, color}` object,
`tags` when non-empty, children nesting, and the collection/root flags.

**`id` is dropped.** Ticket 01 measured it at 77% of the gzipped tree — a 32-character hex hash, so
incompressible by construction, while handles and labels share prefixes and compress well. `handle`
is already unique and already carries every URL and `data-*` attribute. Its only other use,
`browser-{{ entity.id }}-panel-view` DOM ids in mandelbrot's markup, is served equally well by
`handle` in templates that are being rewritten anyway. Result: ~22.6 K gzipped for 3810 nodes.

### The entity payload — four files per component, not one

The granularity is per **component**, with variants inlined rather than addressable separately (the
Pen's variant switcher is local state, not navigation). But the payload is split by **panel**:

| File                              | Contents                                                          | Fetched                      |
| --------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| `button.json`                     | identity, variant list, preview URLs, `references`/`referencedBy` | every navigation (~470 B)    |
| `button.notes.json`               | raw markdown notes, component and per-variant                     | when the Notes panel opens   |
| `button.context.json`             | context objects, component and per-variant                        | when the Context panel opens |
| `button.view.json`                | view source per variant                                           | when the View panel opens    |
| `button.ext.<theme>.<panel>.json` | theme-contributed panel data                                      | when that panel opens        |

**The rule is general — each panel's data is its own payload** — which is why a theme's custom panel
data loads exactly the way a built-in panel's does, instead of every consumer paying for it on
every navigation.

Measured justification: splitting only `context` (as first proposed) would have removed 22.2% and
left 78% of the weight in the per-navigation fetch. The real distribution is `notes` 42.9%,
`viewSource` 30.9%, `context` 22.2%, identity+references 3.9%. Splitting all three drops the
per-navigation payload from ~12 KB to ~470 B. Total bytes on disk are unchanged — this redistributes
rather than removes.

Shared view content stays **duplicated** across variants rather than hoisted and referenced: ticket
01 measured hoisting at 27.9% raw but only 2.0% gzipped, and with `file://` dropped (below) every
payload is served compressed.

### Layout, addressing, and dev/static symmetry

Payloads are **siblings of the route they back** — `dist/components/detail/button.json` beside
`button.html`. The client derives a payload URL from its own location: strip a trailing `.html`,
append the panel segment and `.json`. One rule, identical in dev and static, correct at any
`static.mount`, and requiring no server configuration.

This matters because the two modes do **not** share URLs today: dev serves
`/components/detail/button`, the static build emits `button.html`. The strip-then-append rule
absorbs that difference. The tempting alternative — emitting `detail/button/index.html` for
identical clean URLs — is ruled out by the map's decision to preserve today's URLs so existing
bookmarks survive.

The **tree payload** is global and so needs a real path rather than a sibling derivation. It
deliberately does **not** get its own addressing mechanism: the shell must already locate its own JS
and CSS, so the tree reuses whatever base mechanism [ticket 05](05-decide-how-a-theme-ships.md)
settles for assets, carried in the `window.frctl` block the shell already has today.

Two consequences inherited from [ticket 03](03-research-vite-middleware-adapter-rendering.md), not
open questions: the dev JSON routes register **before** the Frame catch-all, and because they read
the tree they must carry the shared `gateOnIdle` middleware or ADR 0001's rebuild guarantee silently
breaks for data requests.

### Build time versus client side

**Build time is reserved for what genuinely needs the filesystem**: `getPreviewContent()`, file
reads, file sizes and mtimes. Everything else is client-side: `highlight`, `linkRefs`, `markdown`,
`format`, `fileSize`.

> **Corrected 2026-08-17 by [ticket 05](05-decide-how-a-theme-ships.md).** `hexToRgb` was originally
> listed client-side here and that was wrong. It feeds the `:root` custom-property block in the
> shell's `<head>` (`views/partials/stylesheets.nunj:1-10`), which must exist before any JavaScript
> runs, so it resolves at **site build time** when the shell is written. The rule still holds — it is
> just that this filter feeds the shell rather than a panel, which is the distinction the original
> list missed. The other five are unaffected; all of them feed panels.

Two findings drove this rather than preference:

- **`linkRefs` consumes `highlight`'s output.** `panel-view.nunj:3` pipes
  `getPreviewContent() | async | trim | highlight(…) | linkRefs(entity)`, regex-replacing `@handle`
  in already-highlighted HTML. The two are coupled and must run on the same side of the wire, so
  deferring highlighting to the client takes `linkRefs` with it. It becomes a post-highlight pass
  driven by the `references: handle[]` field.
- **`markdown()` already highlights internally.** `packages/core/src/markdown.js:11-18` calls
  `highlighter()` inside its code-block renderer. Keeping markdown at build time would have
  highlighted fenced code at build time while the View panel highlighted client-side — two
  highlighting paths, contradicting the map. Client-side markdown collapses them into one. Cost:
  `marked` + `marked-smartypants` (~15-20 K gzipped) on top of the `highlight.js` the Frame was
  already taking.

**All payload values are JSON-serialisable.** Raw values only — ISO 8601 timestamps, byte counts,
paths — with formatting client-side.

### The route table

Survives, minus `view`. `handle`, the path pattern and the params resolver all stay; the resolvers
are where the real knowledge lives. Under CSR the walk emits a shell copy plus payloads per route
instead of a rendered page.

### Versioning

An integer `contractVersion` at the root of the tree payload and each entity payload. A theme
declares the version it supports and `@fractality/web` fails **loudly with a useful message** on
mismatch. Breaking = removing or renaming a field, narrowing a type, or changing semantics; adding
an optional field is not. **Type-level changes count as breaking on the same footing as runtime
ones** — shipping `.d.ts` means narrowing `string` to a union breaks a theme author's compile with
an unchanged runtime payload. `ext` sits outside the guarantee.

### Extensibility

Build-time contributor hooks under a namespace: a theme registers a function that runs per entity,
and its return value lands at `ext: { <themeName>: … }`, addressed as
`button.ext.<theme>.<panel>.json`. Hooks run in Node during the build, so they have the filesystem
access a custom panel usually needs. In TypeScript the core contract types `ext` as
`Record<string, unknown>` and a theme narrows its own slot.

### Shell copies

Byte-identical, with `document.title` set client-side on route resolve. Costs a generic tab title
until JS runs; keeps "it is a file copy, not a render pass" literally true.

## Accepted costs — decided, not solved

1. **`file://` is dropped as a supported target.** Browsers give `file://` pages an opaque `null`
   origin, so CORS rejects every `fetch`, relative or absolute — no addressing scheme avoids it. The
   Frame would load and then fail to populate. Today's static build _does_ work from disk, so this
   is a real regression, and the ADR must state it rather than leave it implied. Note this is known
   browser behaviour, not something measured in this effort.
2. **The JS→TS seam is unguarded by choice.** `@fractality/core` stays JavaScript and the payload
   types are hand-written, with no assertion functions, schema validation or fixture tests standing
   between them. Drift will be caught by review, not by tooling. Accepted on the understanding that
   the full TypeScript conversion is the real fix and the published types in `@fractality/web` are
   the contract in the meantime.
3. **The per-navigation win costs a second fetch.** Opening a component fetches the core payload
   plus whichever panel is open. Cheap and parallel, but it is two round trips where there was one.

## Handoffs

**To [ticket 06](06-decide-third-party-theme-migration.md) — four capabilities die with no
equivalent:**

- `render` — doc pages may contain nunjucks template syntax today. Nothing replaces it.
- `information[].format` — a **function** in theme config, evaluated server-side. Functions cannot
  cross a JSON wire; it becomes a declarative format descriptor.
- `theme.addLoadPath()` view overriding (carried from ticket 02).
- `setErrorView` / `redirectView`, which die with `addRoute({ view })`.

**To [ticket 05](05-decide-how-a-theme-ships.md):** the tree payload's base path is deliberately
left to 05's asset-base decision. Do not solve it twice.

**To [ticket 08](08-settle-typescript-toolchain.md):** the contract's `.d.ts` is public API, so the
`types` export condition and the `tsc --noEmit` gate are load-bearing for it, not hygiene.
