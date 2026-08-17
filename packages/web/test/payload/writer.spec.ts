import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../../fractality/src/fractal.js';
import { writePayloads } from '../../src/payload/writer.js';
import { entityHandles } from '../../src/build/routes.js';
import { payloadPathFor } from '../../src/payload/paths.js';
import type { SourceApp } from '../../src/payload/source-types.js';
import type { EntityPayload, TreePayload } from '../../src/contract/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

interface TestApp extends SourceApp {
    components: SourceApp['components'] & { set(key: string, value: unknown): void };
    docs: SourceApp['docs'] & { set(key: string, value: unknown): void };
    load(): Promise<unknown>;
}

let app: TestApp;
let dest: string;
let result: Awaited<ReturnType<typeof writePayloads>>;

beforeAll(async () => {
    const instance = create() as unknown as TestApp;
    instance.components.set('path', path.join(example, 'components'));
    instance.docs.set('path', path.join(example, 'docs'));
    await instance.load();
    app = instance;

    dest = await mkdtemp(path.join(tmpdir(), 'fractality-payloads-'));
    result = await writePayloads(app, { dest });
}, 30000);

afterAll(async () => {
    if (dest) await rm(dest, { recursive: true, force: true });
});

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8')) as T;

describe('writePayloads', () => {
    it('writes one tree payload', async () => {
        const tree = await readJson<TreePayload>(result.tree);
        expect(tree.components.length).toBeGreaterThan(0);
        expect(Object.keys(tree.status).length).toBeGreaterThan(0);
    });

    it('writes a core payload per routable handle and panels per component', () => {
        // Not the same count: the detail route resolves for variant handles too,
        // so the core payload is emitted under each of them while the panel
        // payloads — the bulk — are written once per component.
        const components = app.components
            .flatten()
            .toArray()
            .filter((c) => !c.isHidden);
        expect(result.entities.length).toBe(entityHandles(app).length);
        expect(result.panels.length).toBe(components.length * 3);
        expect(result.entities.length).toBeGreaterThan(components.length);
    });

    it('places payloads as siblings of the route they back', () => {
        const entity = result.entities.find((f) => f.endsWith(`${path.sep}render.json`));
        expect(entity).toBeDefined();
        expect(entity).toContain(path.join('components', 'detail'));
        for (const panel of ['notes', 'context', 'view']) {
            expect(result.panels).toContain(entity!.replace(/\.json$/, `.${panel}.json`));
        }
    });

    it('agrees with the addressing rule the client uses', () => {
        // The writer must not have its own idea of where files go — a client
        // deriving the path from its location has to land on the same file.
        const derived = payloadPathFor('/components/detail/render.html');
        expect(result.entities).toContain(path.join(dest, derived.replace(/^\//, '')));
    });

    it('writes payloads that parse and carry their contract version', async () => {
        const entity = await readJson<EntityPayload>(
            result.entities.find((f) => f.endsWith(`${path.sep}render.json`))!,
        );
        expect(entity.handle).toBe('render');
        expect(entity.contractVersion).toBeGreaterThan(0);
        expect(entity.variants.length).toBeGreaterThan(1);
    });

    it('emits identical bytes for every handle routing to the same component', async () => {
        // What makes duplicating the core payload across variant handles cheap.
        // Measured at the real library's ratio (3797 handles / 1365 components)
        // the duplication costs ~1.1 MB of a ~33.7 MB build.
        //
        // Deliberately not asserted as a byte ratio against the panel payloads:
        // that holds at real scale but inverts on a fixture whose templates are
        // two lines long and whose components average two variants.
        const render = result.entities.filter((f) => /render(--[^/\\]+)?\.json$/.test(f));
        expect(render.length).toBeGreaterThan(1);
        const bodies = await Promise.all(render.map((f) => readFile(f, 'utf8')));
        for (const body of bodies) expect(body).toBe(bodies[0]);
    });

    it('keeps core payload size independent of content volume', async () => {
        // A component with substantial notes must not pay for them on every
        // navigation — that is the whole point of the panel split.
        const coreOf = async (handle: string): Promise<number> =>
            (
                await readFile(
                    result.entities.find((f) => f.endsWith(`${path.sep}${handle}.json`))!,
                    'utf8',
                )
            ).length;
        const notesOf = async (handle: string): Promise<number> =>
            (
                await readFile(
                    result.panels.find((f) => f.endsWith(`${path.sep}${handle}.notes.json`))!,
                    'utf8',
                )
            ).length;

        const withNotes = await coreOf('notes-config');
        expect(await notesOf('notes-config')).toBeGreaterThan(0);
        expect(withNotes).toBeGreaterThan(0);

        // Assert on the notes *content*, not the word "notes" — the component is
        // called notes-config, so its own handle and viewPath contain it.
        const notes = await readJson<{ notes: string | null }>(
            result.panels.find((f) => f.endsWith(`${path.sep}notes-config.notes.json`))!,
        );
        const body = (notes.notes ?? '').trim();
        expect(body.length).toBeGreaterThan(0);

        const core = await readFile(
            result.entities.find((f) => f.endsWith(`${path.sep}notes-config.json`))!,
            'utf8',
        );
        expect(core).not.toContain(body);
    });

    it('excludes hidden components', async () => {
        const written = new Set(result.entities.map((f) => path.basename(f, '.json')));
        const hidden = app.components
            .flatten()
            .toArray()
            .filter((c) => c.isHidden);
        for (const component of hidden) {
            expect(written.has(component.handle)).toBe(false);
        }
    });
});
