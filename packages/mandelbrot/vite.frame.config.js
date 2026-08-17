import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const web = path.resolve(__dirname, '../web/src');

export default defineConfig({
    root: path.resolve(__dirname, 'frame'),

    // Mandatory, not stylistic: it keeps references *inside* built assets
    // resolving against their own URL, so they stay correct at any static.mount.
    // The Shell's own <link>/<script> cannot use this — @fractality/web rewrites
    // those to be root-absolute at site build, because identical Shell copies sit
    // at different depths. See docs/specs/client-rendered-frame.md §7.
    base: './',

    plugins: [react()],

    resolve: {
        alias: {
            // Interim. @fractality/web still publishes raw JavaScript, so its
            // TypeScript contract cannot be imported through its exports map yet.
            // Vite reads the source directly; the packaging flip (§10) replaces
            // these with real subpath exports. A test asserts the Frame and the
            // server agree on the addressing rule regardless.
            '@fractality/web/contract': path.join(web, 'contract/index.ts'),
            '@fractality/web/addressing': path.join(web, 'payload/paths.ts'),
            '@fractality/web/shell': path.join(web, 'shell/config.ts'),
        },
    },

    build: {
        outDir: path.resolve(__dirname, 'dist/frame'),
        emptyOutDir: true,
        // React is bundled here and never peered, which is what keeps the Frame's
        // 19 clear of whatever version a consumer pins for their own patterns.
        rollupOptions: {},
    },
});
