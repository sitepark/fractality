/**
 * Fails when a package's peer range on another workspace package does not
 * accept that package's current version.
 *
 * The adapters peer-depend on `@fractality/fractality` (and mandelbrot on
 * `@fractality/web`) with plain semver ranges, which lerna does not touch when
 * it bumps versions. All packages share one version, so a major release makes
 * every one of those ranges reject the packages it ships with, and npm refuses
 * to install them together. The release workflow runs this right after the
 * version bump, before anything is committed or published, so a forgotten
 * range fails the run instead of shipping.
 *
 * Ranges using the `workspace:` protocol are rewritten by lerna at publish
 * time and are skipped.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import semver from 'semver';

const PACKAGES_DIR = 'packages';

const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKAGES_DIR, entry.name, 'package.json'))
    .map((path) => ({ path, json: JSON.parse(readFileSync(path, 'utf8')) }));

const versions = new Map(packages.map(({ json }) => [json.name, json.version]));

let failed = 0;

for (const { path, json } of packages) {
    for (const [name, range] of Object.entries(json.peerDependencies ?? {})) {
        const version = versions.get(name);
        if (!version || range.startsWith('workspace:')) continue;

        if (!semver.satisfies(version, range)) {
            failed += 1;
            console.error(`${path}: peer range "${range}" for ${name} does not accept ${version}.`);
        }
    }
}

if (failed > 0) {
    console.error(`\nWiden the range(s) above to include the new version, commit, and run the release again.`);
    process.exit(1);
}

console.log('All peer ranges on workspace packages accept the versions being released.');
