export default {
    root: true,
    parserOptions: {
        ecmaVersion: 2018,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended', 'plugin:import/recommended'],
    env: {
        browser: true,
        node: true,
        es6: true,
        jest: true,
    },
    plugins: ['import'],
    rules: {
        'import/no-unresolved': [
            'error',
            {
                commonjs: true,
            },
        ],
        'import/no-extraneous-dependencies': 'error',
    },
    overrides: [
        {
            files: ['*.spec.js'],
            env: {
                jest: true,
            },
        },
        {
            files: ['**/*.jsx'],
            extends: ['plugin:react/recommended'],
            settings: {
                react: {
                    version: 'detect',
                },
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
    ],
};
