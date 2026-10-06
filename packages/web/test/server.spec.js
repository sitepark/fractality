import app from '../../fractality/src/fractal';

import Theme from '../src/theme';

import Server from '../src/server';

describe('Server', () => {
    let server;

    beforeEach(() => {
        server = new Server(new Theme(), {}, app);
    });

    it('is an event emitter', () => {
        expect(server.hasMixedIn('Emitter')).toBe(true);
    });

    describe('.start()', () => {
        function startServer(config) {
            const fakeApp = { load: () => Promise.resolve(), watch: () => {} };
            const fakeTheme = { static: () => [], matchRoute: () => null };
            const startedServer = new Server(fakeTheme, {}, config, fakeApp);
            return startedServer.start(false).then(() => startedServer);
        }

        it('binds the configured host, the same address the free port was checked on', async () => {
            const hostServer = await startServer({ host: '127.0.0.1' });
            try {
                expect(hostServer._instance.address().address).toBe('127.0.0.1');
                expect(hostServer.url).toBe(`http://127.0.0.1:${hostServer.port}`);
            } finally {
                hostServer.stop();
            }
        });

        it('binds the wildcard address when no host is configured', async () => {
            const wildcardServer = await startServer({});
            try {
                expect(['::', '0.0.0.0']).toContain(wildcardServer._instance.address().address);
                expect(wildcardServer.url).toBe(`http://localhost:${wildcardServer.port}`);
            } finally {
                wildcardServer.stop();
            }
        });
    });

    describe('Chrome DevTools workspace route', () => {
        const devtoolsPath = '/.well-known/appspecific/com.chrome.devtools.json';
        const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

        async function withServer(config, cli, fn) {
            const fakeApp = { load: () => Promise.resolve(), watch: () => {}, whenIdle: () => Promise.resolve(), cli };
            const fakeTheme = { static: () => [], matchRoute: () => null, errorView: () => null };
            const startedServer = new Server(fakeTheme, { setGlobal: () => {} }, config, fakeApp);
            await startedServer.start(false);
            try {
                return await fn(startedServer);
            } finally {
                startedServer.stop();
            }
        }

        function fetchWorkspace(config, cli) {
            return withServer(config, cli, async (s) => {
                const res = await fetch(`${s.url}${devtoolsPath}`);
                return { status: res.status, body: res.status === 200 ? await res.json() : null };
            });
        }

        it('serves the directory of the config file as root, with a v4-formatted uuid', async () => {
            const { status, body } = await fetchWorkspace(
                { host: '127.0.0.1' },
                { configPath: '/projects/styleguide/fractality.config.js' },
            );
            expect(status).toBe(200);
            expect(body.workspace.root).toBe('/projects/styleguide');
            expect(body.workspace.uuid).toMatch(uuidV4);
        });

        it('falls back to the working directory when no config file was loaded', async () => {
            const { body } = await fetchWorkspace({ host: '127.0.0.1' }, { configPath: null });
            expect(body.workspace.root).toBe(process.cwd());
        });

        it('derives the uuid from the root, so it is stable across restarts', async () => {
            const cli = { configPath: '/projects/styleguide/fractality.config.js' };
            const first = await fetchWorkspace({ host: '127.0.0.1' }, cli);
            const second = await fetchWorkspace({ host: '127.0.0.1' }, cli);
            const other = await fetchWorkspace(
                { host: '127.0.0.1' },
                { configPath: '/projects/other/fractality.config.js' },
            );
            expect(second.body.workspace.uuid).toBe(first.body.workspace.uuid);
            expect(other.body.workspace.uuid).not.toBe(first.body.workspace.uuid);
        });

        it('is not served when disabled via the devtools option', async () => {
            const { status } = await fetchWorkspace({ host: '127.0.0.1', devtools: false }, { configPath: null });
            expect(status).toBe(404);
        });
    });

    describe('._onRequest()', () => {
        function fakeReqRes() {
            const req = { url: '/', path: '/', headers: {}, query: {} };
            const res = {
                locals: {
                    __request: { headers: {}, segments: [], params: {}, path: '/', query: {}, url: '/', route: null },
                },
                send: () => {},
                redirect: () => {},
                sendFile: () => {},
            };
            return { req, res };
        }

        it('waits for the app to be idle before matching a route, so an in-progress rebuild is never read mid-flight', async () => {
            let resolveIdle;
            const idle = new Promise((resolve) => {
                resolveIdle = resolve;
            });
            const matchRoute = () => ({ route: { view: 'view.html' }, params: {} });
            const fakeApp = { whenIdle: () => idle };
            const fakeTheme = { static: () => [], matchRoute };
            const fakeEngine = { setGlobal: () => {}, render: () => Promise.resolve('ok') };
            const idleServer = new Server(fakeTheme, fakeEngine, {}, fakeApp);

            const { req, res } = fakeReqRes();
            let sent;
            res.send = (v) => {
                sent = v;
            };

            idleServer._onRequest(req, res, () => {});

            const notYetRendered = Symbol('not yet rendered');
            const outcome = await Promise.race([
                new Promise((resolve) => {
                    const check = () => (sent !== undefined ? resolve('rendered') : setTimeout(check, 5));
                    check();
                }),
                new Promise((resolve) => setTimeout(() => resolve(notYetRendered), 50)),
            ]);
            expect(outcome).toBe(notYetRendered);

            resolveIdle();
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(sent).toEqual('ok');
        });
    });
});
