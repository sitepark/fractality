import Theme from '../src/theme.js';
import { CONTRACT_VERSION } from '../src/contract/index.js';
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

    const currentTheme = () => new Theme().setContractVersion(CONTRACT_VERSION);

    it('builds a Builder and a Server from a registered theme', () => {
        const web = new Web(app());
        web.theme('default', currentTheme());
        expect(web.builder({})).toBeDefined();
        expect(web.server({})).toBeDefined();
    });

    it('names 0.x themes specifically, since that is what every existing theme is', () => {
        // The common case deserves the precise message: a theme that declares
        // nothing was written before the contract existed, which is different
        // from one targeting a version this build does not support.
        const web = new Web(app());
        web.theme('default', new Theme());
        expect(() => web.builder({})).toThrow(/targets Fractality 0\.x/);
    });

    it('reports a version mismatch separately, naming both versions', () => {
        const web = new Web(app());
        web.theme('default', new Theme().setContractVersion(CONTRACT_VERSION + 1));
        expect(() => web.builder({})).toThrow(
            new RegExp(`version ${CONTRACT_VERSION + 1}.*supports version ${CONTRACT_VERSION}`),
        );
    });

    it('fails before anything renders', () => {
        // At registration, not at first request: a theme that cannot work should
        // not get as far as writing files or binding a port.
        const web = new Web(app());
        web.theme('default', new Theme());
        expect(() => web.server({})).toThrow();
    });

    it('constructs no template engine', () => {
        // Previously Web built an Engine per server and per builder and handed
        // it to the theme. Nothing renders a theme view any more.
        const web = new Web(app()) as unknown as Record<string, unknown>;
        expect(web._engine).toBeUndefined();
    });
});
