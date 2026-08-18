# Migrating from `@frctl/fractal` to `@fractality/*`

This guide covers migrating a real CommonJS-based Fractal project (the typical shape: `fractal.config.js` using `require()`/`module.exports`, a custom Mandelbrot theme, custom Handlebars helpers/partials) to this fork. It was validated end-to-end against a real, large production styleguide (194 components, custom theme, custom helpers/partials from three separate packages) — the fork produced an identical component tree and byte-identical raw component output.

## 1. Package names

Replace every `@frctl/*` dependency with its `@fractality/*` equivalent:

| Before              | After                    |
| ------------------- | ------------------------ |
| `@frctl/fractal`    | `@fractality/fractality` |
| `@frctl/handlebars` | `@fractality/handlebars` |
| `@frctl/mandelbrot` | `@fractality/mandelbrot` |
| `@frctl/nunjucks`   | `@fractality/nunjucks`   |
| `@frctl/twig`       | `@fractality/twig`       |
| `@frctl/react`      | `@fractality/react`      |

The CLI binary is also renamed: `fractal build` / `fractal start` become `fractality build` / `fractality start`.

## 2. The real blocker: CommonJS → ESM

Every `@fractality/*` package is ESM-only (`"type": "module"`, no CJS build). Node's native `require()` **can** load an ESM-only package (`require(esm)` is supported in modern Node), but it does **not** unwrap a `default` export automatically the way a bundler's CJS/ESM interop would. Concretely:

```js
// Before (CJS, @frctl/*)
const handlebars = require('@frctl/handlebars');
handlebars({ helpers: {...} }); // handlebars is directly callable

// After, if you keep using require() as-is (BREAKS):
const handlebars = require('@fractality/handlebars');
handlebars({ helpers: {...} }); // TypeError: handlebars is not a function
// require() actually returns { __esModule: true, default: <the real thing> }
```

`@fractality/fractality` itself is the one exception — it has a named `create` export in addition to its default export, so `const { create } = require('@fractality/fractality')` still works. Every adapter/theme package (`handlebars`, `mandelbrot`, `nunjucks`, `twig`, `react`) is default-export-only and **will** break under plain `require()`.

**The supported path is converting your config to real ESM**, not chasing `.default` on every require call. In practice this means:

- Rename `fractal.config.js` → `fractal.config.mjs` (or `fractality.config.mjs`; the legacy `fractal.config.js`/`fractal.js` filenames still work but print a deprecation notice) and your theme/extension entry files similarly.
- Replace `require`/`module.exports` with `import`/`export default`.
- Replace `__dirname`/`__filename` with the standard ESM equivalent:
    ```js
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    ```
- For helper/partial modules that are themselves still CommonJS (common for older internal packages), keep loading them with `require()` via `createRequire` rather than converting them too — that's often out of scope for the Fractal migration itself:
    ```js
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const helpers = require('./my-legacy-helpers.js');
    ```

### Before / after example

```js
// fractal.config.js (before)
const { create } = require('@frctl/fractal');
const handlebars = require('@frctl/handlebars');
const path = require('node:path');
const fractal = create();
fractal.web.theme(require('./theme'));
fractal.components.engine(handlebars({ helpers: { ...require('./helpers') } }));
module.exports = fractal;
```

```js
// fractal.config.mjs (after)
import { create } from '@fractality/fractality';
import handlebars from '@fractality/handlebars';
import path from 'node:path';
import { createRequire } from 'node:module';
import theme from './theme/index.mjs';
const require = createRequire(import.meta.url);
const fractal = create();
fractal.web.theme(theme);
fractal.components.engine(handlebars({ helpers: { ...require('./helpers') } }));
export default fractal;
```

Do the same conversion for any custom theme file (`theme/index.js` → `theme/index.mjs`), converting its `require('@frctl/mandelbrot')` to `import mandelbrot from '@fractality/mandelbrot'` and its `module.exports = theme` to `export default theme`.

## 3. Testing your migration before rolling it out

Since `@fractality/*` isn't a byte-for-byte drop-in (step 2 above is a real, one-time cost), verify the migration by diffing build output rather than trusting it blindly:

1. Build once with the project unmodified (`@frctl/fractal`) to a reference directory.
2. Apply the changes in this guide, build again to a separate directory.
3. `diff -rq` the two build outputs. Expect differences in: build timestamps, any component context that uses non-seeded random data (e.g. Faker without a fixed seed), and small theme-version-related markup/asset-hash differences if your `@fractality/mandelbrot` version has diverged from your previous `@frctl/mandelbrot` version. Anything beyond that is worth investigating as a real incompatibility.

If you want to test unreleased/local changes to this fork itself (rather than the published npm packages) against a real consuming project without publishing: `pnpm pack` each `@fractality/*` package you need into tarballs, then add a `pnpm-workspace.yaml` to the consuming project (if it doesn't already have one) with an `overrides` section pointing every `@fractality/*` package at its local tarball path. A plain `file:` dependency on the package's _source directory_ is not enough — this fork's own packages reference each other via the `workspace:*` protocol internally, which only resolves inside an actual pnpm workspace.

## 4. Known cosmetic differences

- `cachebust=<version>` query strings on theme assets will change if your `@fractality/mandelbrot` version differs from whatever `@frctl/mandelbrot` version you were pinned to.
- Syntax-highlighted code blocks (context/JSON panels) may render with additional `hljs-punctuation` spans depending on the installed `highlight.js` version — a highlight.js grammar change, not a Fractal/Fractality difference.
