import type { RequestHandler } from 'express';

/** The part of a loaded app this middleware needs. */
export interface IdleGateable {
    whenIdle(): Promise<unknown>;
}

/**
 * Waits for any in-progress source rebuild before handling a request.
 *
 * This is ADR 0001's guarantee: a rebuild publishes newly parsed entities into
 * the live collection partway through, before their context has finished
 * resolving, so a request landing in that window can read a half-built tree.
 *
 * Today one catch-all route carries the gate. The client-rendered Frame replaces
 * it with many narrow routes, and **every route that reads the tree needs this**
 * — including the JSON payload endpoints, which are nothing *but* tree reads.
 * Forgetting it there would not fail loudly; it would serve a subtly wrong
 * payload occasionally, during a rebuild, and look like a caching bug.
 *
 * Specified in docs/specs/client-rendered-frame.md §8.3.
 */
export function gateOnIdle(app: IdleGateable): RequestHandler {
    return (_req, _res, next) => {
        app.whenIdle().then(
            () => next(),
            (error: unknown) => next(error),
        );
    };
}
