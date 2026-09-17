'use strict';

import * as yaml from 'js-yaml';
import _ from 'lodash';
import Path from 'path';
import fs from 'fs-extra';
import * as utils from './utils.js';
import Log from './log.js';
import { pathToFileURL } from 'node:url';
import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default {
    parse(data, format) {
        format = format.toLowerCase();
        if (['js', 'mjs', 'cjs', 'javascript'].includes(format)) {
            return data;
        } else if (format === 'json') {
            return JSON.parse(data);
        } else if (format === 'yaml') {
            return yaml.load(data);
        }
        throw new Error(`Data format '${format}' not recognised`);
    },

    stringify(data, format) {
        format = format.toLowerCase();
        if (['cjs'].includes(format)) {
            return `module.exports = ${JSON.stringify(data, null, 4)};`;
        } else if (['js', 'mjs', 'javascript'].includes(format)) {
            return `export default ${JSON.stringify(data, null, 4)};`;
        } else if (format === 'json') {
            return JSON.stringify(data, null, 4);
        } else if (format === 'yaml') {
            return yaml.dump(data);
        }
        throw new Error(`Data format '${format}' not recognised`);
    },

    async readFile(filePath) {
        const format = utils.lang(filePath, true).mode;
        if (format === 'js' || format === 'javascript') {
            try {
                // always delete from require cache, to prevent stale content when loading cjs files
                delete require.cache[require.resolve(filePath)];
                const { mtimeMs } = await stat(filePath);

                // import() takes a URL, not a path. pathToFileURL escapes what
                // would otherwise change the meaning of that URL: drive letters,
                // backslashes, '#', '?', spaces. The mtime query gives every
                // revision its own URL, because Node keeps ESM modules cached
                // for good and only require.cache can be cleared, as above.
                const fileUrl = pathToFileURL(filePath);
                fileUrl.searchParams.set('t', mtimeMs);
                let data = (await import(fileUrl.href)).default;
                if (typeof data === 'function') {
                    data = data();
                }
                if (!_.isObject(data)) {
                    Log.error(`Error loading data file ${filePath}: JS files must return a JavaScript data object.`);
                    return Promise.reject(new Error('Error loading data file'));
                }
                return Promise.resolve(data);
            } catch (err) {
                Log.error(`Error parsing data file ${Path.basename(filePath)}: ${err.message}`);
                return Promise.resolve({});
            }
        } else {
            return fs
                .readFile(filePath, 'utf8')
                .then((contents) => this.parse(contents, format))
                .catch((err) => {
                    Log.error(`Error loading data file ${filePath}: ${err.message}`);
                    return {};
                });
        }
    },

    writeFile(filePath, data) {
        const format = utils.lang(filePath, true).mode;
        return fs.writeFile(filePath, this.stringify(data, format));
    },
};
