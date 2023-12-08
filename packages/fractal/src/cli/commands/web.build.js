'use strict';


/**
 * @param {import("../../fractal.js").Fractal} fractal
 */
export default function (fractal) {
    const cli = fractal._cli;
    const console = cli.console;

    cli._programm.command('build')
        .description('Build a static version of the web UI')
        .option('-t, --theme <package-name>', 'The name of custom UI theme to use, if required')
        .action((_args, options) => {
            const builder = fractal.web.builder(options);

            builder.on('start', () => {
                console.success('Build started...');
            });

            builder.on('progress', (completed, total) => {
                console.update(`Exported ${completed} of ${total} items`, 'info');
            });

            builder.on('error', (err) => {
                console.error(err.message, err).persist();
            });

            return builder
                .build()
                .then((data) => {
                    console.persist();
                    const e = data.errorCount;
                    console[e ? 'warn' : 'success'](
                        `Build finished with ${e === 0 ? 'no' : e} error${e == 1 ? '' : 's'}.`,
                    ).unslog();
                })
                .catch((e) => {
                    console.error(e).unslog().br();
                });
        })

};
