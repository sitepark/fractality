export default {
    plugins: ['stylelint-scss'],
    customSyntax: 'postcss-scss',
    rules: {
        'at-rule-no-unknown': null,
        'scss/at-rule-no-unknown': true,
        'no-descending-specificity': null,
        'font-family-no-missing-generic-family-keyword': null,
    },
};
