'use strict';

/**
 * @param {import("../../fractal.js").Fractality} fractality
 */
export default function (fractality) {
    const cli = fractality._cli;
    const console = cli.console;

    cli._programm
        .command('build')
        .description('Build a static version of the web UI')
        .option('-t, --theme <package-name>', 'The name of custom UI theme to use, if required')
        .action(async (args) => {
            const builder = fractality.web.builder(args);

            builder.on('start', () => {
                console.success('Build started...');
            });

            builder.on('progress', (completed, total) => {
                // Files, not pages. A client-rendered build writes the data
                // contract alongside the documents, so this count is legitimately
                // larger than the page count the engine-backed builder reported —
                // saying "items" made that read as though the library had grown.
                console.update(`Written ${completed} of ${total} files`, 'info');
            });

            builder.on('error', (err) => {
                console.error(err.message, err).persist();
            });

            try {
                const data = await builder.build();

                console.persist();

                console.success(
                    `${data.routes} pages, ${data.previewFiles} previews, ` + `${data.payloadFiles} data files.`,
                );

                const e = data.errorCount;
                console[e ? 'warn' : 'success'](
                    `Build finished with ${e === 0 ? 'no' : e} error${e == 1 ? '' : 's'}.`,
                ).unslog();
            } catch (e) {
                console.error(e).unslog().br();
            }
        });
}
