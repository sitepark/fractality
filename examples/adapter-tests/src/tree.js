export default function tree(fractality) {
    it('inherits context from parents', () => {
        expect(fractality.components.find('@subtree-leaf').context.root).toBe(true);
        expect(fractality.components.find('@subtree-leaf').context.subTree).toBe(true);
        expect(fractality.components.find('@subtree-leaf').context.subTreeLeaf).toBe(true);
    });

    it('overrides context from parents', () => {
        expect(fractality.components.find('@tree-leaf--another').context.level).toBe(2);
    });

    it('overrides context from parents and pass it further down', () => {
        expect(fractality.components.find('@subtree-leaf').context.level).toBe(2);
    });
}
