import path from 'path';
import { globbySync } from 'globby';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';

const skins = globbySync('./assets/scss/skins/*.scss').reduce((acc, file) => {
    const fileName = path.basename(file, '.scss');

    return {
        ...acc,
        [fileName]: path.resolve(file),
    };
}, {});

export default defineConfig(({ mode }) => ({
    css: {
        preprocessorOptions: {
            scss: {
                // Several skins share identical color variables and therefore compile to
                // byte-identical CSS (e.g. default.scss === blue.scss). Rollup dedupes
                // assets with identical content onto one physical file regardless of the
                // requested name, which would silently drop one skin's output entirely.
                // This makes every skin's compiled CSS genuinely unique so that can't happen.
                additionalData: (source, filename) => {
                    if (!filename.includes(`${path.sep}scss${path.sep}skins${path.sep}`)) {
                        return source;
                    }
                    const name = path.basename(filename, '.scss');
                    return `${source}\n:root { --sp-mandelbrot-skin: "${name}"; }\n`;
                },
            },
        },
        postcss: {
            plugins: [autoprefixer()],
        },
    },
    build: {
        outDir: path.resolve('./dist'),
        rollupOptions: {
            input: {
                mandelbrot: path.resolve('./assets/js/mandelbrot.js'),
                highlight: path.resolve('./assets/scss/highlight.scss'),
                ...skins,
            },
            output: {
                entryFileNames: 'js/[name].js',
                assetFileNames: 'css/[name][extname]',
            },
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'assets/img/**/*', dest: 'img', rename: { stripBase: true } },
                { src: 'assets/favicon.ico', dest: '.', rename: { stripBase: true } },
            ],
        }),
        ...(mode === 'analyze' ? [visualizer({ filename: 'dist/stats.html', open: true })] : []),
    ],
}));
