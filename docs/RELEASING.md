# Releasing

Releases are cut by the [Release workflow](../.github/workflows/release.yml), triggered manually from the Actions tab. Versions, changelogs and GitHub release notes are all derived from commit messages, so nothing needs to be written by hand at release time — the work happens when you write the commit.

## Writing releasable commits

Version bumps and changelog entries come from [Conventional Commits](https://www.conventionalcommits.org). The type decides the bump, and the scope decides which package it lands in:

| Commit                                    | Effect                                                    |
| ----------------------------------------- | --------------------------------------------------------- |
| `fix(core): resolve symlinked components` | patch bump for `@fractality/core`, listed under Bug Fixes |
| `feat(web): add a JSON endpoint`          | minor bump for `@fractality/web`, listed under Features   |
| `feat(core)!: drop Node 22`               | major bump (a `!` or a `BREAKING CHANGE:` footer)         |
| `chore: tidy the lockfile`                | no release                                                |

Packages are versioned independently, and a bumped package also bumps its dependents. Anything without a releasable commit since its last tag is left alone.

## Cutting a release

1. Make sure `main` is green and holds everything you want to ship.
2. Check that the `NPM_TOKEN` secret is still valid — npm granular tokens expire after 90 days at most, and an expired one is the single most likely reason for a failed release. The workflow verifies this before it changes anything, so a dead token costs you a few seconds rather than a broken release. Packages covered by trusted publishing (below) do not need it.
3. Run the **Release** workflow from the Actions tab. Tick **dry-run** first if you want to see which packages and versions it would ship without publishing or pushing anything.
4. The workflow validates, tests, bumps versions, writes changelogs, publishes to npm, and only then pushes the version commit, the tags and the GitHub releases.

## Holding back a bump

The **bump** input defaults to `conventional`, which is the normal case: every package moves by whatever its own commits imply. Setting it to `patch`, `minor` or `major` overrides that for the whole release at once.

Reach for it when a `feat!` sitting in the backlog would force a major you are not ready to cut. Setting `minor` ships that work as a minor instead. The changelog still records the breaking change under **BREAKING CHANGES**, so nothing is hidden from the people upgrading.

The override applies to every package in the release, so a package whose commits were all fixes moves by the chosen bump too. Check the dry run before using it.

## Trusted publishing

Publishing authenticates through npm's trusted publishing rather than a stored token. Lerna asks GitHub for an OIDC token, trades it at the registry for a short-lived credential scoped to the one package it is about to publish, and throws it away afterwards. Nothing long-lived sits in the repository secrets, npm never asks for a one-time password, and each published version carries a provenance attestation linking it to the commit and workflow run that built it.

This is configured per package, at **npmjs.com → the package → Settings → Trusted Publisher**:

| Field       | Value                 |
| ----------- | --------------------- |
| Publisher   | GitHub Actions        |
| Repository  | `sitepark/fractality` |
| Workflow    | `release.yml`         |
| Environment | leave empty           |

Every package in `packages/` needs its own entry. The workflow grants `id-token: write`, without which GitHub does not hand out an OIDC token at all and lerna quietly falls back to `NPM_TOKEN`.

That fallback is why a missing entry is not dangerous: the package publishes the old way, or fails the old way, and the rest of the release is unaffected. Once every package is covered, `NPM_TOKEN` and the step that verifies it can go.

## When a release fails

Nothing is pushed until npm has accepted every package, so a failed run leaves `main` and the tags exactly as they were. Fix the cause and run the workflow again — publishing is idempotent, so a run that died partway through is completed rather than duplicated. See [ADR 0005](adr/0005-publish-to-npm-before-pushing-release-tags.md) for why the pipeline is ordered this way.
