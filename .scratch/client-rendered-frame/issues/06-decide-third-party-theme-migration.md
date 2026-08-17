# Decide the migration path for third-party themes

Part of [the map](../map.md)

Type: grilling
Status: resolved
Blocked by: 04, 05

> **Reviewed 2026-08-17 against the CSR reversal — unchanged.** What breaks, breaks to the hard
> cutover, and the hard cutover is orthogonal to whether the Frame is prerendered or client-rendered.
> The removed-API list below is the same either way. Two things to carry in when writing it: CSR
> makes **"no JS, no Frame"** a supported-behaviour change a theme author must be told about, and
> ticket 05's decision on panels/nav turns `theme.get('panels')` from an array of partial names into
> component registrations — which belongs on the list in item 1.
>
> **TypeScript adds one line to the guide and no breakage** (map, 2026-08-17). `@fractality/web`
> moves its entrypoint from `src/` to a compiled `dist/`, but the 2026-08-14 audit added an
> `exports` map to every package, so deep imports into internals were already closed off and no
> consumer can be resolving `@fractality/web/src/...` today. The move is therefore invisible.
> What a theme author _gains_ is published contract types — so the guide should tell them the types
> exist and where, rather than warning them about anything. Write themes in JS or TS: their choice,
> and say so, since the Frame being TS could easily be misread as a requirement on them.

## Question

The map fixes a **hard cutover**: `@fractality/web` drops view-based server rendering at the major,
with no dual rendering path — because maintaining two rendering models is exactly the cost already
being paid for the server/static split at
`packages/mandelbrot/assets/js/mandelbrot.js:24`. Migration is therefore documentation plus
mandelbrot as a worked reference, and this ticket decides what that actually consists of.

Settle:

> **Inputs from ticket 04 (resolved 2026-08-17) — four capabilities that die with no equivalent.**
> These are not "changed API", they are losses, and item 1's list must carry them as such:
>
> - **`render`** — doc pages may contain nunjucks template syntax today. Nothing replaces it; docs
>   become plain Markdown. This is the one most likely to be in real-world use.
> - **`information[].format`** — a **function** in theme config, evaluated server-side. Functions
>   cannot cross a JSON wire, so it becomes a declarative format descriptor. Any theme setting a
>   custom `information` entry is affected.
> - **`theme.addLoadPath()` view overriding** — carried from ticket 02.
> - **`setErrorView` / `redirectView`** — die with `addRoute({ view })`.
>
> Also from ticket 04, for item 4's scope-of-promise: **`file://` is no longer supported.** Today's
> static build can be opened directly from disk; a client-rendered Frame cannot, because browsers
> give `file://` pages an opaque origin and block every fetch. Anyone shipping a `dist/` for
> colleagues to open locally is affected and needs telling explicitly.
>
> **Inputs from ticket 05 (resolved 2026-08-17) — three more, and these hit ordinary users rather
> than theme authors, so they need plainer language than the API list above:**
>
> - **Named skins are removed.** `skin: 'blue'` and the other 16 stop working. The replacement
>   already exists and is worth leading with rather than burying: `skin: { accent, complement,
links }` has always been accepted and emits custom properties. Anyone who picked a named skin
>   for its colours can express that directly. Anyone who wanted arbitrary CSS still has
>   `styles`/`stylesheet`.
> - **`dist/` is no longer relocatable after building.** The shell's asset links become
>   root-absolute from the configured `static.mount`, where today they are relativised per page. Move
>   the output and it breaks. This one will bite silently — the build succeeds and the site looks
>   broken only once served from somewhere else — so it deserves prominence disproportionate to its
>   size.
> - **Custom panels and nav sections need the plugin API** ([ticket 09](09-design-the-plugin-api.md)),
>   which is deferred. Between the cutover and that API landing, consumers can select and reorder
>   built-in panels but cannot add new ones. Item 2's mapping should say that honestly rather than
>   pointing at an API that does not exist yet — and item 1's `addLoadPath()` entry should point
>   here instead of flatly saying "no equivalent", since one is planned.

1. **What breaks, enumerated.** The precise list of removed `@fractality/web` API:
   `theme.addRoute({ view })`, `setErrorView`, `redirectView`, the nunjucks engine and its filters
   and globals, `request.isPjax`. A theme author must be able to read one list and know their
   position. Ticket 02 identified one to add: **`theme.addLoadPath()` view overriding dies** — and
   it dies to the hard cutover, not to whatever ticket 05 decides about packaging, so it is this
   ticket's to handle.
2. **The mapping.** For each removed capability, its replacement under the new contract — or an
   honest "no equivalent, here is what to do instead."
3. **Version and range mechanics.** New major for `@fractality/web`. What happens to
   mandelbrot's `peerDependencies` (`@fractality/web: ">= 0.3 < 1"`), and what `@fractality/fractality`
   does when it meets a theme built for the old contract. Does it fail loudly with a useful
   message, or mysteriously?
4. **Scope of the promise.** Is the old major supported at all after cutover, or is it frozen?
   Say so explicitly rather than leaving it implied.
5. **Where the guide lives.** `MIGRATION.md` exists at the root and already carries the fractal →
   fractality story. Extend it, or a separate document per major?

This is the ticket that turns "breaking major" from a decision into something a theme author can
act on.

