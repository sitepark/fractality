import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { create } from '../../fractality/src/fractal.js';
import Builder, { type BuildReport } from '../src/builder.js';
import Theme from '../src/theme.js';
import { CONTRACT_VERSION } from '../src/contract/index.js';

const SHELL = '<!DOCTYPE html><html><head></head><body><div id="frame"></div></body></html>';

let root: string;
let dest: string;
let report: BuildReport;
let emitted: string[];

/**
 * A minimal but real build: a theme with a Shell, an empty library, and one
 * static mount pointing at a directory that does not exist — the shape two of
 * this repo's own examples are in, since `web.static.path` is commonly set
 * before the directory is created.
 */
beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'fractality-builder-'));
    dest = path.join(root, 'dist');

    const themeDist = path.join(root, 'theme');
    await mkdir(themeDist, { recursive: true });
    await writeFile(path.join(themeDist, 'index.html'), SHELL);

    await mkdir(path.join(root, 'components'), { recursive: true });
    await mkdir(path.join(root, 'docs'), { recursive: true });

    const theme = new Theme();
    theme.setContractVersion(CONTRACT_VERSION);
    theme.addStatic(path.join(root, 'public'), '/'); // missing, deliberately
    theme.addStatic(themeDist, '/themes/test');
    theme.setShell(path.join(themeDist, 'index.html'));
    theme.addRoute('/', { handle: 'overview' });

    const app = create() as unknown as {
        components: { set(key: string, value: unknown): void };
        docs: { set(key: string, value: unknown): void };
    };
    app.components.set('path', path.join(root, 'components'));
    app.docs.set('path', path.join(root, 'docs'));

    const builder = new Builder(theme, { dest }, app as never);
    emitted = [];
    builder.on('error', (error: Error) => emitted.push(error.message));

    report = await builder.build();
}, 30000);

afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
});

describe('Builder', () => {
    it('finishes a build whose static directory is missing', async () => {
        // It used to reject here — after the Shells, payloads and Previews were
        // all on disk — so a mistyped web.static.path threw away a finished
        // build and the CLI printed a bare ENOENT instead of the summary.
        expect(report.routes).toBeGreaterThan(0);
        expect(await readFile(path.join(dest, 'index.html'), 'utf8')).toContain('id="frame"');
    });

    it('reports the failed copy, and counts it', async () => {
        expect(report.staticErrors).toHaveLength(1);
        expect(report.staticErrors[0]!.mount).toBe('/');
        expect(report.errorCount).toBe(1);
        expect(emitted.some((message) => /does not exist/.test(message))).toBe(true);
    });

    it('still copies the mounts that do exist', async () => {
        expect(await readFile(path.join(dest, 'themes', 'test', 'index.html'), 'utf8')).toBe(SHELL);
    });
});
