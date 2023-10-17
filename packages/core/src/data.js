'use strict';

import Promise from "bluebird";
import yaml from "js-yaml";
import _ from "lodash";
import Path from "path";
import fs from "fs-extra";
import * as utils from "./utils.js";
import Log from "./log.js";
import { URL, fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default {
    parse(data, format) {
        format = format.toLowerCase();
        if (format === 'js' || format === 'javascript') {
            return data;
        } else if (format === 'json') {
            return JSON.parse(data);
        } else if (format === 'yaml') {
            return yaml.load(data);
        }
        throw new Error('Data format not recognised');
    },

    stringify(data, format) {
        format = format.toLowerCase();
        if (format === 'js' || format === 'javascript') {
            return `module.exports = ${JSON.stringify(data, null, 4)};`;
        } else if (format === 'json') {
            return JSON.stringify(data, null, 4);
        } else if (format === 'yaml') {
            return yaml.dump(data);
        }
        throw new Error('Data format not recognised');
    },

    async readFile(filePath) {
        const format = utils.lang(filePath, true).mode;
        if (format === 'js' || format === 'javascript') {
            try {
                filePath = Path.relative(__dirname, filePath);
                // TODO: This is a problem with ESM and import syntax
                // delete require.cache[require.resolve(filePath)]; // Always fetch a fresh copy
                // let data = require(filePath);
                // Using Cache-Bustim parameter for now

                let data = (await import(`${filePath}?t=${Date.now()}`)).default;
                if (typeof data === 'function') {
                    data = data();
                }
                if (!_.isObject(data)) {
                    Log.error(`Error loading data file ${filePath}: JS files must return a JavaScript data object.`);
                    return Promise.reject(new Error('Error loading data file'));
                }
                return Promise.resolve(data);
            } catch (err) {
                Log.error(
                    `Error parsing data file ${filePath.split('/')[filePath.split('/').length - 1]}: ${err.message}`
                );
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
