import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../../fractality/src/fractal.js';
import { assetsMount, buildAssetPayload, routedAssets } from '../../src/payload/asset.js';
import type { SourceApp } from '../../src/payload/source-types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

interface TestApp extends SourceApp {
    components: SourceApp['components'] & { set(key: string, value: unknown): void };
    assets: { add(name: string, config: unknown): unknown; visible?(): never[] };
    load(): Promise<unknown>;
}

let app: TestApp;
let root: string;

/**
 * Asset sources are opt-in — a project registers one with
 * `fractality.assets.add()` — and no example in this repo does, which is why the
 * assets tree root is empty everywhere. This builds one, so the code path has
 * something real to run against rather than being exercised only by its absence.
 */
beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'fractality-assets-'));
    await mkdir(path.join(root, 'css'), { recursive: true });
    await writeFile(path.join(root, 'css', 'main.css'), 'body { color: red }', 'utf8');
    await writeFile(path.join(root, 'app.js'), 'console.log(1)', 'utf8');

    const instance = create() as unknown as TestApp;
    instance.components.set('path', path.join(example, 'components'));
    instance.assets.add('theme', root);
    await instance.load();
    app = instance;
}, 30000);

afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
});

describe('asset payloads', () => {
    it('routes every visible asset source', () => {
        const routed = routedAssets(app);
        expect(routed).toHaveLength(1);
        expect(routed[0]?.route).toBe('/assets/theme');
    });

    it('lists the files in the source', () => {
        const payload = buildAssetPayload(routedAssets(app)[0]!.asset, assetsMount(app));
        const names = payload.files.map((file) => file.name).sort();
        expect(names).toEqual(['app.js', 'main.css']);
    });

    it('points file urls at where the files are actually served', () => {
        // From web.assets.mount, not from the source's own directory — which is
        // somewhere nothing is served from.
        const payload = buildAssetPayload(routedAssets(app)[0]!.asset, assetsMount(app));
        for (const file of payload.files) {
            expect(file.url.startsWith('/assets/')).toBe(true);
        }
        // srcPath includes the source name, so files from a source registered
        // as 'theme' are served under /assets/theme/ — the same URL the template
        // layer's url filter produced.
        expect(payload.files.map((f) => f.url)).toContain('/assets/theme/css/main.css');
    });

    it('carries real byte sizes', () => {
        const payload = buildAssetPayload(routedAssets(app)[0]!.asset, assetsMount(app));
        for (const file of payload.files) {
            expect(file.size).toBeGreaterThan(0);
        }
    });

    it('is JSON-serialisable and round-trips', () => {
        const payload = buildAssetPayload(routedAssets(app)[0]!.asset, assetsMount(app));
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    });
});
