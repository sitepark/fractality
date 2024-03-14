'use strict';

/**
 * @param {import("../../fractal.js").Fractal} fractal
 */
export default function (fractal) {
    const cli = fractal._cli;
    const console = cli.console;

    cli._programm
        .command('info')
        .description('Get information about your Fractality installation')
        .action(() => {
            const header = 'Fractality install info';
            const footer = null;

            let body = '';
            if (cli.scope === 'project') {
                body += `Project Fractality version: ${fractal.version}\n`;
            }
            body += `CLI helper version:      ${cli.cliPackage.version}`;

            return console.box(header, body, footer).unslog();
        });
}
