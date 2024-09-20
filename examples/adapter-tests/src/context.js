export default function context(fractality) {
    it('asynchronously loads context', async () => {
        const ctx = await fractality.components.find('@async').getResolvedContext();
        expect(ctx).toMatchSnapshot();
    });

    it('loads context from JS config file', async () => {
        const ctx = await fractality.components.find('@js').getResolvedContext();
        expect(ctx.text).toBe('JS Context');
    });

    it('loads context from CJS config file', async () => {
        const ctx = await fractality.components.find('@cjs').getResolvedContext();
        expect(ctx.text).toBe('CJS Context');
    });

    it('loads context from JSON config file', async () => {
        const ctx = await fractality.components.find('@json').getResolvedContext();
        expect(ctx.text).toBe('JSON Context');
    });

    it('loads context from YAML config file', async () => {
        const ctx = await fractality.components.find('@yaml').getResolvedContext();
        expect(ctx.text).toBe('YAML Context');
    });

    it('loads context from another component', async () => {
        const ctx = await fractality.components.find('@reference').getResolvedContext();
        expect(ctx.parent.text).toBe('JS Context');
    });

    it('loads context from another component context key', async () => {
        const ctx = await fractality.components.find('@reference-key').getResolvedContext();
        expect(ctx.text).toBe('JS Context');
    });

    it('loads fully rendered component from another component context key', async () => {
        const ctx = await fractality.components.find('@reference-full').getResolvedContext();
        expect(ctx.reference).toMatchSnapshot();
    });
}
