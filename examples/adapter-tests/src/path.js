export default function path(fractality) {
    it('renders original path for server', async () => {
        const render = await fractality.components.find('@path').render(undefined, { server: true });
        expect(render).toMatchSnapshot();
    });

    it('converts absolute path to relative for builder', async () => {
        const render = await fractality.components.find('@path').render(undefined, { builder: true });
        expect(render).toMatchSnapshot();
    });
}
