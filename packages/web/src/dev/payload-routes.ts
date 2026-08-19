import { Router, type RequestHandler } from 'express';

import { componentsByHandle } from '../build/routes.js';
import { buildContextPayload, buildEntityPayload, buildNotesPayload, buildViewPayload } from '../payload/entity.js';
import { buildStatusTable } from '../payload/status.js';
import { buildTreePayload } from '../payload/tree.js';
import { buildDocPayload, routedDocs } from '../payload/doc.js';
import { assetsMount, buildAssetPayload, routedAssets } from '../payload/asset.js';
import type { SourceApp, SourceComponent } from '../payload/source-types.js';
import { gateOnIdle, type IdleGateable } from './gate.js';

export interface PayloadRoutesOptions {
    app: SourceApp & IdleGateable;
    detailRoute?: string;
    treeFile?: string;
    docsRoute?: string;
    assetsRoute?: string;
}

type PanelName = 'notes' | 'context' | 'view';

const PANEL_BUILDERS: Record<PanelName, (component: SourceComponent) => unknown> = {
    notes: buildNotesPayload,
    context: buildContextPayload,
    view: buildViewPayload,
};

const isPanel = (value: string): value is PanelName => value in PANEL_BUILDERS;

/**
 * A route parameter as a path.
 *
 * Express hands a wildcard's value over as an array of segments and a named
 * parameter's as a string, so both shapes arrive here depending on the route.
 */
const segments = (value: unknown): string =>
    (Array.isArray(value) ? value : [value]).filter((part) => part != null && part !== '').join('/');

/**
 * Serves the data contract in dev, at exactly the URLs the static build writes
 * to disk.
 *
 * The symmetry is the point: a client derives a payload URL from its own
 * location by stripping `.html` and appending the panel segment, and must not be
 * able to tell whether the answer came from memory or from a file. That is why
 * these handlers use the same builders and the same `<handle>.<panel>.json`
 * shape rather than inventing an API of their own.
 *
 * Register **before** the Frame catch-all — `'*path'` matches everything,
 * including `/@vite/client` — and before `vite.middlewares`.
 *
 * Specified in docs/specs/client-rendered-frame.md §8.
 */
export function payloadRoutes(options: PayloadRoutesOptions): Router {
    const {
        app,
        detailRoute = '/components/detail',
        treeFile = '/tree.json',
        docsRoute = '/docs',
        assetsRoute = '/assets',
    } = options;

    const router = Router();

    // Every route below reads the tree, so all of them are gated. Applied once
    // here rather than per route, so a route added later cannot forget it.
    router.use(gateOnIdle(app));

    const sendTree: RequestHandler = (_req, res) => {
        res.json(buildTreePayload(app));
    };

    const sendEntity: RequestHandler = (req, res, next) => {
        const file = String(req.params.file ?? '');
        if (!file.endsWith('.json')) return next();

        const name = file.slice(0, -'.json'.length);
        // `<handle>` or `<handle>.<panel>`. Split on the *first* dot, not the
        // last: a theme panel's segment is `ext.<theme>.<panel>`, so splitting
        // from the right would take the handle to be `button.ext.mandelbrot`.
        // Handles do not contain dots; variant handles use `--`.
        const dot = name.indexOf('.');
        const handle = dot === -1 ? name : name.slice(0, dot);
        const panel = dot === -1 ? undefined : name.slice(dot + 1);

        const component = componentsByHandle(app).get(handle);
        if (!component) return next();

        if (!panel) {
            res.json(buildEntityPayload(component, buildStatusTable(app)));
            return;
        }

        if (!isPanel(panel)) return next();
        res.json(PANEL_BUILDERS[panel](component));
    };

    const sendDoc: RequestHandler = (req, res, next) => {
        // A wildcard, not `:file`: docs nest, so `/docs/guide/setup.json` is two
        // segments and a single-segment param does not match it at all — the
        // request fell through to the Frame catch-all and the Frame parsed a
        // Shell as JSON.
        const file = segments(req.params.file);
        if (!file.endsWith('.json')) return next();
        const wanted = file.slice(0, -'.json'.length);

        const match = routedDocs(app.docs.flatten().toArray(), docsRoute).find(
            ({ route }) => route === `${docsRoute}/${wanted}`,
        );
        if (!match) return next();

        res.json(buildDocPayload(match.doc, buildStatusTable(app)));
    };

    router.get(treeFile, sendTree);
    router.get(`${detailRoute}/:file`, sendEntity);
    const sendAsset: RequestHandler = (req, res, next) => {
        const file = String(req.params.file ?? '');
        if (!file.endsWith('.json')) return next();
        const wanted = file.slice(0, -'.json'.length);

        const match = routedAssets(app, assetsRoute).find(({ route }) => route === `${assetsRoute}/${wanted}`);
        if (!match) return next();

        res.json(buildAssetPayload(match.asset, assetsMount(app)));
    };

    router.get(`${docsRoute}/*file`, sendDoc);
    router.get(`${assetsRoute}/:file`, sendAsset);

    // A payload path nothing answered is a 404, not the Frame's problem.
    //
    // Falling through to the Shell catch-all meant every missing payload arrived
    // as an HTML document with a 200, so a client asking for one got a JSON
    // parse error where it should have got a status — and could not tell a page
    // that does not exist from a server that is broken. Scoped to these three
    // prefixes and to `.json`, so a theme's or a project's own static files are
    // still served by the mounts registered after this router.
    const noPayload: RequestHandler = (req, res, next) => {
        if (!req.path.endsWith('.json')) return next();
        res.status(404).json({ error: `No payload is served at ${req.path}` });
    };

    for (const prefix of [detailRoute, docsRoute, assetsRoute]) {
        router.get(`${prefix}/*file`, noPayload);
    }

    return router;
}
