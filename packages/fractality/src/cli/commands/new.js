import { shell, utils } from '@fractality/core';
import { execa } from 'execa';
import fs from 'fs-extra';
import Handlebars from 'handlebars';
import * as inquirer from '@inquirer/prompts';
import Path from 'node:path';

const __dirname = import.meta.dirname;

/*
 * The templates write the answers into JavaScript and YAML, not HTML, so
 * Handlebars' default HTML escaping is wrong for them. `{{json value}}` emits
 * a double-quoted JSON string, which is a valid string literal in both.
 */
const templates = Handlebars.create();
templates.registerHelper('json', (value) => new Handlebars.SafeString(JSON.stringify(value)));

/**
 * @param {import("../../fractal.js").Fractality} fractality
 */
export default function (fractality) {
    const cli = fractality._cli;
    const console = cli.console;
    cli._programm
        .command('new')
        .argument('<path>')
        .description('Create a new Fractality project')
        .action(async (projectPath) => {
            const basePath = Path.resolve(projectPath);
            const viewsPath = Path.join(__dirname, '../../../views/cli/new');
            const fractalFileTpl = Path.join(viewsPath, 'fractal.hbs');
            const docsIndexTpl = Path.join(viewsPath, 'docs/index.md');
            const exampleComponent = Path.join(viewsPath, 'components/example');

            if (utils.fileExistsSync(basePath)) {
                console.error(`Cannot create new project: The directory ${basePath} already exists.`);
                return;
            }

            console.br().log('Creating new project.... just a few questions:').br();

            const answers = {
                projectTitle: await inquirer.input({
                    message: "What's the title of your project?",
                    default: utils.titlize(Path.basename(projectPath)),
                }),
                componentDir: await inquirer.input({
                    message: 'Where would you like to keep your components?',
                    default: 'components',
                }),
                docsDir: await inquirer.input({
                    message: 'Where would you like to keep your docs?',
                    default: 'docs',
                }),
                publicDir: await inquirer.input({
                    message: 'What would you like to call your public directory?',
                    default: 'public',
                }),
                useGit: await inquirer.confirm({
                    message: 'Will you use Git for version control on this project?',
                    default: true,
                }),
            };

            console.log('Generating project structure...');

            const componentsDir = Path.join(basePath, answers.componentDir);
            const docsDir = Path.join(basePath, answers.docsDir);
            const publicDir = Path.join(basePath, answers.publicDir);
            const packageJSONPath = Path.join(basePath, 'package.json');
            const gitIgnorePath = Path.join(basePath, '.gitignore');
            const fractalFilePath = Path.join(basePath, 'fractality.config.js');
            const docsIndexPath = Path.join(docsDir, '01-index.md');
            const componentCopyTo = Path.join(componentsDir, 'example');

            const packageJSON = {
                name: utils.slugify(answers.projectTitle),
                version: '0.1.0',
                type: 'module',
                dependencies: {
                    '@fractality/fractality': `^${fractality.get('version')}`,
                },
                scripts: {
                    'fractality:start': 'fractality start',
                    'fractality:build': 'fractality build',
                },
            };

            const fractalContents = templates.compile(fs.readFileSync(fractalFileTpl, 'utf8'))(answers);
            const indexContents = templates.compile(fs.readFileSync(docsIndexTpl, 'utf8'))(answers);

            try {
                await fs.ensureDir(basePath);
                await Promise.all([
                    fs.ensureDir(componentsDir),
                    fs.ensureDir(docsDir),
                    fs.ensureDir(publicDir),
                    fs.writeJson(packageJSONPath, packageJSON),
                ]);
                await fs.copy(exampleComponent, componentCopyTo);
                if (answers.useGit) {
                    shell.touch(Path.join(publicDir, '.gitkeep'));
                    await fs.writeFile(gitIgnorePath, 'node_modules\n');
                }

                await Promise.all([
                    fs.writeFile(fractalFilePath, fractalContents),
                    fs.writeFile(docsIndexPath, indexContents),
                ]);
            } catch (e) {
                await fs.remove(basePath);
                console.error(e);
            } finally {
                console.log('Installing NPM dependencies - this may take some time!');
                shell.cd(basePath);
                const { stdout } = await execa('npm', ['install']);
                console.log(stdout);
                console.success('Your new Fractality project has been set up.');
            }
        });
}
