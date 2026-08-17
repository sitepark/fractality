import { writePayloads } from '../payload/writer.js';
import { writeShells } from '../shell/writer.js';
import type { FrctlConfig } from '../shell/config.js';
import type { SourceApp } from '../payload/source-types.js';
import { writePreviews, type PreviewError } from './previews.js';
import { staticRoutes } from './routes.js';

export interface BuildStaticOptions {
    app: SourceApp;
    /** The build destination — `dist/`. */
    dest: string;
    /** The Shell HTML as the theme built it. */
    shell: string;
    config: FrctlConfig;
    detailRoute?: string;
}

export interface BuildStaticResult {
    routes: number;
    shellBytes: number;
    /** Total bytes of Shell copies — route count times one copy. */
    shellTotalBytes: number;
    payloadFiles: number;
    previewFiles: number;
    /** Patterns that failed to render. Collected, not thrown. */
    previewErrors: PreviewError[];
}

/**
 * The static build: one Shell per route, plus the whole data contract.
 *
 * This is the CSR replacement for rendering a page per route: one Shell per
 * route, the whole data contract, and the Preview documents rendered through the
 * Adapters. No theme view is rendered anywhere.
 */
export async function buildStatic(options: BuildStaticOptions): Promise<BuildStaticResult> {
    const { app, dest, shell, config, detailRoute } = options;

    const routes = staticRoutes(app, { detailRoute });
    const shells = await writeShells({ dest, routes, shell, config });
    const payloads = await writePayloads(app, {
        dest,
        detailRoute,
        treeFile: config.treeFile,
    });
    const previews = await writePreviews(app, { dest });

    return {
        routes: routes.length,
        shellBytes: shells.bytes,
        shellTotalBytes: shells.bytes * routes.length,
        payloadFiles: 1 + payloads.entities.length + payloads.panels.length,
        previewFiles: previews.files.length,
        previewErrors: previews.errors,
    };
}
