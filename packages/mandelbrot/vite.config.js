import path from 'path';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
    resolve: {
        // jQuery 4's `exports` map sends an ESM `import` to dist-module/jquery.module.js
        // but a bundler's `require` to the classic dist/jquery.js, so jquery-global.js and
        // the CommonJS jQuery plugins each ended up with their own copy. The plugins then
        // registered $.fn.resizable on the copy that never became window.$, and every call
        // threw "resizable is not a function".
        //
        // Pin both to the classic build: it is the one the plugins can consume, since it
        // exports the jQuery function itself. The ESM build only has named exports, so
        // aliasing there instead hands the CommonJS plugins a module namespace object and
        // they throw on `$.fn` while the bundle is still initialising.
        alias: {
            jquery: path.resolve('./node_modules/jquery/dist/jquery.js'),
        },
        dedupe: ['jquery'],
    },
    css: {
        postcss: {
            plugins: [autoprefixer()],
        },
    },
    build: {
        outDir: path.resolve('./dist'),
        // The Frame is built separately into dist/frame by vite.frame.config.js.
        // Vite empties outDir by default, so leaving this on makes this build
        // delete the Frame — silently, and depending only on which build ran
        // last. `prebuild` already does the cleaning.
        emptyOutDir: false,
        rollupOptions: {
            input: {
                mandelbrot: path.resolve('./assets/js/mandelbrot.js'),
                highlight: path.resolve('./assets/scss/highlight.scss'),
                // One stylesheet, not seventeen. Named skins are gone; the
                // Frame's colours are set through CSS custom properties written
                // into the Shell, so nothing here varies per project.
                default: path.resolve('./assets/scss/skins/default.scss'),
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
