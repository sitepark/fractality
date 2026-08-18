import { resolveShellMount } from '../../src/shell/mount.js';

describe('resolveShellMount', () => {
    it('accounts for the Shell living below the mount root', () => {
        // The real case, and the one a fixture test cannot show: mandelbrot
        // mounts dist/ at /themes/mandelbrot but builds its Frame into
        // dist/frame/. Using the mount alone yields /themes/mandelbrot/assets/…
        // for files served from /themes/mandelbrot/frame/assets/… — a build that
        // succeeds, looks right, and 404s every asset.
        expect(
            resolveShellMount('/repo/packages/mandelbrot/dist/frame/index.html', [
                { path: '/repo/packages/mandelbrot/dist', mount: '/themes/mandelbrot' },
            ]),
        ).toBe('/themes/mandelbrot/frame');
    });

    it('returns the bare mount when the Shell sits at its root', () => {
        expect(resolveShellMount('/theme/dist/index.html', [{ path: '/theme/dist', mount: '/themes/example' }])).toBe(
            '/themes/example',
        );
    });

    it('normalises surrounding slashes on the mount', () => {
        expect(
            resolveShellMount('/theme/dist/frame/index.html', [{ path: '/theme/dist', mount: 'themes/example/' }]),
        ).toBe('/themes/example/frame');
    });

    it('ignores a mount the Shell is merely adjacent to', () => {
        expect(
            resolveShellMount('/theme/other/index.html', [{ path: '/theme/dist', mount: '/themes/example' }]),
        ).toBeNull();
    });

    it('returns null when no mount contains the Shell, so the caller can say so', () => {
        expect(resolveShellMount('/nowhere/index.html', [])).toBeNull();
    });
});
