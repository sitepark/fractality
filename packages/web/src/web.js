'use strict';

import _ from "lodash";
import { utils, mixins } from "@frctl/core";
import Server from "./server.js";
import Builder from "./builder.js";
import Theme from "./theme.js";
import Engine from "./engine/index.js";
const mix = mixins.mix;
const Configurable = mixins.configurable;
const Emitter = mixins.emitter;

export default class Web extends mix(Configurable, Emitter) {
    constructor(app) {
        super(app);
        this.config(app.get('web'));
        this._app = app;
        this._servers = new Map();
        this._themes = new Map();
        this.defaultTheme(this.get('theme'));
    }

    server(config) {
        const opts = utils.defaultsDeep(config, this.get('server'));
        const theme = this._loadTheme(opts.theme);
        const engine = new Engine(theme.loadPaths(), 'server', this._app);
        theme.emit('init', engine, this._app);
        engine.setGlobal('theme', theme);
        this.emit('server:beforeCreate', theme, engine, opts);
        const server = new Server(theme, engine, opts, this._app);
        this.emit('server:created', server);
        return server;
    }

    builder(config) {
        const opts = utils.defaultsDeep(config, this.get('builder'));
        const theme = this._loadTheme(opts.theme);
        const engine = new Engine(theme.loadPaths(), 'builder', this._app);
        theme.emit('init', engine, this._app);
        engine.setGlobal('theme', theme);
        this.emit('builder:beforeCreate', theme, engine, opts);
        const builder = new Builder(theme, engine, opts, this._app);
        this.emit('builder:created', builder);
        return builder;
    }

    theme(name, instance) {
        instance = instance || name;
        // TODO: Breaking Change
        // if (_.isString(instance)) {
        //     instance = require(instance)();
        // }
        this._themes.set(name, instance);
        this._themes.set('default', instance);
        return this;
    }

    defaultTheme(instance) {
        if (instance) {
            return this.theme('default', instance);
        }
        return this._themes.get('default');
    }

    _loadTheme(theme) {
        if (!theme) {
            theme = this.defaultTheme();
        }
        // TODO: Breaking Change
        // if (_.isString(theme)) {
        //     if (this._themes.has(theme)) {
        //         theme = this._themes.get(theme);
        //     } else {
        //         theme = require(theme)();
        //     }
        // }
        if (!(theme instanceof Theme)) {
            throw new Error('Fractal themes must inherit from the base Theme class.');
        }
        const stat = [].concat(this.get('static'));
        for (const s of stat) {
            if (s.path) {
                theme.addStatic(s.path, s.mount || '/');
            }
        }
        return theme;
    }
};
