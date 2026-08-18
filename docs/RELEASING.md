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
2. Check that the `NPM_TOKEN` secret is still valid — npm granular tokens expire after 90 days at most, and an expired one is the single most likely reason for a failed release. The workflow verifies this before it changes anything, so a dead token costs you a few seconds rather than a broken release.
3. Run the **Release** workflow from the Actions tab. Tick **dry-run** first if you want to see which packages and versions it would ship without publishing or pushing anything.
4. The workflow validates, tests, bumps versions, writes changelogs, publishes to npm, and only then pushes the version commit, the tags and the GitHub releases.

## When a release fails

Nothing is pushed until npm has accepted every package, so a failed run leaves `main` and the tags exactly as they were. Fix the cause and run the workflow again — publishing is idempotent, so a run that died partway through is completed rather than duplicated. See [ADR 0005](adr/0005-publish-to-npm-before-pushing-release-tags.md) for why the pipeline is ordered this way.
