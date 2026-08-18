import Theme from '../src/theme.js';

describe('Theme', () => {
    it('is an event emitter and configurable', () => {
        const theme = new Theme();
        expect(theme.hasMixedIn('Emitter')).toBe(true);
        expect(theme.hasMixedIn('Configurable')).toBe(true);
    });

    it('collects static mounts without duplicating a path', () => {
        const theme = new Theme();
        theme.addStatic('/assets', '/static');
        theme.addStatic('/assets', '/other');
        expect(theme.static()).toEqual([{ path: '/assets', mount: '/static' }]);
    });

    it('registers routes and resolves urls from them', () => {
        const theme = new Theme();
        theme.addRoute('/components/detail/:handle', { handle: 'component' });
        expect(theme.urlFromRoute('component', { handle: 'button' })).toBe('/components/detail/button');
        expect(theme.routes()).toHaveLength(1);
    });

    it('matches a url back to its route', () => {
        const theme = new Theme();
        theme.addRoute('/components/detail/:handle', { handle: 'component' });
        const matched = theme.matchRoute('/components/detail/button');
        expect(matched && matched.params).toEqual({ handle: 'button' });
    });

    it('does not match an unknown url, and has no built-in index view to fall back on', () => {
        // The old Theme answered '/' with a '__system/index.nunj' view. There are
        // no views any more, so an unmatched url is simply unmatched and the
        // Frame resolves it client-side.
        const theme = new Theme();
        expect(theme.matchRoute('/')).toBe(false);
    });

    it('carries the Shell a theme boots its Frame from', () => {
        const theme = new Theme();
        expect(theme.shellPath()).toBeNull();
        theme.setShell('/themes/example/frame/index.html');
        expect(theme.shellPath()).toBe('/themes/example/frame/index.html');
    });

    it('no longer exposes any view-rendering api', () => {
        // The hard cutover, asserted rather than assumed. Each of these had a
        // caller in mandelbrot, so their absence is the breaking change third
        // party themes need to hear about (spec §9.1).
        const theme = new Theme() as unknown as Record<string, unknown>;
        for (const removed of [
            'addLoadPath',
            'loadPaths',
            'setErrorView',
            'errorView',
            'setRedirectView',
            'redirectView',
        ]) {
            expect(theme[removed]).toBeUndefined();
        }
    });
});
