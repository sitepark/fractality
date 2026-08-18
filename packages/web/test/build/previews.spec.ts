import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../../fractality/src/fractal.js';
import { routedEntities, writePreviews } from '../../src/build/index.js';
import type { SourceApp } from '../../src/payload/source-types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

interface TestApp extends SourceApp {
    components: SourceApp['components'] & { set(key: string, value: unknown): void };
    load(): Promise<unknown>;
}

let app: TestApp;
let dest: string;
let result: Awaited<ReturnType<typeof writePreviews>>;

beforeAll(async () => {
    const instance = create() as unknown as TestApp;
    instance.components.set('path', path.join(example, 'components'));
    await instance.load();
    app = instance;

    dest = await mkdtemp(path.join(tmpdir(), 'fractality-previews-'));
    result = await writePreviews(app, { dest });
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

describe('writePreviews', () => {
    it('writes a preview and a render document for every routable handle', async () => {
        const handles = routedEntities(app).map((e) => e.handle);
        expect(result.files.length).toBe(handles.length * 2);

        for (const handle of handles.slice(0, 5)) {
            expect(await exists(path.join(dest, 'components', 'preview', `${handle}.html`))).toBe(true);
            expect(await exists(path.join(dest, 'components', 'render', `${handle}.html`))).toBe(true);
        }
    });

    it('renders a variant handle as that variant, not its default', async () => {
        // Rendering the component for a variant route would silently produce the
        // default variant for every one of them — the same page under N urls.
        const variant = routedEntities(app).find((e) => e.handle.includes('--') && !e.handle.endsWith('--default'));
        expect(variant).toBeDefined();

        const [asVariant, asComponent] = await Promise.all([
            readFile(path.join(dest, 'components', 'render', `${variant!.handle}.html`), 'utf8'),
            readFile(path.join(dest, 'components', 'render', `${variant!.component.handle}.html`), 'utf8'),
        ]);
        expect(asVariant).not.toBe(asComponent);
    });

    it('collects render failures instead of aborting the build', () => {
        // The fixtures include deliberately broken components. One broken
        // pattern must not take down a build of thousands.
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.every((e) => typeof e.message === 'string')).toBe(true);
    });

    it('reports a failing pattern once, not once per document it writes', () => {
        // Each pattern renders two documents, preview and render, and a broken
        // one fails identically in both — so the build reported every failure
        // twice before this. Deduplicated on handle and message, which still
        // separates a preview failing differently from its render.
        const keys = result.errors.map((e) => `${e.handle}\u0000${e.message}`);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('writes a readable error document where a pattern failed', async () => {
        const failure = result.errors[0]!;
        const file = path.join(dest, failure.route.replace(/^\//, ''), `${failure.handle}.html`);
        const html = await readFile(file, 'utf8');
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain(failure.handle);
    });

    it('escapes the error document, since the message comes from user templates', async () => {
        const html = await readFile(
            path.join(dest, result.errors[0]!.route.replace(/^\//, ''), `${result.errors[0]!.handle}.html`),
            'utf8',
        );
        // Whatever the template threw, it must not become live markup.
        const body = html.slice(html.indexOf('<pre>'));
        expect(body).not.toMatch(/<script/i);
    });

    it('renders patterns without involving any theme view', async () => {
        // The engine and its views are gone; what lands here is the adapter's
        // output for the user's own template.
        const html = await readFile(path.join(dest, 'components', 'render', 'render.html'), 'utf8');
        expect(html).not.toContain('Frame');
        expect(html.trim().length).toBeGreaterThan(0);
    });
});
