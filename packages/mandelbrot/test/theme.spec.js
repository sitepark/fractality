import { vi } from 'vitest';

import mandelbrot from '../src/theme.js';

describe('mandelbrot theme factory', () => {
    describe('default configuration', () => {
        it('resolves the default stylesheet to the default skin name', () => {
            const theme = mandelbrot();
            expect(theme.get('styles')).toContain('/themes/mandelbrot/css/default.css');
        });

        it('resolves the default highlight stylesheet', () => {
            const theme = mandelbrot();
            expect(theme.get('styles')).toContain('/themes/mandelbrot/css/highlight.css');
        });

        it('links no theme script by default', () => {
            // The Frame is loaded by the Shell as a module. 'default' no longer
            // resolves to anything, and must not resolve to a URL that 404s.
            const theme = mandelbrot();
            expect(theme.get('scripts')).toEqual([]);
        });

        it("still passes a consumer's own script urls through", () => {
            const theme = mandelbrot({ scripts: ['/custom/analytics.js'] });
            expect(theme.get('scripts')).toEqual(['/custom/analytics.js']);
        });

        it('defaults the favicon to the theme mount path', () => {
            const theme = mandelbrot();
            expect(theme.get('favicon')).toEqual('/themes/mandelbrot/favicon.ico');
        });

        it('ignores a leftover named skin rather than linking a stylesheet that is gone', () => {
            // Named skins were removed. Honouring `skin: 'blue'` would resolve to
            // /css/blue.css, which is no longer built — a 404 for a stylesheet
            // instead of an unstyled-but-working Frame.
            const theme = mandelbrot({ skin: 'blue' });
            expect(theme.get('skin')).toEqual({});
            expect(theme.get('styles')).toContain('/themes/mandelbrot/css/default.css');
            expect(theme.get('styles')).not.toContain('blue.css');
        });

        it('keeps a skin object as custom-property overrides', () => {
            const theme = mandelbrot({ skin: { accent: '#FFB300' } });
            expect(theme.get('skin')).toEqual({ accent: '#FFB300' });
        });

        it('passes through a non-"default" style URL unchanged', () => {
            const theme = mandelbrot({ styles: '/custom/style.css' });
            expect(theme.get('styles')).toContain('/custom/style.css');
        });

        it('includes a default "built on" information entry', () => {
            const theme = mandelbrot();
            const info = theme.get('information');
            expect(info).toHaveLength(1);
            expect(info[0].label).toEqual('Built on');
            expect(info[0].type).toEqual('time');
        });
    });

    describe('language and writing direction', () => {
        it('resolves rtl into the attribute value the Shell is written with', () => {
            // `rtl` is a flag in this config and an attribute value on the page.
            // Nothing was translating between the two, so an rtl project rendered
            // left to right.
            expect(mandelbrot({ rtl: true }).get('dir')).toBe('rtl');
            expect(mandelbrot().get('dir')).toBe('ltr');
        });

        it('defaults the language to en and passes another through', () => {
            expect(mandelbrot().get('lang')).toBe('en');
            expect(mandelbrot({ lang: 'pt-BR' }).get('lang')).toBe('pt-BR');
        });
    });

    describe('theming', () => {
        // `skin` is the whole of mandelbrot's colour configuration now that named
        // skins are gone, and it reaches the page as custom properties written
        // into the Shell. `theme.get('skin')` holding the values is not evidence
        // that anything applies them — that is precisely how this silently
        // stopped working.
        it('resolves skin colours to the custom properties the stylesheet reads', () => {
            const theme = mandelbrot({ skin: { accent: '#0089ff', complement: '#666', links: '#0089ff' } });
            expect(theme.get('theming')).toEqual({
                '--skin-accent': '0, 137, 255',
                '--skin-complement': '102, 102, 102',
                '--skin-links': '0, 137, 255',
            });
        });

        it('expands the three-digit hex form', () => {
            const theme = mandelbrot({ skin: { links: '#08f' } });
            expect(theme.get('theming')).toEqual({ '--skin-links': '0, 136, 255' });
        });

        it('accepts uppercase hex', () => {
            const theme = mandelbrot({ skin: { accent: '#FFB300' } });
            expect(theme.get('theming')).toEqual({ '--skin-accent': '255, 179, 0' });
        });

        it('declares no theming when no skin is configured', () => {
            expect(mandelbrot().get('theming')).toEqual({});
        });

        it('ignores a leftover named skin in either form', () => {
            expect(mandelbrot({ skin: 'blue' }).get('theming')).toEqual({});
            expect(mandelbrot({ skin: { name: 'blue' } }).get('theming')).toEqual({});
        });

        it('refuses a colour it cannot split into channels', () => {
            // The stylesheet interpolates these into rgba(), so a keyword would
            // produce an invalid value — and CSS drops those silently.
            expect(() => mandelbrot({ skin: { accent: 'rebeccapurple' } })).toThrow(/must be a hex colour/);
            expect(() => mandelbrot({ skin: { accent: 'rgb(0 137 255)' } })).toThrow(/must be a hex colour/);
        });

        it('refuses an unknown skin option instead of ignoring it', () => {
            expect(() => mandelbrot({ skin: { link: '#0089ff' } })).toThrow(/unknown skin option "link"/);
        });
    });

    describe('static assets', () => {
        it('mounts its own dist directory under the configured mount path', () => {
            const theme = mandelbrot();
            const staticPaths = theme.static();
            expect(staticPaths.some((s) => s.mount === '/themes/mandelbrot')).toBe(true);
        });
    });

    describe('routes', () => {
        it('registers every expected route handle', () => {
            const theme = mandelbrot();
            const handles = theme.routes().map((r) => r.handle);
            expect(handles).toEqual(
                expect.arrayContaining(['overview', 'asset-source', 'preview', 'render', 'component', 'page']),
            );
        });

        it('matches a component render URL and extracts the handle param', () => {
            const theme = mandelbrot();
            const match = theme.matchRoute('/components/render/my-component--variant');
            expect(match.route.handle).toEqual('render');
            expect(match.params.handle).toEqual('my-component--variant');
        });

        it("declares no route for a component's own files", () => {
            // @fractality/web serves those itself, at the same
            // /components/raw/<handle>/<file> urls. The mechanism this route used
            // — handing a filesystem path back for the renderer to send — went
            // with the server-rendered Frame, so the route resolved to nothing.
            const theme = mandelbrot();
            expect(theme.matchRoute('/components/raw/my-component/image.png')).toBe(false);
        });

        it('matches a nested docs page URL, including the wildcard path segments', () => {
            const theme = mandelbrot();
            const match = theme.matchRoute('/docs/getting-started/installation');
            expect(match.route.handle).toEqual('page');
            expect(match.params.path).toEqual(['getting-started', 'installation']);
        });

        it('matches the bare /docs URL as a redirect to /', () => {
            const theme = mandelbrot();
            const match = theme.matchRoute('/docs');
            expect(match.route.redirect).toEqual('/');
        });
    });

    describe('component handle resolver (shared by the preview/render/component detail routes)', () => {
        function fakeComponents(components) {
            return {
                _listeners: {},
                on(event, cb) {
                    this._listeners[event] = cb;
                },
                emit(event) {
                    this._listeners[event]();
                },
                flatten() {
                    return {
                        each(cb) {
                            components.forEach(cb);
                        },
                    };
                },
            };
        }

        function fakeComponent(handle, variantHandles = []) {
            return {
                handle,
                variants() {
                    return {
                        size: variantHandles.length,
                        each(cb) {
                            variantHandles.forEach((h) => cb({ handle: h }));
                        },
                    };
                },
            };
        }

        it('lists every component handle', () => {
            const theme = mandelbrot();
            const resolver = theme.resolvers().render[0];
            const app = { components: fakeComponents([fakeComponent('@button'), fakeComponent('@card')]) };

            expect(resolver(app)).toEqual([{ handle: '@button' }, { handle: '@card' }]);
        });

        it('also lists variant handles when a component has more than one variant', () => {
            const theme = mandelbrot();
            const resolver = theme.resolvers().render[0];
            const app = {
                components: fakeComponents([fakeComponent('@button', ['@button--primary', '@button--secondary'])]),
            };

            expect(resolver(app)).toEqual([
                { handle: '@button' },
                { handle: '@button--primary' },
                { handle: '@button--secondary' },
            ]);
        });

        it('does not list variant handles when a component has only one variant', () => {
            const theme = mandelbrot();
            const resolver = theme.resolvers().render[0];
            const app = { components: fakeComponents([fakeComponent('@button', ['@button--default'])]) };

            expect(resolver(app)).toEqual([{ handle: '@button' }]);
        });

        it('caches the handle list across calls instead of re-flattening every time', () => {
            const theme = mandelbrot();
            const resolver = theme.resolvers().render[0];
            const components = fakeComponents([fakeComponent('@button')]);
            const flattenSpy = vi.spyOn(components, 'flatten');
            const app = { components };

            resolver(app);
            resolver(app);

            expect(flattenSpy).toHaveBeenCalledTimes(1);
        });

        it('recomputes the handle list after the components source emits "updated"', () => {
            const theme = mandelbrot();
            const resolver = theme.resolvers().render[0];
            const components = fakeComponents([fakeComponent('@button')]);
            const app = { components };

            resolver(app);
            components.emit('updated');
            const flattenSpy = vi.spyOn(components, 'flatten');
            resolver(app);

            expect(flattenSpy).toHaveBeenCalledTimes(1);
        });
    });
});
