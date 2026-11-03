'use strict';

import Path from 'path';
import os from 'os';
import fsp from 'fs/promises';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import fs, { pathSegments } from '../src/fs.js';

describe('Fs', () => {
    // Passing the separator explicitly is what shows up the win32 case off
    // Windows, where Path.sep is '/' and a backslash is a normal filename
    // character.
    describe('.pathSegments()', () => {
        it('splits posix paths', () => {
            expect(pathSegments('components/patterns/_private', Path.posix.sep)).toEqual([
                'components',
                'patterns',
                '_private',
            ]);
        });

        it('splits win32 paths', () => {
            expect(pathSegments('components\\patterns\\_private', Path.win32.sep)).toEqual([
                'components',
                'patterns',
                '_private',
            ]);
        });

        it('drops empty segments from leading and repeated separators', () => {
            expect(pathSegments('/components//patterns/', Path.posix.sep)).toEqual(['components', 'patterns']);
            expect(pathSegments('\\components\\\\patterns\\', Path.win32.sep)).toEqual(['components', 'patterns']);
        });

        it('treats a backslash as a regular character in a posix path', () => {
            expect(pathSegments('components/odd\\name', Path.posix.sep)).toEqual(['components', 'odd\\name']);
        });

        it('returns no segments for an empty path', () => {
            expect(pathSegments('', Path.sep)).toEqual([]);
        });
    });

    // A component under a '_'-prefixed directory counts as hidden. That check
    // walks the path segments, so it only works on Windows if the split used
    // the platform separator instead of '/'.
    describe('hidden-path detection', () => {
        const isHidden = (relPath, sep) => pathSegments(relPath, sep).some((s) => s.startsWith('_'));

        it('detects a hidden ancestor directory on both platforms', () => {
            expect(isHidden('patterns/_private/button.hbs', Path.posix.sep)).toBe(true);
            expect(isHidden('patterns\\_private\\button.hbs', Path.win32.sep)).toBe(true);
        });

        it('does not treat a visible path as hidden', () => {
            expect(isHidden('patterns/public/button.hbs', Path.posix.sep)).toBe(false);
            expect(isHidden('patterns\\public\\button.hbs', Path.win32.sep)).toBe(false);
        });
    });

    describe('.describe()', () => {
        let dir;

        beforeEach(async () => {
            dir = await fsp.mkdtemp(Path.join(os.tmpdir(), 'fractality-fs-'));
        });

        afterEach(async () => {
            await fsp.rm(dir, { recursive: true, force: true });
        });

        const names = (tree) => tree.children.map((c) => c.base);

        // Editors write these next to the file being saved and delete them right
        // after. The watcher ignores them, so if a refresh picked one up it would
        // stay in the tree after the editor removed it.
        it('skips dotfiles and editor temp files', async () => {
            for (const file of ['button.config.js', 'button.config.js~', '.button.config.js.swp', '.hidden']) {
                await fsp.writeFile(Path.join(dir, file), '');
            }
            expect(names(await fs.describe(dir, dir))).toEqual(['button.config.js']);
        });

        it('skips dotfiles and editor temp files with a custom filter', async () => {
            for (const file of ['button.config.js', 'button.config.js~', '.hidden', 'excluded.js']) {
                await fsp.writeFile(Path.join(dir, file), '');
            }
            const tree = await fs.describe(dir, dir, (filePath) => !filePath.endsWith('excluded.js'));
            expect(names(tree)).toEqual(['button.config.js']);
        });

        // A dangling symlink is listed by readdir but fails to stat, like a file
        // an editor deletes between the two calls.
        it('drops entries that disappear while reading the directory', async () => {
            await fsp.writeFile(Path.join(dir, 'button.config.js'), '');
            await fsp.symlink(Path.join(dir, 'gone'), Path.join(dir, '4913'));
            expect(names(await fs.describe(dir, dir))).toEqual(['button.config.js']);
        });
    });
});
