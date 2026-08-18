import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { prepareShell, writeShells, type FrctlConfig } from '../../src/shell/index.js';

const config: FrctlConfig = {
    env: 'static',
    themeMount: '/themes/mandelbrot',
    siteRoot: '/',
    treeFile: '/tree.json',
};

/**
 * A stand-in for what a theme's build emits. The Shell's content belongs to the
 * theme; what is under test here is only what `@fractality/web` does to it.
 */
const SHELL = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link rel="stylesheet" href="./css/default.css">
<link rel="shortcut icon" href="favicon.ico">
<link rel="preconnect" href="https://example.com/fonts">
<script type="module" src="./js/frame.js"></script>
</head>
<body><div id="frame"></div><noscript>JavaScript required.</noscript></body></html>`;

describe('prepareShell', () => {
    it('makes theme-relative asset links root-absolute from the mount', () => {
        const html = prepareShell({ shell: SHELL, config });
        expect(html).toContain('href="/themes/mandelbrot/css/default.css"');
        expect(html).toContain('src="/themes/mandelbrot/js/frame.js"');
        expect(html).toContain('href="/themes/mandelbrot/favicon.ico"');
    });

    it('leaves absolute and external urls alone', () => {
        const html = prepareShell({ shell: SHELL, config });
        expect(html).toContain('href="https://example.com/fonts"');
    });

    it('injects the global config before any script can run', () => {
        const html = prepareShell({ shell: SHELL, config });
        expect(html).toContain('window.frctl=');
        expect(html.indexOf('window.frctl=')).toBeLessThan(html.indexOf('</head>'));
    });

    it('cannot be broken out of by a string containing a closing script tag', () => {
        // A label, theme name or any consumer string ends up inside an inline
        // <script>. Unescaped, "</script>" would terminate the block early and
        // inject the rest as markup.
        const hostile: FrctlConfig = {
            ...config,
            labels: { evil: '</script><img src=x onerror=alert(1)>' },
        };
        const html = prepareShell({ shell: SHELL, config: hostile });
        expect(html).not.toContain('</script><img');
        expect(html).toContain('\\u003c/script');
        // and it must still be valid JSON once parsed back out
        const json = html.match(/window\.frctl=(.*?);<\/script>/)?.[1];
        expect(JSON.parse(json!.replace(/\\u003c/g, '<')).labels.evil).toBe('</script><img src=x onerror=alert(1)>');
    });

    it('escapes the line terminators that are legal in JSON but not in JS', () => {
        const html = prepareShell({
            shell: SHELL,
            config: { ...config, labels: { sep: '\u2028\u2029' } },
        });
        expect(html).not.toContain('\u2028');
        expect(html).toContain('\\u2028');
    });

    it("links the theme's own stylesheets and favicon", () => {
        const html = prepareShell({
            shell: SHELL,
            config: {
                ...config,
                styles: ['/themes/mandelbrot/css/default.css', '/custom/extra.css'],
                favicon: '/themes/mandelbrot/favicon.ico',
            },
        });
        expect(html).toContain('<link rel="stylesheet" href="/themes/mandelbrot/css/default.css">');
        expect(html).toContain('<link rel="stylesheet" href="/custom/extra.css">');
        expect(html).toContain('<link rel="shortcut icon" href="/themes/mandelbrot/favicon.ico">');
    });

    it('passes theme style urls through without rewriting them', () => {
        // A theme builds these from its own configured mount, so they are
        // already root-absolute. Running them through the mount rewrite would
        // prefix them a second time.
        const html = prepareShell({
            shell: SHELL,
            config: { ...config, styles: ['/themes/mandelbrot/css/default.css'] },
        });
        expect(html).not.toContain('/themes/mandelbrot/themes/');
    });

    it('escapes a style url rather than letting it break out of the attribute', () => {
        const html = prepareShell({
            shell: SHELL,
            config: { ...config, styles: ['/x.css" onload="alert(1)'] },
        });
        expect(html).not.toContain('onload="alert(1)"');
        expect(html).toContain('&quot;');
    });

    it('injects nothing when a theme declares no styles or favicon', () => {
        // Counted rather than matched: the fixture Shell has its own favicon
        // link, so a plain "does not contain" assertion would be testing the
        // fixture rather than the injection.
        const before = (SHELL.match(/shortcut icon/g) ?? []).length;
        const html = prepareShell({ shell: SHELL, config });
        expect((html.match(/shortcut icon/g) ?? []).length).toBe(before);
        expect(html).not.toContain('href="undefined"');
    });

    it('keeps the noscript notice, since no-JS is unsupported', () => {
        expect(prepareShell({ shell: SHELL, config })).toContain('<noscript>');
    });
});

describe('writeShells', () => {
    let dest: string;

    beforeAll(async () => {
        dest = await mkdtemp(path.join(tmpdir(), 'fractality-shells-'));
    });

    afterAll(async () => {
        if (dest) await rm(dest, { recursive: true, force: true });
    });

    const routes = [
        '/index.html',
        '/components/detail/button.html',
        '/components/detail/card--variant-1.html',
        '/docs/getting-started.html',
    ];

    it('writes one shell per route, byte-identical across every depth', async () => {
        const result = await writeShells({ dest, routes, shell: SHELL, config });
        expect(result.files).toHaveLength(routes.length);

        const contents = await Promise.all(result.files.map((f) => readFile(f, 'utf8')));
        const [first] = contents;
        for (const body of contents) {
            expect(body).toBe(first);
        }
        // The property that makes this a file copy rather than a render pass:
        // a copy two directories deep is identical to the one at the root.
        expect(contents).toHaveLength(4);
    });

    it('reports the size of a single copy, which is what multiplies by route count', async () => {
        const result = await writeShells({ dest, routes, shell: SHELL, config });
        const actual = (await readFile(result.files[0]!, 'utf8')).length;
        expect(result.bytes).toBe(actual);
    });

    it('preserves the route paths so existing urls and bookmarks survive', async () => {
        const result = await writeShells({ dest, routes, shell: SHELL, config });
        expect(result.files).toContain(path.join(dest, 'components', 'detail', 'button.html'));
        expect(result.files).toContain(path.join(dest, 'index.html'));
    });
});
