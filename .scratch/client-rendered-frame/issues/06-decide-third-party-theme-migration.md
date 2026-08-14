# Decide the migration path for third-party themes

Part of [the map](../map.md)

Type: grilling
Status: open
Blocked by: 04, 05

## Question

The map fixes a **hard cutover**: `@fractality/web` drops view-based server rendering at the major,
with no dual rendering path — because maintaining two rendering models is exactly the cost already
being paid for the server/static split at
`packages/mandelbrot/assets/js/mandelbrot.js:24`. Migration is therefore documentation plus
mandelbrot as a worked reference, and this ticket decides what that actually consists of.

Settle:

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
