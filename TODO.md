## Maintanance
- [ ] Write Changelog & Migration Guide
- [ ] replace imports of `package.json` for better support
- [ ] Figure out how to deal with `__dirname`
- [ ] Re-implement beautify filter
- Migrate Packages to ESM
  - [x] core
  - [x] fractal
  - [x] handlebars
  - [x] mandelbrot
  - [x] nunjucks
  - [ ] react
  - [x] twig
  - [x] web
- [ ] Update all dependencies
- Migrate Examples
  - [x] adapter-tests
  - [x] handlebars
  - [x] nunjucks
  - [ ] react
  - [x] twig
- Make tests pass
  - packages
    - [x] core
    - [x] fractal
    - [x] handlebars
    - [x] mandelbrot
    - [x] nunjucks
    - [x] react
    - [x] twig
    - [x] web
  - examples
    - [x] handlebars
    - [ ] nunjucks
    - [ ] react
    - [x] twig
- [ ] migrate to vite & vitest

## Features
- [ ] Convert to Typescript
- [ ] Provide Types for Component-Data
  ```ts
  import { defineComponent } from "@frctl/fractal"
  export default defineComponent({
    name: "button"
  });
  ```
- [ ] Multiple Adapters at once - eg. using react with handlebars

