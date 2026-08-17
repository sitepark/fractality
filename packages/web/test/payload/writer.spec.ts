import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../../fractality/src/fractal.js';
import { writePayloads } from '../../src/payload/writer.js';
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

    it('writes a core payload plus one per panel for every component', () => {
        expect(result.entities.length).toBeGreaterThan(0);
        // notes, context, view
        expect(result.panels.length).toBe(result.entities.length * 3);
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

    it('moves the bulk of the data off the per-navigation path', async () => {
        // The justification for splitting at all. Asserted in aggregate rather
        // than per component: a core payload carries one entry per variant, so a
        // variant-heavy component with a two-line template can have a core larger
        // than its own view payload. The measured ~470 B core was an average over
        // 1365 real components, not a per-component guarantee.
        const sizeOf = async (files: string[]): Promise<number> => {
            const sizes = await Promise.all(files.map((f) => readFile(f, 'utf8')));
            return sizes.reduce((total, contents) => total + contents.length, 0);
        };
        const [coreBytes, panelBytes] = await Promise.all([sizeOf(result.entities), sizeOf(result.panels)]);
        expect(panelBytes).toBeGreaterThan(coreBytes);
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
