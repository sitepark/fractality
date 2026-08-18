import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { Log, mixins } from '@fractality/core';

import { buildStatic, type BuildStaticResult } from './build/index.js';
import type { Loadable, SourceApp } from './payload/source-types.js';
import type { FrctlConfig } from './shell/config.js';
import { resolveShellMount } from './shell/mount.js';
import Theme from './theme.js';
import WebError from './error.js';

const mix = mixins.mix;
const Emitter = mixins.emitter;

export interface BuilderConfig {
    dest?: string;
    [key: string]: unknown;
}

export interface BuildReport extends BuildStaticResult {
    /** What the CLI reports at the end of a build. */
    errorCount: number;
}

/**
 * The static builder.
 *
 * Where this used to walk the route table rendering a theme view per page, it
 * now copies one Shell across those same routes, emits the data contract, and
 * renders the Previews through the adapters. The route table survives; the
 * rendering does not.
 */
export default class Builder extends mix(Emitter) {
    private readonly _theme: Theme;
    private readonly _config: BuilderConfig;
    private readonly _app: SourceApp & Loadable;

    constructor(theme: Theme, config: BuilderConfig, app: SourceApp & Loadable) {
        super();
        this._theme = theme;
        this._config = config;
        this._app = app;
    }

    async build(): Promise<BuildReport> {
        const dest = this._config.dest;
        if (!dest) {
            throw new WebError('No builder destination configured (web.builder.dest).');
        }

        const shellPath = this._theme.shellPath();
        if (!shellPath) {
            throw new WebError(
                'The configured theme does not provide a Shell. A theme must call setShell() ' +
                    'with the HTML its Frame boots from — see docs/specs/client-rendered-frame.md §7.',
            );
        }

        // node:fs covers what fs-extra was here for, so the dependency goes
        // with the engine rather than being carried for two calls.
        await rm(dest, { recursive: true, force: true });
        await mkdir(dest, { recursive: true });

        this.emit('start');

        // The tree has to exist before anything can be written from it. The
        // engine-backed builder did this too; leaving it out produces a build
        // that reports success and emits almost nothing.
        await this._app.load();

        const shell = await readFile(shellPath, 'utf8').catch(() => {
            // A theme ships its Shell as build output, so this is what a user
            // sees when the theme has not been built — a far more common
            // situation than a misconfigured one, and ENOENT does not say it.
            throw new WebError(
                `The theme's Shell is missing at ${shellPath}. The theme has probably not been ` +
                    'built — run its build, or reinstall it so its published output is present.',
            );
        });
        const result = await buildStatic({
            app: this._app,
            dest,
            shell,
            config: this._frctlConfig(shellPath),
            onProgress: (completed, total) => this.emit('progress', completed, total),
        });

        // Static assets last: they must not be clobbered by the route walk, and
        // copying them first would mean deleting them on a failed build.
        for (const mount of this._theme.static()) {
            await cp(mount.path, path.join(dest, mount.mount.replace(/^\/+/, '')), {
                recursive: true,
            });
        }

        for (const error of result.previewErrors) {
            Log.error(`Failed to render ${error.handle}: ${error.message}`);
            this.emit('error', new WebError(`${error.handle}: ${error.message}`));
        }

        return { ...result, errorCount: result.previewErrors.length };
    }

    private _frctlConfig(shellPath: string): FrctlConfig {
        const mount = resolveShellMount(shellPath, this._theme.static());
        if (!mount) {
            throw new WebError(
                `The theme's Shell (${shellPath}) is not inside any of its static mounts, ` +
                    'so its assets cannot be addressed. Call addStatic() for the directory ' +
                    'the Shell is built into.',
            );
        }

        return {
            env: 'static',
            themeMount: mount,
            siteRoot: '',
            treeFile: '/tree.json',
            labels: (this._theme.get('labels') as Record<string, unknown>) ?? undefined,
        };
    }
}
