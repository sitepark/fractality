export default function include(fractality) {
    it('includes child component', async () => {
        const render = await fractality.components.find('@include-parent').render();
        expect(render).toMatchSnapshot();
    });

    it('does not modify _self when including child component', async () => {
        const render = await fractality.components.find('@include-parent--self').render();
        expect(render).toMatchSnapshot();
    });
}
