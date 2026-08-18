import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';

import type { Watchable } from '../payload/source-types.js';

/** Where the Frame subscribes for rebuild notifications. */
export const LIVE_RELOAD_ROUTE = '/__fractality/events';

export interface LiveReloadOptions {
    app: Watchable;
    route?: string;
}

/**
 * Tells the Frame when the library has been rebuilt.
 *
 * Server-sent events rather than Vite's HMR channel. Under the prebuilt-theme
 * model the Frame's bundle is served as a static asset and never enters the
 * consumer's Vite graph, so `import.meta.hot` does not exist in it — the custom
 * HMR event the design assumed can only be received by a module Vite has
 * transformed. EventSource needs nothing from the bundler, works identically in
 * a consumer's project and in this repo, and reconnects on its own.
 *
 * The Frame decides what to do with the signal: it refetches the data it is
 * showing and reloads the Preview iframe. It is never itself reloaded, so open
 * panels, scroll position and tree expansion survive an edit — the thing
 * browser-sync could not do.
 */
export function liveReloadRoutes(options: LiveReloadOptions): Router {
    const { app, route = LIVE_RELOAD_ROUTE } = options;
    const router = createRouter();
    const clients = new Set<Parameters<RequestHandler>[1]>();

    app.on('source:updated', () => {
        for (const client of clients) {
            client.write('event: rebuild\ndata: {}\n\n');
        }
    });

    router.get(route, (req, res) => {
        res.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
            // Proxies that buffer would hold the whole stream until it closes.
            'x-accel-buffering': 'no',
        });
        res.write('event: connected\ndata: {}\n\n');

        clients.add(res);
        req.on('close', () => clients.delete(res));
    });

    return router;
}
