'use strict';

import { mixins, utils } from "@frctl/core";
import { Web } from "@frctl/web";
import Promise from "bluebird";
import _ from "lodash";
import defaults from "../config.js";
import AssetSourceCollection from "./api/assets/index.js";
import ComponentSource from "./api/components/index.js";
import DocSource from "./api/docs/index.js";
import Cli from "./cli/index.js";
const mix = mixins.mix;
const Configurable = mixins.configurable;
const Emitter = mixins.emitter;

export class Fractal extends mix(Configurable, Emitter) {
    /**
     * Constructor.
     * @return {Fractal}
     */
    constructor(config) {
        super();
        this.config(utils.defaultsDeep(config || {}, defaults));

        this._cli = null;
        this._web = null;
        this._components = null;
        this._docs = null;
        this._assets = null;
        this._engine = null;

        if (this.debug) {
            Promise.config({
                longStackTraces: true,
            });
        }
    }

    get components() {
        if (!this._components) {
            this._components = new ComponentSource(this);
        }
        return this._components;
    }

    get docs() {
        if (!this._docs) {
            this._docs = new DocSource(this);
        }
        return this._docs;
    }

    get assets() {
        if (!this._assets) {
            this._assets = new AssetSourceCollection(this);
        }
        return this._assets;
    }

    get cli() {
        if (!this._cli) {
            this._cli = new Cli(this);
        }
        return this._cli;
    }

    get web() {
        if (!this._web) {
            this._web = new Web(this);
        }
        return this._web;
    }

    get version() {
        return this.get('version').replace(/v/i, '');
    }

    get debug() {
        return this.get('env').toLowerCase() === 'debug';
    }

    extend(plugin) {
        // TODO: Breaking Change
        // if (_.isString(plugin)) {
        //     plugin = require(plugin);
        // }
        if (!_.isFunction(plugin)) {
            throw new Error('Plugins must be a function');
        }
        const boundPlugin = plugin.bind(this);
        boundPlugin(module.exports.core);
        return this;
    }

    watch() {
        this._sources().forEach((s) => s.watch());
        return this;
    }

    unwatch() {
        this._sources().forEach((s) => s.unwatch());
        return this;
    }

    load() {
        return Promise.all(this._sources().map((s) => s.load()));
    }

    _sources() {
        return [this.components, this.docs].concat(this.assets.sources());
    }

    get __fractal() {
        return this.version;
    }
}

export function create(config) {
    return new Fractal(config);
}

export default create;

export { Adapter, Log as log, utils } from '@frctl/core';
export { Theme as WebTheme } from '@frctl/web';
export * as CliTheme from './cli/theme.js';
import Component from "./api/components/component.js";
import Variant from "./api/variants/variant.js";
import Doc from "./api/docs/doc.js";

export const core = {
    Component,
    Variant,
    Doc,
};
