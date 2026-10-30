import { marked } from 'marked';
import md from '../../src/markdown/index.js';

const code = `
\`\`\`
module.exports = {
    foo: 'bar',
};
\`\`\`
`;

const codeWithLang = `
\`\`\`js
module.exports = {
    foo: 'bar',
};
\`\`\`
`;

describe('Markdown renderer', () => {
    it('does not directly mutate the supplied configuration object', () => {
        const config = {};
        md('**foo**', config);
        expect(config).toEqual({});
    });

    it('renders markdown correctly', () => {
        const result = md('**foo**');
        expect(result).toMatchSnapshot();
    });

    it('renders code correctly', () => {
        const result = md(code);
        expect(result).toMatchSnapshot();
    });

    it('renders code with lang correctly', () => {
        const result = md(codeWithLang);
        expect(result).toMatchSnapshot();
    });

    it('highlights code when options are supplied', () => {
        expect(md(codeWithLang, { gfm: true })).toBe(md(codeWithLang));
    });

    it('does not register extensions on the global marked instance', () => {
        md('"foo"');
        expect(marked.parse('"foo"')).toBe('<p>&quot;foo&quot;</p>\n');
        expect(marked.parse(codeWithLang)).not.toContain('hljs');
    });
});
