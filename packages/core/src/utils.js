'use strict';

import Path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import minimist from 'minimist';
import linguistLanguages from 'linguist-languages';
import _ from 'lodash';

const languages = Object.values(linguistLanguages);

export function lang(filePath) {
    const name = Path.extname(filePath).toLowerCase();
    switch (name) {
        case '.nunjucks':
        case '.nunjs':
        case '.nunj':
        case '.nj':
        case '.jinja2':
        case '.j2':
            return {
                name: 'HTML+Django',
                mode: 'django',
                scope: 'text.html.django',
                color: null,
            };
        default: {
            const result = languages.find((lang) => (lang.extensions ?? []).includes(name));
            return {
                name: result?.name || name,
                mode: result?.aceMode || 'plaintext',
                scope: result?.tmScope || null,
                color: result?.color || null,
            };
        }
    }
}

export function titlize(str) {
    return _.startCase(str);
}

export const slugify = (str) => _.deburr(str).replace(/\s+/g, '-').toLowerCase();

export function escapeForRegexp(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function parseArgv() {
    const argv = minimist(process.argv.slice(2));
    const args = argv._;
    const command = args.length ? args.shift() : null;
    const opts = argv;
    delete opts._;
    delete opts.$0;
    return {
        command: command,
        args: args,
        opts: opts,
    };
}

export function stringify(data, indent) {
    return JSON.stringify(
        data,
        function (key, val) {
            if (this[key] instanceof Buffer) {
                return '<Buffer>';
            }
            if (this[key] instanceof Function) {
                return '<Function>';
            }
            if (_.isPlainObject(this[key]) && !_.size(this[key])) {
                return '{}';
            }
            return val;
        },
        indent || 4,
    );
}

export function fileExistsSync(path) {
    try {
        fs.accessSync(path, fs.F_OK);
        return true;
    } catch (_e) {
        return false;
    }
}

export function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

export function mergeProp(prop, upstream) {
    if (_.isArray(upstream)) {
        return _.uniq(_.concat(upstream, _.castArray(prop)));
    } else if (_.isPlainObject(upstream) && _.isPlainObject(prop)) {
        return this.defaultsDeep(_.cloneDeep(prop || {}), upstream);
    }
    if (_.isUndefined(prop)) {
        return upstream;
    }
    return prop;
}

/*
 * Non-array merging version of _.defaultsDeep
 *
 * utils.defaultsDeep(src, defaults);
 */
export function defaultsDeep() {
    let output = {};

    _.toArray(arguments)
        .reverse()
        .forEach((item) => {
            _.mergeWith(output, item, (objectValue, sourceValue) => {
                if (_.isArray(sourceValue)) {
                    return sourceValue;
                }
                if (!_.isPlainObject(sourceValue) || !_.isPlainObject(objectValue)) {
                    return sourceValue;
                }
                if (_.isUndefined(sourceValue)) {
                    return objectValue;
                }
            });
        });

    return output;
}

export function relUrlPath(toPath, fromPath, opts) {
    if (toPath.startsWith('http')) {
        return toPath;
    }

    const ext = opts.ext || '';

    if (toPath.startsWith('.')) {
        return Path.extname(toPath) || ext === '' ? toPath : toPath + ext;
    }

    fromPath = getStaticPagePath(fromPath).replace(/\\/g, '/');
    toPath = ('/' + _.trim(Path.extname(toPath) ? toPath : getStaticPagePath(toPath), '/')).replace(/\\/g, '/');

    let outputPath;

    if (toPath == '/') {
        outputPath = Path.relative(fromPath, toPath).replace(/\\/g, '/');
    } else {
        const relativePath = Path.relative(fromPath, toPath);
        outputPath = (relativePath ? relativePath : Path.basename(toPath))
            .replace(/\\/g, '/')
            .replace(/^\.\.\//, '')
            .replace('.PLACEHOLDER', ext);
    }

    // for static builds, we want urls relative to the current directory
    // eg: ./btn.html
    // so that any use of `:` within a handle generates links as `./foo:btn.html`
    // and not just `foo:btn.html` as browsers may try to interpret the `:`
    // as an application link, like `<a href="twitter://user?screen_name=clearleft">open</a>``
    // which would open the twitter app.
    // links like `foo:btn.html` the browser tries to open an app "foo", fails and emits:
    // `Failed to launch 'foo:btn' because the scheme does not have a registered handler`
    // and halts navigation. Adding the `./`, giving it a relative path to the current folder
    // stops the browser interpreting the link as an app link, behaves as a normal link
    return opts && opts.relativeToCurrentFolder && !outputPath.startsWith('.') ? `./${outputPath}` : outputPath;

    function getStaticPagePath(url) {
        if (url == '/') {
            return ext == '' ? '/' : '/index.PLACEHOLDER';
        }
        const parts = Path.parse(url);
        return `${parts.dir}/${parts.name}.PLACEHOLDER`;
    }
}

export async function awaitProps(obj) {
    const waitingEntries = Object.entries(obj).map(async ([key, value]) => {
        return [key, await value];
    });
    return Promise.all(waitingEntries).then((entries) => {
        return Object.fromEntries(entries);
    });
}
