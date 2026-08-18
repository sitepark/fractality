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

    it('builds no legacy script bundle', () => {
        // The jQuery theme script is gone: the Frame is a module the Shell loads,
        // not a script the theme links. A stale bundle left in dist would still
        // be copied into every site.
        expect(existsSync(Path.join(distDir, 'js', 'mandelbrot.js'))).toBe(false);
    });

    it('copies the favicon to the dist root, referenced by the theme as favicon default', () => {
        expect(existsSync(Path.join(distDir, 'favicon.ico'))).toBe(true);
    });

    it('copies the theme images', () => {
        const images = globbySync('./img/**/*', { cwd: distDir });
        expect(images.length).toBeGreaterThan(0);
    });

    it('ships no jquery anywhere in the theme output', () => {
        // Replaces the guard for ADR 0002's dual-package hazard. That hazard
        // needed two copies of jQuery to exist; there are now none, so the
        // meaningful assertion is absence rather than a count of one.
        const bundles = globbySync('./**/*.js', { cwd: distDir });
        for (const file of bundles) {
            const contents = readFileSync(Path.join(distDir, file), 'utf8');
            expect(contents).not.toContain('jQuery.fn.jquery');
            expect(contents).not.toMatch(/pjax:click/);
        }
    });
});
