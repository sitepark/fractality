# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **multi-context**: it is a pnpm/lerna monorepo whose packages live under `packages/<name>/`, and each package is its own context.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per package. Read each one relevant to the topic.
- **`docs/adr/`** at the repo root — system-wide decisions. Read the ADRs that touch the area you're about to work in.
- **`packages/<name>/docs/adr/`** — package-scoped decisions for the packages you're working in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
│   ├── 0001-gate-requests-on-source-rebuild.md
│   └── 0002-explicit-jquery-global-shim.md
└── packages/
    ├── core/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── mandelbrot/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
