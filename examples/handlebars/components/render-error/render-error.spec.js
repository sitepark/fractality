import fractality from '../../fractality.config.js';

describe('render helper error handling', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    it('propagates a rendering error from a nested component instead of silently swallowing it', async () => {
        await expect(fractality.components.find('@render-error').render()).rejects.toThrow();
    });
});
