'use strict';
/**
 * @param {import("../../fractal.js").Fractalilty} fractality
 */
export default function (fractality) {
    const cli = fractality._cli;
    const console = cli.console;

    cli._programm
        .command('start')
        .description('Start a development server')
        .option('-p, --port <number>', 'The port to run the server on.')
        .option('-t, --theme <package-name>', 'The name of custom UI theme to use, if required')
        .option('-w, --watch', 'Watch the filesystem for changes.')
        .action(async (args) => {
            const server = fractality.web.server(args);

            server.on('ready', () => {
                const header = 'Fractality web UI server is running!';
                const footer = cli.isInteractive()
                    ? "Use the 'stop' command to stop the server."
                    : 'Use ^C to stop the server.';
                const format = (str) => console.theme.format(str, 'success', true);
                const body = `Local URL: ${format(server.urls.server)}`;

                return console.box(header, body, footer).persist();
            });

            server.on('error', (err) => {
                if (err.status === 404) {
                    console.warn(`404: ${err.message}`);
                } else {
                    console.error(err.message, err);
                }
            });

            await server.start();
        });
}
