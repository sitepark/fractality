import path from 'node:path';

import type { StaticMount } from '../theme.js';

/**
 * Works out the URL prefix the Shell's own assets resolve against.
 *
 * A theme builds its Shell with `base: './'`, so its `<link>`/`<script>` are
 * relative to the Shell's own directory. That directory sits *inside* one of the
 * theme's static mounts, and it is usually not the root of it — mandelbrot mounts
 * `dist/` at `/themes/mandelbrot` but builds the Frame into `dist/frame/`.
 *
 * Taking the mount alone would produce `/themes/mandelbrot/assets/…` for a file
 * that is actually served from `/themes/mandelbrot/frame/assets/…`: a build that
 * succeeds, looks right, and 404s every asset.
 */
export function resolveShellMount(shellPath: string, mounts: StaticMount[]): string | null {
    const shellDir = path.dirname(path.resolve(shellPath));

    for (const mount of mounts) {
        const root = path.resolve(mount.path);
        const relative = path.relative(root, shellDir);
        // Inside this mount if the relative path neither escapes nor is absolute.
        if (relative.startsWith('..') || path.isAbsolute(relative)) continue;

        const prefix = `/${mount.mount.replace(/^\/+|\/+$/g, '')}`;
        return relative ? `${prefix}/${relative.split(path.sep).join('/')}` : prefix;
    }

    return null;
}
