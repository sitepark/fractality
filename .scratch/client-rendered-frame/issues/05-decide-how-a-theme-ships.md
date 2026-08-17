# Decide how a theme ships: prebuilt bundle, or built in the consumer's project

Part of [the map](../map.md)

Type: grilling
Status: resolved
Blocked by: 03

> **Rewritten 2026-08-17** for the CSR reversal, and **substantially narrowed.** This was flagged at
> charting as the sneakily large ticket, and most of that size came from SSG: a theme had to ship an
> SSR bundle _and_ a client bundle, and the consumer's `fractality build` had to load and drive the
> SSR bundle to prerender every route. None of that exists any more. A theme now ships a client
> bundle plus a shell HTML file — which is, to a first approximation, **what mandelbrot already does
> today** (`prepack` runs `vite build`; output served via `theme.addStatic(..., '/themes/mandelbrot')`
> at `packages/mandelbrot/src/theme.js:130`). Ticket 02's dependency is dropped: it was needed to
> establish whether the SSR half was possible, and there is no SSR half.

## Question

Decide between:

- **(a) Prebuilt.** The theme ships a client bundle and a shell; `fractality build` copies the shell
  across the route table and emits the payloads. Vite never runs in the consumer's project. Fast
  installs, no toolchain leakage — but theme config (skins, panels, nav sections, labels) must be
  entirely runtime data, never build-time.
- **(b) Built in the consumer's project.** `fractality build` runs Vite over the theme's source.
  User config compiles in, custom panels are real components — at the cost of putting Vite, React
  and a compile step into every consumer's build.
- **(c) Hybrid.** Prebuilt by default; a consumer opts into a local build when they need
  compiled-in customisation.

**(a) is now the presumption, not one of three equals.** It is what mandelbrot does today, it is
what Storybook's prebuilt manager does, and CSR removed the thing that made it hard. This ticket's
real job is to establish whether the extension points below can be served by runtime data — and if
any genuinely cannot, whether that is worth (c).

## The four things that decide it

1. **Panels and nav sections.** `theme.get('panels')` and `theme.get('nav')` are arrays of partial
   names resolved at render time. Under (a) these must become component registrations against a
   registry the prebuilt bundle exposes, rather than template includes. Is that expressible, and
   what does a theme author's code look like? This is the load-bearing one.
2. **Custom skins.** Skins are user-selectable strings resolved to prebuilt CSS URLs
   (`packages/mandelbrot/src/theme.js:80-97`), and ADR 0004 documents a Rollup dedup hazard in how
   they are compiled. Ticket 02 found this narrower than it looked at charting — mandelbrot's
   `files` array never shipped `assets/`, so custom skins do not regress. Confirm and move on.
3. **`base: './'` versus the per-route shell copies — the new problem, and the sharp one.**
   Ticket 02 established that `base: './'` is **mandatory** or the runtime-configurable
   `static.mount` (`src/theme.js:24-26`) breaks: default `base: '/'` bakes `url(/css/…)` into built
   CSS. But CSR now copies the shell to paths at differing depths — `dist/index.html` and
   `dist/components/detail/button.html` — and a relative asset URL cannot be correct at both unless
   the copies stop being byte-identical. Something has to give. The candidates: root-absolute URLs
   computed against a known `static.mount` at build time (kills `base: './'` and the copies stay
   identical), a `<base href>` written per copy (copies vary, minimally), or depth-adjusted URLs per
   copy (copies vary, more). **Decide this here** — it is the one place where the CSR reversal
   created work rather than removing it, and neither research ticket covers it because neither knew
   about the copies.
4. **No Frame HMR in a consumer's project.** Flagged independently by tickets 02 and 03 — treat the
   corroboration as significant. Under (a) the theme lives in the consumer's `node_modules`, and
   Vite's watcher ignore list is hardcoded and unwatchable there, so Vite's dev server transforms
   almost nothing in a consumer's project and middleware mode's value there narrows to "we get a
   WebSocket". Frame HMR stays real only for theme development in this repo. Ticket 02 argues this
   is the right trade (consumers edit patterns, not Frame components; Storybook makes the same
   call). **This ticket owns that call.** If it goes the other way, (a) dies for dev mode and only
   (c) survives.

**TypeScript is not a factor in this decision** (map, 2026-08-17) — worth saying so explicitly so it
does not get relitigated here. A theme's Frame code is `.ts`/`.tsx` compiled by Vite into the same
bundle it already produces, so what ships is unchanged: JavaScript and CSS, no types, no source. The
only interaction is that a theme author now _consumes_ `@fractality/web`'s published contract types
while writing their theme — which is ticket 04's surface and ticket 08's mechanics, not this
ticket's.

Also worth stating explicitly since the map fixes it: does (a) force the Frame's React version on
every consumer? Under bundled-not-peered the answer should be no — the consumer never resolves the
Frame's React — but say it out loud, because it is exactly the property that keeps
`@fractality/react`'s `>= 18.0.0 < 20` peer range honest.

