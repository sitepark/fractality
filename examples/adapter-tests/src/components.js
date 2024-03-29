export default function components(fractal) {
    it('properly loads components', () => {
        expect(fractal.components.find('@tree-leaf')).toBeDefined();
        expect(fractal.components.find('@subtree-leaf')).toBeDefined();
    });

    it('properly loads variants from files', () => {
        expect(fractal.components.find('@tree-leaf--variant')).toBeDefined();
        expect(fractal.components.find('@subtree-leaf--variant')).toBeDefined();
    });

    it('properly loads variants from config', () => {
        expect(fractal.components.find('@tree-leaf--another')).toBeDefined();
    });
}
