import fractality from '../../fractality.config.js';

describe('partial-block', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    it('properly loads components', () => {
        expect(fractality.components.find('@partial-block-partial')).toBeDefined();
        expect(fractality.components.find('@partial-block-parent')).toBeDefined();
    });

    it('renders partial', async () => {
        const render = await fractality.components.find('@partial-block-partial').render();
        expect(render).toBe('partial\n    \n');
    });

    it('renders parent', async () => {
        const render = await fractality.components.find('@partial-block-parent').render();
        expect(render).toBe('partial\n    parent\n');
    });
});
