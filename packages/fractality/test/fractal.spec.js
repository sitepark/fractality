import { Web } from '@fractality/web';

import { create, core } from '../src/fractal';
import Cli from '../src/cli';
import ComponentSource from '../src/api/components';
import DocSource from '../src/api/docs/source';
import fsExtra from 'fs-extra';
import { URL, fileURLToPath } from 'url';

const { readJsonSync } = fsExtra;
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pkg = readJsonSync(__dirname + '../package.json');

describe('Fractality', () => {
    let app = create();
    beforeEach(() => {
        app.web;
        app.cli;
        app.docs;
        app.components;
    });

    it('is an event emitter', () => {
        expect(app.hasMixedIn('Emitter')).toBe(true);
    });
    it('is configurable', () => {
        expect(app.hasMixedIn('Configurable')).toBe(true);
    });

    describe('.cli', () => {
        it('is a command line interface handler', () => {
            expect(app.cli).toBeInstanceOf(Cli);
        });
    });

    describe('.web', () => {
        it('is a web interface handler', () => {
            expect(app.web).toBeInstanceOf(Web);
        });
    });

    describe('.components', () => {
        it('is a component source instance', () => {
            expect(app.components).toBeInstanceOf(ComponentSource);
        });
    });

    describe('.docs', () => {
        it('is a documentation source instance', () => {
            expect(app.docs).toBeInstanceOf(DocSource);
        });
    });

    describe('.version', () => {
        it('matches the version number set in the package.json file', () => {
            expect(app.version).toEqual(pkg.version);
        });
    });

    describe('.extend()', () => {
        it('calls the plugin, bound to the app, with the core API namespace', () => {
            let receivedApp;
            let receivedCore;
            app.extend(function (coreApi) {
                receivedApp = this;
                receivedCore = coreApi;
            });
            expect(receivedApp).toBe(app);
            expect(receivedCore).toBe(core);
        });

        it('throws when the plugin is not a function', () => {
            expect(() => app.extend('not-a-function')).toThrow('Plugins must be a function');
        });
    });
});
