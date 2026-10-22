# Releasing

Releases are cut by the [Release workflow](../.github/workflows/release.yml), triggered manually from the Actions tab. Versions, changelogs and GitHub release notes are all derived from commit messages, so nothing needs to be written by hand at release time — the work happens when you write the commit.

## Writing releasable commits

All packages share one version and are released together, as one tag (`v3.1.0`) and one GitHub release. Version bumps and changelog entries come from [Conventional Commits](https://www.conventionalcommits.org), rendered by [git-cliff](https://git-cliff.org) with the config in [`cliff.toml`](../cliff.toml). The type decides the bump and the section; the scope names the package in the changelog:

| Commit                                    | Effect                                                 |
| ----------------------------------------- | ------------------------------------------------------ |
| `fix(core): resolve symlinked components` | patch bump, listed under Bug Fixes as **core:** …      |
| `feat(web): add a JSON endpoint`          | minor bump, listed under Features as **web:** …        |
| `feat(core)!: drop Node 22`               | major bump (a `!` or a `BREAKING CHANGE:` footer)      |
| `build(deps): bump chokidar from 5 to 6`  | patch bump, listed under Dependency Updates            |
| `build(deps-dev): …`, `ci: …`             | left out of the changelog, and no release on their own |

Scope the commit with the package it changes (`core`, `fractality`, `web`, `mandelbrot`, `handlebars`, `nunjucks`, `react`, `twig`), since one changelog covers them all and the scope is what tells readers which one moved. Leave it off for changes that span the repository.

Every release bumps every package, whether or not it changed: the version says which packages belong together, not which ones were touched. See [ADR 0006](adr/0006-one-shared-version-for-all-packages.md) for why. The changelog is [`CHANGELOG.md`](../CHANGELOG.md) at the repository root; the per-package changelogs stop at the last per-package release.

## Cutting a release

1. Make sure `main` is green and holds everything you want to ship.
2. Nothing to prepare for npm. Publishing authenticates through trusted publishing (below), so there is no token to keep alive.
3. Run the **Release** workflow from the Actions tab. Tick **dry-run** first if you want to see the version and release notes it would ship without publishing or pushing anything; both end up in the run's summary.
4. The workflow validates, tests, bumps the version, writes the changelog, publishes to npm, and only then pushes the version commit and the tag and creates the GitHub release.

The run refuses to release when nothing changelog-worthy happened since the last tag, for example when only CI config or dev dependencies moved.

## The first shared release

The packages moved to one version after each had been versioned on its own, so the first shared version has to be above the highest one in use (nunjucks at 2.5.0). `lerna.json` therefore starts at 2.5.0, and the first run must be started with **bump: major**, which lands every package on 3.0.0. The workflow refuses any other bump while no `v*` tag exists. 3.0.0 is a renumbering, not a breaking change: the adapters' peer ranges accept fractality 1.5 and up as before.

## Holding back a bump

The **bump** input defaults to `conventional`, which is the normal case: the commits since the last tag decide. Setting it to `patch`, `minor` or `major` overrides that.

Reach for it when a `feat!` sitting in the backlog would force a major you are not ready to cut. Setting `minor` ships that work as a minor instead. The changelog still lists the change under **Breaking Changes**, so nothing is hidden from the people upgrading.

## Peer ranges on a major release

The adapters peer-depend on `@fractality/fractality`, and mandelbrot on `@fractality/web`, with plain semver ranges such as `>= 1.5 < 4`. Lerna does not touch those when it bumps the version, so a major release would ship adapters that refuse to install next to the fractality they were released with. The workflow runs [`scripts/check-peer-ranges.mjs`](../scripts/check-peer-ranges.mjs) right after the bump and fails before anything is committed or published if a range no longer accepts the new version. Widen the ranges in a commit of their own, then run the release again.

## Trusted publishing

Publishing authenticates through npm's trusted publishing rather than a stored token. Lerna asks GitHub for an OIDC token, trades it at the registry for a short-lived credential scoped to the one package it is about to publish, and throws it away afterwards. Nothing long-lived sits in the repository secrets, npm never asks for a one-time password, and each published version carries a provenance attestation linking it to the commit and workflow run that built it.

This is configured per package, at **npmjs.com → the package → Settings → Trusted Publisher**:

| Field       | Value                 |
| ----------- | --------------------- |
| Publisher   | GitHub Actions        |
| Repository  | `sitepark/fractality` |
| Workflow    | `release.yml`         |
| Environment | leave empty           |

Every package in `packages/` needs its own entry. The workflow grants `id-token: write`, without which GitHub hands out no OIDC token at all; the **Verify OIDC availability** step fails the run early if that permission ever goes missing, since lerna itself treats a failed exchange as optional and would carry on to fail at publish time instead.

There is no stored token behind this any more. If you add a package to `packages/`, note that its first publish has nothing to attach a trusted publisher to, because npm configures this on packages that already exist. Publish that one version by hand, then add its entry like the rest.

## When a release fails

Nothing is pushed until npm has accepted every package, so a failed run leaves `main` and the tags exactly as they were, and the re-run computes the same version again. Fix the cause and run the workflow again — publishing is idempotent, so a run that died partway through is completed rather than duplicated. See [ADR 0005](adr/0005-publish-to-npm-before-pushing-release-tags.md) for why the pipeline is ordered this way.
