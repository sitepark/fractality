import { payloadPathFor, type PanelSegment } from '@fractality/web/addressing';
import type {
    AssetPayload,
    ContextPayload,
    DocPayload,
    EntityPayload,
    NotesPayload,
    TreePayload,
    ViewPayload,
} from '@fractality/web/contract';
import { frctl } from './frctl.js';

const cache = new Map<string, Promise<unknown>>();

/**
 * Drops every cached payload.
 *
 * Called when the dev server reports a rebuild. Without this the Frame would
 * keep serving the tree and payloads it fetched at boot, and an edit to a
 * template or to context data would never appear.
 */
export const invalidate = (): void => cache.clear();

async function getJson<T>(url: string): Promise<T> {
    let pending = cache.get(url) as Promise<T> | undefined;
    if (!pending) {
        pending = fetch(url).then((res) => {
            if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
            return res.json() as Promise<T>;
        });
        cache.set(url, pending);
    }
    return pending;
}

/** Fetched once and cached — it is the same for every route. */
export const fetchTree = (): Promise<TreePayload> =>
    getJson<TreePayload>(`${frctl.siteRoot.replace(/\/$/, '')}${frctl.treeFile}`);

/**
 * The payload backing the current location.
 *
 * Derived from `location.pathname` using the same rule the server and the static
 * build use, rather than from a route table the Frame keeps its own copy of.
 */
export const fetchEntity = (pathname: string): Promise<EntityPayload> =>
    getJson<EntityPayload>(payloadPathFor(pathname));

/**
 * A panel's data, fetched only when its tab is opened.
 *
 * Addressed from the *component's* handle rather than from `location.pathname`,
 * because a variant route resolves to its component's panels.
 */
const panelUrl = (handle: string, panel: PanelSegment): string =>
    payloadPathFor(`${frctl.siteRoot.replace(/\/$/, '')}/components/detail/${handle}`, panel);

/**
 * A documentation page.
 *
 * Same derivation rule as everything else: the payload is a sibling of the route
 * the Shell was served at, so the Frame never needs its own route table.
 */
export const fetchDoc = (pathname: string): Promise<DocPayload> => {
    // A static host serves /docs/ from /docs/index.html, so the Frame can find
    // itself at the bare docs root even though every doc is routed as
    // /docs/<name>. Normalise before deriving, so both spellings hit one file.
    const normalised = pathname.replace(/\.html$/, '').replace(/\/+$/, '');
    const route = /^\/docs$/.test(normalised) ? '/docs/index' : normalised;
    return getJson<DocPayload>(payloadPathFor(route));
};

export const fetchAsset = (pathname: string): Promise<AssetPayload> =>
    getJson<AssetPayload>(payloadPathFor(pathname.replace(/\/+$/, '')));

/**
 * A component's rendered markup, fetched as text rather than JSON.
 *
 * Reuses the render document the build already writes and the dev server
 * already serves, instead of duplicating the same markup into a payload of its
 * own — it is the one artefact nothing else in the Frame was consuming.
 */
export async function fetchRendered(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
    return res.text();
}

export const fetchNotes = (handle: string): Promise<NotesPayload> => getJson<NotesPayload>(panelUrl(handle, 'notes'));

export const fetchContext = (handle: string): Promise<ContextPayload> =>
    getJson<ContextPayload>(panelUrl(handle, 'context'));

export const fetchView = (handle: string): Promise<ViewPayload> => getJson<ViewPayload>(panelUrl(handle, 'view'));
