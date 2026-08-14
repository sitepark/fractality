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
