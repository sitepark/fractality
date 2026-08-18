import { createServer as createHttpServer, type Server } from 'node:http';
import express, { type Express } from 'express';
import { createServer as createViteServer, type ViteDevServer } from 'vite';

import { prepareShell } from '../shell/writer.js';
import type { FrctlConfig } from '../shell/config.js';
import type { SourceApp, Watchable } from '../payload/source-types.js';
import type { IdleGateable } from './gate.js';
import { liveReloadRoutes, LIVE_RELOAD_ROUTE } from './live-reload.js';
import { payloadRoutes } from './payload-routes.js';
import { previewRoutes } from './preview-routes.js';

export interface DevHostOptions {
    app: SourceApp & IdleGateable & Watchable;
    /**
     * The Shell HTML as the theme built it.
     *
     * A function is re-read on every request, so rebuilding the theme is picked
     * up without restarting the server. Holding a string captured at start-up
     * meant a rebuild left the Shell pointing at a bundle hash that no longer
     * existed, and the Frame stopped loading entirely.
     */
    shell: string | (() => Promise<string>);
    config: FrctlConfig;
    /** Vite's root. A theme author's source tree; irrelevant for a prebuilt theme. */
    root?: string;
    /**
     * The theme's static assets.
     *
     * Passed in rather than mounted by the caller afterwards: the Frame
     * catch-all is registered here, and Express matches middleware in
     * registration order, so anything added after this function returns is
     * unreachable.
     */
    staticMounts?: Array<{ path: string; mount: string }>;
}

export interface DevHost {
    express: Express;
    server: Server;
    vite: ViteDevServer;
    listen(port?: number): Promise<number>;
    close(): Promise<void>;
    /** Where the Frame subscribes for rebuild notifications. */
    liveReloadRoute: string;
}

/**
 * The dev server: a thin Express host with Vite in middleware mode.
 *
 * **Registration order is load-bearing**, and getting it wrong fails in ways
 * that look like something else:
 *
 * 1. The live-reload stream.
 * 2. Preview and render routes — the user's templates, never transformed.
 * 3. Payload routes — the data contract.
 * 4. The theme's static assets.
 * 5. `vite.middlewares`.
 * 6. The Frame catch-all, **last**. It matches everything, `/@vite/client`
 *    included, so anything after it is unreachable and HMR silently dies.
 *
 * `appType: 'custom'` drops Vite's own HTML-fallback and 404 middlewares so it
 * never terminates a request it does not recognise.
 *
 * Specified in docs/specs/client-rendered-frame.md §8.
 */
export async function createDevHost(options: DevHostOptions): Promise<DevHost> {
    const { app, shell, config, root, staticMounts = [] } = options;

    const host = express();
    const server = createHttpServer(host);

    const vite = await createViteServer({
        root,
        appType: 'custom',
        server: {
            middlewareMode: true,
            // Without this Vite opens a *second* HTTP server on port 24678 for
            // its websocket. Handing it ours keeps the dev server to one port.
            ws: { server },
        },
    });

    // Before everything: it is a long-lived stream, and must not be gated on a
    // rebuild it exists to announce.
    host.use(liveReloadRoutes({ app }));

    host.use(previewRoutes({ app }));
    host.use(payloadRoutes({ app, treeFile: config.treeFile }));

    for (const entry of staticMounts) {
        host.use(entry.mount, express.static(entry.path));
    }

    host.use(vite.middlewares);

    // Last. Every route the Frame owns resolves to the same Shell — that is what
    // makes a deep link work without the server knowing the route table.
    host.use(async (req, res, next) => {
        try {
            const current = typeof shell === 'string' ? shell : await shell();
            const html = prepareShell({ shell: current, config });
            res.status(200)
                .type('html')
                .send(await vite.transformIndexHtml(req.originalUrl, html));
        } catch (error: unknown) {
            next(error);
        }
    });

    return {
        express: host,
        server,
        vite,
        async listen(port = 0) {
            await new Promise<void>((resolve) => server.listen(port, resolve));
            const address = server.address();
            if (typeof address === 'string' || address === null) {
                throw new Error('dev host did not bind a port');
            }
            return address.port;
        },
        async close() {
            await vite.close();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        },
        liveReloadRoute: LIVE_RELOAD_ROUTE,
    };
}
