import { cp, stat } from 'node:fs/promises';
import path from 'node:path';

import * as anymatchModule from 'anymatch';
import type { Matcher, Tester } from 'anymatch';

import type { StaticMount } from '../theme.js';

/**
 * `anymatch`, which is what `web.builder.static.ignored` has always meant.
 *
 * It is CJS carrying an ESM-style `export default`, so under `nodenext` the
 * callable arrives as a property of the namespace and the compiler types that
 * property as the namespace itself. The cast is the whole of the workaround; the
 * value is a function at runtime under both CJS and ESM.
 */
const anymatch = anymatchModule.default as unknown as (matchers: Matcher) => Tester;

export interface CopyStaticAssetsOptions {
    /** The build destination — `dist/`. */
    dest: string;
    /**
     * `web.builder.static.ignored` — anymatch patterns (globs, regexes,
     * predicates, or an array of them), matched against the **absolute source
     * path** of every file considered for copying.
     */
    ignored?: Matcher;
}

export interface StaticAssetError {
    /** The source directory that could not be copied. */
    path: string;
    /** Where it was going to be mounted. */
    mount: string;
    message: string;
}

export interface CopyStaticAssetsResult {
    copied: StaticMount[];
    /** Collected, not thrown — see below. */
    errors: StaticAssetError[];
}

/**
 * Explains a copy failure in terms of the configuration that caused it.
 *
 * A bare `ENOENT: no such file or directory, lstat '…/public'` names a path and
 * nothing else. The path is almost always `web.static.path` pointing at a
 * directory that was never created, and that is what the reader needs told.
 */
function describe(error: unknown, from: string, mount: string): string {
    const code = (error as { code?: string } | null)?.code;

    if (code === 'ENOENT') {
        return (
            `Static directory ${from} does not exist, so nothing was copied to ${mount}. ` +
            'Check web.static.path, or the addStatic() call in your theme.'
        );
    }

    const message = error instanceof Error ? error.message : String(error);
    return `Could not copy ${from} to ${mount}: ${message}`;
}

/**
 * Copies the theme's and the project's static directories into the build.
 *
 * **Failures are collected rather than thrown.** A build writes every page,
 * payload and Preview before it gets here, so letting one unreadable directory
 * reject would discard a finished build over an asset copy — which is what
 * happened between the engine-backed builder (it logged the failure and counted
 * it) and this one. Each mount is independent, so one failing must not stop the
 * rest either.
 */
export async function copyStaticAssets(
    mounts: StaticMount[],
    options: CopyStaticAssetsOptions,
): Promise<CopyStaticAssetsResult> {
    const { dest, ignored } = options;

    // Compiled once for the whole build rather than per file: anymatch turns its
    // patterns into a matcher, and this runs for every file in every mount.
    const isIgnored = ignored === undefined ? () => false : anymatch(ignored);

    const copied: StaticMount[] = [];
    const errors: StaticAssetError[] = [];

    for (const mount of mounts) {
        const from = path.resolve(mount.path);
        const to = path.join(dest, mount.mount.replace(/^\/+/, ''));

        try {
            // Statted first so a missing directory — the common misconfiguration —
            // is reported as one, rather than as whichever fs call happens to fail
            // first inside cp().
            await stat(from);
            await cp(from, to, { recursive: true, filter: (source) => !isIgnored(source) });
            copied.push(mount);
        } catch (error: unknown) {
            errors.push({ path: from, mount: mount.mount, message: describe(error, from, mount.mount) });
        }
    }

    return { copied, errors };
}
