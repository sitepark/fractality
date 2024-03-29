export default {
    semi: true,
    singleQuote: true,
    printWidth: 120,
    tabWidth: 4,
    overrides: [
        {
            files: ['*.json', '*.yml'],
            options: {
                tabWidth: 2,
            },
        },
        {
            files: ['*.scss'],
            options: {
                singleQuote: false,
            },
        },
    ],
};
