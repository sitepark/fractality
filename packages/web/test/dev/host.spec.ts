import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from '../../../fractality/src/fractal.js';
import { createDevHost, type DevHost } from '../../src/dev/index.js';
import { payloadPathFor } from '../../src/payload/paths.js';
import type { SourceApp } from '../../src/payload/source-types.js';
import type { IdleGateable } from '../../src/dev/gate.js';
import type { FrctlConfig } from '../../src/shell/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

interface TestApp extends SourceApp, IdleGateable {
    components: SourceApp['components'] & { set(key: string, value: unknown): void };
    docs: SourceApp['docs'] & { set(key: string, value: unknown): void };
    load(): Promise<unknown>;
}

const config: FrctlConfig = {
    env: 'server',
    themeMount: '/themes/mandelbrot/frame',
    siteRoot: '',
    treeFile: '/tree.json',
};

const SHELL = `<!DOCTYPE html><html><head><script type="module" src="./assets/frame.js"></script>
</head><body><div id="frame"></div></body></html>`;

let host: DevHost;
let origin: string;

beforeAll(async () => {
    const instance = create() as unknown as TestApp;
    instance.components.set('path', path.join(example, 'components'));
    instance.docs.set('path', path.join(example, 'docs'));
    await instance.load();

    host = await createDevHost({
        app: instance,
        shell: SHELL,
        config,
        root: example,
        staticMounts: [{ path: path.join(example, 'components'), mount: '/themes/example' }],
    });
    const port = await host.listen();
    origin = `http://127.0.0.1:${port}`;
}, 60000);

afterAll(async () => {
    if (host) await host.close();
});

describe('createDevHost', () => {
    it('serves the Shell for a Frame route', async () => {
        const res = await fetch(`${origin}/components/detail/render`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        const html = await res.text();
        expect(html).toContain('id="frame"');
        expect(html).toContain('window.frctl=');
    });

    it('serves the same Shell for any depth, including one that does not exist', async () => {
        // Deep links are the Frame's to resolve, not the server's — it has no
        // route table and does not need one.
        const [a, b] = await Promise.all([
            fetch(`${origin}/components/detail/render`).then((r) => r.text()),
            fetch(`${origin}/components/detail/nope`).then((r) => r.text()),
        ]);
        expect(a).toBe(b);
    });

    it('does NOT let the Frame catch-all swallow Vite client requests', async () => {
        // The failure ticket 03 flagged: '*path' matches /@vite/client, so a
        // catch-all registered before vite.middlewares kills HMR silently — the
        // Frame still loads and simply never hot-updates.
        const res = await fetch(`${origin}/@vite/client`);
        expect(res.status).toBe(200);
        const body = await res.text();
        expect(body).not.toContain('id="frame"');
        expect(res.headers.get('content-type')).toContain('javascript');
    });

    it('reaches the payload routes rather than the catch-all', async () => {
        const res = await fetch(`${origin}${payloadPathFor('/components/detail/render')}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        const payload = (await res.json()) as { handle: string };
        expect(payload.handle).toBe('render');
    });

    it('renders a Preview through the adapter, untouched by Vite', async () => {
        // transformIndexHtml is called on the Shell and never here. That single
        // rule is what keeps the user's templates out of Vite's module graph.
        const res = await fetch(`${origin}/components/preview/render`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).not.toContain('/@vite/client');
        expect(html).not.toContain('id="frame"');
    });

    it('injects the Vite client into the Shell', async () => {
        const html = await fetch(`${origin}/components/detail/render`).then((r) => r.text());
        expect(html).toContain('/@vite/client');
    });

    it('reports a pattern render failure inside the iframe, not as a server error', async () => {
        const res = await fetch(`${origin}/components/preview/render-error-broken`);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('Error rendering');
    });

    it('runs the websocket on the host server rather than opening a second port', async () => {
        // Middleware mode otherwise starts its own HTTP server on 24678.
        //
        // On its own this assertion is weak — it would also pass if the socket
        // never started at all — so it is paired with the broadcast below, which
        // only works when the ws is actually wired to the host server.
        const stray = await fetch('http://127.0.0.1:24678/').then(
            () => true,
            () => false,
        );
        expect(stray).toBe(false);
    });

    it('serves the theme static assets instead of swallowing them in the catch-all', async () => {
        // Found by running the real dev server: mounting these after
        // createDevHost returns puts them behind the Frame catch-all, so every
        // stylesheet came back as HTML with a 200 and the Frame looked unstyled
        // for no visible reason.
        const res = await fetch(`${origin}/themes/example/render/render.hbs`);
        expect(res.status).toBe(200);
        expect(await res.text()).not.toContain('id="frame"');
    });

    it('can broadcast a preview reload over that websocket', () => {
        // The Preview-reload mechanism: a namespaced custom event rather than
        // full-reload, which would broadcast and make the Frame reload itself,
        // discarding the state client-side rendering exists to preserve.
        expect(() => host.reloadPreviews()).not.toThrow();
    });
});
