# Migrating to `@fractality/web` 1.0

The tool's own interface — the **Frame** — is now rendered in the browser from a
documented data contract instead of being rendered on the server from templates.

Most of this guide is for people who wrote a theme. **If you only use Fractality,
read the first section and stop** — it is short, and everything after it is about
authoring themes.

Why this happened, and the measurements behind it:
[ADR 0005](../adr/0005-client-render-the-frame.md).

---

## If you just use Fractality

Three things change for you. None of them touch your components.

### Named skins are removed

`skin: 'blue'` and the other sixteen no longer exist. Set the colours directly —
this form has always been supported, so most people can express what they had:

```js
mandelbrot({
    skin: { accent: '#0089ff', complement: '#666', links: '#0089ff' },
});
```

If you want more than that, `styles` still accepts a URL to your own stylesheet.

### `dist/` must be served from the path it was built for

The built output now references the theme's assets with absolute URLs derived
from `static.mount`. Previously each page linked to them relatively, so the
directory could be moved anywhere after building.

**This one fails quietly**: the build succeeds and the site looks fine until it
is served from somewhere other than the configured mount, at which point every
stylesheet and script 404s. If you deploy into a subdirectory, set `static.mount`
to match it.

### Opening `dist/index.html` from disk no longer works

The Frame fetches its data, and browsers refuse `fetch` from `file://` URLs
regardless of how the path is written — the page loads and then stays empty.
Serve the directory over HTTP instead; any static server will do.

This is a real regression against 0.x, and there is no workaround that keeps the
rest of the model intact.

### `_env` in your own patterns is smaller, but still there

`{{#if _env.server}}`, `_env.builder` and the `path` helper all keep working:
`@fractality/web` still tells your patterns which of the two modes rendered them.

`_env.request` is trimmed to what a static build can honestly answer — `path`,
`url`, `segments`, `params`, `query` and `headers`. There is no request behind it
in a build, so `route`, `error`, `errorStatus` and `isPjax` are gone. `path` is
the URL of the Preview document itself, as before.

---

## If you wrote a theme

Themes no longer render. A theme now contributes a **route table**, its **static
assets**, and a **Shell** — an HTML document its Frame boots from — and the Frame
renders everything from the data contract. There is no template engine left in
`@fractality/web` to render a view with.

### What was removed

| Removed                                            | Replacement                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `Engine`, `AsyncNunjucksEnvironment` exports       | none — the nunjucks engine is gone entirely                               |
| `addRoute(url, { view })`                          | `addRoute` survives **without** `view`; resolvers are unchanged           |
| `Theme#addLoadPath()` / `#loadPaths()`             | none today — see _Custom panels_ below                                    |
| `Theme#setErrorView()` / `#errorView()`            | none; `@fractality/web` renders render-failures itself                    |
| `Theme#setRedirectView()` / `#redirectView()`      | none                                                                      |
| `addRoute(url, { static })`                        | none — `@fractality/web` serves component files itself, see below         |
| `render` filter (template syntax inside doc pages) | none — documentation is plain Markdown                                    |
| `information[].format` (a function)                | a declarative descriptor; functions cannot cross a JSON wire              |
| `request.isPjax`                                   | none                                                                      |
| browser-sync (`--sync`)                            | Vite's websocket reloads the Preview iframe; the Frame is never torn down |

Still there and unchanged: `Theme#addStatic()`, `Theme#addResolver()`,
`Theme#resolvers()`, `Builder`, `Server`, `Theme`, `Web`, `WebError`.

### What a theme must now do

```js
import { Theme, CONTRACT_VERSION } from '@fractality/web';

const theme = new Theme(config);

// Declare which data contract you were written against. Do not skip this: a
// theme that declares nothing is treated as a 0.x theme and refused.
theme.setContractVersion(CONTRACT_VERSION);

// Where your built assets live, as before.
theme.addStatic(path.join(__dirname, '..', 'dist'), `/${config.static.mount}`);

// The HTML your Frame boots from. This replaces every view you used to render.
theme.setShell(path.join(__dirname, '..', 'dist', 'frame', 'index.html'));
```

Your Shell must live **inside one of your static mounts** — its asset URLs are
resolved relative to where it sits within that mount.

### A component's own files are served for you

A theme used to declare a route for them and hand back a filesystem path.
`@fractality/web` serves them itself now, at the same URLs —
`/components/raw/<handle>/<file>` — and the resources payload carries the URL of
every file, so a Frame links what it is given rather than constructing paths:

```js
import type { ResourcesPayload } from '@fractality/web/contract';
```

Remove any route you declared for this. `{ static }` is no longer honoured, and
the file is looked up in the library rather than resolved from the request path,
which also closes the traversal the old resolver allowed.

### Reading the data

`@fractality/web` publishes the contract as TypeScript declarations:

```js
import type { TreePayload, EntityPayload } from '@fractality/web/contract';
import { payloadPathFor } from '@fractality/web/addressing';
```

Your Frame derives a payload URL from its own location — strip a trailing
`.html`, append the panel segment — and the same URLs work in development and in
a static build. You do not need to know which mode you are in.

Writing your theme in TypeScript is optional. The Frame shipped with Fractality
is TypeScript; yours does not have to be.

### Custom panels and nav sections

Adding a **new** panel is not currently possible: `addLoadPath()` is gone and the
plugin API that replaces it is still being designed. You can select and reorder
the built-in panels through configuration, as before.

If you are blocked on this, say so on the issue tracker — it is the main thing
holding the plugin API's design open.

---

## Versions

`@fractality/web` goes to **1.0.0**. Themes should require `">= 1 < 2"`.

The version deliberately crosses the `< 1` boundary that existing themes peer
against, so an incompatible pairing is rejected at install time rather than
failing mysteriously later. npm errors on this; **pnpm only warns** unless
`strict-peer-dependencies` is set, so `@fractality/web` also refuses at theme
registration, before anything renders, with a message naming the versions
involved.

**0.3.x is frozen.** No backports, no security fixes. Maintaining two rendering
models is the cost this release exists to stop paying.
