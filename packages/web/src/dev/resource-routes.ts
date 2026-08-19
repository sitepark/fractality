import { Router } from 'express';

import { RESOURCE_ROUTE, routedResources } from '../payload/resources.js';
import type { SourceApp } from '../payload/source-types.js';
import { gateOnIdle, type IdleGateable } from './gate.js';

export interface ResourceRoutesOptions {
    app: SourceApp & IdleGateable;
    resourceRoute?: string;
}

/**
 * Serves a component's own files — its stylesheet, its script, an image beside
 * its template.
 *
 * These were served in 0.x by a theme route that handed back a filesystem path,
 * a mechanism that went with the render pipeline; nothing has served them since,
 * so the Resources panel had no file to link to and no image to show. The URL is
 * the one 0.x used, so links copied out of that panel still resolve.
 *
 * The file is found by **looking the request up in the library**, never by
 * joining the request path onto a directory. That is what keeps
 * `/components/raw/button/../../../etc/passwd` from being a question this has to
 * answer — and the theme route it replaces did join, so it *was* one.
 */
export function resourceRoutes(options: ResourceRoutesOptions): Router {
    const { app, resourceRoute = RESOURCE_ROUTE } = options;

    const router = Router();
    router.use(gateOnIdle(app));

    router.get(`${resourceRoute}/:handle/:file`, (req, res, next) => {
        const wanted = `${resourceRoute}/${req.params.handle}/${encodeURIComponent(String(req.params.file ?? ''))}`;
        const match = routedResources(app, resourceRoute).find((resource) => resource.route === wanted);
        if (!match) return next();

        res.sendFile(match.path);
    });

    return router;
}
