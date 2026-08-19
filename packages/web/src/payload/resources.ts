import { CONTRACT_VERSION } from '../contract/version.js';
import type { ResourceCollection, ResourceFile, ResourcesPayload } from '../contract/entity.js';
import type { SourceApp, SourceComponent, SourceResource } from './source-types.js';

/** Where component resource files are served. Mirrors the 0.x route. */
export const RESOURCE_ROUTE = '/components/raw';

/**
 * The URL a component's resource file is served at.
 *
 * The same shape 0.x's `component-resource` theme route used, so links people
 * copied out of the Resources panel still resolve. It is `@fractality/web` that
 * serves it now: a theme used to declare the route and hand back a filesystem
 * path, and nothing has honoured that since the Frame stopped being rendered
 * from a route table.
 */
export const resourceUrl = (handle: string, name: string, route = RESOURCE_ROUTE): string =>
    `${route}/${handle}/${encodeURIComponent(name)}`;

/**
 * A resource file as the panel needs it, contents included.
 *
 * Read here rather than in the browser because only this side has the file: the
 * panel shows the source of a component's stylesheet or script the same way the
 * View panel shows its template.
 */
function fileOf(component: SourceComponent, resource: SourceResource, route: string): ResourceFile {
    const file: ResourceFile = {
        name: resource.base,
        path: resource.relPath,
        ext: resource.ext,
        size: resource.stat?.size ?? 0,
        url: resourceUrl(component.handle, resource.base, route),
        lang: resource.lang ?? '',
        // Binary content has nothing to show as text, and its bytes have no place
        // in a JSON payload — the panel links to the file instead, and shows it
        // inline when it is an image.
        content: resource.isBinary ? null : (resource.getContentSync?.() ?? null),
    };

    if (resource.isImage) file.isImage = true;

    return file;
}

/**
 * A component's resource files, in the groups the project configured.
 *
 * Groups come from `components.resources` — one `assets` group matching
 * everything by default — and empty ones are dropped, as the template layer
 * dropped their tabs.
 */
export function resourceCollections(component: SourceComponent, route = RESOURCE_ROUTE): ResourceCollection[] {
    const collections: ResourceCollection[] = [];

    for (const collection of component.resources().toArray()) {
        const files = collection.toArray().map((resource) => fileOf(component, resource, route));
        if (!files.length) continue;

        collections.push({
            name: collection.name ?? 'assets',
            label: collection.label ?? collection.name ?? 'Assets',
            files,
        });
    }

    return collections;
}

/** `<handle>.resources.json` — a component's own files, fetched when the panel opens. */
export function buildResourcesPayload(component: SourceComponent, route = RESOURCE_ROUTE): ResourcesPayload {
    return {
        contractVersion: CONTRACT_VERSION,
        handle: component.handle,
        collections: resourceCollections(component, route),
    };
}

/** One servable file: where it is on disk, and the URL path it answers at. */
export interface RoutedResource {
    /** URL path, root-absolute. */
    route: string;
    /** Absolute path on disk. */
    path: string;
}

/**
 * Every component resource file, paired with the URL it is served at.
 *
 * Enumerated from the library rather than resolved from the request path, which
 * is what keeps `/components/raw/button/../../../etc/passwd` from being a
 * question this has to answer: a request either names a file the library knows
 * about or it does not.
 */
export function routedResources(app: SourceApp, route = RESOURCE_ROUTE): RoutedResource[] {
    const routed: RoutedResource[] = [];

    for (const component of app.components.flatten().toArray()) {
        if (component.isHidden) continue;

        for (const collection of component.resources().toArray()) {
            for (const resource of collection.toArray()) {
                routed.push({ route: resourceUrl(component.handle, resource.base, route), path: resource.path });
            }
        }
    }

    return routed;
}
