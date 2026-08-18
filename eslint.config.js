import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['**/dist/**']),
    {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        plugins: {
            vitest,
        },
        rules: {
            ...vitest.configs.recommended.rules,
        },
        languageOptions: {
            globals: {
                ...vitest.environments.env.globals,
            },
        },
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jquery,
            },
        },
    },
    {
        ...pluginJs.configs.recommended,
        rules: {
            'no-unused-vars': [
                'error',
                {
                    caughtErrorsIgnorePattern: '_',
                },
            ],
        },
    },
    // TypeScript. Without this — and without `.ts`/`.tsx` in the glob above —
    // TypeScript sources lint clean by simply never being visited.
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ['**/*.{ts,tsx}'],
    })),
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            // Mirror the JS rule above rather than running both.
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    caughtErrorsIgnorePattern: '_',
                },
            ],
        },
    },
    {
        ...pluginReact.configs.flat.recommended,
        settings: {
            react: {
                // The floor of @fractality/react's peer range, which is the React
                // the adapter and the examples actually run against.
                version: '18',
            },
        },
    },
    {
        // The Frame bundles its own React 19 and never peers it, so it is a
        // different React from the one above. A single global value would
        // silently mislint one of the two.
        files: ['packages/mandelbrot/**/*.{js,jsx,ts,tsx}'],
        settings: {
            react: {
                version: '19',
            },
        },
    },
    {
        // The Frame compiles with the automatic JSX runtime, so React is not in
        // scope and must not be required to be. Covers its tests as well as its
        // source; the legacy theme JavaScript in this package is not JSX at all.
        files: ['packages/mandelbrot/frame/**/*.{ts,tsx}', 'packages/mandelbrot/test/**/*.tsx'],
        ...pluginReact.configs.flat['jsx-runtime'],
    },
]);
