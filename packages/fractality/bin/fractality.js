#!/usr/bin/env node

'use strict';

import Path from 'path';
import semver from 'semver';
import Liftoff from 'liftoff';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { create } from '../src/fractal.js';
import fsExtra from 'fs-extra';
const { readJsonSync } = fsExtra;
const cliPackage = readJsonSync('./package.json');

const notifier = updateNotifier({
    pkg: cliPackage,
});

const FractalCli = new Liftoff({
    processTitle: 'fractality',
    moduleName: '@fractality/fractality',
    configName: 'fractal',
    extensions: {
        '.config.mjs': null,
        '.config.cjs': null,
        '.config.js': null,
        '.mjs': null,
        '.cjs': null,
        '.js': null,
        'ity.config.mjs': null,
        'ity.config.cjs': null,
        'ity.config.js': null,
        'ity.mjs': null,
        'ity.cjs': null,
        'ity.js': null,
    },
    // ,
    // v8flags: ['--harmony']
});

/*
 * Figure out what the Fractality CLI config file is called.
 *
 * - See if there is a package.json file present that contains a specific filename
 * - Otherwise look for the default fractal.config.js or fractal.js
 */

let config = {};
try {
    const projectPackage = readJsonSync(Path.join(process.cwd(), 'package.json'));
    if (projectPackage.fractal && projectPackage.fractal.main) {
        config.configPath = Path.join(process.cwd(), projectPackage.fractal.main);
    }
} catch (_e) {
    // don't do anything with the error since not having a package.json
    // is expected when it can't be required
}

FractalCli.prepare(config, (env) => {
    FractalCli.execute(env, async (env) => {
        let app;
        let scope = 'global';
        let configPath = env.configPath;

        if (configPath) {
            // Config file found - it's running in project context.
            try {
                app = (await import(configPath)).default;
                scope = 'project';
            } catch (e) {
                console.error(e.stack);
                return;
            }
        }

        /*
         * If it's a project context check compare the local Fractality version with the CLI version.
         * Also check that the config file is correctly exporting a configured fractal instance.
         *
         * If it's not a global context, then import the global Fractality module and create a fresh instance.
         */

        if (scope === 'project') {
            if (semver.lt(env.modulePackage.version, `1.0.0`)) {
                // Project is using a legacy version of Fractal, load it the old way...
                console.log(
                    `Fractality version mismatch! Global: ${cliPackage.version} / Local: ${env.modulePackage.version}`,
                );
                import(env.modulePath).then((frctl) => frctl.run());
                return;
            }

            if (!app || !app.__fractal) {
                // looks like the configuration file is not correctly module.export'ing a fractal instance
                console.log(
                    `${chalk.red(
                        'Configuration error',
                    )}: The CLI configuration file is not exporting an instance of Fractal.`,
                );
                return;
            }

            // Alert to any version mismatches.
            if (semver.gt(cliPackage.version, env.modulePackage.version)) {
                app.cli.notify.versionMismatch({
                    cli: cliPackage.version,
                    local: env.modulePackage.version,
                });
            }

            if (Path.basename(configPath) === 'fractal.js') {
                console.log(`Deprecated configuration file name! Rename fractal.js to fractality.config.js.`);
            }

            if (Path.basename(configPath) === 'fractal.config.js') {
                console.log(`Deprecated configuration file name! Rename fractal.config.js to fractality.config.js.`);
            }
        } else {
            // Global context
            app = create();
        }

        /*
         * Notify of any available updates on exit
         */

        if (notifier.update) {
            process.on('exit', function () {
                app.cli.notify.updateAvailable(notifier.update);
            });
        }

        /*
         * Kick things off...
         */

        app.cli.init(scope, configPath, env, cliPackage);
        app.cli.exec();
    });
});
