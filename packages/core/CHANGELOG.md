# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.6.1](https://github.com/sitepark/fractality/compare/%40fractality%2Fcore%400.6.0...%40fractality%2Fcore%400.6.1) (2026-08-26)

### Performance Improvements

- **core:** stop materialising heritable props when deriving collections ([a68479f](https://github.com/sitepark/fractality/commit/a68479f4feb247d828c55ff42aa28237b4e86b97)), closes [Collection#newSelf](https://github.com/Collection/issues/newSelf)

# [0.6.0](https://github.com/sitepark/fractality/compare/%40fractality%2Fcore%400.5.3...%40fractality%2Fcore%400.6.0) (2026-08-19)

### Bug Fixes

- clear cjs cache before loading cjs modules ([c0af387](https://github.com/sitepark/fractality/commit/c0af387b55026e5b95f179d6a495f77905375234))
- **core,fractality,web:** gate requests on in-progress source rebuilds ([f17a02c](https://github.com/sitepark/fractality/commit/f17a02c77403d3c14c01d52af6ad0a847321ae46))
- **core:** guard the @@ context reference against a missing entity ([80f9327](https://github.com/sitepark/fractality/commit/80f9327d2820a9c83800c51dea922ba5e8cfccb4))
- **core:** make PromiseStream work with native promises ([1aa2fc5](https://github.com/sitepark/fractality/commit/1aa2fc533dcb884bf0ef0c6914a74b553981b167))
- **core:** stop merging arrays by reference in defaultsDeep ([b7f30ae](https://github.com/sitepark/fractality/commit/b7f30aeb0b013d8f303f7bec9d456697233cf015))
- **deps:** update all dependencies to latest, except sass ([88d3e5c](https://github.com/sitepark/fractality/commit/88d3e5c67c3976fc6dd815875a39685e6033dbe1))
- **deps:** update dependencies ([ff33e1a](https://github.com/sitepark/fractality/commit/ff33e1ad489715a86a4de5fd9fb49b32bfc418f5))
- **deps:** update dependencies ([3c598f9](https://github.com/sitepark/fractality/commit/3c598f95a148a151c97f0d3c3293ba924862155c))
- **deps:** update dependencies ([80e4e56](https://github.com/sitepark/fractality/commit/80e4e56d9764a5a297cfe4d7d0af4dacf5dc88fe))
- **deps:** update linguist-languages from 7.27.0 to 9.0.0 ([e66232c](https://github.com/sitepark/fractality/commit/e66232c607cc7fa276c7c21efbd3f38cf75b4979))
- **deps:** update marked from 14.1.4 to 16.3.0 ([6733972](https://github.com/sitepark/fractality/commit/67339725c58800e059652f67c556fe5d4491a060))
- stat the original absolute path, not the import()-relativized one ([f0047d3](https://github.com/sitepark/fractality/commit/f0047d363d583701142895e1426e590cf5ab3d9c))

### Features

- add files allowlists and exports maps to all packages ([298d693](https://github.com/sitepark/fractality/commit/298d69391c96b5a2c6751eb87653b17796d36ab9))

### Performance Improvements

- use mtime for cache invalidation to reduce number of cache misses ([1d29452](https://github.com/sitepark/fractality/commit/1d2945232d5342b098527921a4355cb1dadc1d59))

## 0.5.3 (2024-09-24)

**Note:** Version bump only for package @fractality/core

## 0.5.2 (2024-09-20)

**Note:** Version bump only for package @fractality/core

## 0.5.1 (2024-09-20)

**Note:** Version bump only for package @fractality/core

# 0.5.0 (2024-09-20)

### Bug Fixes

- add relative path to component links in static builds ([#1062](https://github.com/frctl/fractal/issues/1062)) ([2f84d3b](https://github.com/frctl/fractal/commit/2f84d3b84498c238d28c2ca1021daf89aff879be))
- don't lowercase name before titlizing to generate label ([#1081](https://github.com/frctl/fractal/issues/1081)) ([daf5c69](https://github.com/frctl/fractal/commit/daf5c69a455e320f43ccdba830ee46ab40929ad5))
- migrate import of globby ([e6341fa](https://github.com/frctl/fractal/commit/e6341fa7aae0b188529ddeb95aa8e3952a70bd2b))
- relative path generated to self ([#1067](https://github.com/frctl/fractal/issues/1067)) ([dcc6dab](https://github.com/frctl/fractal/commit/dcc6dabeaf7dc742eb434dd9838ccb297f9e0271)), closes [#1062](https://github.com/frctl/fractal/issues/1062)
- resolve the context for fully rendered subcomponents ([#646](https://github.com/frctl/fractal/issues/646)) ([2bda749](https://github.com/frctl/fractal/commit/2bda749f003b29ee9f24021db639602aae1868df))
- return correct relative path if it has preexisting file extension ([#1065](https://github.com/frctl/fractal/issues/1065)) ([90192d0](https://github.com/frctl/fractal/commit/90192d0bc797b874be1c4e53eba1443f1db47ae7))
- sync for docs ([#1181](https://github.com/frctl/fractal/issues/1181)) ([ac748d6](https://github.com/frctl/fractal/commit/ac748d6b481765093d7663e6c291ec8b5fe24d2c))
- use marked-smartypants instead of deprecated marked option ([e49e24e](https://github.com/frctl/fractal/commit/e49e24e1d7e1a763e7c1056b96e4d3bc9d50e07d))

### Features

- add support for cjs file extension ([a05bde7](https://github.com/frctl/fractal/commit/a05bde7c8cb2788e296f5ffda859e46debbbcd39))
- allow pulling collections to root ([#642](https://github.com/frctl/fractal/issues/642)) ([d2cfa1b](https://github.com/frctl/fractal/commit/d2cfa1b6a76ca2328967374c62f4e35ca10cb758))
- filter excluded files/directories in the file system parsing stage ([#661](https://github.com/frctl/fractal/issues/661)) ([7c09c27](https://github.com/frctl/fractal/commit/7c09c27ca970dc2bca79ea4f1acafb1d7209642d))
- react ([c40ac0a](https://github.com/frctl/fractal/commit/c40ac0a1f949a1ddd7c846aef85b11356cf129ab))
- replace @allmarkedup/fang with linguist-languages ([a54fe31](https://github.com/frctl/fractal/commit/a54fe3158bc97adfb35db46893fbecdf8a6c1170))
- replace bluebird with native promises ([1c8daa0](https://github.com/frctl/fractal/commit/1c8daa09a70962211ce550eff9a930ee3d9a9323))
- replace usage of co with async-await ([c79f666](https://github.com/frctl/fractal/commit/c79f666ae1d19dd2a723722e4a23cf37fc8e97ff))
- update a bunch of dependencies ([bebdf6b](https://github.com/frctl/fractal/commit/bebdf6b11a911e2d19b165ca5ed1e06ce2160db3))
- update highlight.js ([#941](https://github.com/frctl/fractal/issues/941)) ([d8f7ae3](https://github.com/frctl/fractal/commit/d8f7ae36854032000f799e248d7a40bc146d6864))

### Performance Improvements

- ignore excluded directories from file watcher ([#842](https://github.com/frctl/fractal/issues/842)) ([8b3ae0e](https://github.com/frctl/fractal/commit/8b3ae0e06f3a5e3aba127ad24bb71447b5ed813d))
- skip file system and components parsing when template/resource is changed ([#949](https://github.com/frctl/fractal/issues/949)) ([10c4420](https://github.com/frctl/fractal/commit/10c44202ab1da459d9ddada1e278b813f4d2d559))

# 0.4.0 (2024-03-19)

### Bug Fixes

- add relative path to component links in static builds ([#1062](https://github.com/frctl/fractal/issues/1062)) ([2f84d3b](https://github.com/frctl/fractal/commit/2f84d3b84498c238d28c2ca1021daf89aff879be))
- don't lowercase name before titlizing to generate label ([#1081](https://github.com/frctl/fractal/issues/1081)) ([daf5c69](https://github.com/frctl/fractal/commit/daf5c69a455e320f43ccdba830ee46ab40929ad5))
- migrate import of globby ([e6341fa](https://github.com/frctl/fractal/commit/e6341fa7aae0b188529ddeb95aa8e3952a70bd2b))
- relative path generated to self ([#1067](https://github.com/frctl/fractal/issues/1067)) ([dcc6dab](https://github.com/frctl/fractal/commit/dcc6dabeaf7dc742eb434dd9838ccb297f9e0271)), closes [#1062](https://github.com/frctl/fractal/issues/1062)
- resolve the context for fully rendered subcomponents ([#646](https://github.com/frctl/fractal/issues/646)) ([2bda749](https://github.com/frctl/fractal/commit/2bda749f003b29ee9f24021db639602aae1868df))
- return correct relative path if it has preexisting file extension ([#1065](https://github.com/frctl/fractal/issues/1065)) ([90192d0](https://github.com/frctl/fractal/commit/90192d0bc797b874be1c4e53eba1443f1db47ae7))
- sync for docs ([#1181](https://github.com/frctl/fractal/issues/1181)) ([ac748d6](https://github.com/frctl/fractal/commit/ac748d6b481765093d7663e6c291ec8b5fe24d2c))
- use marked-smartypants instead of deprecated marked option ([e49e24e](https://github.com/frctl/fractal/commit/e49e24e1d7e1a763e7c1056b96e4d3bc9d50e07d))

### Features

- add support for cjs file extension ([a05bde7](https://github.com/frctl/fractal/commit/a05bde7c8cb2788e296f5ffda859e46debbbcd39))
- allow pulling collections to root ([#642](https://github.com/frctl/fractal/issues/642)) ([d2cfa1b](https://github.com/frctl/fractal/commit/d2cfa1b6a76ca2328967374c62f4e35ca10cb758))
- filter excluded files/directories in the file system parsing stage ([#661](https://github.com/frctl/fractal/issues/661)) ([7c09c27](https://github.com/frctl/fractal/commit/7c09c27ca970dc2bca79ea4f1acafb1d7209642d))
- react ([c40ac0a](https://github.com/frctl/fractal/commit/c40ac0a1f949a1ddd7c846aef85b11356cf129ab))
- replace @allmarkedup/fang with linguist-languages ([a54fe31](https://github.com/frctl/fractal/commit/a54fe3158bc97adfb35db46893fbecdf8a6c1170))
- replace bluebird with native promises ([1c8daa0](https://github.com/frctl/fractal/commit/1c8daa09a70962211ce550eff9a930ee3d9a9323))
- replace usage of co with async-await ([c79f666](https://github.com/frctl/fractal/commit/c79f666ae1d19dd2a723722e4a23cf37fc8e97ff))
- update a bunch of dependencies ([bebdf6b](https://github.com/frctl/fractal/commit/bebdf6b11a911e2d19b165ca5ed1e06ce2160db3))
- update highlight.js ([#941](https://github.com/frctl/fractal/issues/941)) ([d8f7ae3](https://github.com/frctl/fractal/commit/d8f7ae36854032000f799e248d7a40bc146d6864))

### Performance Improvements

- ignore excluded directories from file watcher ([#842](https://github.com/frctl/fractal/issues/842)) ([8b3ae0e](https://github.com/frctl/fractal/commit/8b3ae0e06f3a5e3aba127ad24bb71447b5ed813d))
- skip file system and components parsing when template/resource is changed ([#949](https://github.com/frctl/fractal/issues/949)) ([10c4420](https://github.com/frctl/fractal/commit/10c44202ab1da459d9ddada1e278b813f4d2d559))

## [0.3.5](https://github.com/frctl/fractal/compare/@frctl/core@0.3.4...@frctl/core@0.3.5) (2022-08-17)

### Bug Fixes

- sync for docs ([#1181](https://github.com/frctl/fractal/issues/1181)) ([ac748d6](https://github.com/frctl/fractal/commit/ac748d6b481765093d7663e6c291ec8b5fe24d2c))

## [0.3.4](https://github.com/frctl/fractal/compare/@frctl/core@0.3.3...@frctl/core@0.3.4) (2022-01-26)

### Bug Fixes

- don't lowercase name before titlizing to generate label ([#1081](https://github.com/frctl/fractal/issues/1081)) ([daf5c69](https://github.com/frctl/fractal/commit/daf5c69a455e320f43ccdba830ee46ab40929ad5))

## [0.3.3](https://github.com/frctl/fractal/compare/@frctl/core@0.3.2...@frctl/core@0.3.3) (2021-07-20)

### Bug Fixes

- relative path generated to self ([#1067](https://github.com/frctl/fractal/issues/1067)) ([dcc6dab](https://github.com/frctl/fractal/commit/dcc6dabeaf7dc742eb434dd9838ccb297f9e0271)), closes [#1062](https://github.com/frctl/fractal/issues/1062)

## [0.3.2](https://github.com/frctl/fractal/compare/@frctl/core@0.3.1...@frctl/core@0.3.2) (2021-07-19)

### Bug Fixes

- add relative path to component links in static builds ([#1062](https://github.com/frctl/fractal/issues/1062)) ([2f84d3b](https://github.com/frctl/fractal/commit/2f84d3b84498c238d28c2ca1021daf89aff879be))
- return correct relative path if it has preexisting file extension ([#1065](https://github.com/frctl/fractal/issues/1065)) ([90192d0](https://github.com/frctl/fractal/commit/90192d0bc797b874be1c4e53eba1443f1db47ae7))

## [0.3.1](https://github.com/frctl/fractal/compare/@frctl/core@0.3.0...@frctl/core@0.3.1) (2021-05-20)

### Performance Improvements

- skip file system and components parsing when template/resource is changed ([#949](https://github.com/frctl/fractal/issues/949)) ([10c4420](https://github.com/frctl/fractal/commit/10c44202ab1da459d9ddada1e278b813f4d2d559))

# [0.3.0](https://github.com/frctl/fractal/compare/@frctl/core@0.2.4...@frctl/core@0.3.0) (2021-03-23)

### Features

- update highlight.js ([#941](https://github.com/frctl/fractal/issues/941)) ([d8f7ae3](https://github.com/frctl/fractal/commit/d8f7ae36854032000f799e248d7a40bc146d6864))

## [0.2.4](https://github.com/frctl/fractal/compare/@frctl/core@0.2.3...@frctl/core@0.2.4) (2021-03-20)

**Note:** Version bump only for package @frctl/core

## [0.2.3](https://github.com/frctl/fractal/compare/@frctl/core@0.2.2...@frctl/core@0.2.3) (2021-02-14)

**Note:** Version bump only for package @frctl/core

## [0.2.2](https://github.com/frctl/fractal/compare/@frctl/core@0.2.1...@frctl/core@0.2.2) (2021-02-07)

### Performance Improvements

- ignore excluded directories from file watcher ([#842](https://github.com/frctl/fractal/issues/842)) ([8b3ae0e](https://github.com/frctl/fractal/commit/8b3ae0e06f3a5e3aba127ad24bb71447b5ed813d))

## [0.2.1](https://github.com/frctl/fractal/compare/@frctl/core@0.2.0...@frctl/core@0.2.1) (2020-12-22)

### Bug Fixes

- resolve the context for fully rendered subcomponents ([#646](https://github.com/frctl/fractal/issues/646)) ([2bda749](https://github.com/frctl/fractal/commit/2bda749f003b29ee9f24021db639602aae1868df))

# [0.2.0](https://github.com/frctl/fractal/compare/@frctl/core@0.1.1...@frctl/core@0.2.0) (2020-11-03)

### Features

- allow pulling collections to root ([#642](https://github.com/frctl/fractal/issues/642)) ([d2cfa1b](https://github.com/frctl/fractal/commit/d2cfa1b6a76ca2328967374c62f4e35ca10cb758))

## [0.1.1](https://github.com/frctl/fractal/compare/@frctl/core@0.1.0...@frctl/core@0.1.1) (2020-10-19)

**Note:** Version bump only for package @frctl/core

# 0.1.0 (2020-10-15)

### Features

- filter excluded files/directories in the file system parsing stage ([#661](https://github.com/frctl/fractal/issues/661)) ([7c09c27](https://github.com/frctl/fractal/commit/7c09c27ca970dc2bca79ea4f1acafb1d7209642d))
