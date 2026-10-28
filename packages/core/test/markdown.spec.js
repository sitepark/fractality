import md from '../src/markdown';

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

    describe('heading ids', () => {
        it('adds an id to headings', () => {
            expect(md('## Type scale')).toBe('<h2 id="type-scale">Type scale</h2>\n');
        });

        it('suffixes duplicate ids', () => {
            const result = md('## Usage\n\n## Usage\n\n## Usage');
            expect(result).toContain('id="usage"');
            expect(result).toContain('id="usage-1"');
            expect(result).toContain('id="usage-2"');
        });

        it('resets duplicate tracking between calls', () => {
            md('## Usage');
            expect(md('## Usage')).toContain('id="usage"');
        });

        it('keeps duplicate tracking separate for concurrent async renders', async () => {
            const source = '## Usage\n\n## Usage';
            const [first, second] = await Promise.all([md(source, { async: true }), md(source, { async: true })]);
            expect(first).toBe(second);
            expect(second).toContain('id="usage"');
            expect(second).toContain('id="usage-1"');
        });

        it('strips punctuation and quotes', () => {
            expect(md('## Don\'t "stop"')).toContain('id="dont-stop"');
        });

        it('builds the id from plain text and keeps inline markup', () => {
            expect(md('### The `mzp-c-button` *class*')).toBe(
                '<h3 id="the-mzp-c-button-class">The <code>mzp-c-button</code> <em>class</em></h3>\n',
            );
        });
    });
});
