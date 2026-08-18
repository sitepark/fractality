# Implementation spec: the client-rendered Frame

Status: **implemented on `next-major`** (2026-08-18), except where noted in §11. Target release: the
next major of `@fractality/web` (1.0.0).

Decisions behind this document: [ADR 0005](../adr/0005-client-render-the-frame.md) (rendering model)
and [ADR 0006](../adr/0006-compile-and-publish-web-from-typescript.md) (TypeScript and the build
step). The reasoning, alternatives and measurements live in `.scratch/client-rendered-frame/`; this
document is the settled result and should be implementable without reading that tracker.

Vocabulary is defined in [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) and the per-package `CONTEXT.md`
files. Terms used here in their glossary sense: **Frame**, **Shell HTML**, **Pen**, **Preview**,
**Browser**, **Panel**, **Adapter**, **Handle**, **tree payload**, **entity payload**, **panel
payload**, **ext slot**.

---

## 1. Scope

**In scope.** `@fractality/web`'s rendering model, its public data contract, its dev server and
static builder, and its packaging as a TypeScript package.

**Out of scope when written, since done.** Mandelbrot's view-by-view rewrite into React components
(~30 `.nunj` files, plus Pen, Browser, resizable panels, tree and search) was a separate effort that
started from this document and has since landed: the `.nunj` views, `assets/js/` and jQuery are all
deleted. Removing jQuery falls out of that rewrite. The template adapters
(nunjucks/handlebars/twig/react) are unchanged — they keep rendering the user's patterns exactly as
they do now, behind the Preview iframe.

**Deferred.** The plugin API for third-party panels and nav sections. This spec fixes only two of
its properties (§7.2); the rest is deliberately unspecified.

---

## 2. The rendering model

The Frame is a client-side React application. It renders from JSON payloads and is never
server-rendered or prerendered — there is no SSR bundle, no hydration, and no `react-dom/static`.

Both modes converge on this one model. Today client-side Frame persistence exists only in server
mode, gated at `packages/mandelbrot/assets/js/mandelbrot.js:24` (`if (frctl.env == 'server')`), and
static builds get none of it. That split goes away.

The user's patterns are rendered by the Adapters into the **Preview** iframe, exactly as today. The
Frame's React and the user's React never meet: the Frame's copy is bundled into the theme and
**never peered**, so a user pinning React 18 for their patterns cannot collide with the Frame's 19.

### 2.1 Deep links

`fractality build` writes the **same Shell HTML at every path in the route table** —
`dist/components/detail/button.html` and friends keep existing, byte-identical to one another. This
is a file copy, not a render pass.

- URLs are unchanged from today; existing bookmarks survive.
- Works on any static HTTP server with no configuration.
- Measured cost: 998 bytes × 3797 routes = 3.61 MB, 10.7% of the new build's total.

`document.title` is set client-side on route resolve. Nothing else varies per copy — keeping the
copies byte-identical is a property worth defending.

### 2.2 What is not supported

- **`file://`.** Browsers give such pages an opaque `null` origin, so CORS rejects every `fetch`,
  relative or absolute. The Shell loads and then fails to populate. This is a regression against
  today's build and must be documented as one.
- **No-JS.** There is no Frame without scripting. The Shell carries a `<noscript>` saying so.

---

## 3. The data contract

Owned and versioned by `@fractality/web`. Published as TypeScript declarations, which makes the
types themselves part of the contract (§8.4).

### 3.1 Tree payload

One payload for the whole library, three roots (components, docs, assets), fetched once and cached.

Per node: `handle`, `label`, `status` **as a key into a small table**, `tags` when non-empty,
children nesting, and the collection/root flags.

**There is no `id` field.** It was measured at **77% of the gzipped tree payload** — a 32-character
hex hash, incompressible by construction, while handles and labels share prefixes and compress well.
`handle` already uniquely identifies every entity and already carries every URL and `data-*`
attribute. Dropping it took the payload from 96.7 K to 22.6 K gzipped.

Measured at 3810 nodes: **209 K raw / 22.6 K gzipped / 16.3 K brotli.** Lazy subtree loading was
considered and is **not needed** at this scale.