## Answer

**(a) Prebuilt.** Settled 2026-08-17 in a three-round grilling. The theme ships a client bundle and a
shell; `fractality build` copies the shell across the route table and emits the payloads; Vite never
runs in the consumer's project.

### Extension points

**Panels and nav sections stay extensible, through a defined plugin API** — not through
`theme.addLoadPath()`, which dies to the hard cutover regardless. The API itself is **deferred** to
[ticket 09](09-design-the-plugin-api.md) and does **not** block the ADR or the spec: the packaging
decision only needs to know that plugins load at **runtime as ES modules** rather than being bundled
in, which is what keeps option (a) intact.

One constraint falls out of the map's bundled-not-peered rule and is recorded here so ticket 09 does
not rediscover it: **a plugin cannot `import React` and get the Frame's copy.** There is no shared
module to resolve against — the Frame's React lives inside the theme's bundle. The Frame must
therefore _hand_ plugins their React, and a small component/hook surface with it, at registration
time. Plugins inherit React 19 as a consequence, with no say in it.

### Skins: removed

Named skins go — the 17 files under `assets/scss/skins/`, `config.skin.name`, the skin-keyed Vite
inputs, and ADR 0004's dedup hack along with them.

**Custom-property theming stays, and it already exists.**
`views/partials/stylesheets.nunj:1-10` emits an inline `:root` block from
`skin: { accent, complement, links }` — `config.skin` has always accepted an object as well as a
string (`src/theme.js:80-87`). So anyone on a _named_ skin loses it, but the escape hatch is already
shipped, which makes the migration story much better than it first looked. Values resolve to `rgb`
at **site build** and are written into the shell, so this stays global config and byte-identical
shells survive.

⚠️ **Open naming question, deliberately left rather than buried:** the config key stays `skin`, which
will name a concept that no longer exists. Renaming it to something like `theming` is cheap now and
expensive later. Not blocking anything; decide it during the rewrite.

**Scope note:** removing skins sits in the mandelbrot rewrite's territory, which the map puts out of
scope for this effort. It is recorded here as a constraint the rewrite **inherits**, not as work this
effort performs. It settles ticket 05 by deleting the question rather than answering it.

### Assets, `base`, and the shell-depth problem

The tension neither research ticket could see, because neither knew the shells would be copied.
Resolved by splitting the two cases:

- **Asset → asset** references (`url(./img/x.png)` inside built CSS) keep `base: './'`, exactly as
  ticket 02 measured. These resolve against the stylesheet's own URL and are correct at any mount.
- **Shell → asset** references (`<link>`, `<script>`) are written **root-absolute from the
  consumer's configured `static.mount`**, baked in at _site_ build time by `@fractality/web` — not at
  theme build time. They must resolve before any JavaScript runs, so nothing clever is available.

Shells stay byte-identical because the mount is global rather than per-route, and the mount stays
runtime-configurable because it resolves in the consumer's project. **The cost is a real
regression:** `dist/` must be served at the path it was configured for, where today's relativised
per-page URLs let it be relocated freely. Ticket 06 must say so plainly.

### `window.frctl` carries the global config

Everything the shell needs before JavaScript runs, serialised at site build into the block the shell
already has today: the **theme asset mount**, the **site root** (a second, distinct base — the tree
payload is site data and does not belong under `themes/mandelbrot/`), **i18n label overrides**, and
the **theming custom properties**. All global, none per-route, so byte-identical shells hold.

**i18n labels** (handed over by ticket 04, which established they are theme config and so never enter
the payload contract): defaults compile into the theme's bundle — they are the theme's own strings —
and a consumer's overrides ride in `window.frctl`. No extra fetch.

### Accepted costs

- **No Frame HMR in a consumer's project.** Corroborated independently by tickets 02 and 03:
  `node_modules` is unwatchable, so a consumer's dev server transforms almost nothing and middleware
  mode's value there narrows to the WebSocket. Frame HMR stays real for theme development in this
  repo. Consumers edit patterns, not Frame components, and pattern changes still reload the Preview
  via ticket 03's namespaced event.
- **`dist/` is no longer relocatable** after building (above).

### The React question, answered out loud

**(a) does not force the Frame's React on consumers.** Bundled-not-peered means React 19 lives inside
the theme's `dist` and is never resolved by the consumer's package manager; their `node_modules`
never gains it. A user pinning React 18 for their patterns is unaffected — that copy runs in the
Preview iframe. This is the property keeping `@fractality/react`'s `>= 18.0.0 < 20` peer range
honest. The single exception is plugins, which are handed React 19 by the Frame.

## Correction issued to ticket 04

Ticket 04 placed `hexToRgb` client-side with the other presentation filters. **That is wrong** — it
feeds the `:root` custom-property block in the shell's `<head>`, which must exist before any
JavaScript runs. It belongs at **site build time**, when the shell is written. The other five
client-side filters are unaffected; they all feed panels. Ticket 04 has been corrected.
