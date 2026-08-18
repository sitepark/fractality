import Theme from '../src/theme.js';
import Web from '../src/web.js';

const app = () => ({ get: () => undefined }) as never;

describe('Web', () => {
    it('is an event emitter and configurable', () => {
        const web = new Web(app());
        expect(web.hasMixedIn('Emitter')).toBe(true);
        expect(web.hasMixedIn('Configurable')).toBe(true);
    });

    it('rejects anything that is not a Theme', () => {
        // The identity check that makes @fractality/web a peer of a theme rather
        // than a dependency: a second copy of this package would fail it.
        const web = new Web(app());
        web.theme('default', {} as unknown as Theme);
        expect(() => web.builder({})).toThrow(/must inherit from the base Theme class/);
    });

    it('builds a Builder and a Server from a registered theme', () => {
        const web = new Web(app());
        web.theme('default', new Theme());
        expect(web.builder({})).toBeDefined();
        expect(web.server({})).toBeDefined();
    });

    it('constructs no template engine', () => {
        // Previously Web built an Engine per server and per builder and handed
        // it to the theme. Nothing renders a theme view any more.
        const web = new Web(app()) as unknown as Record<string, unknown>;
        expect(web._engine).toBeUndefined();
    });
});
