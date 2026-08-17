# Context Map

Fractality is a component-library and styleguide generator: it reads a directory of component
source files and turns it into a browsable site. This repo is a pnpm/lerna monorepo, and each
package is its own context.

## Contexts

- [core](./packages/core/CONTEXT.md) — the entity model: how source files on disk become a tree of
  addressable things
- [fractality](./packages/fractality/CONTEXT.md) — the concrete library API (components, variants,
  docs, assets) and the CLI
- [web](./packages/web/CONTEXT.md) — turns a library into a browsable site: dev server, static
  builder, and the data contract a theme renders from
- [mandelbrot](./packages/mandelbrot/CONTEXT.md) — the default theme: the tool's own UI
- **adapters** — `handlebars`, `nunjucks`, `twig`, `react`. Each renders the _user's_ patterns in
  one template language. They share `core`'s Adapter vocabulary and have no terms of their own.

## Relationships

- **core → fractality**: `fractality` supplies the concrete entity types that `core`'s tree is made
  of. Handle, Entity, Collection and Source are `core`'s language; Component, Variant, Doc and Asset
  are `fractality`'s.
- **fractality → web**: `web` reads the loaded library and serialises it. Nothing flows back — `web`
  never mutates the library.
- **web ↔ mandelbrot**: `web` owns the data contract; `mandelbrot` is one consumer of it. The
  contract is public, so third-party themes are peers of mandelbrot, not special cases.
- **adapters → web**: adapters render patterns into the Preview. They are deliberately outside the
  Frame's own rendering — the two never share a template engine or a React copy.

## Related documentation

- `docs/adr/` — system-wide decisions
- `packages/<name>/docs/adr/` — package-scoped decisions
- `docs/specs/` — approved designs not yet implemented
- `docs/agents/domain.md` — how agents should consume these files

> **Note for the next major.** `docs/specs/client-rendered-frame.md` changes several of the terms
> below: the Frame becomes client-rendered, **Skin** is retired, and **Plugin** and the payload terms
> are introduced. `packages/web/CONTEXT.md`'s payload vocabulary names that design and is not yet in
> the code; the note there should be deleted once it is.
