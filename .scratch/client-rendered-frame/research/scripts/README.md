# Measurement scripts for ticket 01

Reproduce the figures in [../payload-weights.md](../payload-weights.md).

They expect a consumer project with `@fractality/fractality`, `@fractality/handlebars` and
`@fractality/mandelbrot` resolvable — the simplest setup is a scratch directory whose `node_modules`
is symlinked to `examples/handlebars/node_modules`, with a `fractality.config.js` pointing
`components.path`, `docs.path` and `web.builder.dest` at that directory.

**Put `builder.dest` on real disk.** The baseline build writes ~9 GB for a 3797-handle library, and
a default scratch location may be tmpfs — that is why the recorded baseline run was stopped at 43%.

| Script                                           | What it does                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `gen.mjs <handles> <projectDir>`                 | Generates a deterministic synthetic library of the given routable-handle count. Seeded, so runs are reproducible. Writes `manifest.json`. |
| `measure-payloads.mjs <absConfigPath> <outJson>` | Tree payload in three shapes (naive / status-keyed / minus `id`) and per-entity payloads, each raw + gzip + brotli.                       |
| `entity-dedup.mjs <absConfigPath>`               | Compares duplicating view content per variant against hoisting and referencing it.                                                        |
| `shell.html`                                     | The CSR shell as measured (998 B raw / 523 B gzipped), built from the real `<head>` of a generated page.                                  |

Config paths must be **absolute** — these are imported dynamically, so a relative path resolves
against the script's own directory, not the working directory.

The handle-count formula is the one thing worth re-verifying if `@fractality/core` changes:
`variants()` includes the implicit default, so a component declaring N extra variants contributes
N + 2 handles. Check the generator's reported count against `ls dist/components/detail | wc -l`.