> **Amended during implementation (2026-08-17).** Two things this section did not anticipate,
> both found by driving the builders against a real library:
>
> - **Status keys are namespaced by root** — `components:ready`, not `ready`. Components and docs
>   carry separate, independently configurable status sets that share key names. The shipped
>   defaults agree on label and colour and differ only in `description`, which the contract does not
>   carry, so a flat table looks harmless right up until a project configures one set differently
>   and the other silently inherits it. Lookups are scoped to a root as well, so status resolution
>   cannot match across sets. Note a resolved status carries **no key at all** — the entity holds
>   the value while the key exists only in config, so the table is built from config and entities
>   are matched back to it.
> - **`tags` needs sanitising.** Core resolves an untagged component's tags to `[null]`, not `[]`.
>   This is long-standing rather than new: mandelbrot's navigation macro works around the same thing
>   in the template layer with `item.tags | dump | replace("null,", "")`, a workaround with nowhere
>   to live once the tree is data. Non-string entries are dropped and the field is omitted entirely
>   when nothing survives.

### 3.2 Entity payload and panel payloads

Granularity is **per Component**, with variants inlined — the Pen's variant switcher is local state,
not navigation. The payload is then split **by Panel**:

| File                                | Contents                                                            | Fetched                      |
| ----------------------------------- | ------------------------------------------------------------------- | ---------------------------- |
| `<handle>.json`                     | identity, variant list, preview URLs, `references` / `referencedBy` | every navigation (~470 B)    |
| `<handle>.notes.json`               | raw Markdown notes, component and per-variant                       | when the Notes panel opens   |
| `<handle>.context.json`             | context objects, component and per-variant                          | when the Context panel opens |
| `<handle>.view.json`                | view source per variant                                             | when the View panel opens    |
| `<handle>.ext.<theme>.<panel>.json` | theme-contributed panel data                                        | when that panel opens        |

**The rule is general: each Panel's data is its own payload.** A theme's custom Panel loads its data
exactly the way a built-in Panel does.

> **Amended during implementation (2026-08-17).** The detail route resolves for **variant** handles
> as well as component ones, so a Shell can land on `/components/detail/button--variant-1.html` —
> and §4.1's rule derives the payload path from that location. Granularity is still per component,
> but the **core payload is emitted under every handle that routes to it**, so the derivation always
> hits a real file. Panel payloads are _not_ duplicated: they are the bulk, and the client addresses
> them using the core payload's `handle`, which is always the component's.
>
> The alternative was having the client strip a `--variant` suffix, trading duplication for handle
> parsing in the browser. Measured at the real library's ratio (3797 handles across 1365 components)
> the duplication costs **~1.1 MB of a ~33.7 MB build**, and every copy is byte-identical.

Measured distribution that drove this: `notes` 42.9%, view source 30.9%, `context` 22.2%, identity
and references 3.9%. Splitting only `context` would have left 78% of the weight in the
every-navigation fetch. Total bytes on disk are unchanged (~17 MB at 1365 components); what changes
is that navigation costs ~470 B instead of ~12 KB.

Shared view content stays **duplicated** across variants rather than hoisted and referenced —
measured at 27.9% raw but only **2.0% gzipped**, so it does not earn the indirection.

### 3.3 Values

All payload values are **JSON-serialisable**. Raw values only — ISO 8601 timestamps, byte counts,
paths — with formatting done client-side. Anything requiring a function to express has no place in
the contract (see `information[].format` in §9).

### 3.4 Versioning

An integer `contractVersion` at the root of the tree payload and each entity payload.

- **Breaking:** removing or renaming a field, narrowing a type, changing semantics.
- **Not breaking:** adding an optional field.
- **Type-level changes count as breaking on the same footing as runtime ones** — shipping `.d.ts`
  means narrowing `string` to a union breaks a theme author's compile with an unchanged payload.
- The **ext slot is outside the guarantee**.

`@fractality/web` reads the version at theme registration and crashes (§9.3).

### 3.5 Extensibility

Build-time contributor hooks under a namespace. A theme registers a function that runs per entity;
its return value lands at `ext: { <themeName>: … }`, addressed as `<handle>.ext.<theme>.<panel>.json`.
Hooks run in Node during the build, so they have the filesystem access a custom Panel usually needs.

