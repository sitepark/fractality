# Research: Vite middleware mode alongside per-request adapter rendering

Part of [the map](../map.md)

Type: research
Status: resolved
Blocked by: —

## Question

Interactive mode puts Vite's dev server in **middleware mode** inside a thin Express host, which
keeps owning the routes that render the _user's_ templates. Those templates are not Vite modules
and must never enter its graph.

Establish, against primary sources (Vite docs on `createServer({ server: { middlewareMode: true } }`
and `ssrLoadModule`, Express 5, and real integrations):

1. **Composition order.** How Vite's middleware sits with Express 5 route handlers so that
   `/components/preview/:handle` and `/components/render/:handle` reach the adapters, while
   everything Frame-shaped goes to Vite. Watch for Express 5's changed router matching.
2. **Loading the Frame's SSR entry in dev.** `ssrLoadModule` versus a prebuilt bundle, and how that
   differs from what ticket 02 finds for production.
3. **Two watchers, or one.** Vite watches its own module graph; `@fractality/core` watches the
   user's component sources (`packages/web/src/server.js:150`, chokidar). Can Vite's watcher be
   reused, or must both run? What replaces browser-sync's reload?
4. **HMR across the iframe boundary — the interesting part.** When a _pattern_ file changes, the
   Preview iframe should reload while the Frame keeps its state (open panels, scroll, tree
   expansion). When a _Frame_ file changes, normal HMR. How is that split expressed, and can the
   iframe be reloaded from the parent without a full-page reload?
5. **Gating on rebuild.** ADR 0001 gates requests on source rebuild. Read it and report whether
   middleware mode preserves or breaks that guarantee.

**Deliverable:** findings captured as a Markdown file in the repo per the `/research` skill, with a
pointer added to this ticket's `## Answer`. Flag anything that contradicts the map's fixed
constraints rather than quietly working around it.

## Answer

Findings: [research/vite-middleware-adapter-rendering.md](../research/vite-middleware-adapter-rendering.md)
(verified against Vite 8.2.1, Express 5.2.1, path-to-regexp 8.4.2 — docs plus shipped source).

1. **Composition.** `appType: 'custom'` drops Vite's HTML-fallback/404 middlewares, so Vite never
   terminates a request it doesn't recognise and ordering is free. Register the engine routes
   _before_ `app.use(vite.middlewares)` and the Frame catch-all _after_ — verified locally that
   `'*path'` matches `/@vite/client`, so today's `server.js:288` catch-all would swallow HMR whole.
2. **Dev SSR entry.** `ssrLoadModule` still works in Vite 8 but is future-deprecated; write
   `vite.environments.ssr.runner.import()` now. `transformIndexHtml` is the _only_ thing injecting
   `/@vite/client` — call it on the Frame's HTML, never on the Preview's. That one rule is what
   keeps the user's patterns out of Vite's graph.
3. **Watchers.** Two, permanently. `Source#watch()` rebuilds the tree and has no Vite equivalent;
   Vite ignores `**/node_modules/**` unconditionally. All chokidar in `server.js` does go.
4. **HMR split — clean.** `full-reload` is wrong (broadcasts; only the Frame would hear it and
   reload itself). Use a namespaced custom event fired off core's post-rebuild `source:updated`;
   the Frame handles it with `iframe.contentWindow.location.reload()` (same-origin). Frame state
   survives by construction — the parent never navigates. Strictly better than today, where
   browser-sync reloads both.
5. **ADR 0001 preserved.** The gate is a per-request `await` on core's `_loading`; middleware mode
   is irrelevant to it. Real risk is refactoring: one catch-all becomes many routes, so make
   `gateOnIdle` a shared middleware on every tree-reading route (including the new JSON endpoints).

⚠️ **Flagged, not worked around:** (a) in a _consumer's_ project the Frame gets **no HMR** —
node_modules is unwatchable — so middleware mode's value there narrows to the WebSocket; real
tension with ticket 02's prebuilt-bundle crux, for **ticket 05** to settle. (b) Middleware mode
opens a second HTTP server on port **24678** unless the host passes its own `http.Server` as
`server.ws.server`. `map.md` not edited.
