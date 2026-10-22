import { createHash } from 'node:crypto';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const DEVTOOLS_ROUTE = '/.well-known/appspecific/com.chrome.devtools.json';

export interface DevtoolsRoutesOptions {
    /** The project directory DevTools maps the served files back to. */
    root: string;
}

/**
 * Chrome DevTools "Automatic Workspace Folders".
 *
 * The uuid is derived from the root so DevTools recognises the same workspace
 * across server restarts. DevTools expects a v4 uuid, so a hash of the root
 * stands in for the random bytes.
 */
export function devtoolsRoutes(options: DevtoolsRoutesOptions): Router {
    const { root } = options;
    const random = createHash('sha256').update(root).digest().subarray(0, 16);
    const workspace = { root, uuid: uuidv4({ random }) };

    const router = Router();
    router.get(DEVTOOLS_ROUTE, (_req, res) => {
        res.json({ workspace });
    });
    return router;
}
