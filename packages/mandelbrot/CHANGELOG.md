# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.12.3 (2024-09-24)

**Note:** Version bump only for package @fractality/mandelbrot

## 1.12.2 (2024-09-20)

**Note:** Version bump only for package @fractality/mandelbrot

## 1.12.1 (2024-09-20)

**Note:** Version bump only for package @fractality/mandelbrot

# 1.12.0 (2024-09-20)

### Bug Fixes

- fix empty error render in HTML tab ([#102](https://github.com/frctl/fractal/issues/102)) ([053b7e0](https://github.com/frctl/fractal/commit/053b7e0168eda4242550f833e45aefbbb1895fe4))
- increase text selection contrast ([#111](https://github.com/frctl/fractal/issues/111)) ([021738e](https://github.com/frctl/fractal/commit/021738ef7f49ee351d3b59ede3a6ae92e89fb374)), closes [#44](https://github.com/frctl/fractal/issues/44)
- initialize frame before navigation ([#667](https://github.com/frctl/fractal/issues/667)) ([33f4f59](https://github.com/frctl/fractal/commit/33f4f595705f906eba7634137a2045dfa4496220))
- **mandelbrot:** bump @frctl/fractal peerDependency minimum version ([#974](https://github.com/frctl/fractal/issues/974)) ([0b9dcdc](https://github.com/frctl/fractal/commit/0b9dcdc4b6689e0b1ba4a04d57862e927f249117))
- **mandelbrot:** hide hidden variants in info panel ([#649](https://github.com/frctl/fractal/issues/649)) ([179c4fd](https://github.com/frctl/fractal/commit/179c4fd78e64ecb90e5716df67cb83b767d19ea6))
- **mandelbrot:** make relative path links from notes accessible both from local server as deployed server ([#659](https://github.com/frctl/fractal/issues/659)) ([9311ef5](https://github.com/frctl/fractal/commit/9311ef5a3ca429c473686bc9cfa20ef7c85db582))
- **mandelbrot:** move @frctl/web from deps to devDeps ([#969](https://github.com/frctl/fractal/issues/969)) ([6bbcd34](https://github.com/frctl/fractal/commit/6bbcd34b5edae30c6f09cdf1a44aeb9094c19600))
- **mandelbrot:** Properly initialize assets tab file select ([#669](https://github.com/frctl/fractal/issues/669)) ([dfaefa5](https://github.com/frctl/fractal/commit/dfaefa56ff1e76110381303c53ca742aacfcf660)), closes [#668](https://github.com/frctl/fractal/issues/668)
- move scrolling of the sidebar to after the state has been applied ([#85](https://github.com/frctl/fractal/issues/85)) ([c693e42](https://github.com/frctl/fractal/commit/c693e421dbb2adc5f8fd5f30c74f844848c5d2f5))
- **Navigation:** proper padding for Assets block title ([292b469](https://github.com/frctl/fractal/commit/292b469e4332100bfd0df318956bcbdf30879a2d))
- only expand tree's with matches ([#1252](https://github.com/frctl/fractal/issues/1252)) ([9e881f8](https://github.com/frctl/fractal/commit/9e881f848e952e26d0c3767a382fea38cf490a9e))
- remove printed out navigation type from header ([#1142](https://github.com/frctl/fractal/issues/1142)) ([b6b92dc](https://github.com/frctl/fractal/commit/b6b92dcb0550dabb606e3edfc71e75a5c86ec17d))
- skip linkRefs if there are no references ([#825](https://github.com/frctl/fractal/issues/825)) ([2376aab](https://github.com/frctl/fractal/commit/2376aab5682ba2d01c19172ead8665953af34924))
- wrap long text in navigation tree ([#1101](https://github.com/frctl/fractal/issues/1101)) ([b7b0a4e](https://github.com/frctl/fractal/commit/b7b0a4eff65a1bc601391cb483af38ea87109eb9))

### Features

- add build time information ([#94](https://github.com/frctl/fractal/issues/94)) ([17c34da](https://github.com/frctl/fractal/commit/17c34da2e7255e375f2c83e082d114acb7193a40))
- add navigation search ([#81](https://github.com/frctl/fractal/issues/81)) ([08b73e3](https://github.com/frctl/fractal/commit/08b73e33186a6940950629712bdd95f4ee5a7152)), closes [#27](https://github.com/frctl/fractal/issues/27)
- allow custom information properties ([#678](https://github.com/frctl/fractal/issues/678)) ([2941791](https://github.com/frctl/fractal/commit/29417917d71abb5e10c1feeaf42305b61256c8e6))
- allow customizing Mandelbrot skin with hex codes ([#627](https://github.com/frctl/fractal/issues/627)) ([f4ef6f9](https://github.com/frctl/fractal/commit/f4ef6f9064ae3a459e975947bc7c990afb098e08))
- allow pulling collections to root ([#642](https://github.com/frctl/fractal/issues/642)) ([d2cfa1b](https://github.com/frctl/fractal/commit/d2cfa1b6a76ca2328967374c62f4e35ca10cb758))
- allow resizing pen preview height on narrow screens ([#626](https://github.com/frctl/fractal/issues/626)) ([519335b](https://github.com/frctl/fractal/commit/519335b303aa0489d83297e543252b53a5985e73))
- allow users to customize highlight.js theme ([#105](https://github.com/frctl/fractal/issues/105)) ([88e6a18](https://github.com/frctl/fractal/commit/88e6a18baf3e039d8db7e5b70e351695c3e04b2b))
- bump handlebars from 4.1.0 to 4.5.3 ([#98](https://github.com/frctl/fractal/issues/98)) ([f1bb8da](https://github.com/frctl/fractal/commit/f1bb8daface11764ea0948a67b5b2b7bb473b99e))
- bump jquery from 2.2.4 to 3.4.0 ([#87](https://github.com/frctl/fractal/issues/87)) ([09afb15](https://github.com/frctl/fractal/commit/09afb15c2e4665ab55b4afd103e384fabade4294))
- **deps:** update mandelbrot dependencies ([998d416](https://github.com/frctl/fractal/commit/998d416b3c10bdd04d8d8e9fee23d659990b6be9))
- display preview iframe size ([#685](https://github.com/frctl/fractal/issues/685)) ([c217848](https://github.com/frctl/fractal/commit/c2178482593bd670324b8cfa0a3f067f3a5523b6)), closes [#606](https://github.com/frctl/fractal/issues/606)
- enable keyboard interaction for nav toggles ([#106](https://github.com/frctl/fractal/issues/106)) ([a91ae04](https://github.com/frctl/fractal/commit/a91ae04ace94c60288d553d17b306b9a3dfd78a7))
- focus search input after clearing it ([#672](https://github.com/frctl/fractal/issues/672)) ([1c00083](https://github.com/frctl/fractal/commit/1c00083ab5d3758371c95afa87d506eea934df52))
- improve variants searchability ([#984](https://github.com/frctl/fractal/issues/984)) ([96f5099](https://github.com/frctl/fractal/commit/96f5099fef5836f4b91c6865b2bf21c5f6430e6b))
- make navigation style configurable ([#1100](https://github.com/frctl/fractal/issues/1100)) ([b69ff91](https://github.com/frctl/fractal/commit/b69ff914064285c72b1a709ad3fc2925fdc6d087))
- **Mandelbrot:** allow to customize all the theme labels ([#636](https://github.com/frctl/fractal/issues/636)) ([5735ef7](https://github.com/frctl/fractal/commit/5735ef7a9745cbf2fe4e4ca7eb31837fb2a4494e)), closes [#633](https://github.com/frctl/fractal/issues/633)
- **Navigation:** improve search behavior & add collapse all ([#107](https://github.com/frctl/fractal/issues/107)) ([a8daf61](https://github.com/frctl/fractal/commit/a8daf61ee7cc8b25b4301281d36b54dbb0036df7))
- persist navigation state only for the current session ([#110](https://github.com/frctl/fractal/issues/110)) ([67fbacb](https://github.com/frctl/fractal/commit/67fbacb47c9972bbdc630c2dcd121a7c01369fb3)), closes [#78](https://github.com/frctl/fractal/issues/78)
- react ([c40ac0a](https://github.com/frctl/fractal/commit/c40ac0a1f949a1ddd7c846aef85b11356cf129ab))
- split variant navigation into another panel ([#775](https://github.com/frctl/fractal/issues/775)) ([a0a54fb](https://github.com/frctl/fractal/commit/a0a54fb09d421ebb07a106e9f8fe498447743472))
- style native select instead of using a plugin ([#774](https://github.com/frctl/fractal/issues/774)) ([818246d](https://github.com/frctl/fractal/commit/818246d6ffd5f2063f94bdaf837089617e3cf769))
- update a bunch of dependencies ([bebdf6b](https://github.com/frctl/fractal/commit/bebdf6b11a911e2d19b165ca5ed1e06ce2160db3))
- update highlight.js ([#941](https://github.com/frctl/fractal/issues/941)) ([d8f7ae3](https://github.com/frctl/fractal/commit/d8f7ae36854032000f799e248d7a40bc146d6864))
- use system font stacks ([#768](https://github.com/frctl/fractal/issues/768)) ([ce266da](https://github.com/frctl/fractal/commit/ce266daa9fef9f5faa2086733f8f05bc8d77aa27))
- **variants:** add support for hidden variants ([d8604a8](https://github.com/frctl/fractal/commit/d8604a87b95db725a596e433a6cec456febc6446))

### Performance Improvements

- avoid extraneous render ([#826](https://github.com/frctl/fractal/issues/826)) ([65b71d9](https://github.com/frctl/fractal/commit/65b71d9d927da55bd20f48059136374489c70e23))

# 1.11.0 (2024-03-19)

### Bug Fixes

- fix empty error render in HTML tab ([#102](https://github.com/frctl/fractal/issues/102)) ([053b7e0](https://github.com/frctl/fractal/commit/053b7e0168eda4242550f833e45aefbbb1895fe4))
- increase text selection contrast ([#111](https://github.com/frctl/fractal/issues/111)) ([021738e](https://github.com/frctl/fractal/commit/021738ef7f49ee351d3b59ede3a6ae92e89fb374)), closes [#44](https://github.com/frctl/fractal/issues/44)
- initialize frame before navigation ([#667](https://github.com/frctl/fractal/issues/667)) ([33f4f59](https://github.com/frctl/fractal/commit/33f4f595705f906eba7634137a2045dfa4496220))
- **mandelbrot:** bump @frctl/fractal peerDependency minimum version ([#974](https://github.com/frctl/fractal/issues/974)) ([0b9dcdc](https://github.com/frctl/fractal/commit/0b9dcdc4b6689e0b1ba4a04d57862e927f249117))
- **mandelbrot:** hide hidden variants in info panel ([#649](https://github.com/frctl/fractal/issues/649)) ([179c4fd](https://github.com/frctl/fractal/commit/179c4fd78e64ecb90e5716df67cb83b767d19ea6))
- **mandelbrot:** make relative path links from notes accessible both from local server as deployed server ([#659](https://github.com/frctl/fractal/issues/659)) ([9311ef5](https://github.com/frctl/fractal/commit/9311ef5a3ca429c473686bc9cfa20ef7c85db582))
- **mandelbrot:** move @frctl/web from deps to devDeps ([#969](https://github.com/frctl/fractal/issues/969)) ([6bbcd34](https://github.com/frctl/fractal/commit/6bbcd34b5edae30c6f09cdf1a44aeb9094c19600))
- **mandelbrot:** Properly initialize assets tab file select ([#669](https://github.com/frctl/fractal/issues/669)) ([dfaefa5](https://github.com/frctl/fractal/commit/dfaefa56ff1e76110381303c53ca742aacfcf660)), closes [#668](https://github.com/frctl/fractal/issues/668)
- move scrolling of the sidebar to after the state has been applied ([#85](https://github.com/frctl/fractal/issues/85)) ([c693e42](https://github.com/frctl/fractal/commit/c693e421dbb2adc5f8fd5f30c74f844848c5d2f5))
- **Navigation:** proper padding for Assets block title ([292b469](https://github.com/frctl/fractal/commit/292b469e4332100bfd0df318956bcbdf30879a2d))
- only expand tree's with matches ([#1252](https://github.com/frctl/fractal/issues/1252)) ([9e881f8](https://github.com/frctl/fractal/commit/9e881f848e952e26d0c3767a382fea38cf490a9e))
- remove printed out navigation type from header ([#1142](https://github.com/frctl/fractal/issues/1142)) ([b6b92dc](https://github.com/frctl/fractal/commit/b6b92dcb0550dabb606e3edfc71e75a5c86ec17d))
- skip linkRefs if there are no references ([#825](https://github.com/frctl/fractal/issues/825)) ([2376aab](https://github.com/frctl/fractal/commit/2376aab5682ba2d01c19172ead8665953af34924))
- wrap long text in navigation tree ([#1101](https://github.com/frctl/fractal/issues/1101)) ([b7b0a4e](https://github.com/frctl/fractal/commit/b7b0a4eff65a1bc601391cb483af38ea87109eb9))

### Features

- add build time information ([#94](https://github.com/frctl/fractal/issues/94)) ([17c34da](https://github.com/frctl/fractal/commit/17c34da2e7255e375f2c83e082d114acb7193a40))
- add navigation search ([#81](https://github.com/frctl/fractal/issues/81)) ([08b73e3](https://github.com/frctl/fractal/commit/08b73e33186a6940950629712bdd95f4ee5a7152)), closes [#27](https://github.com/frctl/fractal/issues/27)
- allow custom information properties ([#678](https://github.com/frctl/fractal/issues/678)) ([2941791](https://github.com/frctl/fractal/commit/29417917d71abb5e10c1feeaf42305b61256c8e6))
- allow customizing Mandelbrot skin with hex codes ([#627](https://github.com/frctl/fractal/issues/627)) ([f4ef6f9](https://github.com/frctl/fractal/commit/f4ef6f9064ae3a459e975947bc7c990afb098e08))
- allow pulling collections to root ([#642](https://github.com/frctl/fractal/issues/642)) ([d2cfa1b](https://github.com/frctl/fractal/commit/d2cfa1b6a76ca2328967374c62f4e35ca10cb758))
- allow resizing pen preview height on narrow screens ([#626](https://github.com/frctl/fractal/issues/626)) ([519335b](https://github.com/frctl/fractal/commit/519335b303aa0489d83297e543252b53a5985e73))
- allow users to customize highlight.js theme ([#105](https://github.com/frctl/fractal/issues/105)) ([88e6a18](https://github.com/frctl/fractal/commit/88e6a18baf3e039d8db7e5b70e351695c3e04b2b))
- bump handlebars from 4.1.0 to 4.5.3 ([#98](https://github.com/frctl/fractal/issues/98)) ([f1bb8da](https://github.com/frctl/fractal/commit/f1bb8daface11764ea0948a67b5b2b7bb473b99e))
- bump jquery from 2.2.4 to 3.4.0 ([#87](https://github.com/frctl/fractal/issues/87)) ([09afb15](https://github.com/frctl/fractal/commit/09afb15c2e4665ab55b4afd103e384fabade4294))
- **deps:** update mandelbrot dependencies ([998d416](https://github.com/frctl/fractal/commit/998d416b3c10bdd04d8d8e9fee23d659990b6be9))
- display preview iframe size ([#685](https://github.com/frctl/fractal/issues/685)) ([c217848](https://github.com/frctl/fractal/commit/c2178482593bd670324b8cfa0a3f067f3a5523b6)), closes [#606](https://github.com/frctl/fractal/issues/606)
- enable keyboard interaction for nav toggles ([#106](https://github.com/frctl/fractal/issues/106)) ([a91ae04](https://github.com/frctl/fractal/commit/a91ae04ace94c60288d553d17b306b9a3dfd78a7))
- focus search input after clearing it ([#672](https://github.com/frctl/fractal/issues/672)) ([1c00083](https://github.com/frctl/fractal/commit/1c00083ab5d3758371c95afa87d506eea934df52))
- improve variants searchability ([#984](https://github.com/frctl/fractal/issues/984)) ([96f5099](https://github.com/frctl/fractal/commit/96f5099fef5836f4b91c6865b2bf21c5f6430e6b))
- make navigation style configurable ([#1100](https://github.com/frctl/fractal/issues/1100)) ([b69ff91](https://github.com/frctl/fractal/commit/b69ff914064285c72b1a709ad3fc2925fdc6d087))
- **Mandelbrot:** allow to customize all the theme labels ([#636](https://github.com/frctl/fractal/issues/636)) ([5735ef7](https://github.com/frctl/fractal/commit/5735ef7a9745cbf2fe4e4ca7eb31837fb2a4494e)), closes [#633](https://github.com/frctl/fractal/issues/633)
- **Navigation:** improve search behavior & add collapse all ([#107](https://github.com/frctl/fractal/issues/107)) ([a8daf61](https://github.com/frctl/fractal/commit/a8daf61ee7cc8b25b4301281d36b54dbb0036df7))
- persist navigation state only for the current session ([#110](https://github.com/frctl/fractal/issues/110)) ([67fbacb](https://github.com/frctl/fractal/commit/67fbacb47c9972bbdc630c2dcd121a7c01369fb3)), closes [#78](https://github.com/frctl/fractal/issues/78)
- react ([c40ac0a](https://github.com/frctl/fractal/commit/c40ac0a1f949a1ddd7c846aef85b11356cf129ab))
- split variant navigation into another panel ([#775](https://github.com/frctl/fractal/issues/775)) ([a0a54fb](https://github.com/frctl/fractal/commit/a0a54fb09d421ebb07a106e9f8fe498447743472))
- style native select instead of using a plugin ([#774](https://github.com/frctl/fractal/issues/774)) ([818246d](https://github.com/frctl/fractal/commit/818246d6ffd5f2063f94bdaf837089617e3cf769))
- update a bunch of dependencies ([bebdf6b](https://github.com/frctl/fractal/commit/bebdf6b11a911e2d19b165ca5ed1e06ce2160db3))
- update highlight.js ([#941](https://github.com/frctl/fractal/issues/941)) ([d8f7ae3](https://github.com/frctl/fractal/commit/d8f7ae36854032000f799e248d7a40bc146d6864))
- use system font stacks ([#768](https://github.com/frctl/fractal/issues/768)) ([ce266da](https://github.com/frctl/fractal/commit/ce266daa9fef9f5faa2086733f8f05bc8d77aa27))
- **variants:** add support for hidden variants ([d8604a8](https://github.com/frctl/fractal/commit/d8604a87b95db725a596e433a6cec456febc6446))

### Performance Improvements

- avoid extraneous render ([#826](https://github.com/frctl/fractal/issues/826)) ([65b71d9](https://github.com/frctl/fractal/commit/65b71d9d927da55bd20f48059136374489c70e23))

## [1.10.3](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.10.2...@frctl/mandelbrot@1.10.3) (2023-01-26)

### Bug Fixes

- only expand tree's with matches ([#1252](https://github.com/frctl/fractal/issues/1252)) ([9e881f8](https://github.com/frctl/fractal/commit/9e881f848e952e26d0c3767a382fea38cf490a9e))

## [1.10.2](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.10.1...@frctl/mandelbrot@1.10.2) (2022-08-17)

**Note:** Version bump only for package @frctl/mandelbrot

## [1.10.1](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.10.0...@frctl/mandelbrot@1.10.1) (2022-02-01)

### Bug Fixes

- remove printed out navigation type from header ([#1142](https://github.com/frctl/fractal/issues/1142)) ([b6b92dc](https://github.com/frctl/fractal/commit/b6b92dcb0550dabb606e3edfc71e75a5c86ec17d))

# [1.10.0](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.9.4...@frctl/mandelbrot@1.10.0) (2022-01-26)

### Bug Fixes

- wrap long text in navigation tree ([#1101](https://github.com/frctl/fractal/issues/1101)) ([b7b0a4e](https://github.com/frctl/fractal/commit/b7b0a4eff65a1bc601391cb483af38ea87109eb9))

### Features

- improve variants searchability ([#984](https://github.com/frctl/fractal/issues/984)) ([96f5099](https://github.com/frctl/fractal/commit/96f5099fef5836f4b91c6865b2bf21c5f6430e6b))
- make navigation style configurable ([#1100](https://github.com/frctl/fractal/issues/1100)) ([b69ff91](https://github.com/frctl/fractal/commit/b69ff914064285c72b1a709ad3fc2925fdc6d087))

## [1.9.4](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.9.3...@frctl/mandelbrot@1.9.4) (2021-07-20)

**Note:** Version bump only for package @frctl/mandelbrot

## [1.9.3](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.9.2...@frctl/mandelbrot@1.9.3) (2021-07-19)

**Note:** Version bump only for package @frctl/mandelbrot

## [1.9.2](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.9.1...@frctl/mandelbrot@1.9.2) (2021-05-20)

**Note:** Version bump only for package @frctl/mandelbrot

## [1.9.1](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.9.0...@frctl/mandelbrot@1.9.1) (2021-05-20)

### Bug Fixes

- **mandelbrot:** bump @frctl/fractal peerDependency minimum version ([#974](https://github.com/frctl/fractal/issues/974)) ([0b9dcdc](https://github.com/frctl/fractal/commit/0b9dcdc4b6689e0b1ba4a04d57862e927f249117))
- **mandelbrot:** move @frctl/web from deps to devDeps ([#969](https://github.com/frctl/fractal/issues/969)) ([6bbcd34](https://github.com/frctl/fractal/commit/6bbcd34b5edae30c6f09cdf1a44aeb9094c19600))

# [1.9.0](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.8.2...@frctl/mandelbrot@1.9.0) (2021-03-23)

### Features

- update highlight.js ([#941](https://github.com/frctl/fractal/issues/941)) ([d8f7ae3](https://github.com/frctl/fractal/commit/d8f7ae36854032000f799e248d7a40bc146d6864))

## [1.8.2](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.8.1...@frctl/mandelbrot@1.8.2) (2021-03-20)

**Note:** Version bump only for package @frctl/mandelbrot

## [1.8.1](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.8.0...@frctl/mandelbrot@1.8.1) (2021-02-14)

**Note:** Version bump only for package @frctl/mandelbrot

# [1.8.0](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.7.0...@frctl/mandelbrot@1.8.0) (2021-02-07)

### Bug Fixes

- skip linkRefs if there are no references ([#825](https://github.com/frctl/fractal/issues/825)) ([2376aab](https://github.com/frctl/fractal/commit/2376aab5682ba2d01c19172ead8665953af34924))

### Features

- split variant navigation into another panel ([#775](https://github.com/frctl/fractal/issues/775)) ([a0a54fb](https://github.com/frctl/fractal/commit/a0a54fb09d421ebb07a106e9f8fe498447743472))
- style native select instead of using a plugin ([#774](https://github.com/frctl/fractal/issues/774)) ([818246d](https://github.com/frctl/fractal/commit/818246d6ffd5f2063f94bdaf837089617e3cf769))
- use system font stacks ([#768](https://github.com/frctl/fractal/issues/768)) ([ce266da](https://github.com/frctl/fractal/commit/ce266daa9fef9f5faa2086733f8f05bc8d77aa27))

### Performance Improvements

- avoid extraneous render ([#826](https://github.com/frctl/fractal/issues/826)) ([65b71d9](https://github.com/frctl/fractal/commit/65b71d9d927da55bd20f48059136374489c70e23))

# [1.7.0](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.6.0...@frctl/mandelbrot@1.7.0) (2020-12-22)

### Features

- display preview iframe size ([#685](https://github.com/frctl/fractal/issues/685)) ([c217848](https://github.com/frctl/fractal/commit/c2178482593bd670324b8cfa0a3f067f3a5523b6)), closes [#606](https://github.com/frctl/fractal/issues/606)

# [1.6.0](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.5.1...@frctl/mandelbrot@1.6.0) (2020-11-03)

### Features

- allow custom information properties ([#678](https://github.com/frctl/fractal/issues/678)) ([2941791](https://github.com/frctl/fractal/commit/29417917d71abb5e10c1feeaf42305b61256c8e6))
- allow pulling collections to root ([#642](https://github.com/frctl/fractal/issues/642)) ([d2cfa1b](https://github.com/frctl/fractal/commit/d2cfa1b6a76ca2328967374c62f4e35ca10cb758))
- focus search input after clearing it ([#672](https://github.com/frctl/fractal/issues/672)) ([1c00083](https://github.com/frctl/fractal/commit/1c00083ab5d3758371c95afa87d506eea934df52))

## [1.5.1](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.5.0...@frctl/mandelbrot@1.5.1) (2020-10-19)

### Bug Fixes

- **mandelbrot:** Properly initialize assets tab file select ([#669](https://github.com/frctl/fractal/issues/669)) ([dfaefa5](https://github.com/frctl/fractal/commit/dfaefa56ff1e76110381303c53ca742aacfcf660)), closes [#668](https://github.com/frctl/fractal/issues/668)
- initialize frame before navigation ([#667](https://github.com/frctl/fractal/issues/667)) ([33f4f59](https://github.com/frctl/fractal/commit/33f4f595705f906eba7634137a2045dfa4496220))

# [1.5.0](https://github.com/frctl/fractal/compare/@frctl/mandelbrot@1.4.0...@frctl/mandelbrot@1.5.0) (2020-10-15)

### Bug Fixes

- **mandelbrot:** hide hidden variants in info panel ([#649](https://github.com/frctl/fractal/issues/649)) ([179c4fd](https://github.com/frctl/fractal/commit/179c4fd78e64ecb90e5716df67cb83b767d19ea6))
- **mandelbrot:** make relative path links from notes accessible both from local server as deployed server ([#659](https://github.com/frctl/fractal/issues/659)) ([9311ef5](https://github.com/frctl/fractal/commit/9311ef5a3ca429c473686bc9cfa20ef7c85db582))

### Features

- **Mandelbrot:** allow to customize all the theme labels ([#636](https://github.com/frctl/fractal/issues/636)) ([5735ef7](https://github.com/frctl/fractal/commit/5735ef7a9745cbf2fe4e4ca7eb31837fb2a4494e)), closes [#633](https://github.com/frctl/fractal/issues/633)
- allow customizing Mandelbrot skin with hex codes ([#627](https://github.com/frctl/fractal/issues/627)) ([f4ef6f9](https://github.com/frctl/fractal/commit/f4ef6f9064ae3a459e975947bc7c990afb098e08))
- allow resizing pen preview height on narrow screens ([#626](https://github.com/frctl/fractal/issues/626)) ([519335b](https://github.com/frctl/fractal/commit/519335b303aa0489d83297e543252b53a5985e73))

## 1.4.0

### Bug Fixes

- proper padding for Assets block title
- increase text selection contrast (#111)

### Features

- enable keyboard interaction for nav toggles (#106)
- improve search behavior & add collapse all button to navigation (#107)
- allow users to customize highlight.js theme (#105)
- remove useless preview iframe sandbox attribute (#109)
- avoid redefining already inherited font families (#112)
- persist navigation state only for the current session (#110)

### Chores

- setup ESLint, Prettier and properly configure Stylelint (#108)

## 1.3.0

### Bug Fixes

- make header button usable with keyboard (#84)
- fix style for code blocks (#79)
- fix empty error render in HTML tab (#102)
- move scrolling of the sidebar to after the state has been applied (#85)
- fix font file loading error in firefox (#103)

### Features

- add build time information (#94)
- add navigation search (#81)

### Chores

- update development environment (#97)
- bump handlebars from 4.1.0 to 4.5.3 (#98)
- bump jquery from 2.2.4 to 3.4.0 (#87)

## 1.2.1

- Improve header layout when having a long title on small screens
- Add support for IE 11
- Add allow-modals to preview iframe sandbox attribute to authorize alerts

## 1.2.0

- Add user-configurable `beautify` filter
- Limit images width in documentation section

## 1.1.0

- Fix labelling of variants in info panel
- Fix context for collated components

## 1.0.9

- Update default static assets mount location

## 1.0.8

- Display components tags in info panel
- Add `allow-forms` for form submissions in preview iframe
- Ensure that title rather than label is used for top-level navigation

## 1.0.7

- Temporary fix for broken links in static builds

## 1.0.6

- 1.0.5 with assets built

## 1.0.5

- Remove srcdoc attribute from iframe due to SVG rendering issues

## 1.0.4

- Clean up setting of environment vars when rendering components
- Fix blockquote styling [@paulrobertlloyd]
- Fix code block overflow in doc pages

## 1.0.3

- Fix initial preview window height bug
- Change confusing 'open in new window' title text
- Windows compat improvements

## 1.0.2

- Make component asset URLs file-structure independent
- Update default favicon

## 1.0.1

- Fix duplicate tabs issue

## 1.0.0

Initial release.
