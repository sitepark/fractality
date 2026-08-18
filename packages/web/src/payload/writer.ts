import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildContextPayload, buildEntityPayload, buildNotesPayload, buildViewPayload } from './entity.js';
import { payloadPathFor } from './paths.js';
import { buildStatusTable } from './status.js';
import { buildTreePayload } from './tree.js';
import { buildDocPayload, routedDocs } from './doc.js';
import { assetsMount, buildAssetPayload, routedAssets } from './asset.js';
import { componentsByHandle } from '../build/routes.js';
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
    docsRoute?: string;
    assetsRoute?: string;
}

export interface WritePayloadsResult {
    tree: string;
    entities: string[];
    panels: string[];
    docs: string[];
    assets: string[];
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
    const {
        dest,
        detailRoute = '/components/detail',
        treeFile = '/tree.json',
        docsRoute = '/docs',
        assetsRoute = '/assets',
    } = options;

    const statuses = buildStatusTable(app);
    const byHandle = componentsByHandle(app);
    const components = app.components
        .flatten()
        .toArray()
        .filter((component: SourceComponent) => !component.isHidden);

    const treePath = toDiskPath(dest, treeFile);
    await writeJson(treePath, buildTreePayload(app));

    const entities: string[] = [];
    const panels: string[] = [];

    // The detail route resolves for variant handles as well as component ones,
    // so a Shell can land on /components/detail/button--variant-1.html. Deriving
    // the payload path from that location must hit a real file, so the core
    // payload is emitted under every handle that routes to this component.
    //
    // The alternative — having the client strip a `--variant` suffix — would
    // trade a little duplication for handle parsing in the browser, and the core
    // payload is the small one. Panel payloads are *not* duplicated: they are the
    // bulk, and the client addresses them from the core payload's `handle`, which
    // is always the component's.
    for (const [handle, component] of byHandle) {
        const file = toDiskPath(dest, payloadPathFor(`${detailRoute}/${handle}`));
        await writeJson(file, buildEntityPayload(component, statuses));
        entities.push(file);
    }

    for (const component of components) {
        const route = `${detailRoute}/${component.handle}`;
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

    const docs: string[] = [];
    for (const { route, doc } of routedDocs(app.docs.flatten().toArray(), docsRoute)) {
        const file = toDiskPath(dest, payloadPathFor(route));
        await writeJson(file, buildDocPayload(doc, statuses));
        docs.push(file);
    }

    const assets: string[] = [];
    const mount = assetsMount(app);
    for (const { route, asset } of routedAssets(app, assetsRoute)) {
        const file = toDiskPath(dest, payloadPathFor(route));
        await writeJson(file, buildAssetPayload(asset, mount));
        assets.push(file);
    }

    return { tree: treePath, entities, panels, docs, assets };
}
