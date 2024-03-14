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
});
