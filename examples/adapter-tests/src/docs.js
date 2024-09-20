export default function docs(fractality) {
    it('properly loads docs', () => {
        expect(fractality.docs.find('@index')).toBeDefined();
    });

    it('properly loads docs front-matter', () => {
        expect(fractality.docs.find('@index').title).toBe('Project Overview');
    });

    it('properly render docs through templating engine', async () => {
        const render = await fractality.docs.find('@index').render();
        expect(render).toMatchSnapshot();
    });
}