In TypeScript the core contract types `ext` as `Record<string, unknown>`; a theme narrows its own
slot.

---

## 4. On-disk layout and addressing

Payloads are **siblings of the route they back**:

```
dist/
  index.html                              ← Shell HTML
  components/detail/button.html           ← byte-identical Shell copy
  components/detail/button.json           ← entity payload
  components/detail/button.notes.json     ← panel payload
  components/detail/button.context.json
  components/detail/button.view.json
  components/preview/button.html          ← engine-rendered, unchanged
  components/render/button.html           ← engine-rendered, unchanged
  themes/mandelbrot/…                     ← theme assets at static.mount
```

### 4.1 The derivation rule

The client derives a payload URL **from its own location**: strip a trailing `.html` if present,
then append the panel segment and `.json`.

This is one rule, identical in dev and static, correct at any `static.mount`, and requiring no server
configuration. It absorbs the fact that the two modes do **not** share URLs — dev serves
`/components/detail/button`, the static build emits `button.html`.

Emitting `detail/button/index.html` for identical clean URLs in both modes was rejected: it changes
today's URLs and breaks existing bookmarks.

### 4.2 The two bases

The tree payload is global, so it cannot be derived from a page's own location. Two base values are
resolved at **site build** and written into the Shell's `window.frctl` block:

- **theme asset mount** — where the theme's JS/CSS live (`static.mount`, default
  `themes/mandelbrot`).
- **site root** — where site data lives. Distinct from the above: the tree payload is site data and
  does **not** belong under `themes/mandelbrot/`.

Entity and panel payloads need neither.

---

## 5. The build

Two passes, one command.

1. **Frame build** (theme side, at theme publish time — see §7). Vite builds the client bundle and
   the Shell HTML. `base: './'` so asset→asset references resolve against the stylesheet's own URL
   and are correct at any mount.
