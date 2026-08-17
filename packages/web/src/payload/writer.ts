import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildContextPayload, buildEntityPayload, buildNotesPayload, buildViewPayload } from './entity.js';
import { payloadPathFor } from './paths.js';
import { buildStatusTable } from './status.js';
import { buildTreePayload } from './tree.js';
import type { SourceApp, SourceComponent } from './source-types.js';

export interface WritePayloadsOptions {
    /** The build destination — `dist/`. */
    dest: string;
    /**
     * Route prefix the detail pages live under, and therefore the directory the
     * entity payloads sit in as siblings. Mirrors the route table rather than
     * being invented here.
     */
    detailRoute?: string;
    /**
     * Where the tree payload lives. It is global, so unlike entity payloads it
     * cannot be derived from a page's own location — the Shell is told about it
     * through `window.frctl`.
     */
    treeFile?: string;
}

export interface WritePayloadsResult {
    tree: string;
    entities: string[];
    panels: string[];
}

const toDiskPath = (dest: string, urlPath: string): string => path.join(dest, urlPath.replace(/^\/+/, ''));

async function writeJson(file: string, value: unknown): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value), 'utf8');
}

/**
 * Emits the whole data contract to disk: one tree payload, and per visible
 * component a core payload plus one payload per panel.
 *
 * Specified in docs/specs/client-rendered-frame.md §4 and §5.
 */
export async function writePayloads(app: SourceApp, options: WritePayloadsOptions): Promise<WritePayloadsResult> {
    const { dest, detailRoute = '/components/detail', treeFile = '/tree.json' } = options;

    const statuses = buildStatusTable(app);
    const components = app.components
        .flatten()
        .toArray()
        .filter((component: SourceComponent) => !component.isHidden);

    const treePath = toDiskPath(dest, treeFile);
    await writeJson(treePath, buildTreePayload(app));

    const entities: string[] = [];
    const panels: string[] = [];

    for (const component of components) {
        const route = `${detailRoute}/${component.handle}`;

        const entityFile = toDiskPath(dest, payloadPathFor(route));
        await writeJson(entityFile, buildEntityPayload(component, statuses));
        entities.push(entityFile);

        for (const [panel, build] of [
            ['notes', buildNotesPayload],
            ['context', buildContextPayload],
            ['view', buildViewPayload],
        ] as const) {
            const file = toDiskPath(dest, payloadPathFor(route, panel));
            await writeJson(file, build(component));
            panels.push(file);
        }
    }

    return { tree: treePath, entities, panels };
}
