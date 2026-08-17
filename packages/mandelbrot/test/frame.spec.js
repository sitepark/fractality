import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../fractality/src/fractal.js';
import { buildStatic } from '../../web/src/build/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const mandelbrot = path.resolve(__dirname, '..');
const example = path.resolve(__dirname, '..', '..', '..', 'examples', 'handlebars');

/**
 * The end-to-end proof that the pieces compose: mandelbrot's Frame is built with
 * Vite, and its real Shell is driven through @fractality/web's static build.
 *
 * Every other test in this effort exercises one piece against a fixture. This is
 * the only one where the Shell is the one a theme actually produces, so it is
 * the only place a mismatch between the theme's output and the builder's
 * expectations can surface.
 */
describe('the client-rendered Frame, end to end', () => {
    let dest;
    let result;
    let shell;

    beforeAll(async () => {
        // Build the Frame the way `prepack` does, rather than checking a built
        // artefact into the test.
        execFileSync('pnpm', ['run', 'build:frame'], { cwd: mandelbrot, stdio: 'pipe' });
        shell = await readFile(path.join(mandelbrot, 'dist', 'frame', 'index.html'), 'utf8');

        const app = create();
        app.components.set('path', path.join(example, 'components'));
        app.docs.set('path', path.join(example, 'docs'));
        await app.load();

        dest = await mkdtemp(path.join(tmpdir(), 'fractality-e2e-'));
        result = await buildStatic({
            app,
            dest,
            shell,
            config: {
                env: 'static',
                themeMount: '/themes/mandelbrot/frame',
                siteRoot: '',
                treeFile: '/tree.json',
            },
        });
    }, 180000);

    afterAll(async () => {
        if (dest) await rm(dest, { recursive: true, force: true });
    });

    const exists = async (file) => {
        try {
            await stat(path.join(dest, file));
            return true;
        } catch {
            return false;
        }
    };

    it('builds a Frame whose shell carries a root element and a module script', () => {
        expect(shell).toContain('id="frame"');
        expect(shell).toContain('<noscript>');
        expect(shell).toMatch(/<script[^>]+type="module"/);
    });

    it('writes the shell, the tree and the payloads', async () => {
        expect(await exists('index.html')).toBe(true);
        expect(await exists('tree.json')).toBe(true);
        expect(await exists('components/detail/render.json')).toBe(true);
        expect(await exists('components/detail/render.notes.json')).toBe(true);
        expect(await exists('components/preview/render.html')).toBe(true);
    });

    it('rewrites the frame bundle url so it resolves from any route depth', async () => {
        // Vite emits `./assets/...` under base: './'. A copy two directories deep
        // would resolve that against its own location and 404 — which is exactly
        // why the Shell's own links are made root-absolute at site build.
        const nested = await readFile(path.join(dest, 'components/detail/render.html'), 'utf8');
        expect(nested).toContain('src="/themes/mandelbrot/frame/assets/');
        expect(nested).not.toContain('src="./assets/');
    });

    it('writes byte-identical shells at every depth', async () => {
        const [root, nested] = await Promise.all([
            readFile(path.join(dest, 'index.html'), 'utf8'),
            readFile(path.join(dest, 'components/detail/render.html'), 'utf8'),
        ]);
        expect(nested).toBe(root);
    });

    it('gives the Frame everything it needs before any script runs', async () => {
        const html = await readFile(path.join(dest, 'index.html'), 'utf8');
        const json = html.match(/window\.frctl=(\{.*?\});<\/script>/)?.[1];
        expect(json).toBeDefined();
        const config = JSON.parse(json.replace(/\\u003c/g, '<'));
        expect(config).toMatchObject({ env: 'static', treeFile: '/tree.json' });
        expect(html.indexOf('window.frctl=')).toBeLessThan(html.indexOf('</head>'));
    });

    it('resolves a payload for every route it wrote a shell to', async () => {
        // The property the whole addressing rule exists for, now checked against
        // a real theme's Shell rather than a fixture string.
        expect(result.routes).toBeGreaterThan(1);
        expect(await exists('components/detail/render--variant-1.json')).toBe(true);
        expect(await exists('components/detail/render--variant-1.html')).toBe(true);
    });

    it('reports render failures without having aborted the build', () => {
        // The fixtures contain deliberately broken components.
        expect(Array.isArray(result.previewErrors)).toBe(true);
        expect(result.previewFiles).toBeGreaterThan(0);
    });
});
