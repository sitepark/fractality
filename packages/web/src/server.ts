import { readFile } from 'node:fs/promises';
import express from 'express';
import getPort, { portNumbers } from 'get-port';
import { mixins } from '@fractality/core';

import { createDevHost, type DevHost } from './dev/host.js';
import type { Loadable, SourceApp } from './payload/source-types.js';
import type { IdleGateable } from './dev/gate.js';
import type { FrctlConfig } from './shell/config.js';
import { resolveShellMount } from './shell/mount.js';
import Theme from './theme.js';
import WebError from './error.js';

const mix = mixins.mix;
const Emitter = mixins.emitter;

export interface ServerConfig {
    port?: number;
    [key: string]: unknown;
}

/**
 * The dev server.
 *
 * A thin Express host with Vite in middleware mode. browser-sync and the
 * chokidar wiring that used to live here are gone: the Frame is not reloaded on
 * a pattern change, only the Preview iframe is, which is what lets open panels
 * and scroll position survive an edit.
 */
export default class Server extends mix(Emitter) {
    private readonly _theme: Theme;
    private readonly _config: ServerConfig;
    private readonly _app: SourceApp & IdleGateable & Loadable;
    private _host: DevHost | null = null;
    private _port: number | null = null;

    constructor(theme: Theme, config: ServerConfig, app: SourceApp & IdleGateable & Loadable) {
        super();
        this._theme = theme;
        this._config = config;
        this._app = app;
    }

    get port(): number | null {
        return this._port;
    }

    get urls(): { server: string | null } {
        return { server: this._port ? `http://localhost:${this._port}` : null };
    }

    /**
     * Always false. browser-sync is gone: a pattern change reloads the Preview
     * iframe over Vite's websocket, and the Frame around it is never torn down.
     */
    get isSynced(): boolean {
        return false;
    }

    async start(): Promise<DevHost> {
        const shellPath = this._theme.shellPath();
        if (!shellPath) {
            throw new WebError(
                'The configured theme does not provide a Shell. A theme must call setShell() ' +
                    'with the HTML its Frame boots from — see docs/specs/client-rendered-frame.md §7.',
            );
        }

        await this._app.load();

        const shell = await readFile(shellPath, 'utf8');
        const host = await createDevHost({
            app: this._app,
            shell,
            config: this._frctlConfig(shellPath),
        });

        // Theme assets are served as ordinary static files, ahead of the Frame
        // catch-all but after the routes that answer with data.
        for (const mount of this._theme.static()) {
            host.express.use(mount.mount, express.static(mount.path));
        }

        const port = this._config.port ?? (await getPort({ port: portNumbers(3000, 3100) }));
        this._port = await host.listen(port);
        this._host = host;

        this.emit('ready', this);
        return host;
    }

    async stop(): Promise<void> {
        await this._host?.close();
        this._host = null;
        this._port = null;
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
            env: 'server',
            themeMount: mount,
            siteRoot: '',
            treeFile: '/tree.json',
            labels: (this._theme.get('labels') as Record<string, unknown>) ?? undefined,
        };
    }
}
