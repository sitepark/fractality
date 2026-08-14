import Source from '../../src/entities/source.js';

function fakeConfig() {
    return {
        get: (key) => {
            if (key === 'foo') {
                return {
                    path: '/fake/path',
                    engine: { register: () => ({ load: () => {} }) },
                };
            }
        },
    };
}

describe('Source mixin', () => {
    describe('.whenIdle()', () => {
        it('resolves immediately when no rebuild is in progress', async () => {
            const source = new Source('foo', fakeConfig());
            await expect(source.whenIdle()).resolves.toBeDefined();
        });

        it('stays pending until context resolution has finished, even after parsing completes', async () => {
            const source = new Source('foo', fakeConfig());
            source.isLoaded = true;
            source._getTree = () => Promise.resolve(null);
            source._parse = () => Promise.resolve([]);

            let resolveContext;
            const contextGate = new Promise((resolve) => {
                resolveContext = resolve;
            });
            source._resolveTreeContext = () => contextGate;

            const rebuild = source.refresh();

            const notYetIdle = Symbol('not yet idle');
            const outcome = await Promise.race([
                source.whenIdle().then(() => 'idle'),
                new Promise((resolve) => setTimeout(() => resolve(notYetIdle), 50)),
            ]);
            expect(outcome).toBe(notYetIdle);

            resolveContext([]);
            await rebuild;
            await expect(source.whenIdle()).resolves.toBeDefined();
        });
    });
});
