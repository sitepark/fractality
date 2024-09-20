export default function components(fractality) {
    it('properly loads components', () => {
        expect(fractality.components.find('@tree-leaf')).toBeDefined();
        expect(fractality.components.find('@subtree-leaf')).toBeDefined();
    });

    it('properly loads variants from files', () => {
        expect(fractality.components.find('@tree-leaf--variant')).toBeDefined();
        expect(fractality.components.find('@subtree-leaf--variant')).toBeDefined();
    });

    it('properly loads variants from config', () => {
        expect(fractality.components.find('@tree-leaf--another')).toBeDefined();
    });
}
