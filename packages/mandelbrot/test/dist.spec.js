import { execSync } from 'node:child_process';
import { globbySync } from 'globby';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Path from 'node:path';
const packageRoot = Path.dirname(Path.dirname(fileURLToPath(import.meta.url)));
const distDir = Path.join(packageRoot, 'dist');

describe('mandelbrot dist build', () => {
    beforeAll(() => {
        execSync('pnpm exec vite build', { cwd: packageRoot, stdio: 'pipe' });
    }, 60000);

    it('builds the one theme stylesheet, referenced by the theme as styles default', () => {
        expect(existsSync(Path.join(distDir, 'css', 'default.css'))).toBe(true);
    });

    it('builds no named skin stylesheets', () => {
        // Named skins were removed: the Frame's colours come from CSS custom
        // properties written into the Shell. Asserted rather than assumed,
        // because a stale one lying around in dist would still be served.
        for (const gone of ['blue', 'aqua', 'black', 'red', 'white']) {
            expect(existsSync(Path.join(distDir, 'css', `${gone}.css`))).toBe(false);
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

    it('bundles exactly one copy of jquery, so plugins register on the instance that becomes window.$', () => {
        const bundle = readFileSync(Path.join(distDir, 'js', 'mandelbrot.js'), 'utf8');

        // jQuery 4's `exports` map resolves an ESM `import` and a bundler `require` to two
        // different builds. When both were bundled, jquery-resizable-dom registered
        // $.fn.resizable on the copy that never became window.$ and every call threw.
        // noConflict is defined exactly once per jQuery copy.
        expect(bundle.match(/noConflict/g)).toHaveLength(1);
    });
});
