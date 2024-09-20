import fractality from '../../fractality.config.js';

describe('context-data', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    it('does not modify used component context', async () => {
        const correctContext = { items: [{ foo: 'bar' }] };
        const initialContext = await fractality.components.find('@context-data-a').variants().default().getContext();
        expect(initialContext).toEqual(correctContext);
        await fractality.components.find('@context-data-a').render();
        const context = await fractality.components.find('@context-data-a').variants().default().getContext();
        expect(context).toEqual(correctContext);
    });
});
