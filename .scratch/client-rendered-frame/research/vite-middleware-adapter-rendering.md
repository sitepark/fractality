# Vite middleware mode alongside per-request adapter rendering

Research for [ticket 03](../issues/03-research-vite-middleware-adapter-rendering.md) · part of [the map](../map.md)

Verified against Vite **8.2.1**, Express **5.2.1**, path-to-regexp **8.4.2** — the exact versions
resolved in this repo. Where a claim comes from the shipped Vite source rather than the docs, the
file and line in `node_modules/.pnpm/vite@8.2.1_…/node_modules/vite/` is given, because several of
the load-bearing behaviours are not documented anywhere else.

---

## ⚠️ Read this first — two findings that pull against the map

Neither is a flat contradiction of a fixed constraint, but both change what the constraint _buys_,
and both need recording before ticket 05 decides how a theme ships. Stating them up front rather
than burying them in Q2/Q3.

### ⚠️ 1. Middleware mode gives the Frame no HMR in a consumer's project

Vite's dev-server watcher is created over `[root, configFileDependencies, envFiles, publicDir]`
with an `ignored` list whose **first entries are hardcoded and cannot be removed by user config**:

```js
// vite/dist/node/chunks/node.js:13726-13733  (resolveChokidarOptions)
const ignored = [
    '**/.git/**',
    '**/node_modules/**',
    '**/test-results/**',
    escapePath(cacheDir) + '/**',
    ...arraify(ignoredList || []), // user's server.watch.ignored is APPENDED
];
```

The docs state the consequence plainly: _"It's currently not possible to watch files and packages in
`node_modules`."_ ([server.watch](https://vite.dev/config/server-options#server-watch))

A consumer project installs `@fractality/mandelbrot` from npm, so the Frame's source sits under
`<project>/node_modules/@fractality/mandelbrot/`. Vite will happily **serve** those modules
(`server.fs.allow` defaults to the workspace root, which contains `node_modules`) but it will never
**watch** them. So in the consumer case:

- Frame source changes → no HMR, no reload, nothing. (Irrelevant in practice — consumers don't edit
  the theme — but it means middleware mode is not buying Frame HMR _there_.)
- Frame HMR is real only in **this repo**, where mandelbrot is a workspace package resolved outside
  `node_modules`, i.e. for theme development.

Combine that with ticket 02's crux (a theme shipping _prebuilt_ SSR + client bundles so the
consumer never runs Vite over theme source) and the honest conclusion is: **in a consumer project,
Vite's dev server transforms almost nothing.** What it still provides there is
(a) the HMR WebSocket as a general-purpose message bus (which is what Q4 needs), (b) dep
pre-bundling and the transform pipeline _if_ the theme ships source rather than a bundle, and
(c) static asset serving that `express.static` already does today.

That is a real tension with "**Vite in middleware mode inside a thin Express host**" as the _dev_
architecture — not because middleware mode fails, but because its justification in the consumer
case narrows to one websocket. **Ticket 05 should decide this explicitly, not inherit it.** I have
not edited `map.md`.

### ⚠️ 2. Middleware mode opens a _second_ HTTP server unless you hand Vite yours

In middleware mode `httpServer` is `null`, so Vite has nothing to attach the HMR WebSocket to:

```js
// vite/dist/node/chunks/node.js:26334-26335
const middlewares = connect();
const httpServer = middlewareMode ? null : await resolveHttpServer(middlewares, httpsOptions);
const ws = createWebSocketServer(httpServer, config, httpsOptions);
```

```js
// vite/dist/node/chunks/node.js:17500-17505  (createWebSocketServer)
const wsCustomServer = wsOptions?.server;
const wsServer = wsCustomServer || (!wsPort || wsPort === config.server.port) && server;
…
const port = wsPort || 24678;
…
} else { /* no wsServer → Vite creates its own http.Server on 24678 */ }
```

