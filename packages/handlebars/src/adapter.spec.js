import Handlebars from 'handlebars';
import promisedHbs from 'promised-handlebars';

/*
 * The invokePartial patch in adapter.js hands each partial its own `_self` on
 * data.root. These cover the two things that patch must not break: the caller's
 * root has to survive the call, and `_self` must not be a shared object that one
 * render can leave modified for the next.
 */
describe('handlebars adapter: _self on data.root', () => {
    /** Mirrors the shape of adapter.js's invokePartial wrapper. */
    function withPatch(resolveSelf) {
        const hbs = promisedHbs(Handlebars, { Promise });
        const invokePartial = hbs.VM.invokePartial;
        hbs.VM.invokePartial = function () {
            const args = Array.from(arguments);
            const data = args[2].data;
            args[2].data = { ...data, root: { ...data.root, _self: resolveSelf(args[2].name) } };
            return invokePartial.apply(hbs.VM, args);
        };
        return { hbs, restore: () => (hbs.VM.invokePartial = invokePartial) };
    }

    it("leaves the caller's _self intact after a partial returns", async () => {
        const { hbs, restore } = withPatch((name) => ({ handle: name }));
        try {
            hbs.registerPartial('child', '{{@root._self.handle}}');
            const out = await hbs.compile('{{@root._self.handle}} {{> child}} {{@root._self.handle}}')({
                _self: { handle: 'parent' },
            });
            expect(out).toBe('parent child parent');
        } finally {
            restore();
        }
    });

    it('gives each partial its own _self', async () => {
        const { hbs, restore } = withPatch((name) => ({ handle: name }));
        try {
            hbs.registerPartial('one', '{{@root._self.handle}}');
            hbs.registerPartial('two', '{{@root._self.handle}}');
            expect(await hbs.compile('{{> one}}|{{> two}}')({})).toBe('one|two');
        } finally {
            restore();
        }
    });

    it('does not carry a write to _self into the next render of the same partial', async () => {
        // resolveSelf caches the entity but must build the JSON per invocation -
        // caching the JSON instead lets the first render's write leak into the second.
        const entity = { toJSON: () => ({ context: { title: 'clean' } }) };
        const { hbs, restore } = withPatch(() => entity.toJSON());
        try {
            hbs.registerHelper('taint', (options) => {
                options.hash.on.title = 'tainted';
                return '';
            });
            hbs.registerPartial('child', '{{@root._self.context.title}}{{taint on=@root._self.context}}');
            expect(await hbs.compile('{{> child}} {{> child}}')({})).toBe('clean clean');
        } finally {
            restore();
        }
    });
});
