import { compile, match, type MatchFunction } from 'path-to-regexp';
import { mixins } from '@fractality/core';

const mix = mixins.mix;
const Configurable = mixins.configurable;
const Emitter = mixins.emitter;

export interface StaticMount {
    path: string;
    mount: string;
}

export interface RouteDefinition {
    /** Stable name the route is addressed by. */
    handle: string;
    path: string;
    /** Where this route redirects to, if it is a redirect. */
    redirect?: string;
    /** Resolves a static file for this route instead of a page. */
    static?: (params: Record<string, string>, app: unknown) => string;
    matcher: MatchFunction<Record<string, string>>;
    [key: string]: unknown;
}

export type RouteResolver = unknown;

/**
 * The base every theme extends.
 *
 * **`view` is gone.** A theme no longer renders anything: it contributes a route
 * table, its static assets and a Shell, and the Frame renders from the data
 * contract. The removed API — `addLoadPath`, `setErrorView`, `setRedirectView`
 * and `addRoute({ view })` — has no replacement, by design; see
 * docs/specs/client-rendered-frame.md §9.1.
 */
export default class Theme extends mix(Configurable, Emitter) {
    private _staticPaths = new Set<StaticMount>();
    private _routes = new Map<string, RouteDefinition>();
    private _resolvers: Record<string, RouteResolver[]> = {};
    private _shellPath: string | null = null;
    private _contractVersion: number | null = null;

    constructor(options?: Record<string, unknown>) {
        super();

        this.options = this.config.bind(this);
        this.setOption = this.set.bind(this);
        this.getOption = this.get.bind(this);

        this.options(options ?? {});
    }

    options!: (options: Record<string, unknown>) => unknown;
    setOption!: (key: string, value: unknown) => unknown;
    getOption!: (key: string) => unknown;

    /**
     * Reads a config value. Comes from the Configurable mixin, which is
     * JavaScript and therefore untyped — declared here so a Theme can satisfy an
     * interface that asks for it. `declare` rather than a field, because a real
     * field would be defined as `undefined` at construction and shadow the
     * prototype method it is describing.
     */
    declare get: (key: string) => unknown;

    /**
     * The version of the data contract this theme was written against.
     *
     * Declared explicitly rather than defaulted, and that is the point: a theme
     * built for an older major never calls this, so its absence is what
     * identifies it. Defaulting it to the current version would make every old
     * theme claim compatibility with a contract it has never seen.
     */
    setContractVersion(version: number): this {
        this._contractVersion = version;
        return this;
    }

    contractVersion(): number | null {
        return this._contractVersion;
    }

    /**
     * The Shell HTML this theme boots its Frame from, as a file path.
     *
     * A theme builds this alongside its client bundle; `@fractality/web` copies
     * it across the route table and injects the global config. This replaces
     * every view-rendering entry point the theme used to have.
     */
    setShell(path: string): this {
        this._shellPath = path;
        return this;
    }

    shellPath(): string | null {
        return this._shellPath;
    }

    addStatic(path: string, mount: string): this {
        for (const existing of this._staticPaths) {
            if (existing.path === path) return this;
        }
        this._staticPaths.add({ path, mount });
        return this;
    }

    static(): StaticMount[] {
        return Array.from(this._staticPaths.values());
    }

    addRoute(path: string, opts: Record<string, unknown>, resolvers?: RouteResolver): this {
        const handle = String(opts.handle ?? path);
        const route: RouteDefinition = {
            ...opts,
            path,
            handle,
            matcher: match(path) as MatchFunction<Record<string, string>>,
        };
        this.addResolver(handle, resolvers ?? null);
        this._routes.set(handle, route);
        return this;
    }

    addResolver(handle: string, resolver: RouteResolver): this {
        this._resolvers[handle] = ([] as RouteResolver[]).concat(resolver);
        return this;
    }

    routes(): RouteDefinition[] {
        return Array.from(this._routes.values());
    }

    resolvers(): Record<string, RouteResolver[]> {
        return this._resolvers;
    }

    matchRoute(urlPath: string): { route: RouteDefinition; params: Record<string, string> } | false {
        for (const route of this._routes.values()) {
            const matched = route.matcher(urlPath);
            if (matched) return { route, params: matched.params };
        }
        return false;
    }

    urlFromRoute(handle: string, params: Record<string, string>, noRedirect?: boolean): string | null {
        const route = this._routes.get(handle);
        if (!route) return null;
        if (!noRedirect && route.redirect) return route.redirect;
        return compile(route.path)(params).replace(/%2F/g, '/');
    }
}
