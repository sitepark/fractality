'use strict';

import Path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import data from '../src/data.js';

const execFileAsync = promisify(execFile);
const runner = Path.join(import.meta.dirname, 'fixtures', 'read-data-file.mjs');

let tmpRoot;

// readFile() pulls JS data files in through dynamic import(), which reads the
// real filesystem and never sees mock-fs. So these tests write real files.
async function writeProject(name, { type, files }) {
    const dir = Path.join(tmpRoot, name);
    await fs.ensureDir(dir);
    await fs.writeJson(Path.join(dir, 'package.json'), { name: 'fixture', type });
    for (const [file, contents] of Object.entries(files)) {
        await fs.outputFile(Path.join(dir, file), contents);
    }
    return dir;
}

// readFile() has to run outside Vitest to hit the platform's real module
// resolution. See fixtures/read-data-file.mjs.
async function readInNode(steps) {
    const { stdout } = await execFileAsync(process.execPath, [runner, JSON.stringify(steps)]);
    return JSON.parse(stdout.slice(stdout.indexOf('__RESULT__') + '__RESULT__'.length));
}

async function readOne(filePath) {
    const { results } = await readInNode([{ read: filePath }]);
    return results[0];
}

beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(Path.join(os.tmpdir(), 'fractality-data-'));
});

afterAll(async () => {
    await fs.remove(tmpRoot);
});

describe('Data', () => {
    describe('.readFile()', () => {
        it('reads a json file', async () => {
            const dir = await writeProject('json', {
                type: 'commonjs',
                files: { 'data.json': '{"title":"From JSON"}' },
            });
            expect(await readOne(Path.join(dir, 'data.json'))).toEqual({ value: { title: 'From JSON' } });
        });

        it('reads a yaml file', async () => {
            const dir = await writeProject('yaml', {
                type: 'commonjs',
                files: { 'data.yaml': 'title: From YAML\n' },
            });
            expect(await readOne(Path.join(dir, 'data.yaml'))).toEqual({ value: { title: 'From YAML' } });
        });

        it('reads an esm .js file', async () => {
            const dir = await writeProject('esm', {
                type: 'module',
                files: { 'data.js': 'export default { title: "From ESM" };' },
            });
            expect(await readOne(Path.join(dir, 'data.js'))).toEqual({ value: { title: 'From ESM' } });
        });

        it('reads a commonjs .js file', async () => {
            const dir = await writeProject('cjs', {
                type: 'commonjs',
                files: { 'data.js': 'module.exports = { title: "From CJS" };' },
            });
            expect(await readOne(Path.join(dir, 'data.js'))).toEqual({ value: { title: 'From CJS' } });
        });

        it('reads .mjs and .cjs files', async () => {
            const dir = await writeProject('mixed', {
                type: 'commonjs',
                files: {
                    'data.mjs': 'export default { title: "From MJS" };',
                    'data.cjs': 'module.exports = { title: "From CJS ext" };',
                },
            });
            const { results } = await readInNode([
                { read: Path.join(dir, 'data.mjs') },
                { read: Path.join(dir, 'data.cjs') },
            ]);
            expect(results).toEqual([{ value: { title: 'From MJS' } }, { value: { title: 'From CJS ext' } }]);
        });

        it('calls the export when it is a function', async () => {
            const dir = await writeProject('fn', {
                type: 'module',
                files: { 'data.js': 'export default () => ({ title: "From function" });' },
            });
            expect(await readOne(Path.join(dir, 'data.js'))).toEqual({ value: { title: 'From function' } });
        });

        // A file path is not a URL. Space, '#' and '?' are ordinary characters
        // in a path but carry meaning in a URL, so they need escaping. Without
        // it, everything after a '#' drops off as a fragment. The same escaping
        // step is what lets Windows import a 'C:\...' path at all, where the
        // drive letter would otherwise read as a URL scheme.
        it('reads a js file from a path containing url-significant characters', async () => {
            const dir = await writeProject(Path.join('odd chars', 'a#b'), {
                type: 'module',
                files: { 'data.js': 'export default { title: "From odd path" };' },
            });
            expect(await readOne(Path.join(dir, 'data.js'))).toEqual({ value: { title: 'From odd path' } });
        });

        it('picks up changes to a js file that was already read', async () => {
            const dir = await writeProject('reread', {
                type: 'module',
                files: { 'data.js': 'export default { title: "Before" };' },
            });
            const file = Path.join(dir, 'data.js');
            const { results } = await readInNode([
                { read: file },
                { write: { path: file, contents: 'export default { title: "After" };' } },
                { read: file },
            ]);
            expect(results).toEqual([{ value: { title: 'Before' } }, { value: { title: 'After' } }]);
        });

        it('rejects when a js file does not export an object', async () => {
            const dir = await writeProject('notobject', {
                type: 'module',
                files: { 'data.js': 'export default "not an object";' },
            });
            expect(await readOne(Path.join(dir, 'data.js'))).toEqual({ error: 'Error loading data file' });
        });

        it('reports the file name, not the whole path, when a js file is broken', async () => {
            const dir = await writeProject('broken', {
                type: 'module',
                files: { 'data.js': 'export default { oops' },
            });
            const { logged } = await readInNode([{ read: Path.join(dir, 'data.js') }]);
            expect(logged[0]).toStartWith('Error parsing data file data.js:');
        });
    });

    describe('.parse()', () => {
        it('throws on an unknown format', () => {
            expect(() => data.parse('{}', 'toml')).toThrow("Data format 'toml' not recognised");
        });
    });

    describe('.stringify()', () => {
        it('writes esm and cjs exports', () => {
            expect(data.stringify({ a: 1 }, 'js')).toEqual('export default {\n    "a": 1\n};');
            expect(data.stringify({ a: 1 }, 'cjs')).toEqual('module.exports = {\n    "a": 1\n};');
        });

        it('throws on an unknown format', () => {
            expect(() => data.stringify({}, 'toml')).toThrow("Data format 'toml' not recognised");
        });
    });
});
