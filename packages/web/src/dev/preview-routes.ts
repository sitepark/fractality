import { Router, type RequestHandler } from 'express';

import { routedEntities } from '../build/entities.js';
import type { SourceApp } from '../payload/source-types.js';
import { gateOnIdle, type IdleGateable } from './gate.js';

export interface PreviewRoutesOptions {
    app: SourceApp & IdleGateable;
    previewRoute?: string;
    renderRoute?: string;
}

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
    const { app, previewRoute = '/components/preview', renderRoute = '/components/render' } = options;

    const router = Router();
    router.use(gateOnIdle(app));

    const render = (preview: boolean): RequestHandler => {
        return (req, res, next) => {
            const handle = String(req.params.handle ?? '').replace(/\.html$/, '');
            const match = routedEntities(app).find((entity) => entity.handle === handle);
            if (!match) return next();

            match.entity.render(null, {}, { preview, collate: true }).then(
                (markup: string) => {
                    res.type('html').send(markup);
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
