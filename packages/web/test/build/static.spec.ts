import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../../fractality/src/fractal.js';
import { buildStatic, entityHandles, staticRoutes } from '../../src/build/index.js';
import { payloadPathFor } from '../../src/payload/paths.js';
import type { SourceApp } from '../../src/payload/source-types.js';
import type { EntityPayload } from '../../src/contract/index.js';
import type { FrctlConfig } from '../../src/shell/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

interface TestApp extends SourceApp {
    components: SourceApp['components'] & { set(key: string, value: unknown): void };
    docs: SourceApp['docs'] & { set(key: string, value: unknown): void };
    load(): Promise<unknown>;
}

const config: FrctlConfig = {
    env: 'static',
    themeMount: '/themes/mandelbrot',
    siteRoot: '/',
    treeFile: '/tree.json',
};

const SHELL = `<!DOCTYPE html><html><head><link rel="stylesheet" href="./css/default.css">
<script type="module" src="./js/frame.js"></script></head>
<body><div id="frame"></div><noscript>JavaScript required.</noscript></body></html>`;

let app: TestApp;
let dest: string;
let result: Awaited<ReturnType<typeof buildStatic>>;

beforeAll(async () => {
    const instance = create() as unknown as TestApp;
    instance.components.set('path', path.join(example, 'components'));
    instance.docs.set('path', path.join(example, 'docs'));
    await instance.load();
    app = instance;

    dest = await mkdtemp(path.join(tmpdir(), 'fractality-build-'));
    result = await buildStatic({ app, dest, shell: SHELL, config });
}, 30000);

afterAll(async () => {
    if (dest) await rm(dest, { recursive: true, force: true });
});

const exists = async (file: string): Promise<boolean> => {
    try {
        await stat(file);
        return true;
    } catch {
        return false;
    }
};

describe('buildStatic', () => {
    it('writes a shell for every Frame route', () => {
        // The index, one per component/variant handle, and one per doc page.
        // Docs are Frame routes like any other — a deep link to one has to
        // resolve on a dumb static host too.
        const docs = app.docs
            .flatten()
            .toArray()
            .filter((doc) => !doc.isHidden).length;
        expect(result.routes).toBe(staticRoutes(app).length);
        expect(result.routes).toBe(1 + entityHandles(app).length + docs);
    });

    it('resolves a payload for every route a shell was written to', async () => {
        // The integration property that isolated tests cannot show: a Shell can
        // land on a *variant* route, and deriving the payload path from that
        // location has to hit a real file.
        const missing: string[] = [];
        for (const route of staticRoutes(app)) {
            if (route === '/index.html') continue;
            const file = path.join(dest, payloadPathFor(route).replace(/^\//, ''));
            if (!(await exists(file))) missing.push(route);
        }
        expect(missing).toEqual([]);
    });

    it('serves the owning component from a variant route', async () => {
        const handles = entityHandles(app);
        const variantHandle = handles.find((h) => h.includes('--'));
        expect(variantHandle).toBeDefined();

        const file = path.join(dest, payloadPathFor(`/components/detail/${variantHandle}`).replace(/^\//, ''));
        const payload = JSON.parse(await readFile(file, 'utf8')) as EntityPayload;

        // The payload's handle is the component's, not the variant's — which is
        // what lets the client address panel payloads without parsing handles.
        expect(variantHandle!.startsWith(payload.handle)).toBe(true);
        expect(payload.variants.some((v) => v.handle === variantHandle)).toBe(true);
    });

    it('addresses panel payloads from the core payload handle', async () => {
        const variantHandle = entityHandles(app).find((h) => h.includes('--'))!;
        const core = JSON.parse(
            await readFile(
                path.join(dest, payloadPathFor(`/components/detail/${variantHandle}`).replace(/^\//, '')),
                'utf8',
            ),
        ) as EntityPayload;

        for (const panel of ['notes', 'context', 'view'] as const) {
            const file = path.join(dest, payloadPathFor(`/components/detail/${core.handle}`, panel).replace(/^\//, ''));
            expect(await exists(file)).toBe(true);
        }
    });

    it('writes byte-identical shells regardless of route depth', async () => {
        const [root, nested] = await Promise.all([
            readFile(path.join(dest, 'index.html'), 'utf8'),
            readFile(path.join(dest, 'components', 'detail', 'render.html'), 'utf8'),
        ]);
        expect(nested).toBe(root);
    });

    it('reports a breakdown that adds up, in units a reader can compare', async () => {
        // The progress counter measures files, and a client-rendered build writes
        // the data contract alongside the documents — so the number is legitimately
        // larger than the page count the engine-backed builder reported. The
        // breakdown is what makes that difference legible instead of looking like
        // the library grew.
        expect(result.totalFiles).toBe(result.routes + result.previewFiles + result.payloadFiles);
        expect(result.routes).toBe(staticRoutes(app).length);
        expect(result.previewFiles).toBeGreaterThan(0);
        expect(result.payloadFiles).toBeGreaterThan(0);
    });

    it('produces a build dominated by data rather than by repeated markup', async () => {
        // The point of the whole exercise: today every detail page carries the
        // entire navigation tree. Here the markup is one small file repeated,
        // and the tree exists exactly once.
        const treeBytes = (await readFile(path.join(dest, 'tree.json'), 'utf8')).length;
        expect(result.shellBytes).toBeLessThan(2048);
        expect(treeBytes).toBeGreaterThan(0);
        expect(result.shellTotalBytes).toBe(result.shellBytes * result.routes);
    });
});
