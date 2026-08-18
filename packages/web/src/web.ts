import { utils, mixins } from '@fractality/core';

import Server, { type ServerConfig } from './server.js';
import Builder, { type BuilderConfig } from './builder.js';
import Theme from './theme.js';
import type { Loadable, SourceApp } from './payload/source-types.js';
import type { IdleGateable } from './dev/gate.js';

const mix = mixins.mix;
const Configurable = mixins.configurable;
const Emitter = mixins.emitter;

/**
 * Turns a loaded library into a browsable site.
 *
 * Note what no longer happens here: no template engine is constructed, and no
 * theme view is loaded. A theme contributes routes, static assets and a Shell.
 */
export default class Web extends mix(Configurable, Emitter) {
    private readonly _app: SourceApp & IdleGateable & Loadable;
    private readonly _themes = new Map<string, Theme>();

    constructor(app: SourceApp & IdleGateable & Loadable & { get(path: string): unknown }) {
        super(app);
        this.config(app.get('web'));
        this._app = app;
        this.defaultTheme(this.get('theme') as Theme | undefined);
    }

    server(config?: ServerConfig): Server {
        const opts = utils.defaultsDeep<ServerConfig>(config, this.get('server'));
        const theme = this._loadTheme(opts.theme as Theme | undefined);
        this.emit('server:beforeCreate', theme, opts);
        const server = new Server(theme, opts, this._app);
        this.emit('server:created', server);
        return server;
    }

    builder(config?: BuilderConfig): Builder {
        const opts = utils.defaultsDeep<BuilderConfig>(config, this.get('builder'));
        const theme = this._loadTheme(opts.theme as Theme | undefined);
        this.emit('builder:beforeCreate', theme, opts);
        const builder = new Builder(theme, opts, this._app);
        this.emit('builder:created', builder);
        return builder;
    }

    theme(name: string | Theme, instance?: Theme): this {
        const resolved = instance ?? (name as Theme);
        this._themes.set(typeof name === 'string' ? name : 'default', resolved);
        this._themes.set('default', resolved);
        return this;
    }

    defaultTheme(instance?: Theme): Theme | this | undefined {
        if (instance) return this.theme('default', instance);
        return this._themes.get('default');
    }

    private _loadTheme(theme?: Theme): Theme {
        const resolved = theme ?? (this._themes.get('default') as Theme | undefined);

        // The identity check that makes @fractality/web a peer of a theme rather
        // than a dependency: a duplicate copy of this package would fail here.
        if (!(resolved instanceof Theme)) {
            throw new Error('Fractality themes must inherit from the base Theme class.');
        }

        for (const entry of ([] as Array<{ path?: string; mount?: string }>).concat(
            (this.get('static') as { path?: string; mount?: string }[]) ?? [],
        )) {
            if (entry?.path) resolved.addStatic(entry.path, entry.mount ?? '/');
        }

        return resolved;
    }
}
