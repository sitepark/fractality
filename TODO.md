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
  - [ ] twig
  - [x] web
- [ ] Update all dependencies
- Migrate Examples
  - [ ] adapter-tests
  - [x] handlebars
  - [x] nunjucks
  - [ ] react
  - [ ] twig
- Make tests pass
  - packages
    - [ ] core
    - [ ] fractal
    - [ ] handlebars
    - [ ] mandelbrot
    - [ ] nunjucks
    - [ ] react
    - [ ] twig
    - [ ] web

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

