/**
 * Creates one GitHub release per tag produced by `lerna version`, using that
 * package's own CHANGELOG.md section as the release notes.
 *
 * `lerna version --create-release github` cannot be used here: it insists on
 * pushing, and the release pipeline deliberately holds the push back until npm
 * has accepted the packages. So the releases are created afterwards, from the
 * tags the version step created.
 *
 * Reads tags from stdin, one per line. Safe to re-run: existing releases are
 * left alone. Pass --dry-run to print the notes instead of creating anything.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES_DIR = 'packages';
const dryRun = process.argv.includes('--dry-run');

const packageDirs = new Map(
    readdirSync(PACKAGES_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
            const dir = join(PACKAGES_DIR, entry.name);
            try {
                const { name } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
                return name ? [[name, dir]] : [];
            } catch {
                return [];
            }
        }),
);

/** Splits `@fractality/core@0.5.4` into its package name and version. */
function parseTag(tag) {
    const at = tag.lastIndexOf('@');
    if (at <= 0) return null;
    return { name: tag.slice(0, at), version: tag.slice(at + 1) };
}

/**
 * Pulls the notes for one version out of a conventional-changelog file. Version
 * headings vary in level and may be linked, e.g. `## 0.5.4 (2026-08-18)`,
 * `# 0.5.0`, or `## [0.5.4](https://…/compare/…) (2026-08-18)`.
 */
function extractNotes(changelogPath, version) {
    let lines;
    try {
        lines = readFileSync(changelogPath, 'utf8').split('\n');
    } catch {
        return null;
    }

    const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const start = new RegExp(`^(#{1,4})\\s+\\[?${escaped}\\]?([\\s(]|$)`);

    const from = lines.findIndex((line) => start.test(line));
    if (from === -1) return null;

    // The section runs until the next heading at the same or a higher level. It
    // must not stop at its own `### Bug Fixes` / `### Features` subheadings.
    const level = lines[from].match(start)[1].length;
    const nextVersion = new RegExp(`^#{1,${level}}\\s`);

    const rest = lines.slice(from + 1);
    const until = rest.findIndex((line) => nextVersion.test(line));
    const body = (until === -1 ? rest : rest.slice(0, until)).join('\n').trim();

    return body || null;
}

function gh(args, options = {}) {
    return spawnSync('gh', args, { encoding: 'utf8', ...options });
}

const tags = readFileSync(0, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

if (tags.length === 0) {
    console.error('No tags on stdin; nothing to release.');
    process.exit(1);
}

let failed = 0;

for (const tag of tags) {
    const parsed = parseTag(tag);
    if (!parsed) {
        console.error(`Skipping ${tag}: not a package tag.`);
        continue;
    }

    const { name, version } = parsed;
    const dir = packageDirs.get(name);
    if (!dir) {
        console.error(`Skipping ${tag}: no package directory found for ${name}.`);
        continue;
    }

    if (!dryRun && gh(['release', 'view', tag], { stdio: 'ignore' }).status === 0) {
        console.log(`${tag}: release already exists, leaving it as is.`);
        continue;
    }

    const notes =
        extractNotes(join(dir, 'CHANGELOG.md'), version) ??
        `See [\`${dir}/CHANGELOG.md\`](https://github.com/${process.env.GITHUB_REPOSITORY ?? 'sitepark/fractality'}/blob/${tag}/${dir}/CHANGELOG.md).`;

    if (dryRun) {
        console.log(`\n=== ${tag} (${dir}) ===\n${notes}`);
        continue;
    }

    const result = gh(['release', 'create', tag, '--title', tag, '--notes-file', '-'], {
        input: notes,
    });

    if (result.status === 0) {
        console.log(`${tag}: released.`);
    } else {
        failed += 1;
        console.error(`${tag}: failed to create release.\n${result.stderr ?? ''}`);
    }
}

// The packages are already on npm at this point, so a failed release note is
// worth reporting but must not be reported as a failed publish.
if (failed > 0) {
    console.error(`\n${failed} GitHub release(s) could not be created. Packages are published; create these by hand.`);
    process.exit(1);
}
