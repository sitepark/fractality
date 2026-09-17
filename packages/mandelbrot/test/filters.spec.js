'use strict';

import Path from 'path';
import { describe, it, expect } from 'vitest';

import filters from '../src/filters.js';

// Path.resolve builds these, so the expectations hold on posix and win32 alike.
// On Windows they carry backslashes, which is what turns this into a guard
// against separators ending up in a URL.
const componentsPath = Path.resolve('/project/components');

function registerFilters() {
    const registered = {};
    const env = { engine: { addFilter: (name, fn) => (registered[name] = fn) } };
    const app = {
        components: { get: () => componentsPath },
        web: { get: () => 'assets' },
    };
    filters({}, env, app);
    return registered;
}

describe('mandelbrot filters', () => {
    describe('resourceUrl', () => {
        it('builds a slash-separated url from a nested component path', () => {
            const { resourceUrl } = registerFilters();
            const file = Path.join(componentsPath, 'patterns', 'button', 'button.hbs');
            expect(resourceUrl(file)).toEqual('/assets/components/patterns/button/button.hbs');
        });

        it('builds a url for a file directly below the components root', () => {
            const { resourceUrl } = registerFilters();
            const file = Path.join(componentsPath, 'button.hbs');
            expect(resourceUrl(file)).toEqual('/assets/components/button.hbs');
        });

        it('never emits a backslash', () => {
            const { resourceUrl } = registerFilters();
            const file = Path.join(componentsPath, 'patterns', 'button', 'button.hbs');
            expect(resourceUrl(file)).not.toContain('\\');
        });
    });
});
