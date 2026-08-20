'use strict';

import _ from 'lodash';
import { compile, match, parse } from 'path-to-regexp';
import { mixins } from '@fractality/core';
const mix = mixins.mix;
const Configurable = mixins.configurable;
const Emitter = mixins.emitter;

export default class Theme extends mix(Configurable, Emitter) {
    constructor(viewPaths, options) {
        super();

        this.options = this.config.bind(this);
        this.setOption = this.set.bind(this);
        this.getOption = this.get.bind(this);

        this.options(options || {});

        this._staticPaths = new Set();
        this._routes = new Map();
        this._resolvers = {};
        this._builder = null;
        this._views = [];

        this._filters = [];
        this._extensions = [];
        this._globals = {};

        this._errorView = {};
        this._redirectView = {};

        this.addLoadPath(viewPaths);
        this.setErrorView('__system/error.nunj');
        this.setRedirectView('__system/redirect.nunj');
    }

    addLoadPath(path) {
        path = [].concat(path);
        this._views = _.uniq(path.concat(this._views));
        return this;
    }

    loadPaths() {
        return this._views;
    }

    setErrorView(view) {
        this._errorView = view;
        return this;
    }

    errorView() {
        return this._errorView;
    }

    setRedirectView(view) {
        this._redirectView = view;
        return this;
    }

    redirectView() {
        return this._redirectView;
    }

    addStatic(path, mount) {
        for (const s of this._staticPaths) {
            if (path === s.path) {
                return;
            }
        }
        this._staticPaths.add({
            path: path,
            mount: mount,
        });
        return this;
    }

    static() {
        return Array.from(this._staticPaths.values());
    }

    addRoute(path, opts, resolvers) {
        opts.path = path;
        opts.handle = opts.handle || path;
        opts.matcher = match(path);
        opts.wildcards = wildcardNames(path);
        this.addResolver(opts.handle, resolvers || null);
        this._routes.set(opts.handle, _.clone(opts));
        return this;
    }

    addResolver(handle, resolver) {
        _.set(this._resolvers, handle, [].concat(resolver));
        return this;
    }

    routes() {
        return Array.from(this._routes.values());
    }

    resolvers() {
        return this._resolvers;
    }

    matchRoute(urlPath) {
        for (const route of this._routes.values()) {
            const match = route.matcher(urlPath);
            if (match) {
                return {
                    route: route,
                    params: wildcardsToPaths(match.params, route.wildcards),
                };
            }
        }
        if (urlPath === '/') {
            return {
                route: {
                    handle: '__system-index',
                    view: '__system/index.nunj',
                },
                params: {},
            };
        }
        return false;
    }

    urlFromRoute(handle, params, noRedirect) {
        const route = this._routes.get(handle);
        if (route) {
            if (!noRedirect && route.redirect) {
                return route.redirect;
            }
            const compiler = compile(route.path);
            return cleanUrlPath(compiler(pathsToWildcards(params, route.wildcards)));
        }
        return null;
    }
}

function cleanUrlPath(urlPath) {
    return urlPath.replace(/%2F/g, '/');
}

/*
 * Names of every wildcard parameter in a route path, including those nested in
 * optional groups, e.g. 'path' for '/docs{/*path}'.
 */
function wildcardNames(path) {
    const names = [];
    const collect = (tokens) => {
        for (const token of tokens) {
            if (token.type === 'wildcard') {
                names.push(token.name);
            } else if (token.type === 'group') {
                collect(token.tokens);
            }
        }
    };
    collect(parse(path).tokens);
    return names;
}

/*
 * path-to-regexp represents a wildcard parameter as an array of path segments,
 * while routes, resolvers and views all deal in slash-separated strings. These
 * two helpers translate between the representations.
 */
function wildcardsToPaths(params, wildcards) {
    return mapWildcards(params, wildcards, (value) => (Array.isArray(value) ? value.join('/') : value));
}

function pathsToWildcards(params, wildcards) {
    return mapWildcards(params, wildcards, (value) => {
        if (!_.isString(value)) {
            return value;
        }
        const segments = value.split('/').filter((segment) => segment !== '');
        // An empty wildcard has no segments to compile; leaving it undefined
        // lets an optional group be omitted instead of throwing.
        return segments.length ? segments : undefined;
    });
}

function mapWildcards(params, wildcards, mapper) {
    if (!_.isObject(params) || _.isEmpty(wildcards)) {
        return params;
    }
    const mapped = _.clone(params);
    for (const name of wildcards) {
        if (name in mapped) {
            mapped[name] = mapper(mapped[name]);
        }
    }
    return mapped;
}
