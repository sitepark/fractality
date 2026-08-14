import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        setupFiles: ['./tests/setup.js'],
        globals: true,
        // Vitest 4's defaultExclude is only node_modules and .git — unlike Vitest 3,
        // it no longer excludes dist. `fractality build` exports raw copies of every
        // component, including their *.spec.js files, into the example's dist, so
        // running the examples' documented build script would otherwise leave the
        // test run collecting those copies (where the relative config import cannot
        // resolve) on every subsequent `pnpm test`.
        exclude: [...defaultExclude, '**/dist/**'],
    },
});
