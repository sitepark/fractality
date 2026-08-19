# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.3.0](https://github.com/sitepark/fractality/compare/%40fractality%2Fnunjucks%402.2.3...%40fractality%2Fnunjucks%402.3.0) (2026-08-19)

### Bug Fixes

- **deps:** update dependencies ([3c598f9](https://github.com/sitepark/fractality/commit/3c598f95a148a151c97f0d3c3293ba924862155c))
- **nunjucks:** don't hang forever when context resolution fails ([e317763](https://github.com/sitepark/fractality/commit/e3177638f3f34c4f8ab9d97663f0d091c369f95e))
- use workspace protocol for inter-package dependencies ([79b0fd6](https://github.com/sitepark/fractality/commit/79b0fd6634ec319c7f6e8dcaebd385ee2a8181a3))

### Features

- add files allowlists and exports maps to all packages ([298d693](https://github.com/sitepark/fractality/commit/298d69391c96b5a2c6751eb87653b17796d36ab9))

## 2.2.3 (2024-09-24)

**Note:** Version bump only for package @fractality/nunjucks

## 2.2.2 (2024-09-20)

**Note:** Version bump only for package @fractality/nunjucks

## 2.2.1 (2024-09-20)

**Note:** Version bump only for package @fractality/nunjucks

# 2.2.0 (2024-09-20)

### Bug Fixes

- **engine:** update to remove deprecated flatten behaviour ([b89be05](https://github.com/frctl/fractal/commit/b89be05f091c9eb61b14c510b91eb3c548b849cd))
- fetch request context for README.md ([#13](https://github.com/frctl/fractal/issues/13)) ([dec6fea](https://github.com/frctl/fractal/commit/dec6feae727801f5a61291cd8cd1e167b37bee18))

### Features

- **partials:** support new handle-based import syntax ([2719df7](https://github.com/frctl/fractal/commit/2719df71a1e385b21a5c8d0cfb5be173e68269ad))
- replace bluebird with native promises ([1c8daa0](https://github.com/frctl/fractal/commit/1c8daa09a70962211ce550eff9a930ee3d9a9323))

# 2.1.0 (2024-03-19)

### Bug Fixes

- **engine:** update to remove deprecated flatten behaviour ([b89be05](https://github.com/frctl/fractal/commit/b89be05f091c9eb61b14c510b91eb3c548b849cd))
- fetch request context for README.md ([#13](https://github.com/frctl/fractal/issues/13)) ([dec6fea](https://github.com/frctl/fractal/commit/dec6feae727801f5a61291cd8cd1e167b37bee18))

### Features

- **partials:** support new handle-based import syntax ([2719df7](https://github.com/frctl/fractal/commit/2719df71a1e385b21a5c8d0cfb5be173e68269ad))
- replace bluebird with native promises ([1c8daa0](https://github.com/frctl/fractal/commit/1c8daa09a70962211ce550eff9a930ee3d9a9323))

## [2.0.15](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.14...@frctl/nunjucks@2.0.15) (2022-08-17)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.14](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.13...@frctl/nunjucks@2.0.14) (2022-01-26)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.13](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.12...@frctl/nunjucks@2.0.13) (2021-07-20)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.12](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.11...@frctl/nunjucks@2.0.12) (2021-07-19)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.11](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.10...@frctl/nunjucks@2.0.11) (2021-05-20)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.10](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.9...@frctl/nunjucks@2.0.10) (2021-03-23)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.9](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.8...@frctl/nunjucks@2.0.9) (2021-03-20)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.8](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.7...@frctl/nunjucks@2.0.8) (2021-02-14)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.7](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.6...@frctl/nunjucks@2.0.7) (2021-02-07)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.6](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.5...@frctl/nunjucks@2.0.6) (2020-12-22)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.5](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.4...@frctl/nunjucks@2.0.5) (2020-11-03)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.4](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.3...@frctl/nunjucks@2.0.4) (2020-10-19)

**Note:** Version bump only for package @frctl/nunjucks

## [2.0.3](https://github.com/frctl/fractal/compare/@frctl/nunjucks@2.0.2...@frctl/nunjucks@2.0.3) (2020-10-15)

**Note:** Version bump only for package @frctl/nunjucks

## 2.0.2

### Bug Fixes

- fetch request context for component notes file (#13)

### Chores

- bump lodash from 4.17.11 to 4.17.13 (#14)

## 2.0.1

- Fix issue with `render`and `view` tag output being escaped

## 2.0

- Update Nunjucks to v3.x
- Prevent array merging in `render` tag context data
- Enable autoescaping by default
- Add ability to provide environment configuration options

## 1.0.2

- [FIX] Fix issue with path filter in components rendered using the `render` extension.

## 1.0.1

- Provide support for future changes to `_` ('special') variables setting
- Update Nunjucks 2.3.0 -> 2.4.2

## 1.0.0

Initial release.
