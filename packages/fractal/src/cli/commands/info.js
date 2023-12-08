'use strict';

/**
 * @param {import("../../fractal.js").Fractal} fractal
 */
export default function (fractal) {

    const cli = fractal._cli;
    const console = cli.console;

    cli._programm.command('info')
        .description('Get information about your Fractal installation')
        .action(() => {
            const header = 'Fractal install info';
            const footer = null;

            let body = '';
            if (cli.scope === 'project') {
                body += `Project Fractal version: ${fractal.version}\n`;
            }
            body += `CLI helper version:      ${cli.cliPackage.version}`;

            return console.box(header, body, footer).unslog();
        })
}
