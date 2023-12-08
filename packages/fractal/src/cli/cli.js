'use strict';

import { Log, mixins, utils } from '@frctl/core';
import chalk from 'chalk';
import chokidar from 'chokidar';
import _ from 'lodash';
import Console from './console.js';
import Notifier from './notifier.js';
import commands from './commands/index.js';
import { Command } from "commander";

const mix = mixins.mix;
const Configurable = mixins.configurable;
const Emitter = mixins.emitter;
import { URL, fileURLToPath } from 'url';

class Cli extends mix(Configurable, Emitter) {

    /**
     * @param {import('../fractal.js').Fractal} app
     */
    constructor(app) {
        super(app);
        this.config(app.get('cli'));

        this._app = app;
        this._programm = new Command();

        this._defaultsLoaded = false;
        this._interactive = false;
        this._configPath = null;
        this._scope = 'project';
        this._cliPackage = {};
        this._env = {};

        this.console = new Console();
        this.console.debugMode(app.debug);

        this.notify = new Notifier(this.console, this._interactive);

        for (const method of ['log', 'error', 'warn', 'debug', 'success']) {
            this[method] = function () {
                this.console[method].apply(this.console, Array.from(arguments));
            };
            Log.on(method, (msg, data) => this[method](msg, data));
        }
    }

    isInteractive() {
        return this._interactive;
    }


    exec() {

        for (const registerCmd of commands) {
            registerCmd(this._app)
        }
        this._programm.parse();
    }

    theme(theme) {
        // TODO: Breaking Change
        // if (_.isString(theme)) {
        //     theme = require(theme);
        // }
        this.console.theme = theme;
        return this;
    }

    init(scope, configPath, env, cliPackage) {
        this._scope = scope;
        this._configPath = configPath;
        this._env = env;
        this._cliPackage = cliPackage;
        return this;
    }

    get scope() {
        return this._scope;
    }

    get configPath() {
        return this._configPath;
    }

    get env() {
        return this._env;
    }

    get cliPackage() {
        return this._cliPackage;
    }

    _watchConfigFile() {
        if (this._scope === 'project' && this._configPath) {
            const monitor = chokidar.watch(this._configPath);
            monitor.on('change', () => {
                this.warn('Your configuration file has changed.');
                this.warn('Exit & restart the current process to see your changes take effect.');
                monitor.close();
            });
        }
    }
}

export default Cli;
