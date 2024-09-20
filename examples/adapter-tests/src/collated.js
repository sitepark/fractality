export default function collated(fractality) {
    it('renders collated components collated', async () => {
        const render = await fractality.components.find('@collated').render(null, null, { collate: true });
        expect(render).toMatchSnapshot();
    });
}
