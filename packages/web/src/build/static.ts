import { writePayloads } from '../payload/writer.js';
import { writeShells } from '../shell/writer.js';
import type { FrctlConfig } from '../shell/config.js';
import type { SourceApp } from '../payload/source-types.js';
import { writePreviews, type PreviewError } from './previews.js';
import { routedEntities } from './entities.js';
import { staticRoutes } from './routes.js';

export interface BuildStaticOptions {
    app: SourceApp;
    /** The build destination — `dist/`. */
    dest: string;
    /** The Shell HTML as the theme built it. */
    shell: string;
    config: FrctlConfig;
    detailRoute?: string;
    /** Reports units written, so a CLI can show progress over a long build. */
    onProgress?: (completed: number, total: number) => void;
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
    const { app, dest, shell, config, detailRoute, onProgress } = options;

    const routes = staticRoutes(app, { detailRoute });
    const entities = routedEntities(app);

    // One total across all three phases, computed up front. Reporting each phase
    // against its own running count showed "N of N" every time, which reads as a
    // finished build that wrote almost nothing.
    const components = app.components
        .flatten()
        .toArray()
        .filter((component) => !component.isHidden).length;
    const docs = app.docs
        .flatten()
        .toArray()
        .filter((doc) => !doc.isHidden).length;
    const total = routes.length + 1 + entities.length + components * 3 + docs + entities.length * 2;
    let completed = 0;
    const advance = (by: number) => {
        completed += by;
        onProgress?.(completed, total);
    };

    const shells = await writeShells({ dest, routes, shell, config });
    advance(shells.files.length);

    const payloads = await writePayloads(app, { dest, detailRoute, treeFile: config.treeFile });
    advance(1 + payloads.entities.length + payloads.panels.length + payloads.docs.length + payloads.assets.length);

    const before = completed;
    const previews = await writePreviews(app, {
        dest,
        onProgress: (done) => onProgress?.(before + done, total),
    });
    completed = before + previews.files.length;

    return {
        routes: routes.length,
        shellBytes: shells.bytes,
        shellTotalBytes: shells.bytes * routes.length,
        payloadFiles: 1 + payloads.entities.length + payloads.panels.length + payloads.docs.length,
        previewFiles: previews.files.length,
        previewErrors: previews.errors,
    };
}
