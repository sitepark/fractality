import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { serialiseFrctlConfig, type FrctlConfig } from './config.js';

export interface PrepareShellOptions {
    /** The Shell HTML as the theme built it. */
    shell: string;
    config: FrctlConfig;
}

export interface WriteShellsOptions extends PrepareShellOptions {
    /** The build destination — `dist/`. */
    dest: string;
    /**
     * Every path in the route table, as emitted URLs (`/index.html`,
     * `/components/detail/button.html`). One byte-identical Shell per entry.
     */
    routes: string[];
}

export interface WriteShellsResult {
    files: string[];
    /** Size of a single Shell copy. They are all identical, so one number. */
    bytes: number;
}

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|data:)/i;

/**
 * Rewrites a theme-relative asset URL to be root-absolute from the theme mount.
 *
 * A theme builds with `base: './'` so that references *inside* its CSS resolve
 * against the stylesheet's own URL and stay correct at any mount. The Shell's
 * own `<link>` and `<script>` cannot use that trick: identical copies sit at
 * different depths in the route table, and they must resolve before any
 * JavaScript runs, so there is nothing clever available. They are made
 * root-absolute instead.
 *
 * The cost, which is real and belongs in the migration guide: `dist/` can no
 * longer be relocated after building.
 */
function toMountAbsolute(url: string, themeMount: string): string {
    if (!url || ABSOLUTE.test(url)) return url;
    const cleaned = url.replace(/^\.\//, '');
    return `${themeMount.replace(/\/+$/, '')}/${cleaned}`;
}

/**
 * Produces the single Shell every route gets a copy of: asset links made
 * root-absolute, and `window.frctl` injected.
 *
 * Deliberately returns one string rather than rendering per route — the copies
 * being byte-identical is the property that keeps this a file copy rather than a
 * render pass (docs/specs/client-rendered-frame.md §2.1).
 */
export function prepareShell({ shell, config }: PrepareShellOptions): string {
    const rewritten = shell.replace(
        /\b(href|src)=("|')(.*?)\2/gi,
        (match, attr: string, quote: string, url: string) => {
            const next = toMountAbsolute(url, config.themeMount);
            return next === url ? match : `${attr}=${quote}${next}${quote}`;
        },
    );

    const block = `<script>window.frctl=${serialiseFrctlConfig(config)};</script>`;

    if (/<\/head>/i.test(rewritten)) {
        return rewritten.replace(/<\/head>/i, `${block}</head>`);
    }
    // A Shell without a head is malformed, but silently dropping the config
    // would fail far away from the cause.
    return `${block}${rewritten}`;
}

/**
 * Writes the same Shell to every path in the route table.
 *
 * This is what preserves deep links without a prerender pass: today's URLs keep
 * existing, so bookmarks survive, and it works on any static HTTP server with no
 * configuration.
 */
export async function writeShells(options: WriteShellsOptions): Promise<WriteShellsResult> {
    const { dest, routes, shell, config } = options;
    const html = prepareShell({ shell, config });
    const bytes = Buffer.byteLength(html, 'utf8');
    const files: string[] = [];

    for (const route of routes) {
        const file = path.join(dest, route.replace(/^\/+/, ''));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, html, 'utf8');
        files.push(file);
    }

    return { files, bytes };
}
