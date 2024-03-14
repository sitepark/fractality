'use strict';
/**
 * @param {import("../../fractal.js").Fractal} fractal
 */
export default function (fractal) {
    const cli = fractal._cli;
    const console = cli.console;

    cli._programm
        .command('start')
        .description('Start a development server')
        .option('-p, --port <number>', 'The port to run the server on.')
        .option('-t, --theme <package-name>', 'The name of custom UI theme to use, if required')
        .option('-s, --sync', 'Use BrowserSync to sync and reload pages when changes occur')
        .option('-w, --watch', 'Watch the filesystem for changes.')
        .action(async (args) => {
            const server = fractal.web.server(args);

            server.on('ready', () => {
                const header = 'Fractality web UI server is running!';
                const footer = cli.isInteractive()
                    ? "Use the 'stop' command to stop the server."
                    : 'Use ^C to stop the server.';
                const serverUrl = server.urls.server;
                const format = (str) => console.theme.format(str, 'success', true);
                let body = '';

                if (!server.isSynced) {
                    body += `Local URL: ${format(serverUrl)}`;
                } else {
                    const syncUrls = server.urls.sync;
                    body += `Local URL:      ${format(syncUrls.local)}`;
                    body += `\nNetwork URL:    ${format(syncUrls.external)}`;
                    body += `\nBrowserSync UI: ${format(syncUrls.ui)}`;
                }

                return console.box(header, body, footer).persist();
            });

            server.on('error', (err) => {
                if (err.status === '404') {
                    console.warn(`404: ${err.message}`);
                } else {
                    console.error(err.message, err);
                }
            });

            await server.start(args.sync);
        });
}
