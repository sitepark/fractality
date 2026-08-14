import renderExtensionFactory from '../../src/extensions/render.js';

function fakeFractality(resolveResult) {
    const entity = {
        isComponent: false,
        context: {},
        render: () => Promise.resolve('<p>rendered</p>'),
    };
    return {
        components: {
            find: () => entity,
            resolve: () => resolveResult,
        },
    };
}

describe('nunjucks render extension', () => {
    it('calls the callback with the error instead of hanging when context resolution rejects', async () => {
        const rejection = new Error('context resolution failed');
        const extension = renderExtensionFactory(fakeFractality(Promise.reject(rejection)));

        const callbackResult = new Promise((resolve) => {
            extension.run({ ctx: { _env: {} } }, '@handle', undefined, undefined, (err, result) => {
                resolve({ err, result });
            });
        });

        const timedOut = Symbol('timed out');
        const outcome = await Promise.race([
            callbackResult,
            new Promise((resolve) => setTimeout(() => resolve(timedOut), 200)),
        ]);

        expect(outcome).not.toBe(timedOut);
        expect(outcome.err).toBe(rejection);
    });
});
