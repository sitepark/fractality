'use strict';

import mandelbrot from "@frctl/mandelbrot";
import handlebars from "@frctl/handlebars";
import { highlighter } from "@frctl/core"
import { URL, fileURLToPath } from "url";
import fsExtra from 'fs-extra';
const { readJsonSync } = fsExtra;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageJSON = readJsonSync(__dirname + "./package.json");

export default {
    version: packageJSON.version,
    env: process.env.NODE_ENV || 'production',
    project: {
        title: 'Component Library',
        version: null,
    },
    components: {
        engine: handlebars,
        path: null,
        label: 'components',
        title: 'Components',
        yield: 'yield',
        splitter: '--',
        ext: '.hbs',
        files: {
            preview: 'preview',
            config: 'config',
            collator: 'collator',
            notes: 'readme',
        },
        resources: {
            assets: {
                label: 'Assets',
                match: ['**/*'],
            },
        },
        default: {
            collator: function collator(markup, item) {
                return `<!-- Start: @${item.handle} -->\n${markup}\n<!-- End: @${item.handle} -->\n`;
            },
            preview: null,
            display: {},
            context: {},
            tags: [],
            meta: {},
            status: 'ready',
            collated: false,
            prefix: null,
        },
        statuses: {
            prototype: {
                label: 'Prototype',
                description: 'Do not implement.',
                color: '#FF3333',
            },
            wip: {
                label: 'WIP',
                description: 'Work in progress. Implement with caution.',
                color: '#FF9233',
            },
            ready: {
                label: 'Ready',
                description: 'Ready to implement.',
                color: '#29CC29',
            },
        },
    },
    docs: {
        engine: handlebars,
        path: null,
        label: 'documentation',
        title: 'Documentation',
        markdown: {
            gfm: true,
            tables: true,
            breaks: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
        },
        ext: '.md',
        indexLabel: 'Overview',
        default: {
            context: {},
            status: null,
            prefix: null,
        },
        statuses: {
            draft: {
                label: 'Draft',
                description: 'Work in progress.',
                color: '#FF3333',
            },
            ready: {
                label: 'Ready',
                description: 'Ready for referencing.',
                color: '#29CC29',
            },
        },
        files: {
            config: 'config',
        },
    },
    assets: {
        label: 'assets',
        title: 'Assets',
    },
    cli: {},
    web: {
        theme: mandelbrot(),
        server: {
            sync: false,
            watch: false,
            port: null,
            syncOptions: {},
        },
        builder: {
            dest: null,
            concurrency: 10,
            ext: '.html',
            urls: {
                ext: '.html',
                relativeToCurrentFolder: true,
            },
            static: {
                ignored: [],
            },
        },
        static: {
            path: null,
            mount: '/',
        },
        assets: {
            mount: 'assets',
        },
        highlighter: highlighter,
    },
};