Docs confirm the escape hatch: _"When `server.ws.server` is defined, Vite will process the WebSocket
connection requests through the provided server."_ and _"If **not** in middleware mode, Vite will
attempt to process WebSocket connection requests through the existing server."_
([server.ws](https://vite.dev/config/server-options#server-ws))

So a naive middleware-mode port leaks port **24678** alongside the Express port. To keep the
"thin Express host" a single port, the host must create the `http.Server` itself and pass it in —
which means `createServer()` (Vite) can no longer be constructed before the Node server exists, or
must be given the server via `server.ws.server`. `packages/web/src/server.js` currently builds the
`http.Server` implicitly via `this._server.listen(...)` (line 68), so this needs restructuring into
an explicit `http.createServer(expressApp)`.

Note also: `server.hmr.{protocol,host,port,path,clientPort,timeout,server}` are **deprecated in
Vite 8** in favour of `server.ws.*` — confirmed in `vite/dist/node/index.d.ts:1180-1208`, each field
carrying `@deprecated Use server.ws.X instead`. New code should write `server.ws.server`.

---

## 1. Composition order — Vite's middleware next to Express 5 routes

### What `vite.middlewares` actually is

`vite.middlewares` is typed `Connect.Server` (`vite/dist/node/index.d.ts:2668`) — a plain
`(req, res, next)` function, so Express 5's `app.use(fn)` accepts it as ordinary middleware and
Connect's `out` parameter becomes Express's `next`. Unmatched requests fall through to the next
Express layer.

One documented stability guarantee matters for the restart path: _"when the server restarts (for
example after the user modifies vite.config.js), `vite.middlewares` is still going to be the same
reference (with a new internal stack of Vite and plugin-injected middlewares)"_
([SSR guide](https://vite.dev/guide/ssr)). So `app.use(vite.middlewares)` can be registered once at
boot and survives `restartServerWithUrls` — which Vite triggers itself on config-file changes
(`node.js:26941-26951`).

### The exact stack Vite installs under `appType: 'custom'`

From `vite/dist/node/chunks/node.js:26563-26592`, in order:

| #   | middleware                                   | present when                              |
| --- | -------------------------------------------- | ----------------------------------------- |
| 1   | `cachedTransformMiddleware`                  | always (unless `experimental.bundledDev`) |
| 2   | `proxyMiddleware`                            | `server.proxy` set                        |
| 3   | `baseMiddleware`                             | `base !== '/'`                            |
| 4   | `/__open-in-editor`                          | always                                    |
| 5   | `viteHMRPingMiddleware`                      | always                                    |
| 6   | `servePublicMiddleware`                      | `publicDir` set                           |
| 7   | `transformMiddleware`                        | always                                    |
| 8   | `serveRawFsMiddleware` (`/@fs/`)             | always                                    |
| 9   | `serveStaticMiddleware`                      | always                                    |
| 10  | `htmlFallbackMiddleware`                     | **only `appType: 'spa' \| 'mpa'`**        |
| 11  | `indexHtmlMiddleware` + `notFoundMiddleware` | **only `appType: 'spa' \| 'mpa'`**        |
| 12  | `errorMiddleware(server, !!middlewareMode)`  | always                                    |

Rows 10–11 are the whole reason the docs say _"if `appType` is `'spa'` or `'mpa'`, Vite includes
middlewares to handle HTML requests and 404s so user middlewares should be added **before** Vite's
middlewares to take effect instead"_ ([server.middlewareMode](https://vite.dev/config/server-options#server-middlewaremode)).
Under `'custom'` those rows are absent, so **Vite never terminates a request it doesn't recognise**
and ordering is genuinely free.

Two residual hazards in that stack:

- **`serveStaticMiddleware` (row 9)** serves any file under `config.root` that matches the URL path.
  It bails early for `/`-terminated URLs, `.html`, and internal requests (`node.js:20372-20373`) but
  `/components/preview/button` is none of those — it goes to sirv, which returns `next()` only
  because no such file exists. That's a coincidence, not a guarantee. Register the engine routes
  **before** `vite.middlewares` and the hazard disappears.
- **`errorMiddleware` (row 12)** is constructed with `allowNext = !!middlewareMode`, and:

    ```js
    // vite/dist/node/chunks/node.js:6009-6013
    function errorMiddleware(server, allowNext = false) {
        return function viteErrorMiddleware(err, _req, res, next) {
            logError(server, err);
            if (allowNext) next();      // ← note: next(), NOT next(err)
    ```

    In middleware mode a Vite-internal error is logged and then the request continues **with the error
    discarded**. `Server#_onError` (`packages/web/src/server.js:246`) will therefore never see Vite's
    errors; the request instead falls through to whatever Express layer comes next and most likely
    404s. Worth knowing before someone debugs a "mysterious 404" that was actually a transform error.

### Express 5 / path-to-regexp 8 — the actual trap

The official Vite SSR guide's catch-all is `app.use('*all', async (req, res, next) => { … })`
([ssr.md](https://raw.githubusercontent.com/vitejs/vite/refs/heads/main/docs/guide/ssr.md)), and
`packages/web/src/server.js:288` already uses the Express 5 form `this._server.get('*path', …)`.
Express 5 requires the name — _"The wildcard `*` must now have a name… use `/*splat` instead of
`/*`"_ ([Express 5 migration](https://expressjs.com/en/guide/migrating-5.html)).

I ran the repo's own `path-to-regexp@8.4.2` against the patterns that matter:

```
'*path'          /  → {"path":["",""]}                    ✅ matches root
                 /components/preview/foo → {"path":[...]}  ✅
                 /@vite/client           → {"path":["","@vite","client"]}   ⚠️ MATCHES
'/*path'         /  → false                                ❌ does NOT match root
'/{*path}'       /  → {}                                   ✅ matches root
'/docs{/*path}'  /components/preview/foo → false           ✅ correctly scoped
```

**The load-bearing consequence:** `'*path'` (and `'*all'`) matches `/@vite/client`,
`/@fs/…`, `/@react-refresh`, `/node_modules/.vite/deps/*` and every transformed module URL. If
`this._server.get('*path', this._onRequest)` stays where it is today — registered _before_ Vite —
the Frame gets no HMR client, no modules, nothing. The catch-all **must** move after
`app.use(vite.middlewares)`.

Note also that Express 5 wildcards capture an **array**, not a string, and unmatched params are
omitted entirely rather than being `''`/`undefined`. Nothing in `server.js` reads `req.params` (it
re-matches via `Theme#matchRoute`), so this is inert here — but any new code that does read it
should not assume Express 4 shapes.

### Recommended order

```js
const vite = await createViteServer({
    root: themeRoot,
    appType: 'custom',
    server: {
        middlewareMode: true,
        ws: { server: httpServer }, // ← see ⚠️2; keeps everything on one port
    },
});

const app = express();

// 1. request-context shim (unchanged, server.js:271-282)
app.use(requestContext);

// 2. ADR-0001 gate + engine-rendered adapter routes, matched explicitly.
//    Never passed through vite.transformIndexHtml — see Q4.
app.use('/components/preview/:handle', gateOnIdle, renderWithAdapter);
app.use('/components/render/:handle', gateOnIdle, renderWithAdapter);
app.use('/components/raw/:handle/:asset', gateOnIdle, sendComponentFile);

// 3. Vite: /@vite/client, /@fs/, module transforms, static under root
app.use(vite.middlewares);

// 4. Frame catch-all — MUST be after (3), because '*path' swallows /@vite/client
app.get('/{*path}', gateOnIdle, renderFrame);

// 5. error handler (server.js:290)
app.use(onError);
```

Putting the engine routes at step 2 rather than after Vite is a deliberate choice: it removes the
`serveStaticMiddleware` coincidence, and it makes the "these URLs are not Vite's business" boundary
explicit in the code rather than emergent from Vite's fall-through behaviour. It costs nothing,
because the three prefixes cannot collide with Vite's internal `/@…` prefixes.

**Sources:** [Vite SSR guide](https://vite.dev/guide/ssr) ·
[server.middlewareMode](https://vite.dev/config/server-options#server-middlewaremode) ·
[Express 5 migration](https://expressjs.com/en/guide/migrating-5.html) ·
[Express 5 middleware guide](https://expressjs.com/en/5x/guide/using-middleware/) ·
Vite 8.2.1 source as cited.

---

## 2. Loading the Frame's SSR entry in dev

### `ssrLoadModule` is alive in Vite 8, but on a deprecation path

`ViteDevServer#ssrLoadModule(url, opts?)` is present and **not** marked `@deprecated` in
`vite/dist/node/index.d.ts:2731`. It is, however, on the future-deprecation list:

```js
// vite/dist/node/chunks/node.js:5928, 5940
removeSsrLoadModule: 'ssr-using-modulerunner';
removeSsrLoadModule: 'The `server.ssrLoadModule` is replaced with Environment Runner.';
```

Opt in to warnings with `future: { removeSsrLoadModule: 'warn' }`
(`vite/dist/node/index.d.ts:3699`). Docs: _"The deprecation of `server.ssrLoadModule` is planned for
a future major"_ ([SSR using ModuleRunner](https://vite.dev/changes/ssr-using-modulerunner)).

### The modern form

```js
import { createServer, isRunnableDevEnvironment } from 'vite';

const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    environments: { ssr: {} },
});

const env = vite.environments.ssr;
if (!isRunnableDevEnvironment(env)) throw new Error('ssr env is not runnable');
const { renderFrame } = await env.runner.import('/src/entry-server.js');
```

Docs: _"`runner.import(url)` fetches, transforms, and evaluates a module from the Vite module graph
and returns the instantiated module with full HMR support… It is the modern replacement for
`server.ssrLoadModule`, so frameworks can migrate to it to enable HMR for their SSR dev story."_
([Environment API for frameworks](https://vite.dev/guide/api-environment-frameworks))

**Recommendation: write `runner.import()` now.** The API is available in Vite 8, the legacy path is
already flagged, and the migration cost at the point of writing is one line. Nothing about this
effort needs `ssrLoadModule`'s specific semantics.

### Call it per request, not once at boot

Both APIs re-evaluate on invalidation, so calling `runner.import('/src/entry-server.js')` inside the
request handler is the documented pattern and is what picks up edits to the SSR entry. Hoisting it
to boot pins a stale module.

### How this differs from production (ticket 02's half)

|               | dev (this ticket)                                                                                                                                | production (ticket 02)                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| SSR entry     | `env.runner.import('/src/entry-server.js')` — transformed on demand, invalidated by the module graph                                             | `import('./dist/server/entry-server.js')` — a Rolldown bundle from `vite build --ssr` |
| Client assets | served by `vite.middlewares` from source, URLs unhashed                                                                                          | hashed files + `.vite/manifest.json`                                                  |
| HTML          | template through `vite.transformIndexHtml(url, html)`, which _"injects the Vite HMR client, and also applies HTML transforms from Vite plugins"_ | prerendered at build time; no transform hook                                          |
| Errors        | `vite.ssrFixStacktrace(e)` remaps to source                                                                                                      | plain stack                                                                           |

Docs give the split verbatim: build with
`"build:client": "vite build --outDir dist/client"` /
`"build:server": "vite build --outDir dist/server --ssr src/entry-server.js"`, and _"In production,
replace dev-time `ssrLoadModule` calls with direct imports: `import('./dist/server/entry-server.js')`."_
([SSR guide](https://vite.dev/guide/ssr)).

**The `transformIndexHtml` line is the crux for Q4** — it is the _only_ thing that injects
`/@vite/client` into a page. Whichever HTML you pass through it gets an HMR connection; whichever
you don't, doesn't. Call it on the Frame's HTML. **Never call it on the Preview's.** That single
rule is what keeps the user's patterns out of Vite's module graph, exactly as the map requires.

**Sources:** [Vite SSR guide](https://vite.dev/guide/ssr) ·
[Environment API for frameworks](https://vite.dev/guide/api-environment-frameworks) ·
[SSR using ModuleRunner](https://vite.dev/changes/ssr-using-modulerunner) ·
Vite 8.2.1 typings/source as cited.

---

## 3. Two watchers, or one

### Answer: two, and that is correct — but the _server.js_ chokidar goes away entirely

They are not two watchers doing the same job. They watch different trees for different reasons:

|              | Vite's watcher                                      | `@fractality/core`'s watcher                                                                             |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| where        | `config.root` (+ config deps, env files, publicDir) | `Source#fullPath` — the user's `components/` and `docs/` dirs (`packages/core/src/mixins/source.js:125`) |
| purpose      | invalidate the module graph, drive HMR              | **rebuild the component tree** (`_parse()` → `_resolveTreeContext()`)                                    |
| ignores      | `**/node_modules/**` unconditionally (see ⚠️1)      | `/[/\\]\./` plus the source's `exclude` config                                                           |
| replaceable? | no                                                  | no                                                                                                       |

Vite's watcher cannot subsume core's: the user's component directory is normally **outside** Vite's
root (it's in the consumer's project, Vite's root is the theme), and even inside root the ignore
list would bite. And core's watcher does far more than notify — `source.js:147-162` re-resolves
context or calls `refresh()` before emitting `updated`. That work has no Vite equivalent.

Core's watcher cannot subsume Vite's either: it has no module graph.

### What _can_ be reused, and how

`server.watcher` is a live chokidar `FSWatcher` (`vite/dist/node/index.d.ts:2679`), and **every**
path it emits for — including ones added later via `server.watcher.add()` — is funnelled into the
`hotUpdate`/`handleHotUpdate` hooks:

```js
// vite/dist/node/chunks/node.js:26539-26547
watcher.on("change", (file) => { onFileChange(file)…   });   // → onHMRUpdate("update", file)
watcher.on("add",    (file) => { onFileAddUnlink(file, false)… });  // → onHMRUpdate("create", …)
watcher.on("unlink", (file) => { onFileAddUnlink(file, true)…  });  // → onHMRUpdate("delete", …)
```

So _in principle_ `server.watcher.add(componentsDir)` gives you one watcher. **In practice, don't** —
you would then have to re-implement core's rebuild sequencing inside a Vite hook, and you'd inherit
the node_modules ignore for free. Keep `Source#watch()` as the authority on "the tree changed", and
use Vite purely as the transport (Q4).

### What replaces browser-sync

browser-sync currently does three things (`packages/web/src/server.js:118-191`), and they split
three ways:

1. **Proxy + snippet injection + reload broadcast** on `source:updated` (line 143-145) → replaced by
   a custom HMR event over Vite's WebSocket (Q4). Note this is a **behaviour upgrade**: today
   `syncServer.reload()` broadcasts to _every_ connected client, so a pattern edit reloads the Frame
   _and_ the iframe, losing all Frame state. The new model reloads only the iframe.
2. **The chokidar watch over `theme.static()` dirs** (lines 148-160) → **deleted**. Those are the
   theme's own `dist/` assets; under Vite they are either module-graph members (real HMR, including
   CSS hot-swap without reload) or `publicDir` files that Vite already watches.
3. **A second port + its own HTTP server** → deleted, _provided_ `server.ws.server` is set (⚠️2).
   `findPorts()` (server.js:294-340) collapses to a single-port lookup and `_startSync`,
   `isSynced`, `_ports.sync`, `_urls.sync` all go with it.

This matches the map's "browser-sync and most chokidar wiring in `packages/web/src/server.js` go
away" precisely: **all** chokidar in `server.js` goes; the chokidar in
`packages/core/src/mixins/source.js` stays and must stay.

One consequence to plan for: `renderEnv`/`env` currently advertises `sync` and `syncPort`
(`server.js:201-208`) and mandelbrot gates client-side shell persistence on
`frctl.env == 'server'` (per the map, `packages/mandelbrot/assets/js/mandelbrot.js:24`). Both of
those flags lose their meaning under the new model.

**Sources:** Vite 8.2.1 source as cited ·
[server.watch](https://vite.dev/config/server-options#server-watch) ·
[Dependency Pre-Bundling / linked deps](https://vite.dev/guide/dep-pre-bundling) ·
[vitejs/vite#8619 — can't watch specific deps in node_modules](https://github.com/vitejs/vite/issues/8619)

---

## 4. HMR across the iframe boundary

**Yes, the split is expressible cleanly, and it is not a hack — it's the documented
client-server-communication path.** The mechanism has three parts.

### 4a. Why `full-reload` is the wrong tool

The obvious idea — send `{ type: 'full-reload' }` when a pattern changes — is wrong, and the client
source says why:

```js
// vite/dist/client/client.mjs:1008-1016
case "full-reload":
    if (payload.ifFallback && !globalThis.__vite_is_fallback_page__) break;
    await activeHmrClient.notifyListeners("vite:beforeFullReload", payload);
    if (hasDocument) if (payload.path && payload.path.endsWith(".html")) {
        const pagePath = decodeURI(location.pathname);
        const payloadPath = base + payload.path.slice(1);
        if (pagePath === payloadPath || payload.path === "/index.html" || …) pageReload();
        return;
    } else pageReload();
```

`hot.send()` **broadcasts to every connected client**, and each one that has a `document` calls
`location.reload()` on _itself_. The Preview iframe has no Vite client (we never ran its HTML
through `transformIndexHtml` — Q2), so the only client that would hear it is the **Frame**, which is
exactly the document that must survive. `FullReloadPayload.path` narrows only by `.html` filename,
not by frame, so it can't be used to target the iframe either
(`vite/types/hmrPayload.d.ts:59-71`).

There is no per-frame targeting in `full-reload`. Don't use it for patterns.

### 4b. The split: a custom event for patterns, ordinary HMR for the Frame

Two independent channels over one WebSocket:

- **Frame file changes** → Vite's normal pipeline. The Frame's modules are in the graph;
  `import.meta.hot.accept()` boundaries apply; CSS hot-swaps without reload. Nothing to build.
- **Pattern file changes** → a namespaced custom event that carries data, triggers no Vite machinery,
  and leaves it to the Frame to decide what to do.

Server side — driven off **core's** `source:updated`, not Vite's watcher, because
`source:updated` is emitted _after_ the rebuild resolves (`packages/core/src/mixins/source.js:152-161`)
and therefore never announces a tree that isn't ready:

```js
// in the dev host, after createServer()
app.on('source:updated', (source, data) => {
    vite.environments.client.hot.send({
        type: 'custom',
        event: 'fractality:pattern-update',
        data: { path: data.path, source: source.name, event: data.event },
    });
});
```

Client side, in a Frame module:

```js
if (import.meta.hot) {
    import.meta.hot.on('fractality:pattern-update', (data) => {
        preview.reload(data); // Q4c — iframe only
        tree.refetch(); // nav payload may have changed
    });
}
```

Docs: _"Plugins can broadcast events… We recommend **always prefixing** your event names to avoid
collisions with other plugins"_, with the client listening via `import.meta.hot.on(event, cb)`
([Client-server communication](https://vite.dev/guide/api-plugin#client-server-communication),
[HMR API](https://vite.dev/guide/api-hmr)). The reverse direction exists too —
`import.meta.hot.send()` on the client, `hot.on(event, (data, client) => client.send(…))` on the
server, where `client` is a single `NormalizedHotChannelClient`
(`vite/dist/node/index.d.ts:1257-1290`) — useful later if the Frame needs to _ask_ for a rerender.

**Listener lifecycle is safe.** `createHotContext(ownerPath)` prunes that owner's stale listeners
and re-registers the new ones on every module re-execution
(`vite/dist/client/client.mjs:49-55`), so a Frame module that both registers the listener and gets
hot-replaced does not accumulate duplicates or lose the handler.

### 4c. Reloading the iframe from the parent

The Preview is served from the same origin as the Frame (both come out of the one Express host), so
the parent has full DOM access:

> _"Access to the `Window` returned by `contentWindow` is subject to the rules defined by the
> same-origin policy, meaning that if the iframe is same-origin with the parent, then the parent can
> access the iframe's document and its internal DOM"_
> — [MDN HTMLIFrameElement.contentWindow](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/contentWindow)

```js
// same URL, just re-fetch it
iframe.contentWindow.location.reload();

// different URL (variant switch), without polluting history
iframe.contentWindow.location.replace(nextPreviewUrl);
```

The parent document is untouched — no navigation, so open panels, scroll position, tree expansion
and any in-memory state all survive by construction. This is not "state preservation" logic to
write; it's the absence of a reload.

**Do not use `iframe.src = url` for this.** Per MDN, _"The navigations of each embedded browsing
context are linearized into the session history of the **topmost** browsing context"_
([`<iframe>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)) — so
every preview refresh becomes a Back-button step in the Frame's history.
`location.reload()` re-fetches without creating an entry, and `location.replace()` explicitly
_"the current page will not be saved in session History, meaning the user won't be able to use the
back button to navigate to it"_
([MDN Location.replace](https://developer.mozilla.org/en-US/docs/Web/API/Location/replace)).
`reload()` throws `SecurityError` only cross-origin
([MDN Location.reload](https://developer.mozilla.org/en-US/docs/Web/API/Location/reload)) — not our
case. Note MDN's caveat that browsers throttle rapid navigations; debounce the handler if a
formatter-on-save fires several `source:updated` events in a burst.

The existing `packages/mandelbrot/assets/js/components/preview.js:70-78` already holds
`this._iframe` and `this._previewIframeWindow = this._iframe.get(0).contentWindow`, so the hook
point exists today.

### 4d. If you ever _do_ want the plugin to own the decision

Should pattern files ever land inside Vite's root, the `hotUpdate` hook is the correct place —
note it fires for **`create`/`update`/`delete`**, whereas the legacy `handleHotUpdate` is invoked
only for `type === "update"` (`vite/dist/node/chunks/node.js:27004`), and component add/remove
matters here:

```js
{
    name: 'fractality:pattern-hmr',
    hotUpdate({ type, file }) {
        if (!isPatternFile(file)) return;
        this.environment.hot.send({
            type: 'custom',
            event: 'fractality:pattern-update',
            data: { path: file, event: type },
        });
        return [];   // suppress Vite's own handling
    },
}
```

Returning `[]` is the documented way to _"perform complete custom HMR handling by sending custom
events to the client"_ ([handleHotUpdate](https://vite.dev/guide/api-plugin#handlehotupdate)).
Vite's own deprecation table reads _"Plugin hook `handleHotUpdate()` is replaced with `hotUpdate()`"_
(`node.js:5932`), and `HotUpdateOptions` carries `type` where `HmrContext` does not
(`vite/dist/node/index.d.ts:1209-1222`) — use `hotUpdate`.

Reassuringly, **doing nothing is already safe**: if a watched file maps to no module, Vite logs
`[no modules matched]` and sends nothing at all — only `.html` files with no modules trigger a
`full-reload` (`node.js:27040-27053`). So a stray `.nunj`/`.hbs`/`.twig` under root cannot
accidentally reload the Frame.

**Sources:** [HMR API](https://vite.dev/guide/api-hmr) ·
[Client-server communication](https://vite.dev/guide/api-plugin#client-server-communication) ·
[hotUpdate hook](https://vite.dev/changes/hotupdate-hook) ·
[MDN contentWindow](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/contentWindow) ·
[MDN Location.reload](https://developer.mozilla.org/en-US/docs/Web/API/Location/reload) ·
[MDN Location.replace](https://developer.mozilla.org/en-US/docs/Web/API/Location/replace) ·
[MDN `<iframe>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) ·
Vite 8.2.1 client/server source as cited.

**Prior art:** Storybook solves the same manager/preview split, but with a _different_ trade-off —
its preview iframe is itself a Vite-built bundle with its own HMR client, and manager↔preview talk
over a `postMessage` channel, not Vite's. It reloads the preview iframe on story-file change rather
than attempting HMR
([storybook#22553](https://github.com/storybookjs/storybook/issues/22553),
[builder-vite#53](https://github.com/storybookjs/builder-vite/pull/53)). Fractality can't copy that
shape: the map fixes patterns as engine-rendered and explicitly not Vite modules, so the custom-event
route above is the one that fits.

---

## 5. Gating on rebuild — does middleware mode preserve ADR 0001?

**Read of the ADR.** [ADR 0001](../../../docs/adr/0001-gate-requests-on-source-rebuild.md) records
that a source _"publishes the newly parsed entities into the live collection partway through that
rebuild — before their context has finished resolving"_, and that the fix is `Source#whenIdle()` /
`Fractality#whenIdle()`, backed by the `_loading` promise that spans the full rebuild, awaited
_before handling each request_. The ADR's own summary of the trade-off is that a request arriving
mid-rebuild **waits**, rather than being served corrupt data.

The implementation is exactly two lines of leverage:

```js
// packages/web/src/server.js:193-198
_onRequest(req, res, next) {
    this._app.whenIdle().then(() => this._handleRequest(req, res, next)).catch(next);
}
```

```js
// packages/core/src/mixins/source.js:60-62
whenIdle() { return this._loading || Promise.resolve(this); }
```

and `Fractality#whenIdle()` (`packages/fractality/src/fractal.js:102-103`) is
`Promise.all(sources.map(s => s.whenIdle()))`.

### Verdict: middleware mode preserves it — but only if you move the gate deliberately

The guarantee has **nothing to do with the HTTP server**. It is a per-request `await` on a promise
owned by core. Vite neither knows nor cares. Nothing in middleware mode weakens it.

What _does_ break it is an accident of refactoring, and it is easy to commit:

> Today the gate sits on `_server.get('*path', this._onRequest)` — a **single catch-all**, so every
> route that reads the tree is covered by construction. The proposed architecture replaces that one
> route with several (adapter routes, Frame catch-all, and — new — the tree/detail **JSON payload
> endpoints** the client-owned Frame will fetch). **Each of those must await `whenIdle()`
> individually.** Miss one and ADR 0001 is silently void for that route, with no test catching it,
> because the failure window is milliseconds wide.

The mitigation is structural: keep the gate as one shared middleware registered _before_ every
tree-reading handler, rather than open-coding `.whenIdle()` per route.

```js
const gateOnIdle = (req, res, next) => {
    app.whenIdle().then(() => next(), next);
};
```

### Four specifics worth writing into the spec

1. **Vite's own middlewares must _not_ be gated.** `/@vite/client`, module transforms and `/@fs/`
   reads never touch the component tree. Gating them would stall HMR behind unrelated rebuilds for
   no benefit. Register `gateOnIdle` per-route (as above), not as a global `app.use` ahead of Vite.

2. **The SSR entry is a tree reader too.** If the Frame's `entry-server.js` — loaded via
   `env.runner.import()` — walks `app.components` to prerender, that render path must sit behind the
   same gate. `runner.import()` does not gate anything itself.

3. **The Q4 custom event does not need its own gate, and gets ADR 0001 for free.** `source:updated`
   already fires post-rebuild (`source.js:152-161`). Even in the worst case — event fires early, or
   a second edit lands during the iframe's round-trip — the iframe's reload is an ordinary HTTP
   request to `/components/preview/:handle`, which passes through `gateOnIdle` and simply waits.
   The gate is a per-request await, not a broadcast-ordering guarantee, which is precisely why it
   composes with an async reload signal.

4. **Do not gate on Vite's `hotUpdate` instead.** `hotUpdate` fires from Vite's raw watcher with no
   knowledge of core's rebuild state; wiring the pattern-reload event there would fire _before_ the
   tree is consistent. It would still be _safe_ (point 3), but it would produce a needless
   reload-then-wait. `source:updated` is the correct trigger.

**Bottom line for the ticket:** middleware mode **preserves** ADR 0001. The ADR needs no revision.
What it needs is a line in the implementation spec making the gate a named, shared middleware
applied to every tree-reading route, so that fanning the single catch-all out into many routes
cannot silently drop it.

---

## Constraint check against the map

| Map constraint                                                                                | Status                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite in middleware mode inside a thin Express host                                            | ✅ Works. Two operational caveats: port 24678 (⚠️2), and the catch-all must move after `vite.middlewares` (Q1).                                                                                           |
| Host keeps `/components/preview/:handle`, `/components/render/:handle` as ordinary middleware | ✅ `appType: 'custom'` removes Vite's HTML/404 middlewares entirely; nothing competes for those URLs.                                                                                                     |
| The user's templates are not Vite modules and must never enter its graph                      | ✅ Guaranteed by one rule: never pass Preview HTML through `vite.transformIndexHtml()`. Nothing else pulls them in.                                                                                       |
| browser-sync and most chokidar wiring in `server.js` go away                                  | ✅ All chokidar in `server.js` goes. `Source#watch()` in core stays and must stay (Q3).                                                                                                                   |
| Preview iframe reloads without tearing down the Frame                                         | ✅ Achievable, and a strict improvement on today's browser-sync broadcast, which reloads both.                                                                                                            |
| —                                                                                             | ⚠️ **In a consumer's project the Frame gets no HMR** (node_modules is unwatchable). Middleware mode's value there narrows to the WebSocket. Tension with ticket 02/05 — see ⚠️1. **`map.md` not edited.** |

## Open questions handed onward

- **Ticket 05:** given ⚠️1, is Vite middleware mode the dev architecture for _consumer_ projects, or
  only for theme development in this repo? If the latter, what serves the Frame in a consumer
  project, and does the pattern-reload event still need Vite's WebSocket or a plain one?
- **Ticket 07 (spec):** name the `gateOnIdle` middleware and enumerate every tree-reading route it
  must wrap, including the new JSON payload endpoints.
- **Spike-worthy:** confirm the port-24678 behaviour and the `server.ws.server` fix end-to-end
  against the real `packages/web/src/server.js`. Everything above is read from Vite 8.2.1's source
  and docs; it has not been run.
