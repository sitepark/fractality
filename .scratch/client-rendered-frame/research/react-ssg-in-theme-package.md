# Research: React 19 SSG + hydration inside a distributable theme package

Findings for [ticket 02](../issues/02-research-react-ssg-in-theme-package.md). Part of
[the map](../map.md).

Date: 2026-08-14. Verified against React 19.2.8 / Vite 8.2.1 / Rolldown 1.2.4 / Node 24.12.0 as
installed in this repo.

> **Method note.** Every claim below is either quoted from a primary source with its URL, or
> produced by an executable probe run against this repo's own installed toolchain. Where a claim is
> _inferred_ rather than sourced, it says so. Nothing here is answered from memory.

## Headline

**The packaging inversion works.** A theme can ship a prebuilt SSR bundle plus a prebuilt client
bundle, and the consumer's `fractality build` can prerender every route from them with **no Vite,
no React and in fact no `node_modules` at all** in the consumer's project. This was not reasoned
about — it was executed (§3.2).

Nothing found contradicts the map's fixed constraints. Two of them come out _strengthened_:
"React 19, bundled — never a peer" turns out to be not merely allowed but **structurally required**
by the prebuilt model, and "SSG + hydration" is confirmed viable with `react-dom/static`.

Three things ticket 05 must not miss, none of which are contradictions but all of which the map's
Notes do not currently reckon with:

1. **`base: './'` is mandatory** for a prebuilt theme. Vite's default `base: '/'` bakes absolute
   asset paths into built CSS and `import.meta.env.BASE_URL`, which breaks the runtime-configurable
   `config.static.mount` (`packages/mandelbrot/src/theme.js:24-26`). Measured in §3.4.
2. **Prebuilt kills Frame HMR in the consumer's project** — which is fine, and is exactly the
   trade Storybook makes, but it interacts with the map's "Vite in middleware mode" note. See §3.6.
3. **`theme.addLoadPath()` view overriding dies** under prebuilt. It is public API on
   `packages/web/src/theme.js:38`, and mandelbrot ships `views` in its `files` array. See §3.5.

---

## 1. The prerender API

### 1.1 What exists

`react-dom` 19.2.8's `exports` map (read from
`node_modules/.pnpm/react-dom@19.2.8_react@19.2.8/node_modules/react-dom/package.json`) resolves
`./static` under the `node` condition to `./static.node.js`. There are separate `static.browser`,
`static.edge` and `static.react-server` builds. The split is documented:

> These methods are only available in the environments with [Web Streams] […] Node.js also
> includes these methods for compatibility, but they are not recommended due to worse performance.
> Use the dedicated Node.js APIs instead.
> — <https://react.dev/reference/react-dom/static>

So for Fractality's Node build: **`prerenderToNodeStream`**, not `prerender`.

### 1.2 Signature

```js
const { prelude, postponed } = await prerenderToNodeStream(reactNode, options?)
```

Options, verbatim from <https://react.dev/reference/react-dom/static/prerenderToNodeStream>:

| Option                   | Meaning                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `bootstrapScriptContent` | string placed in an inline `<script>` tag                                 |
| `bootstrapScripts`       | array of URLs emitted as `<script>` tags                                  |
| `bootstrapModules`       | as above but `<script type="module">`                                     |
| `identifierPrefix`       | prefix for `useId` IDs; **must match the prefix passed to `hydrateRoot`** |
| `namespaceURI`           | root namespace URI                                                        |
| `onError`                | fires on server errors, recoverable or not                                |
| `progressiveChunkSize`   | bytes per chunk                                                           |
| `signal`                 | `AbortSignal`; aborts and renders the rest on the client                  |

Returns a Promise resolving to `{ prelude, postponed }` — `prelude` is a Node.js `Stream`;
`postponed` is a JSON-serialisable opaque object for `resumeToPipeableStream`, or `null` if
prerendering finished.

### 1.3 `renderToString` is the wrong tool, and React says so out loud

React's own docs:

> `renderToString` does not support streaming or waiting for data.
> […] If some component suspends […] `renderToString` will not wait for its content to resolve.
> Instead, `renderToString` will find the closest `<Suspense>` boundary above it and render its
> `fallback` prop in the HTML. The content will not appear until the client code loads.
> — <https://react.dev/reference/react-dom/server/renderToString>

and recommends `prerenderToNodeStream` for "static prerender" on Node.

**Probe** (run against installed 19.2.8) — same component, same pending promise read with `use()`
inside a `<Suspense>`:

