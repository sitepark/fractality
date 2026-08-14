import resolver from '../src/resolver.js';

function fakeSource(findResult) {
    return {
        find: () => findResult,
        engine: () => ({ render: () => 'rendered' }),
    };
}

describe('resolver', () => {
    describe('.context()', () => {
        it('resolves a @@ reference to an existing component by rendering it', async () => {
            const entity = {
                context: {},
                viewPath: '/some/view.hbs',
                content: 'content',
                toJSON: () => ({}),
            };
            const context = { reference: '@@existing' };
            const resolved = await resolver.context(context, fakeSource(entity));
            expect(resolved).toEqual({ reference: 'rendered' });
        });

        it('resolves to null and warns, instead of throwing, for a @@ reference to a non-existent component', async () => {
            const context = { reference: '@@does-not-exist' };
            await expect(resolver.context(context, fakeSource(undefined))).resolves.toEqual({ reference: null });
        });
    });
});
