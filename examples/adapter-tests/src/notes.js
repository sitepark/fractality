export default function notes(fractal) {
    it('loads notes from config', async () => {
        const cmp = await fractal.components.find('@notes-config');
        expect(cmp.notes).toBe('Component Notes');
    });

    it('loads notes from config for variants', async () => {
        const cmp = await fractal.components.find('@notes-config--alt');
        expect(cmp.notes).toBe('Component Notes for variant');
    });

    it('loads notes from readme file', async () => {
        const cmp = await fractal.components.find('@notes-files');
        expect(cmp.notes).toBe('Component Notes\n');
    });

    it('loads notes from readme file for variants', async () => {
        const cmp = await fractal.components.find('@notes-files--alt');
        expect(cmp.notes).toBe('Component Notes for variant\n');
    });
}
