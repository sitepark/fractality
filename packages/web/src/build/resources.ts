import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { RESOURCE_ROUTE, routedResources } from '../payload/resources.js';
import type { SourceApp } from '../payload/source-types.js';

export interface WriteResourcesOptions {
    /** The build destination — `dist/`. */
    dest: string;
    resourceRoute?: string;
}

/**
 * Copies every component's own files to the URLs the Resources panel links them
 * at.
 *
 * Copied rather than referenced: a built site has to stand on its own, and the
 * panel shows a file's URL as something you can open. The dev server answers the
 * same paths from the library.
 */
export async function writeResources(app: SourceApp, options: WriteResourcesOptions): Promise<string[]> {
    const { dest, resourceRoute = RESOURCE_ROUTE } = options;
    const written: string[] = [];

    for (const resource of routedResources(app, resourceRoute)) {
        const file = path.join(dest, decodeURIComponent(resource.route).replace(/^\/+/, ''));
        await mkdir(path.dirname(file), { recursive: true });
        await copyFile(resource.path, file);
        written.push(file);
    }

    return written;
}