```
SUSPENSE_PRERENDER:      "<div><!--$--><p>LATE DATA</p><!--/$--></div>"

SUSPENSE_RENDERTOSTRING: "<div><!--$!--><template data-msg=\"Switched to client rendering because
  the server rendering aborted due to:\n\nThe server used &quot;renderToString&quot; which does not
  support Suspense. …\"></template><span>loading</span><!--/$--></div>"
```

`renderToString` does not merely degrade — it emits a client-render-fallback marker that discards
the whole boundary at hydration. For SSG that is silent, permanent data loss from the HTML.

Note that the official Vite React playground still uses `renderToString`
(<https://github.com/vitejs/vite-plugin-react/blob/main/playground/ssr-react/src/entry-server.jsx>),
so **do not treat that playground as the model to copy** — it predates `react-dom/static` and has
no async data.

### 1.4 What it demands of the component tree

> `prerenderToNodeStream` waits for all data to load before finishing and resolving. **Only data
> read from a source that activates a Suspense boundary** (such as a Promise read with `use`) will
> suspend during rendering. **Suspense does not detect data fetched inside an Effect or event
> handler.**
> — <https://react.dev/reference/react-dom/static/prerenderToNodeStream>

For Fractality this is comfortable rather than constraining. The map already fixes that "Markdown,
file reads and `getPreviewContent()` resolve at build time" — those resolve in the _Node walk_
(`packages/web/src/builder.js:103-126`), before the component tree is ever constructed. The data
arrives as a plain resolved object passed in as props. **No Suspense boundary and no `use()` is
needed at all** for the prerender to be complete, which is the simplest possible position and the
one to take. Suspense stays available as an escape hatch if some detail payload later becomes
genuinely async.

### 1.5 The whole-document question — resolved empirically

Both static API pages say:

> `reactNode`: A React node you want to render to HTML. **It is expected to represent the entire
> document, so the App component should render the `<html>` tag.**

That reads like a hard requirement and would conflict with the Vite prerender convention of an
`index.html` template with an `<!--app-html-->` placeholder
(<https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js>). It is
_not_ a hard requirement. Probe against 19.2.8:

```
SUBTREE_NO_BOOTSTRAP:
  "<div id=\"frame\"><h1>Hello</h1></div>"
  postponed: null

SUBTREE_WITH_BOOTSTRAP (bootstrapModules + bootstrapScriptContent):
  "<link rel=\"modulepreload\" fetchPriority=\"low\" href=\"/assets/frame-abc123.js\"/>
   <div id=\"frame\"><h1>Hello</h1></div>
   <script id=\"_R_\">window.__X=1</script>
   <script type=\"module\" src=\"/assets/frame-abc123.js\" async=\"\"></script>"

FULLDOC:
  "<!DOCTYPE html><html lang=\"en\"><head>
   <link rel=\"modulepreload\" fetchPriority=\"low\" href=\"/assets/frame-abc123.js\"/><title>T</title>
   </head><body><div id=\"frame\"><h1>Hello</h1></div>
   <script type=\"module\" src=\"/assets/frame-abc123.js\" id=\"_R_\" async=\"\"></script></body></html>"
```

A subtree prerenders cleanly, no `<html>`, no DOCTYPE. **Recommendation: render the subtree and
omit `bootstrapScripts`/`bootstrapModules` entirely**, emitting the `<script type="module">` from
Fractality's own HTML template instead. Rationale: with a subtree root, React injects the
modulepreload _before_ and the script _after_ the subtree, i.e. inside whatever region the
placeholder occupies — usable, but it puts asset wiring in React's hands when the mount prefix
(§3.4) means Fractality must control those URLs anyway.

Also note React tags the inline bootstrap script `id="_R_"`, which is worth knowing before someone
tries to select it.

---

## 2. The two builds

### 2.1 The canonical pair

> ```json
> {
>     "scripts": {
>         "build:client": "vite build --outDir dist/client --ssrManifest",
>         "build:server": "vite build --outDir dist/server --ssr src/entry-server.js"
>     }
> }
> ```
>
> — <https://vite.dev/guide/ssr>

Two manifests, and they are not the same thing:

- **`build.manifest`** (default `false`, path `.vite/manifest.json`) — "a mapping of non-hashed
  filenames to their hashed versions". This is the one you need to write `<link>`/`<script>` tags.
- **`build.ssrManifest`** (default `false`, path `.vite/ssr-manifest.json`) — "for determining
  style links and asset preload directives". Maps _module IDs_ to chunks, so a framework can
  collect the modules touched during a server render and emit exactly their preloads.
  — <https://vite.dev/config/build-options>

Fractality only needs `build.manifest`. `ssrManifest` earns its keep when route-level code
splitting means different routes touch different chunks; the Frame is one bundle, so it is
avoidable complexity. (Inference, flagged as such.)

`manifest.json` shape, verbatim from <https://vite.dev/guide/backend-integration>:

```json
{
    "views/foo.js": {
        "file": "assets/foo-BRBmoGS9.js",
        "name": "foo",
        "src": "views/foo.js",
        "isEntry": true,
        "imports": ["_shared-B7PI925R.js"],
        "css": ["assets/foo-5UjPuW-k.css"]
    }
}
```

and the documented tag order: entry's `css` links first, then recursive `css` from everything in
`imports`, then the module `<script>`, then optional `modulepreload`s.

### 2.2 CSS from the SSR pass: there is none, by design

> **`build.ssrEmitAssets`** — Type `boolean`, Default `false`. "During the SSR build, static assets
> aren't emitted as it is assumed they would be emitted as part of the client build."
> — <https://vite.dev/config/build-options>

Confirmed by probe: `Frame.js` contains `import './frame.css'` and the SSR build output directory
holds exactly one file, `entry-server.js`. The CSS import does **not** throw — it is simply
stripped. So a shared component file can import its own CSS and be used by both passes. All CSS
comes from the client build and is referenced from the prerendered HTML via `manifest.json`.

Corollary for the existing skins arrangement: mandelbrot's skins are already separate Rollup
entries producing separate CSS files (`packages/mandelbrot/vite.config.js:55-68`), and ADR 0004's
uniqueness hack is a _client_-build concern only. The SSR pass never sees them. **Skins survive the
SSR/client split untouched.**

### 2.3 One command

The map fixes "two build passes, one command". For the theme's _own_ build, Vite ≥6 provides this
directly:

> "When the `builder` option is set (even to an empty object `{}`, which is what `vite build --app`
> does), `vite build` opts in to building the entire app instead."
> — <https://vite.dev/guide/api-environment-frameworks>

