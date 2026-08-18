import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { routedEntities } from './entities.js';
import type { SourceApp } from '../payload/source-types.js';

export interface WritePreviewsOptions {
    /** The build destination — `dist/`. */
    dest: string;
    previewRoute?: string;
    renderRoute?: string;
    onProgress?: (completed: number, total: number) => void;
}

export interface PreviewError {
    handle: string;
    route: string;
    message: string;
}

export interface WritePreviewsResult {
    files: string[];
    errors: PreviewError[];
}

const escapeHtml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The document written when a pattern fails to render.
 *
 * A render failure is the *user's* template failing, which is ordinary during
 * development and must not take the build down or leave a blank iframe. Today
 * the theme renders this through a nunjucks error macro; with the engine gone,
 * `@fractality/web` owns it, and it stays deliberately plain — this is the only
 * markup the package generates, and it belongs to no theme.
 */
function errorDocument(handle: string, message: string): string {
    return [
        '<!DOCTYPE html>',
        '<html lang="en"><head><meta charset="UTF-8">',
        `<title>Error rendering ${escapeHtml(handle)}</title>`,
        '</head><body>',
        `<h1>Error rendering <code>${escapeHtml(handle)}</code></h1>`,
        `<pre>${escapeHtml(message)}</pre>`,
        '</body></html>',
    ].join('');
}

async function write(file: string, contents: string): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents, 'utf8');
}

/**
 * Renders every pattern through its Adapter and writes the two documents the
 * Preview iframe loads.
 *
 * This is the half of docs/specs/client-rendered-frame.md §5 that is *not* about
 * the Frame: the user's templates are rendered exactly as they are today and
 * never enter Vite's module graph. Both routes are kept because both exist
 * today — `preview` wraps the pattern in the user's own `@preview` layout if
 * their library has one, `render` does not.
 *
 * Errors are collected rather than thrown: one broken pattern should not abort a
 * build of thousands.
 */
export async function writePreviews(app: SourceApp, options: WritePreviewsOptions): Promise<WritePreviewsResult> {
    const { dest, previewRoute = '/components/preview', renderRoute = '/components/render', onProgress } = options;

    const files: string[] = [];
    const errors: PreviewError[] = [];

    const all = routedEntities(app);
    const total = all.length * 2;

    for (const { handle, entity } of all) {
        for (const [route, preview] of [
            [previewRoute, true],
            [renderRoute, false],
        ] as const) {
            const file = path.join(dest, route.replace(/^\/+/, ''), `${handle}.html`);
            try {
                // `collate: true` unconditionally, matching both of today's templates,
                // which set withCollation = true and leave render() to decide whether
                // the entity is actually collated.
                const markup = await entity.render(null, {}, { preview, collate: true });
                await write(file, markup);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                await write(file, errorDocument(handle, message));
                errors.push({ handle, route, message });
            }
            files.push(file);
            onProgress?.(files.length, total);
        }
    }

    return { files, errors };
}