2. **Site build** (`fractality build`, in the consumer's project). Walks the route table and:
    - copies the Shell to every route path, rewriting its `<link>`/`<script>` to be **root-absolute
      from the configured `static.mount`** and injecting `window.frctl` (§6);
    - emits the tree payload, entity payloads and panel payloads;
    - renders Previews per Component through the Adapters — the user's templates are not Vite
      modules and never enter its graph;
    - copies theme static assets.

Filesystem-bound work resolves here: `getPreviewContent()`, file reads, file sizes and mtimes.

> **Amended during implementation (2026-08-18).** The Shell's asset prefix is derived from **where
> the Shell sits inside a static mount**, not from the mount itself. mandelbrot mounts `dist/` at
> `/themes/mandelbrot` but builds its Frame into `dist/frame/`, so using the mount alone produced
> `/themes/mandelbrot/assets/…` for files served from `/themes/mandelbrot/frame/assets/…` — a build
> that succeeds, looks correct, and 404s every asset. Only running the real CLI surfaced it; the
> fixture tests had the Shell at the mount root, where the two coincide.
>
> **Amended during implementation (2026-08-17).** Preview rendering needs **no theme view**, which
> was not obvious from this section. `entity.render(…, { preview: true })` wraps the pattern in the
> _user's_ own `@preview` layout, not in anything the theme supplies — today's `render.nunj` only
> adds error handling around it. So both documents are the Adapter's output written straight to
> disk, and dropping the engine costs nothing here.
>
> Two consequences that had to be decided rather than inherited:
>
> - **The error document becomes `@fractality/web`'s.** A pattern failing to render is ordinary
>   during development and must not abort the build or leave a blank iframe; today the theme renders
>   it through a nunjucks error macro. With the engine gone the package owns it, and it stays
>   deliberately plain — it is the only markup `@fractality/web` generates and it belongs to no
>   theme. The message comes from a user template, so it is escaped.
> - **Errors are collected, not thrown.** One broken pattern must not take down a build of
>   thousands; `buildStatic` returns them for the caller to report.
>
> A variant handle renders **that variant**, not its component — rendering the component would
> silently emit the default variant under every variant URL.

**`dist/` is not relocatable after building.** The Shell's asset links are root-absolute from the
configured mount, where today they are relativised per page. This is a regression; §9 covers it.

---

## 6. `window.frctl`

Everything the Shell needs before JavaScript runs, serialised at site build. All values are global
rather than per-route, which is what keeps the Shell copies byte-identical.

- theme asset mount, site root (§4.2)
- i18n label overrides — theme defaults compile into the theme bundle, since they are the theme's own
  strings; only a consumer's overrides ride here
- theming custom properties (§7.3)
- the `panels` list — which Browser panels to show, in order (§7.2). Passed through uninterpreted:
  what a panel name means, and what to do with one the theme has no panel for, is the theme's call
- `env`

---

## 7. Packaging

### 7.1 The theme ships prebuilt

A theme ships a client bundle and a Shell. **Vite never runs in the consumer's project.** This is
proven, not assumed: a theme-side build with `ssr.noExternal: true` was driven from a consumer
directory containing no `node_modules` at all.

Consequence, accepted: **a consumer gets no Frame HMR.** Vite's watcher ignore list makes
`node_modules` unwatchable, so in a consumer's project the dev server transforms almost nothing and
middleware mode's value narrows to the WebSocket. Frame HMR remains real for theme development in
this repo. Consumers edit patterns, and pattern changes still reload the Preview (§8.2).

### 7.2 Plugins

Panels and nav sections stay extensible through a plugin API whose design is **deferred**. Two
properties are fixed here because the packaging decision depends on them:

- **Plugins load at runtime as ES modules**, never bundled in — bundling would put a compile step
  into every consumer's build.
- **The Frame hands plugins their React**, plus a small component/hook surface, at registration.
  A plugin cannot `import React` and get the Frame's copy: it is bundled and not peered, so there is
  no shared module to resolve against. Plugins therefore inherit React 19 with no say in it.

Until that API lands, consumers can select and reorder **built-in** Panels through config — pure
runtime data — but cannot add new ones.

### 7.3 Theming

**Named skins are removed** — the 17 files under `assets/scss/skins/`, `config.skin.name`, the
skin-keyed Vite inputs, and with them the subject of ADR 0004.

Custom-property theming replaces them and **already exists**:
`views/partials/stylesheets.nunj` emits an inline `:root` block from `skin: { accent, complement,
links }`, and `config.skin` has always accepted an object as well as a string. Values resolve to
`rgb` at **site build** and are written into the Shell.

> Open naming question: the config key remains `skin` while naming a concept that no longer exists.
> Renaming it is cheap now and expensive later. Not blocking.

---

## 8. The dev server

Vite in **middleware mode** inside a thin Express host. browser-sync and most chokidar wiring in
`packages/web/src/server.js` go away.

### 8.1 Composition — order is load-bearing

`appType: 'custom'`, which drops Vite's HTML-fallback and 404 middlewares so Vite never terminates a
request it does not recognise.

1. Engine routes (`/components/preview/:handle`, `/components/render/:handle`) — **before**
   `vite.middlewares`
2. JSON payload routes — **before** the Frame catch-all
3. `app.use(vite.middlewares)`
4. Frame catch-all — **after** everything

`'*path'` matches `/@vite/client`, so today's catch-all at `server.js:288` would swallow HMR whole
if left where it is.

**`transformIndexHtml` is called on the Frame's Shell HTML and never on the Preview's.** That single
rule is what keeps the user's patterns out of Vite's module graph.

The live-reload subscription is injected into Preview documents only, never into render documents.
A Preview can be opened as a window of its own and needs to hear about rebuilds; a render document
is the component's bare markup, which the Browser's HTML panel reads as _data_ and shows to the user
as their own output — a script in there would look like something they wrote.

Pass the host's own `http.Server` as `server.ws.server`, or middleware mode opens a second HTTP
server on port 24678.

### 8.2 Watching and reload

Two watchers, permanently: `Source#watch()` rebuilds the tree and has no Vite equivalent, and Vite
ignores `**/node_modules/**` unconditionally.

When a pattern changes, the Frame is told over a **server-sent events stream** off core's
post-rebuild `source:updated`; it drops its payload cache, refetches what it is showing, and remounts
the Preview iframe. The Frame itself is never reloaded, so open panels, scroll position and tree
expansion survive an edit.

> **Amended during implementation (2026-08-18).** This section specified a namespaced custom **HMR**
> event. That cannot work under the packaging decision: `import.meta.hot` exists only inside modules
> Vite has transformed, and §7.1 makes the Frame a prebuilt static asset that never enters the
> consumer's Vite graph. Server-sent events need nothing from the bundler, behave identically in a
> consumer's project and in this repo, and reconnect on their own.
>
> Two things also had to change for any of it to fire: the dev server now calls `app.watch()`, which
> the rewrite had dropped, and `web.server.watch` now **defaults to true**. It defaulted to false
> because reloading was browser-sync's job and watching without it achieved nothing — but with the
> Frame subscribing to rebuilds, a dev server that does not watch cannot tell it anything. Frame state survives
> by construction because the parent never navigates. This is strictly better than today, where
> browser-sync reloads both.

### 8.3 Request gating

ADR 0001 gates requests on in-progress source rebuilds, and middleware mode does not affect it. The
real risk is the refactor: one catch-all becomes many routes, so **`gateOnIdle` must become a shared
middleware applied to every tree-reading route, including the new JSON endpoints.** Missing it there
breaks the guarantee silently for data requests.

### 8.4 Symmetry

In dev the payloads come from Express JSON routes; in a static build they are files. The client must
not be able to tell. The §4.1 derivation rule is what makes both work.

---

## 9. What is removed

### 9.1 API

| Removed                                        | Replacement                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `Engine` (exported from `src/index.js`)        | none — the nunjucks engine goes entirely                             |
| `AsyncNunjucksEnvironment` (exported)          | none                                                                 |
| `Theme#addLoadPath()`                          | none today; the deferred plugin API (§7.2) is the intended successor |
| `Theme#setErrorView()`                         | none                                                                 |
| `Theme#setRedirectView()`                      | none                                                                 |
| `addRoute(url, { view })`                      | `addRoute` survives **minus `view`**; resolvers unchanged            |
| `render` filter (template syntax in doc pages) | none — docs become plain Markdown                                    |
| `information[].format` (a **function**)        | a declarative format descriptor                                      |
| `request.isPjax`                               | none                                                                 |
| Named skins (`skin: 'blue'`)                   | `skin: { accent, complement, links }` (§7.3)                         |

**Surviving unchanged:** `Theme#addStatic()`, `Theme#addResolver()`, `Theme#resolvers()`, `Builder`,
`Server`, `Theme`, `Web`, `WebError`.

### 9.2 Filters

**Build time** (needs the filesystem): `getPreviewContent()`, file reads, sizes, mtimes.

**Site build** (writes the Shell): `hexToRgb` — it feeds the `:root` custom-property block in the
Shell's `<head>`, which must exist before any JavaScript runs.

**Client side:** `highlight`, `linkRefs`, `markdown`, `format`, `fileSize`.

> **Amended during implementation (2026-08-18).** Highlighting used to run
> server-side in `@fractality/core`, where the library's size cost nothing. Moving it
> to the browser puts it on every user who opens a code panel, and this section did
> not cost that: highlight.js's full build is **~307 KB gzipped**, several times the
> rest of the Frame. The Frame therefore registers a curated language set —
> the template languages the adapters cover, plus what component source and config
> are written in — loaded as a dynamic import on first use: **35.8 KB gzipped**,
> with the initial chunk unaffected. Anything outside that set renders as escaped
> plain text, which is a legible panel rather than a failure. "Lazily" was in the
> plan; the size of the thing being loaded lazily was not.

Two couplings drove this and must not be undone:

- **`linkRefs` consumes `highlight`'s output.** `panel-view.nunj:3` pipes
  `getPreviewContent() | async | trim | highlight(…) | linkRefs(entity)`, regex-replacing `@handle`
  in already-highlighted HTML. Deferring highlighting to the client takes `linkRefs` with it; it
  becomes a post-highlight pass driven by the `references` field.
- **`markdown()` already highlights internally.** `packages/core/src/markdown.js:11-18` calls
  `highlighter()` inside its code-block renderer. Keeping Markdown at build time would highlight
  fenced code at build time while the View panel highlighted client-side — two highlighting paths.

**Dies with the engine:** `async`, `isError`, `render`.

### 9.3 Version and compatibility

`@fractality/web` publishes **1.0.0**, not 0.4.0. It sits at 0.3.3 and mandelbrot peers
`">= 0.3 < 1"`, so 0.4.0 would still satisfy that range and let an old theme install against an
incompatible `web` and fail at runtime. 1.0.0 makes the range reject the pairing. Mandelbrot's peer
becomes `">= 1 < 2"`.

That rejection is **hard on npm (`ERESOLVE`) but only a warning on pnpm** unless
`strict-peer-dependencies` is set — which is why the runtime check is not optional.
`@fractality/web` **crashes at theme registration** (`fractality.web.theme(...)`), before anything
renders, with two distinct diagnostics:

- **mismatch** — name both versions, link the guide;
- **absent** — no `contractVersion` at all. This is _every existing third-party theme_, so it is the
  message most people will see and deserves its own wording.

**0.3.x is frozen, not supported.** No backports, no security fixes.

### 9.4 Migration guide

A **separate document per major**; `MIGRATION.md` becomes a short index. It currently carries the
unrelated `@frctl/fractal` → `@fractality/*` story, which stays for the readers still working
through it.

The new document leads with **ordinary users** — named skins, `dist/` placement, `file://` — before
the theme-author API table. Ticket 05's breakage hits people who never wrote a theme and who will
not open a document about `addRoute`.

---

## 10. TypeScript

- **`tsc` alone**, no bundler. Declarations native; per-file output keeps stack traces on real files.
- Root `tsconfig.base.json` with `strict: true`, extended by `packages/web/tsconfig.json`. **Not**
  project references while only one package is TypeScript.
- `module` / `moduleResolution: nodenext`.
- **The `./foo.js` import convention** — relative imports carry the `.js` extension though the file
  is `.ts`. Document this for contributors; it is the most common thing to trip someone new to an
  ESM + TS package.
- **`allowJs` off**, with `@fractality/core` and the adapters excluded explicitly. Turning it on
  pulls core in and walks into the `mixwith` layer the type boundary exists to avoid.
- **Published shape:** `main: dist/index.js`; `exports["."] = { types: "./dist/index.d.ts", default:
"./dist/index.js" }` with **`types` first**, since conditions resolve in order; `files: ["dist", …]`;
  `prepack: tsc`. The `src/` → `dist/` move is invisible to consumers thanks to the existing
  `exports` maps.
- **`sourceMap` with `inlineSources`**, maps in `files`.
- **ESLint:** add `typescript-eslint` and widen `eslint.config.js`'s `files` glob, which is
  `**/*.{js,mjs,cjs,jsx}` — TypeScript added without that change is **silently unlinted**. Scope
  `settings.react.version` per config block (19 for the Frame, the peer floor for the adapter and
  examples); one global value mislints one of them.
- **Gating:** a root `typecheck` script (`tsc --noEmit`) in `validate` and CI, **not** pre-commit —
  type-checking is project-scoped while lint-staged is file-scoped.
- **Tests:** new specs `.spec.ts`; existing `.spec.js` unchanged. `vite.config.js` already excludes
  `**/dist/**`.

The stray `packages/*/dist/` bundles dated 2026-03-11 are an abandoned local experiment over the
existing JavaScript. They are not precedent and are safe to delete.

---

## 11. Known open items

None of these block implementation starting.

- **Search architecture.** `mark.js` marks the DOM today; with the tree as data, search becomes
  data-driven. The tree carries `handle`, `label`, `status` and `tags` only — anything search needs
  beyond those is a **contract change**, not a theme-side decision.
- **The Frame's own appearance.** The theme's stylesheets and favicon are now carried into the Shell
  and linked, so `default.css` is loaded — but that CSS targets the old server-rendered markup, and
  the skeleton Frame's components only partly match it. Styling the Frame properly belongs to the
  mandelbrot rewrite.
- **The plugin API** (§7.2), deferred to the mandelbrot rewrite.
- **The `skin` config key name** (§7.3).
- **Whether `packages/web/views/` still ships.** It holds four `__system` files for the nunjucks
  engine that this spec removes.
- **The JS→TS seam is unguarded by choice.** Core stays JavaScript and the payload types are
  hand-written, with no assertion functions or fixture tests between them. Drift is caught by review.
  The wider TypeScript conversion is the real fix.