```js
builder: {
  buildApp: async (builder) => {
    const environments = Object.values(builder.environments)
    await Promise.all(
      environments.map((environment) => builder.build(environment)),
    )
  },
}
```

Also note for whoever writes the config: **`build.rollupOptions` is deprecated in favour of
`build.rolldownOptions`** in Vite 8 (<https://vite.dev/config/build-options>). This repo's
`packages/mandelbrot/vite.config.js:57` still uses `rollupOptions`. It works — the probe used it —
but it is on notice.

### 2.4 There is no built-in Vite SSG, and that is official

Vite maintainer `sapphi-red`, on the SSG request thread: SSG "is almost like an ahead-of-time SSR",
and there would not be a guide for SSG using only browser script execution.
— <https://github.com/vitejs/vite/discussions/18130>

Vite ships a _demo prerender script_, not a feature. The prerender loop is the framework author's
code — Fractality's, in this case, and it already exists in skeleton form as the resolver walk in
`packages/web/src/builder.js:103-126`.

---

## 3. The packaging inversion — the crux

### 3.1 Why the documentation is no help

Every mainstream SSG theme system compiles theme _source_ inside the consumer's project:

- **VitePress**: "The easiest way to distribute a custom theme is by providing it as a template
  repository on GitHub" / "Export the theme object as the default export in your package entry" —
  the consumer creates `.vitepress/theme/index.js` and "it works just like a normal Vite + Vue 3
  application", with the caveat "Do note the theme also needs to be SSR-compatible". No prebuilt
  bundle is shipped. — <https://vitepress.dev/guide/custom-theme>
- **Docusaurus**: swizzling works because "users import theme components using the `@theme` webpack
  alias" with the site's own `src/theme` shadowing the package's
  (<https://docusaurus.io/docs/swizzling>), and theme authors are told to ship
  human-readable compiled JS because "they will be handled by Webpack's Babel loader based on the
  targeted browser versions"
  (<https://docusaurus.io/docs/api/plugin-methods/extend-infrastructure>). Source, compiled by the
  consumer, by design.
- **React Router v7** prerendering is likewise configured in the _site's_
  `react-router.config.ts` (<https://reactrouter.com/how-to/pre-rendering>).
- **`vite-react-ssg`** is a devDependency of the site, not a shippable theme
  (<https://github.com/Daydreamer-riri/vite-react-ssg>).

So the ticket is right that the guides assume you own the site. **The absence of documentation for
the inverted case is not evidence that it is impossible** — it is evidence nobody wrote it down.
Hence the probe.

### 3.2 The probe: it works

Built with the repo's own Vite 8.2.1 and React 19.2.8. Theme side:

```js
// vite.config.js  (theme's own build)
export default defineConfig({
    ssr: { noExternal: true }, // <- the load-bearing line
});
```

```js
// src/entry-server.js  -> built with `vite build --outDir dist/server --ssr src/entry-server.js`
import React from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { Frame } from './Frame.js';

export async function renderRoute(data) {
    const { prelude } = await prerenderToNodeStream(React.createElement(Frame, { data }));
    let html = '';
    for await (const c of prelude) html += c;
    return html;
}
```

Output:

```
dist/server/entry-server.js       640.36 kB │ gzip: 126.33 kB   (React + react-dom/static inlined)
dist/client/js/frame-<hash>.js    190.21 kB │ gzip:  59.91 kB   (React + react-dom/client inlined)
dist/client/css/frame-<hash>.css
dist/client/.vite/manifest.json
```

Consumer side — a directory containing **one file, `package.json`, and no `node_modules`
whatsoever**:

```js
const { renderRoute, REACT_VERSION } = await import('<theme>/dist/server/entry-server.js');
// React inside prebuilt SSR bundle: 19.2.8
// consumer cannot resolve bare "react": ERR_MODULE_NOT_FOUND
const manifest = JSON.parse(fs.readFileSync('<theme>/dist/client/.vite/manifest.json', 'utf8'));
const entry = manifest['src/entry-client.js'];
const MOUNT = '/themes/mandelbrot'; // runtime config, not build-time
const body = await renderRoute({ title: 'Components', items: [1, 2, 3] });
```

Produced page:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="/themes/mandelbrot/css/frame-B8VGdq_4.css" />
    </head>
    <body>
        <div id="frame">
            <h1>Components</h1>
            <p class="Frame-count">3</p>
        </div>
        <script type="application/json" id="__FRACTALITY_DATA__">
            { "title": "Components", "items": [1, 2, 3] }
        </script>
        <script type="module" src="/themes/mandelbrot/js/frame-bJDUeDr4.js"></script>
    </body>
</html>
```

**`ERR_MODULE_NOT_FOUND` for bare `react` in the consumer, while the bundle reports 19.2.8, is the
whole finding.** The SSR bundle is hermetic.

### 3.3 Why `ssr.noExternal: true` is not optional

> "By default, all dependencies are externalized for SSR except for linked dependencies." […]
> `ssr.noExternal: true` "prevent[s] listed dependencies from being externalized" — no dependencies
> are externalized. "if both `ssr.noExternal: true` and `ssr.external: true` are configured,
> `ssr.noExternal` takes priority and no dependencies are externalized."
> — <https://vite.dev/config/ssr-options>

Without it, the shipped `entry-server.js` would contain a bare `import ... from 'react'` resolved
against the **consumer's** `node_modules` at prerender time. In a consumer whose patterns pin React
18 for `@fractality/react`, the Frame would silently prerender on React 18 — or crash. This is the
same class of failure as the two the map already cites (jQuery 4 in
`packages/mandelbrot/vite.config.js:20-32`, `instanceof Theme` in `TODO.md`).

**This is strong new support for the map's "React 19, bundled — never a peer" constraint**: under a
prebuilt model, bundling is not a preference, it is the mechanism that makes the model sound.

Storybook reached the identical conclusion by the identical route. Its prebuilt manager PR:

> the prebundled `lib/ui` is proxied as-is including the runtime, and all `managerEntries` are run
> through esbuild while ensuring shared dependencies between addons and `lib/ui` are globalized and
> replaced
> — <https://github.com/storybookjs/storybook/pull/18550>

and its addon migration guide: "The following packages are provided by Storybook and should always
be externalized: `react`, `react-dom`, `@storybook/icons`"
(<https://storybook.js.org/docs/addons/addon-migration-guide>), with
"Addons with a UI must use the same React version as Storybook"
(<https://storybook.js.org/docs/addons/writing-addons/>).

Storybook is the closest architectural analogue in existence — prebuilt chrome (manager ≈ Frame),
consumer-built content (preview iframe ≈ Preview), React global in the former and _not_ in the
latter. That mapping is worth stating in the ADR.

### 3.4 What actually breaks, #1: the base path — **measured**

`config.static.mount` defaults to `'themes/mandelbrot'` and is user-overridable
(`packages/mandelbrot/src/theme.js:24-26`). But Vite resolves `base` at build time, i.e. at
_theme publish_ time.

Probe, same source, three configs, looking at the built CSS's `url()`:

| config                                                             | emitted                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `base: '/'` (default)                                              | `url(/css/dot-CcAtRhbS.png)` ← **wrong under any non-root mount** |
| `base: './'`                                                       | `url(./dot-CcAtRhbS.png)` ✅                                      |
| `base: '/'` + `experimental.renderBuiltUrl` → `{ relative: true }` | `url(./dot-CcAtRhbS.png)` ✅                                      |

And `import.meta.env.BASE_URL` is baked as a literal — the built entry contains
`console.log(e(), \`/\`)`where the source read`import.meta.env.BASE_URL`. Confirms the docs:
"the public base path […] undergoes static replacement during build"
(<https://vite.dev/guide/build>).

Good news, also measured: **dynamic-import chunk paths are already relative** in both modes
(`await import("./lazy-C7aqLKhl.js")`), so the deferred-syntax-highlighting split the map calls for
is mount-agnostic for free.

**Rule for ticket 05: a prebuilt theme must build with `base: './'`, must never read
`import.meta.env.BASE_URL`, and must compute all HTML-level URLs at prerender time by prefixing
`manifest.json` paths with the runtime mount.** The escape hatch if a JS-side absolute URL is ever
genuinely needed is documented:

> ```ts
> experimental: {
>   renderBuiltUrl(filename, { hostType }) {
>     if (hostType === 'js') {
>       return { runtime: `window.__toCdnUrl(${JSON.stringify(filename)})` }
>     } else {
>       return { relative: true }
>     }
>   },
> },
> ```
>
> — <https://vite.dev/guide/build> (marked experimental)

### 3.5 What actually breaks, #2: extension points

Ordered by how much they hurt.

| Extension point                                                        | Today                                                                                                                                                                                                                                             | Under prebuilt                                                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.addLoadPath()` view overriding (`packages/web/src/theme.js:38`) | Public API; mandelbrot ships `views` in `files`                                                                                                                                                                                                   | **Gone.** No template resolution exists to override.                                                                                  |
| Custom panel as a _component_ (`theme.get('panels')`, `theme.js:117`)  | Array of partial names → nunjucks includes                                                                                                                                                                                                        | Names must become registrations against a **prebuilt** component table. A user's own JSX cannot be added without a compile step.      |
| Custom `nav` sections (`theme.js:118`)                                 | Same                                                                                                                                                                                                                                              | Same                                                                                                                                  |
| Custom skin                                                            | Already only `styles: [url]` / `skin.name` → prebuilt CSS URL (`theme.js:80-97`); mandelbrot's `files` is `["dist","views","src","index.js","CHANGELOG.md"]` — **`assets/` is not published, so SCSS source is already unavailable to consumers** | **No regression.** Supplying a stylesheet URL keeps working exactly as now.                                                           |
| `theme.get('labels.*')` i18n                                           | Injected server-side into templates                                                                                                                                                                                                               | Must ride in the runtime payload. Mechanically trivial, but it is a data-contract item for ticket 04.                                 |
| `theme.routes()` / resolvers                                           | Node-side JS in the theme's `src/`                                                                                                                                                                                                                | **Unaffected** — that code is not bundled and keeps running in the consumer's Node process, which is what makes the whole model work. |

The load-bearing distinction: **anything that is _data_ survives prebuilding; anything that is
_code_ does not.** `theme.get()` config is safe if and only if every value is serialisable and
every "name" resolves to something already inside the bundle.

The `addLoadPath` loss is the one to argue about. It is genuinely public API and genuinely
disappears — but note it is already tied to nunjucks specifically, and the map's "hard cutover"
note ("`@fractality/web` drops view-based server rendering at the major. No dual rendering path")
arguably retires it regardless of how the theme ships. **Prebuilt does not cause this loss; the
cutover does.** Ticket 06 (third-party theme migration) is where it lands.

### 3.6 The dev-mode interaction the map's Notes do not cover

The map fixes "Vite in middleware mode inside a thin Express host". Vite in middleware mode
transforms _source_. If a theme ships only `dist/`, then in the consumer's project there is no
theme source for Vite to transform, and `vite` itself is not in the consumer's dependency graph.

This is not a contradiction — it is a scope question the ADR must answer explicitly:

- **Frame HMR belongs to the theme author, not the theme consumer.** A consumer of
  `@fractality/mandelbrot` is not editing Frame components; they are editing _patterns_, which live
  in the Preview iframe and are rendered by the adapters — a path the map already puts outside Vite
  ("the user's templates are not Vite modules"). So the consumer's dev server can serve the
  theme's prebuilt client bundle as a static asset and lose nothing they wanted.
- This is, again, exactly Storybook's position: consumers do not hot-reload the manager UI.
- The theme author gets Vite middleware mode by running dev _in the theme's own repo_ — which is
  where `vite` is already a devDependency (`packages/mandelbrot/package.json`).

If instead ticket 03 concludes that the consumer's dev server must run Vite over theme source, then
option (a) is dead for dev and only a hybrid survives — so **ticket 03's answer constrains ticket
05's, and 05 should not be decided before 03 lands.** (05 is already `Blocked by: 02, 03`; this is
a note on _why_, not a new dependency.)

### 3.7 Verdict for ticket 05

- **(a) Prebuilt** — technically proven (§3.2). Costs: no view overriding, no user-authored
  components, no Frame HMR for consumers, `base: './'` discipline. Buys: zero toolchain in the
  consumer, fast installs, and — decisively — a hermetic React 19 that cannot collide with the
  user's React 18 patterns.
- **(b) Built in the consumer's project** — what every documented SSG theme system does, so it is
  the well-trodden path. But it puts Vite + React + a compile step into every consumer's build,
  and it re-opens the React-version collision that `ssr.noExternal` closes, because the consumer's
  resolver now picks React for the Frame.
- **(c) Hybrid** — Storybook's answer, and it is a _real_ engineering pattern rather than a
  hedge: ship the Frame prebuilt with React globalized, and run a small compile (esbuild, not Vite)
  over consumer-supplied entries that bind to the prebuilt React. See §3.3's quote. The cost is
  owning a second, smaller build path.

Nothing here rules any of the three out. (a) is the one that was in doubt, and it is now proven
possible; the decision is about extension points, not feasibility.

---

## 4. Hydration payload

### 4.1 Use a JSON data block, not `window.__DATA__`

Recommended shape:

```html
<script type="application/json" id="__FRACTALITY_DATA__">
    {"handle":"button", …}
</script>
```

read as `JSON.parse(document.getElementById('__FRACTALITY_DATA__').textContent)`.

The decisive reason is CSP, and it comes straight out of the HTML spec's _prepare the script
element_ algorithm, whose step order settles it:

- **Step 13** — for a type that is not a JavaScript MIME type essence match, nor `module`, nor
  `importmap`: "Otherwise, return. (No script is executed, and el's type is left as null.)"
- **Step 21** — "If el does not have a `src` content attribute, and the _Should element's inline
  behavior be blocked by Content Security Policy?_ algorithm returns `Blocked` …"

— <https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element>

**Step 13 returns before step 21 ever runs.** A `type="application/json"` block is a data block,
never prepared as script, and therefore never subject to `script-src`. By contrast MDN is explicit
that an executable inline script needs help:

> "If a CSP contains either a `default-src` or a `script-src` directive, then inline JavaScript
> will not be allowed to execute unless extra measures are taken to enable it. This includes:
> JavaScript included inside a `<script>` element in the page …"
> — <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP>

So `window.__DATA__ = {...}` requires `'unsafe-inline'`, a hash, or a nonce, from every consumer
who deploys a built styleguide behind a CSP. The JSON block requires nothing.

### 4.2 Nonces are not available to us anyway — React says so

> "`nonce` is not an available option when prerendering. **Nonces must be unique per request** and
> if you use nonces to secure your application with CSP it would be inappropriate and insecure to
> include the nonce value in the prerender itself."
> — <https://react.dev/reference/react-dom/static/prerender>

corroborated by MDN: "In practice this means that the nonce must be different for every HTTP
response, and must not be predictable."
(<https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP>)

This is structural, not incidental: a **static** build has no request to be unique per. Therefore:

- Never use `bootstrapScriptContent` for the payload (it produces an executable inline script that
  the prerender cannot nonce).
- Prefer the JSON data block, which sidesteps the problem entirely.
- If a consumer's CSP is strict, the only remaining inline construct on the page should be zero.

### 4.3 Escaping

The HTML spec constrains _all_ script element content, data blocks included:

> "The `script` element's descendant text content must match the `script` production in the
> following ABNF" — which prohibits `<!--`, `<script` and `</script>` appearing unescaped.
> — <https://html.spec.whatwg.org/multipage/scripting.html#the-script-element>

All three forbidden sequences start with `<`. So the complete, minimal, one-pass fix is to replace
every `<` in the serialised JSON with its `<` escape:

```js
const payload = JSON.stringify(data).replace(/</g, '\\u003c');
```

`<` is a valid JSON string escape, so `JSON.parse` restores the original text exactly. This is
sufficient for a data block; note that a `window.__DATA__` assignment would additionally need
JS-level care (U+2028/U+2029, and the value is parsed as a JS expression rather than JSON) — a
second reason to prefer the data block.

Also required: the element must have no `src` attribute and its content must be exactly the JSON.
The probe page in §3.2 is a working instance.

### 4.4 One payload or two

The map fixes: "One tree payload, fetched once and cached […] The current route's own detail data
is inlined into its SSG page." That maps cleanly onto **two** separate constructs — an inline
`<script type="application/json">` for the route detail, and a fetched-and-cached JSON file for the
tree. Both are ticket 04's business; nothing in the research constrains the choice further.

---

## 5. Hydration mismatch discipline

### 5.1 What React 19 actually does

React 19 did not make hydration _stricter_; it made it _legible_. The change is one error with a
diff instead of a cascade of warnings:

> ```
> Uncaught Error: Hydration failed because the server rendered HTML didn't match the client. As a
> result this tree will be regenerated on the client. This can happen if an SSR-ed Client Component
> used:
> - A server/client branch `if (typeof window !== 'undefined')`.
> - Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
> - Date formatting in a user's locale which doesn't match the server.
> - External changing data without sending a snapshot of it along with the HTML.
> - Invalid HTML tag nesting.
>
> It can also happen if the client has a browser extension installed which messes with the HTML
> before React loaded.
> ```
>
> — <https://react.dev/blog/2024/12/05/react-19>

And the `hydrateRoot` reference lists the common causes:

> - Extra whitespace (like newlines) around the React-generated HTML inside the root node.
> - Using checks like `typeof window !== 'undefined'` in your rendering logic.
> - Using browser-only APIs like `window.matchMedia` in your rendering logic.
> - Rendering different data on the server and the client.
>   — <https://react.dev/reference/react-dom/client/hydrateRoot>

Note the phrase "this tree will be regenerated on the client": a mismatch does not degrade
gracefully into a patch. React throws the server HTML away for that tree, which for the Frame means
a visible re-render and the loss of the SSG benefit for that page.

### 5.2 The patterns that will bite this specific codebase

Ordered by likelihood, given what mandelbrot does today.

1. **Extra whitespace around the root node.** Fractality generates its HTML by string
   concatenation around the prerender output (§3.2). Prettified templates with newlines
   _inside_ the hydration container will mismatch. Rule: the container element's content must be
   the prerender output byte-for-byte, no pretty-printing between `<div id="frame">` and the
   subtree. This is the highest-probability failure and the easiest to cause accidentally.

2. **`new Date()` / locale formatting.** `packages/mandelbrot/src/theme.js:99-116` builds a
   `config.information` entry whose value is `new Date()` and whose formatter calls
   `value.toLocaleDateString(config.lang)`. Server-side `toLocaleDateString` under Node's ICU and
   the browser's will not reliably agree, and the timestamp itself differs by construction. **Format
   this at build time and put the resulting string in the payload** — which is also exactly what
   the map's "payload carries source of truth, not presentation" note demands. If a live value is
   ever genuinely needed, `suppressHydrationWarning` exists but "only works one level deep, and is
   intended to be an escape hatch. Don't overuse it. React will **not** attempt to patch mismatched
   text content" (<https://react.dev/reference/react-dom/client/hydrateRoot>).

3. **`frctl.env == 'server'` branching.** `packages/mandelbrot/assets/js/mandelbrot.js:24` gates
   behaviour on environment today. Any surviving equivalent inside a _render_ path is the
   documented `typeof window !== 'undefined'` anti-pattern in disguise. It must move into an Effect.

4. **Deferred syntax highlighting — safe, if done correctly.** The map defers highlighting to
   after hydration. This is mismatch-_avoiding_, not mismatch-causing, because the server and the
   first client render both produce the same unhighlighted markup and the DOM only changes
   afterwards. Two conditions:
    - Highlight in an Effect (or an event handler), never during render. Effects do not run on the
      server, so there is nothing to diverge.
    - Do not highlight into the same nodes React is diffing during hydration; hand the highlighter a
      container React does not own after that point, or set the result via state so React does the
      write.
      The lazily-loaded highlighter also needs `import()` — confirmed in §3.4 to emit relative chunk
      paths, so it works under any mount.

5. **`useId` prefix symmetry.** `identifierPrefix` "must match the prefix passed to `hydrateRoot`"
   (<https://react.dev/reference/react-dom/static/prerenderToNodeStream>) and hydrateRoot's
   `identifierPrefix` is "useful to avoid conflicts when using multiple roots on the same page.
   Must be the same prefix as used on the server"
   (<https://react.dev/reference/react-dom/client/hydrateRoot>). Fractality plausibly ends up with
   more than one root on a page (Frame + something in the Pen). Either pass a prefix on both sides
   or pass it on neither — but decide, because the failure is a silent ID collision.

6. **Invalid HTML nesting.** Listed in React 19's own error text. Worth calling out because
   mandelbrot's markup comes from hand-written nunjucks today; the browser's parser silently
   repairs bad nesting, the server string does not, and the two then disagree. Whoever ports each
   view should run the prerendered output through a validator once.

### 5.3 The two-pass escape hatch, and its price

```js
const [isClient, setIsClient] = useState(false);
useEffect(() => {
    setIsClient(true);
}, []);
```

> **Warning:** This approach makes hydration slower because your components have to render twice.
> Be mindful of the user experience on slow connections. […] rendering a different UI immediately
> after hydration may also feel jarring to the user.
> — <https://react.dev/reference/react-dom/client/hydrateRoot>

Relevant because the Frame legitimately has client-only state (persisted sidebar scroll, resizable
panel sizes read from storage). Those should render from a server-safe default and adjust in an
Effect — accepting one frame of adjustment — rather than reading storage during render.

---

## Contradictions with the map's fixed constraints

**None found.** Recorded explicitly because the ticket asked for a loud answer either way:

| Map constraint                                            | Status                                                                                                                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frame client-owned in both modes                          | Compatible.                                                                                                                                                                         |
| SSG + hydration, not CSR, not stub-per-route              | **Confirmed viable** — §1, §3.2.                                                                                                                                                    |
| React 19 bundled, never a peer                            | **Confirmed and strengthened** — under prebuilt it is required, not merely allowed (§3.3). Proven by a consumer with no `node_modules` rendering on 19.2.8.                         |
| Payload carries source of truth; highlighting client-side | Compatible, and §5.2.4 shows the deferral is mismatch-safe.                                                                                                                         |
| Vite middleware mode in a thin Express host               | Compatible, but see §3.6 — under prebuilt this applies to the _theme author's_ repo, not the consumer's. Ticket 03 should confirm. Not a contradiction; an unstated scope boundary. |
| Two build passes, one command                             | Supported directly by `builder` / `vite build --app` (§2.3).                                                                                                                        |
| Hard cutover, no dual rendering path                      | Compatible. Note §3.5: `theme.addLoadPath()` dies to the cutover regardless of packaging.                                                                                           |
| One tree payload; route detail inlined                    | Compatible, §4.4. Inlining is CSP-clean via the JSON data block (§4.1).                                                                                                             |

The nearest thing to a surprise is §3.4: `base: './'` is a hard requirement for a prebuilt theme,
and getting it wrong produces asset 404s only for consumers who changed `static.mount` — i.e. a bug
that would not show up in this repo's own testing.

---

## Reproducing the probes

Both probes ran from `/tmp/.../scratchpad/probe` (deleted). To rebuild:

1. Symlink `react@19.2.8`, `react-dom@19.2.8`, `scheduler`, `vite@8.2.1` from
   `node_modules/.pnpm/` into a scratch project with `{"type": "module"}`.
2. Client: `vite build --outDir dist/client --manifest` with an explicit
   `rollupOptions.input` (Vite 8 fails with `[UNRESOLVED_ENTRY] Cannot resolve entry module
index.html` if no HTML entry and no explicit input is given — the same reason
   `packages/mandelbrot/vite.config.js:57-62` specifies `input`).
3. Server: `vite build --outDir dist/server --ssr src/entry-server.js` with
   `ssr: { noExternal: true }`.
4. Consume from a directory with no `node_modules` via absolute-path `import()`.

## Sources

React

- <https://react.dev/reference/react-dom/static>
- <https://react.dev/reference/react-dom/static/prerenderToNodeStream>
- <https://react.dev/reference/react-dom/static/prerender>
- <https://react.dev/reference/react-dom/server/renderToString>
- <https://react.dev/reference/react-dom/client/hydrateRoot>
- <https://react.dev/blog/2024/12/05/react-19>

Vite

- <https://vite.dev/guide/ssr>
- <https://vite.dev/guide/build>
- <https://vite.dev/guide/backend-integration>
- <https://vite.dev/guide/api-environment-frameworks>
- <https://vite.dev/config/ssr-options>
- <https://vite.dev/config/build-options>
- <https://github.com/vitejs/vite/discussions/18130>
- <https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js>
- <https://github.com/vitejs/vite-plugin-react/blob/main/playground/ssr-react/src/entry-server.jsx>

Prior art for the inversion

- <https://github.com/storybookjs/storybook/pull/18550>
- <https://storybook.js.org/docs/addons/writing-addons/>
- <https://storybook.js.org/docs/addons/addon-migration-guide>
- <https://vitepress.dev/guide/custom-theme>
- <https://docusaurus.io/docs/swizzling>
- <https://docusaurus.io/docs/api/plugin-methods/extend-infrastructure>
- <https://reactrouter.com/how-to/pre-rendering>
- <https://github.com/Daydreamer-riri/vite-react-ssg>

Specs

- <https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element>
- <https://html.spec.whatwg.org/multipage/scripting.html#the-script-element>
- <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP>
