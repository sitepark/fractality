import fractality from '../../fractal.config.js';

describe('wrapper', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    it('renders with wrapper elements', async () => {
        const render = await fractality.components.find('@wrapper-consumer').render();
        expect(render).toMatchSnapshot();
    });
});
