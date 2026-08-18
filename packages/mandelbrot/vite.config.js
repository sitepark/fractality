import path from 'path';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
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
