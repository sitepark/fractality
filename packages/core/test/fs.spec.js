'use strict';

import Path from 'path';
import { describe, it, expect } from 'vitest';

import { pathSegments } from '../src/fs.js';

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
});
