import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from '../../../fractality/src/fractal.js';
import {
    buildContextPayload,
    buildEntityPayload,
    buildNotesPayload,
    buildStatusTable,
    buildTreePayload,
    buildViewPayload,
    type SourceApp,
    type SourceComponent,
} from '../../src/payload/index.js';
import { CONTRACT_VERSION } from '../../src/contract/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

/**
 * Driven against a real loaded library on purpose. These builders read an
 * untyped JavaScript boundary (`src/payload/source-types.ts`), so hand-built
 * fixtures would assert only that the test author and the implementation agree.
 * Feeding them real entities is what makes the seam observable at all.
 */
/**
 * `create()` returns an object whose `set`/`flatten`/`load` are supplied by
 * `mixwith` class factories at runtime, which TypeScript cannot see — the exact
 * reason the type boundary stops before core. Narrowing it once here keeps that
 * cast in a single visible place instead of scattering `any` through the specs.
 */
interface TestApp extends SourceApp {
    components: SourceApp['components'] & { set(key: string, value: unknown): void };
    docs: SourceApp['docs'] & { set(key: string, value: unknown): void };
    load(): Promise<unknown>;
}

let app: TestApp;
let components: SourceComponent[];

beforeAll(async () => {
    const instance = create() as unknown as TestApp;
    instance.components.set('path', path.join(example, 'components'));
    instance.docs.set('path', path.join(example, 'docs'));
    await instance.load();
    app = instance;
    components = instance.components.flatten().toArray();
}, 30000);

const find = (handle: string): SourceComponent => {
    const component = components.find((c) => c.handle === handle);
    if (!component) throw new Error(`fixture component '${handle}' not found`);
    return component;
};

describe('buildTreePayload', () => {
    it('stamps the contract version', () => {
        expect(buildTreePayload(app).contractVersion).toBe(CONTRACT_VERSION);
    });

    it('has three roots', () => {
        const tree = buildTreePayload(app);
        expect(Object.keys(tree)).toEqual(expect.arrayContaining(['components', 'docs', 'assets']));
    });

    it('carries no id anywhere — it was 77% of the gzipped payload', () => {
        const serialised = JSON.stringify(buildTreePayload(app));
        expect(serialised).not.toMatch(/"id"\s*:/);
    });

    it('interns statuses instead of repeating them', () => {
        const tree = buildTreePayload(app);
        const serialised = JSON.stringify(tree.components);
        // The resolved label must not appear on nodes, only in the table.
        expect(serialised).not.toContain('Ready to implement');
        expect(Object.keys(tree.status).length).toBeGreaterThan(0);
    });

    it('namespaces status keys by root, since both sets define "ready"', () => {
        // The shipped defaults agree on label and colour and differ only in
        // `description`, which the contract does not carry — so a flat table
        // would look fine until a project configured the two sets differently.
        const { status } = buildTreePayload(app);
        expect(status).toHaveProperty('components:ready');
        expect(status).toHaveProperty('docs:ready');
        expect(Object.keys(status).every((k) => k.includes(':'))).toBe(true);
    });

    it('resolves an entity status to its own root namespace', () => {
        const tree = buildTreePayload(app);
        const flatten = (nodes: typeof tree.components): typeof tree.components =>
            nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
        const statuses = flatten(tree.components)
            .map((n) => n.status)
            .filter((s): s is string => Boolean(s));
        expect(statuses.length).toBeGreaterThan(0);
        expect(statuses.every((s) => s.startsWith('components:'))).toBe(true);
    });

    it('expands a multi-variant component into children', () => {
        const tree = buildTreePayload(app);
        const flatten = (nodes: typeof tree.components): typeof tree.components =>
            nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
        const render = flatten(tree.components).find((n) => n.handle === 'render');
        expect(render?.children?.length).toBeGreaterThan(1);
    });

    it('omits empty optional fields rather than emitting null', () => {
        const serialised = JSON.stringify(buildTreePayload(app).components);
        expect(serialised).not.toContain('"tags":[]');
        expect(serialised).not.toContain('null');
    });

    it('strips the null tag entries core emits for untagged components', () => {
        // core resolves an untagged component's tags to [null]; mandelbrot's
        // template works around the same thing with replace("null,", "").
        const payload = buildEntityPayload(find('render'), buildStatusTable(app));
        expect(payload.tags).toBeUndefined();
    });
});

describe('buildEntityPayload', () => {
    it('carries variants and preview urls', () => {
        const payload = buildEntityPayload(find('render'), buildStatusTable(app));
        expect(payload.contractVersion).toBe(CONTRACT_VERSION);
        expect(payload.variants.length).toBeGreaterThan(1);
        expect(payload.variants[0]?.previewUrl).toContain('/components/preview/');
        expect(payload.variants.some((v) => v.isDefault)).toBe(true);
    });

    it('keeps notes, context and view source out of the core payload', () => {
        const payload = buildEntityPayload(find('notes-config'), buildStatusTable(app));
        expect(payload).not.toHaveProperty('notes');
        expect(payload).not.toHaveProperty('context');
        expect(JSON.stringify(payload)).not.toContain('{{');
    });

    it('reduces references to handles', () => {
        const payload = buildEntityPayload(find('render'), buildStatusTable(app));
        for (const ref of [...payload.references, ...payload.referencedBy]) {
            expect(typeof ref).toBe('string');
        }
    });

    it('is JSON-serialisable and round-trips', () => {
        const payload = buildEntityPayload(find('render'), buildStatusTable(app));
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    });
});

describe('panel payloads', () => {
    it('notes payload carries raw markdown, not rendered html', () => {
        const payload = buildNotesPayload(find('notes-config'));
        expect(payload.contractVersion).toBe(CONTRACT_VERSION);
        const all = [payload.notes, ...payload.variants.map((v) => v.notes)].join('\n');
        expect(all).not.toContain('<p>');
    });

    it('context payload carries objects, not formatted strings', () => {
        const payload = buildContextPayload(find('render'));
        expect(typeof payload.context).toBe('object');
        for (const variant of payload.variants) {
            expect(typeof variant.context).toBe('object');
        }
    });

    it('view payload carries source per variant', () => {
        const payload = buildViewPayload(find('render'));
        expect(payload.variants.length).toBeGreaterThan(1);
        expect(payload.variants.every((v) => typeof v.lang === 'string')).toBe(true);
    });

    it('every panel payload is independently versioned and addressable', () => {
        const component = find('render');
        for (const payload of [
            buildNotesPayload(component),
            buildContextPayload(component),
            buildViewPayload(component),
        ]) {
            expect(payload.contractVersion).toBe(CONTRACT_VERSION);
            expect(payload.handle).toBe('render');
        }
    });
});
