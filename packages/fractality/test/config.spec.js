import config from '../config.js';

describe('web server defaults', () => {
    it('watches by default', () => {
        // This defaulted to false, which silently defeated the dev server's
        // opt-out check: nothing watched, so no rebuild was ever announced and
        // an edit to a template never reached the browser. Watching is what
        // makes the dev server a dev server now that browser-sync is gone.
        expect(config.web.server.watch).toBe(true);
    });

    it('carries no browser-sync configuration', () => {
        expect(config.web.server).not.toHaveProperty('sync');
        expect(config.web.server).not.toHaveProperty('syncOptions');
    });
});
