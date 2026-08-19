/**
 * The environment a *pattern* is rendered in — `_env` inside a user's template.
 *
 * This is not theme API and not part of the data contract: it is the third thing
 * `@fractality/web` produces, alongside the payloads and the Shell, and it exists
 * only for the duration of one render. Every adapter copies it into the render
 * context as `_env`, and the `path` helper/filter in handlebars, nunjucks and twig
 * reads it to decide whether a URL stays absolute or is rewritten relative to the
 * document it appears in. A pattern that renders correctly in the dev server and
 * links into nowhere in a static build is what a wrong value here looks like.
 *
 * `@fractality/web` is its only producer, and there are exactly two producers of
 * a rendered pattern — the dev server and the static build — which is why both
 * flags live in one module: `server` and `builder` are the same fact stated twice
 * and must never disagree.
 */

/**
 * What the render env says about the document being rendered.
 *
 * Deliberately not an express `Request`, even in the dev server, where one
 * exists. There is no request at all in a static build, so anything the shape
 * offers has to be answerable in both modes — `route`, `error` and `isPjax` are
 * gone for that reason, and so is the ability to reach the live socket.
 */
export interface RenderRequest {
    /** URL path of the document being rendered, without a file extension. */
    path: string;
    url: string;
    /** `path` split on `/`, empties dropped. */
    segments: string[];
    /** Route parameters. For a Preview, the entity's handle. */
    params: Record<string, string>;
    query: Record<string, unknown>;
    headers: Record<string, unknown>;
}

export interface RenderEnv {
    /** Rendering for the dev server: URLs stay as the pattern wrote them. */
    server: boolean;
    /** Rendering into a static build: URLs are rewritten relative to `request.path`. */
    builder: boolean;
    request: RenderRequest;
}

interface RenderRequestInput {
    path: string;
    url?: string;
    params?: Record<string, string>;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
}

function renderEnv(server: boolean, request: RenderRequestInput): RenderEnv {
    const { path } = request;

    return {
        server,
        builder: !server,
        request: {
            path,
            url: request.url ?? path,
            segments: path.split('/').filter(Boolean),
            params: request.params ?? {},
            // Present but empty rather than absent when there is nothing to put
            // in them, so a template reading `_env.request.query.x` behaves the
            // same in both modes instead of throwing in one of them.
            query: request.query ?? {},
            headers: request.headers ?? {},
        },
    };
}

/**
 * The env for a pattern the dev server is about to serve.
 *
 * `path` is the request's own path, so `{{path '/x'}}` resolves against the URL
 * the Preview is actually being viewed at.
 */
export function serverRenderEnv(request: RenderRequestInput): RenderEnv {
    return renderEnv(true, request);
}

/**
 * The env for a pattern being written to disk.
 *
 * `routePath` is the document's own URL *without* the `.html` the build appends —
 * `/components/preview/button`, not `/components/preview/button.html`. The path
 * helpers add the extension themselves; handing them one already appended
 * produces links one directory too shallow.
 */
export function builderRenderEnv(routePath: string, params: Record<string, string> = {}): RenderEnv {
    return renderEnv(false, { path: routePath, params });
}
