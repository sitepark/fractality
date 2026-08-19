import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    frctlConfigFor,
    prepareShell,
    writeShells,
    type FrctlConfig,
    type ThemeConfigSource,
} from '../../src/shell/index.js';

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

    describe('theming', () => {
        const theming = { '--skin-accent': '0, 137, 255', '--skin-links': '34, 136, 255' };

        it('writes the custom properties into a :root rule', () => {
            const html = prepareShell({ shell: SHELL, config: { ...config, theming } });
            expect(html).toContain('<style>:root{--skin-accent:0, 137, 255;--skin-links:34, 136, 255}</style>');
        });

        it('puts them after the theme stylesheets, so an override wins', () => {
            // Same specificity as anything the theme's own CSS declares on :root,
            // so the later of the two is the one that applies.
            const html = prepareShell({
                shell: SHELL,
                config: { ...config, styles: ['/themes/mandelbrot/css/default.css'], theming },
            });
            expect(html.indexOf('<style>:root{')).toBeGreaterThan(html.indexOf('css/default.css">'));
        });

        it('injects no style block when a theme declares no theming', () => {
            expect(prepareShell({ shell: SHELL, config })).not.toContain('<style>');
            expect(prepareShell({ shell: SHELL, config: { ...config, theming: {} } })).not.toContain('<style>');
        });

        it('refuses a value that would end the declaration and inject rules of its own', () => {
            expect(() =>
                prepareShell({
                    shell: SHELL,
                    config: { ...config, theming: { '--skin-accent': 'red;} body{display:none' } },
                }),
            ).toThrow(/not a plain CSS value/);
        });

        it('refuses a value that would close the style element', () => {
            expect(() =>
                prepareShell({
                    shell: SHELL,
                    config: { ...config, theming: { '--skin-accent': '</style><script>alert(1)</script>' } },
                }),
            ).toThrow(/not a plain CSS value/);
        });

        it('refuses a property name that is not a custom property', () => {
            expect(() =>
                prepareShell({ shell: SHELL, config: { ...config, theming: { 'body{color': 'red' } } }),
            ).toThrow(/not a CSS custom property/);
        });
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

describe('frctlConfigFor', () => {
    const SHELL_PATH = path.join('/srv', 'theme', 'dist', 'frame', 'index.html');

    const theme = (options: Record<string, unknown>): ThemeConfigSource => ({
        get: (key) => options[key],
        static: () => [{ path: path.join('/srv', 'theme', 'dist'), mount: '/themes/mandelbrot' }],
    });

    it("carries the theme's whole configuration through to the Shell", () => {
        // Every field, in one assertion, deliberately: this used to be written
        // out separately for the server and the builder, and `theming` was
        // missing from both. Adding a field the Shell needs should fail here.
        const built = frctlConfigFor(
            theme({
                styles: ['/themes/mandelbrot/css/default.css'],
                favicon: '/themes/mandelbrot/favicon.ico',
                labels: { search: { label: 'Suchen' } },
                panels: ['html', 'info'],
                theming: { '--skin-accent': '0, 137, 255' },
            }),
            'static',
            SHELL_PATH,
        );

        expect(built).toEqual({
            env: 'static',
            themeMount: '/themes/mandelbrot/frame',
            siteRoot: '',
            treeFile: '/tree.json',
            styles: ['/themes/mandelbrot/css/default.css'],
            favicon: '/themes/mandelbrot/favicon.ico',
            labels: { search: { label: 'Suchen' } },
            panels: ['html', 'info'],
            theming: { '--skin-accent': '0, 137, 255' },
        });
    });

    it('reaches the rendered Shell, not just the serialised config', () => {
        const built = frctlConfigFor(theme({ theming: { '--skin-accent': '0, 137, 255' } }), 'server', SHELL_PATH);
        expect(prepareShell({ shell: SHELL, config: built })).toContain('--skin-accent:0, 137, 255');
    });

    it('refuses a Shell that sits outside every static mount', () => {
        expect(() => frctlConfigFor(theme({}), 'static', '/elsewhere/index.html')).toThrow(
            /not inside any of its static mounts/,
        );
    });
});
