import { readFile } from 'node:fs/promises';
import { isIPv6 } from 'node:net';
import getPort, { portNumbers } from 'get-port';
import { mixins } from '@fractality/core';

import { createDevHost, type DevHost } from './dev/host.js';
import type { Loadable, SourceApp, Watchable } from './payload/source-types.js';
import type { IdleGateable } from './dev/gate.js';
import { frctlConfigFor } from './shell/config.js';
import Theme from './theme.js';
import WebError from './error.js';

const mix = mixins.mix;
const Emitter = mixins.emitter;

export interface ServerConfig {
    port?: number;
    host?: string | null;
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
    private readonly _app: SourceApp & IdleGateable & Loadable & Watchable;
    private _host: DevHost | null = null;
    private _port: number | null = null;

    constructor(theme: Theme, config: ServerConfig, app: SourceApp & IdleGateable & Loadable & Watchable) {
        super();
        this._theme = theme;
        this._config = config;
        this._app = app;
    }

    get port(): number | null {
        return this._port;
    }

    get urls(): { server: string | null } {
        return { server: this._port ? `http://${urlHost(this._config.host)}:${this._port}` : null };
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

        // Watch by default. The old server did this only under --watch, because
        // reloading was browser-sync's job and watching without it just burned
        // file handles. Now the Frame subscribes to rebuilds over the live-reload
        // stream, so a dev server that does not watch cannot tell it anything —
        // an edit to a template or to context data would never reach the browser.
        // `watch: false` still opts out.
        if (this._config.watch !== false) {
            this._app.watch();
        }

        const readShell = async (): Promise<string> =>
            readFile(shellPath, 'utf8').catch(() => {
                // A theme ships its Shell as build output, so this is what a user
                // sees when the theme has not been built — a far more common
                // situation than a misconfigured one, and ENOENT does not say it.
                throw new WebError(
                    `The theme's Shell is missing at ${shellPath}. The theme has probably not ` +
                        'been built — run its build, or reinstall it so its published output ' +
                        'is present.',
                );
            });

        // Read once now so a missing Shell fails at start-up rather than on the
        // first request, and re-read per request so a theme rebuild is picked up.
        await readShell();
        const host = await createDevHost({
            app: this._app,
            shell: readShell,
            config: frctlConfigFor({ theme: this._theme, app: this._app, env: 'server', shellPath }),
            staticMounts: this._theme.static(),
        });

        // The port check has to cover the same address the server binds. With a
        // `host`, both check and bind use it; without one, the server binds the
        // wildcard address and getPort checks every local address.
        const hostname = this._config.host || undefined;
        const port =
            this._config.port ??
            (await getPort(
                hostname ? { port: portNumbers(3000, 3100), host: hostname } : { port: portNumbers(3000, 3100) },
            ));
        this._port = await host.listen(port, hostname);
        this._host = host;

        this.emit('ready', this);
        return host;
    }

    async stop(): Promise<void> {
        this._app.unwatch?.();
        await this._host?.close();
        this._host = null;
        this._port = null;
    }
}

function urlHost(host: string | null | undefined): string {
    if (!host || host === '0.0.0.0' || host === '::') {
        return 'localhost';
    }
    return isIPv6(host) ? `[${host}]` : host;
}
