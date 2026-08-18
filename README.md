<!-- markdownlint-disable MD033 MD041 -->
<p align=center>
  <a href="https://fractal.build/" align=center>
    <img
        src="https://d33wubrfki0l68.cloudfront.net/5d2e88eb1e2b69f3f8b3a3372b6e4b3b4f095130/2159b/hero.png"
        alt=""
        width="110px">
  </a>
  <h1 align="center">Fractality</h1>
</p>

<br />
<div align="center">
  <!-- Github Actions -->
  <a href="https://github.com/sitepark/fractality/actions/workflows/test.yml" title="Build status">
    <img src="https://github.com/sitepark/fractality/actions/workflows/test.yml/badge.svg" alt="">
  </a>
  <!-- NPM Version -->
  <a href="https://www.npmjs.com/package/@fractality/fractality" title="Current version">
    <img src="https://img.shields.io/npm/v/@fractality/fractality.svg" alt="">
  </a>
  <!-- NPM Downloads -->
  <a href="https://www.npmjs.com/package/@fractality/fractality" title="NPM monthly downloads">
    <img src="https://img.shields.io/npm/dm/@fractality/fractality" alt="">
  </a>
  <!-- License -->
  <a href="https://github.com/sitepark/fractality/blob/main/LICENSE" title="MIT license">
    <img alt="GitHub" src="https://img.shields.io/github/license/sitepark/fractality">
  </a>
</div>

<br />

Fractality is a tool to help you **build** and **document** website component libraries and design systems.

[Read the full Fractality documentation][docs]

## Fork

Fractality is a fork of the popular [Fractal](https://github.com/frctl/fractal)-Project.

## Introduction

Component (or pattern) libraries are a way of designing and building websites in a modular fashion, breaking up the UI into small, reusable chunks that can then later be assembled in a variety of ways to build anything from larger components right up to whole pages.

Fractality helps you assemble, preview and document website component libraries, or even scale up to document entire design systems for your organisation.

Check out the [documentation][docs] for more information.

## Requirements

You'll need a [supported LTS version](https://github.com/nodejs/Release) of Node. Fractality may work on unsupported versions, but there is no active support from Fractality and new features may not be backwards compatible with EOL versions of Node.

## Getting started

### Install into your project (recommended)

```shell
npm install @fractality/fractality --save-dev
```

Then create your `fractality.config.js` file in the project root, and configure using the [official documentation][docs].

Then you can either run `npx fractality start` to start up the project, or create an alias under the `scripts` section in your package.json as a shortcut.

e.g.

```json
"scripts": {
    "fractality:start": "fractality start",
    "fractality:build": "fractality build"
}
```

then

```shell
pnpm run fractality:start
```

### Installing globally

```shell
pnpm i -g @fractality/fractality
```

This will also give you global access to the `fractality` command which you can use to scaffold a new Fractality project with `fractality new`.

The downside is that it's then difficult to use different Fractality versions on different projects.

This option is not recommended until a global Fractality install is capable of offloading to a project specific version.

## Examples

- Official demo (using Nunjucks): [demo.fractal.build](https://demo.fractal.build/)

    Repository: [demo.fractal.build](https://github.com/frctl/demo.fractal.build)

- Official examples are available in the [examples](./examples) directory. Although we primarily use them for developing and testing Fractal, they probably are a great resource for users as well.
- Additional public examples can be found on the [Awesome Fractal](https://github.com/frctl/awesome-fractal) repo.

## Contributing

Please note we have a [code of conduct](.github/CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

### Reporting issues & requesting features

We use GitHub issues to track bugs and feature requests. Thank your for taking the time to submit your issue to [sitepark/fractality](https://github.com/sitepark/fractality/issues).

### Submitting pull requests

Please submit PRs against `main` branch with an explanation of your intention.

We use [conventional commits](https://www.conventionalcommits.org/), which means that every pull request title should conform to the standard.

### Development

This repository is a [pnpm workspaces](https://pnpm.io/workspaces) monorepo. There is a single lockfile in root, and the packages under [packages](./packages) and [examples](./examples) reference each other through the `workspace:*` protocol, so pnpm links them from your working tree — no separate bootstrap step is needed. Lerna is only used to version and publish releases from CI.

You need Node.js >= 22.13.0. The pnpm version is pinned via the `packageManager` field, so enable [corepack](https://nodejs.org/api/corepack.html) (`corepack enable`) or install the matching pnpm yourself.

To get started, run `pnpm install` in root. That is the whole setup.

Useful scripts, all run from root:

- `pnpm test` — run the test suite
- `pnpm validate` — lint JavaScript (ESLint) and SCSS (Stylelint)
- `pnpm format` — format everything with Prettier

Prettier also runs automatically on staged files via a Husky pre-commit hook, so formatting is taken care of for you. The linters are not part of the hook — run `pnpm validate` yourself before pushing.

### Releasing

Versions and changelogs are derived from [Conventional Commits](https://www.conventionalcommits.org), so please write your commit messages accordingly — `fix(core): …`, `feat(web): …`. See [Releasing](docs/RELEASING.md) for how a release is cut.

## Testing

Fractality is a project that evolved rapidly and organically from a proof-of-concept prototype into a more stable, mature tool. Because of this it's currently pretty far behind where it should be in terms of test coverage. Any contributions on this front would be most welcome!

Existing tests can be run using the `pnpm test` command.

## Contributors ✨

Thanks goes to [all wonderful people](https://github.com/frctl/fractal/graphs/contributors) who have helped us out.

Contributions of any kind welcome!

## License

[MIT](https://github.com/sitepark/fractality/blob/main/LICENSE)

[docs]: https://fractal.build
