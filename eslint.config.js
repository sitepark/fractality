import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import vitest from '@vitest/eslint-plugin';

export default [
    {
        files: ['**/*.{js,mjs,cjs,jsx}'],
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
    {
        ...pluginReact.configs.flat.recommended,
        settings: {
            react: {
                version: '18',
            },
        },
    },
];
