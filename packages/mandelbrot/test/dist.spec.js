import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Path from 'node:path';
import { globbySync } from 'globby';

const packageRoot = Path.dirname(Path.dirname(fileURLToPath(import.meta.url)));
const distDir = Path.join(packageRoot, 'dist');

const skinNames = globbySync('./assets/scss/skins/*.scss', { cwd: packageRoot }).map((file) =>
    Path.basename(file, '.scss'),
);

describe('mandelbrot dist build', () => {
    beforeAll(() => {
        execSync('pnpm exec vite build', { cwd: packageRoot, stdio: 'pipe' });
    }, 60000);

    it('builds a skin stylesheet for every skin under assets/scss/skins', () => {
        expect(skinNames.length).toBeGreaterThan(0);
        for (const skin of skinNames) {
            expect(existsSync(Path.join(distDir, 'css', `${skin}.css`))).toBe(true);
        }
    });

    it('builds the highlight stylesheet', () => {
        expect(existsSync(Path.join(distDir, 'css', 'highlight.css'))).toBe(true);
    });

    it('builds the main mandelbrot script bundle, referenced by the theme as scripts default', () => {
        expect(existsSync(Path.join(distDir, 'js', 'mandelbrot.js'))).toBe(true);
    });

    it('copies the favicon to the dist root, referenced by the theme as favicon default', () => {
        expect(existsSync(Path.join(distDir, 'favicon.ico'))).toBe(true);
    });

    it('copies the theme images', () => {
        const images = globbySync('./img/**/*', { cwd: distDir });
        expect(images.length).toBeGreaterThan(0);
    });

    it('bundles jquery-pjax and jquery-resizable-dom, which the theme scripts rely on', () => {
        const bundle = readFileSync(Path.join(distDir, 'js', 'mandelbrot.js'), 'utf8');
        expect(bundle).toContain('pjax:click');
        expect(bundle).toMatch(/resizable/i);
    });
});