## Answer

Settled 2026-08-17 in a two-round grilling, on top of the enumerated inputs from tickets 02, 04, 05
and 08 above.

### Version and range mechanics

**`@fractality/web` publishes 1.0.0**, not 0.4.0.

This is not cosmetic. The package is at **0.3.3** today and mandelbrot peers it as `">= 0.3 < 1"`.
Under semver a 0.x minor is already permitted to break, so 0.4.0 would be _technically_ correct — and
would still satisfy that range, meaning an old theme installs cleanly against a new incompatible
`web` and fails at runtime. Crossing to 1.0.0 makes the existing peer range reject the pairing.
A package now shipping a documented, versioned public contract also has no business still claiming
0.x instability.

Mandelbrot's peer becomes `">= 1 < 2"`.

**Precision on how loud that failure actually is:** npm errors on an unsatisfied peer (`ERESOLVE`);
**pnpm only warns** unless `strict-peer-dependencies` is set. So the range buys a hard stop on npm
and a visible warning on pnpm — not a guaranteed stop everywhere. That gap is exactly why the
runtime check below is not optional.

### The runtime check

**`@fractality/web` crashes at theme registration** — `fractality.web.theme(...)` — on a contract
version it does not support, before anything renders. Ticket 04 fixed the `contractVersion` field;
this fixes when it is read.

Two distinct diagnostics, not one:

- **Mismatch** — the theme declares a version this `web` does not support. Name both versions and
  link the guide.
- **Absent** — the theme declares no `contractVersion` at all. This is _every existing third-party
  theme_, so it is the message most people will actually see, and it deserves its own wording
  ("this theme targets Fractality 0.x") rather than being folded into a generic mismatch.

### Scope of the promise

**0.3.x is frozen, not supported.** No backports, no security fixes, no dual maintenance. That is
the point of a hard cutover, and implying otherwise commits to work nobody intends to do. State it
in those words in the release notes and the guide.

### Where the guide lives

**A separate document per major.** `MIGRATION.md` becomes a short index pointing at both.

`MIGRATION.md` today is the **`@frctl/fractal` → `@fractality/*`** guide, and it stays that for the
readers still working through it. The new document covers **fractality 0.x → 1.0**, a second and
entirely unrelated migration. Folding them together would interleave two migrations and leave
readers unsure which applies to them.

### Structure of the new document — ordinary users first

The ticket is titled "third-party theme migration", but ticket 05 added breakage that hits people
who **never wrote a theme**. Those readers will not open a document about `addRoute` and
`setErrorView`, so the guide leads with them:

1. **"If you just use Fractality"** — short. Named skins removed (and the custom-property
   replacement, which already exists, so lead with the fix rather than the loss). `dist/` is no
   longer relocatable after building. `file://` no longer works.
2. **"If you wrote a theme"** — the full API table below.

Burying three user-facing regressions inside a theme-authoring document is how they get discovered
in production.

### The removed surface, enumerated

Larger than the running list had it — two of these are **disappearing export names**, not just
methods.

| Removed                                        | Replacement                                                                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Engine` (exported from `src/index.js`)        | none — the nunjucks engine goes entirely                                                                                                                         |
| `AsyncNunjucksEnvironment` (exported)          | none                                                                                                                                                             |
| `Theme#addLoadPath()`                          | none today; the deferred plugin API ([ticket 09](09-design-the-plugin-api.md)) is the intended successor — point there rather than saying "no equivalent" flatly |
| `Theme#setErrorView()`                         | none                                                                                                                                                             |
| `Theme#setRedirectView()`                      | none                                                                                                                                                             |
| `addRoute(url, { view })`                      | `addRoute` survives **minus `view`**; resolvers unchanged                                                                                                        |
| `render` filter (template syntax in doc pages) | none — docs become plain Markdown                                                                                                                                |
| `information[].format` (a **function**)        | a declarative format descriptor; functions cannot cross a JSON wire                                                                                              |
| `request.isPjax`                               | none                                                                                                                                                             |
| Named skins (`skin: 'blue'`)                   | `skin: { accent, complement, links }`, which already works today                                                                                                 |

**Surviving unchanged:** `Theme#addStatic()`, `Theme#addResolver()`, `Theme#resolvers()`, `Builder`,
`Server`, `Theme`, `Web`, `WebError`.

### Behavioural changes with no API to point at

These break nothing at compile or install time and are the ones most likely to be discovered the
hard way:

- **`file://` no longer works.** Today's static build opens from disk; a client-rendered Frame cannot,
  because browsers give `file://` pages an opaque origin and block every fetch.
- **`dist/` must be served where it was configured for.** The shell's asset links become
  root-absolute from `static.mount`, where today they are relativised per page. The build succeeds
  and the site looks broken only once served from elsewhere.
- **No Frame HMR in a consumer's project.** Pattern changes still reload the Preview.
- **Custom panels are unavailable** between the cutover and ticket 09 landing. Built-in panels can
  still be selected and reordered through config.

### Not a break

The entrypoint move from `src/` to `dist/` (ticket 08) is **invisible**: the 2026-08-14 audit added
`exports` maps to all 8 packages, so no consumer can be deep-importing `@fractality/web/src/...`
today. Worth saying in the guide precisely because it looks alarming in a changelog.
