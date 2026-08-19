import { Router, type RequestHandler } from 'express';

import { routedEntities } from '../build/entities.js';
import { serverRenderEnv } from '../render-env.js';
import type { SourceApp } from '../payload/source-types.js';
import { gateOnIdle, type IdleGateable } from './gate.js';
import { LIVE_RELOAD_ROUTE } from './live-reload.js';

export interface PreviewRoutesOptions {
    app: SourceApp & IdleGateable;
    previewRoute?: string;
    renderRoute?: string;
    /**
     * Where the live-reload stream lives, or false to inject nothing.
     *
     * Only the dev server injects this. The static build writes the adapter's
     * output untouched — there is no server to subscribe to.
     */
    liveReloadRoute?: string | false;
}

/**
 * Reloads a Preview when the library rebuilds.
 *
 * Needed because a Preview can be opened as a window of its own, outside the
 * Frame, and nothing else would tell it. browser-sync used to inject an
 * equivalent into every page it served; with that gone, the document has to
 * carry its own subscription.
 *
 * Inside the Frame's iframe this is redundant — the Frame remounts it on the
 * same signal — but harmless, and there is no way to tell the two apart: they
 * are the same URL.
 */
const liveReloadScript = (route: string): string =>
    `<script>(function(){try{var s=new EventSource(${JSON.stringify(route)});` +
    `s.addEventListener('rebuild',function(){location.reload()});}catch(e){}})()</script>`;

const escapeHtml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Renders the user's patterns, per request.
 *
 * These must be registered **before** `vite.middlewares`, and their output must
 * never be passed through `transformIndexHtml`. That is the whole mechanism
 * keeping the user's templates out of Vite's module graph: the Frame's Shell is
 * transformed, the Preview's markup is not, so no `/@vite/client` is injected
 * into a document made of the user's own code.
 *
 * Specified in docs/specs/client-rendered-frame.md §8.1.
 */
export function previewRoutes(options: PreviewRoutesOptions): Router {
    const {
        app,
        previewRoute = '/components/preview',
        renderRoute = '/components/render',
        liveReloadRoute = LIVE_RELOAD_ROUTE,
    } = options;

    const withLiveReload = (markup: string): string =>
        liveReloadRoute === false ? markup : markup + liveReloadScript(liveReloadRoute);

    const router = Router();
    router.use(gateOnIdle(app));

    const render = (preview: boolean): RequestHandler => {
        return (req, res, next) => {
            const handle = String(req.params.handle ?? '').replace(/\.html$/, '');
            const match = routedEntities(app).find((entity) => entity.handle === handle);
            if (!match) return next();

            // The env the adapters expose as `_env`. `server: true` is what
            // keeps a pattern's `path` helper emitting absolute URLs here;
            // without it the same markup is served with build-relative links,
            // which resolve against the Preview's own directory and 404.
            const env = serverRenderEnv({ path: req.path, url: req.originalUrl, params: { handle } });

            match.entity.render(null, env, { preview, collate: true }).then(
                (markup: string) => {
                    // Only the Preview. The render route is the component's bare
                    // markup, which the Browser's HTML panel reads as data — a
                    // subscription script in there would be shown to the user as
                    // part of their own component's output.
                    res.type('html').send(preview ? withLiveReload(markup) : markup);
                },
                (error: unknown) => {
                    // A user's template failing is ordinary during development.
                    // It is reported in the iframe rather than as a server error,
                    // so the Frame around it stays usable.
                    const message = error instanceof Error ? error.message : String(error);
                    res.status(200).type('html').send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Error rendering ${escapeHtml(handle)}</title></head><body>
<h1>Error rendering <code>${escapeHtml(handle)}</code></h1>
<pre>${escapeHtml(message)}</pre></body></html>`);
                },
            );
        };
    };

    router.get(`${previewRoute}/:handle`, render(true));
    router.get(`${renderRoute}/:handle`, render(false));

    return router;
}
