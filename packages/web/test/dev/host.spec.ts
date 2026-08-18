import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { create } from '../../../fractality/src/fractal.js';
import { createDevHost, type DevHost } from '../../src/dev/index.js';
import { payloadPathFor } from '../../src/payload/paths.js';
import type { SourceApp } from '../../src/payload/source-types.js';
import type { IdleGateable } from '../../src/dev/gate.js';
import type { Watchable } from '../../src/payload/source-types.js';
import type { FrctlConfig } from '../../src/shell/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

interface TestApp extends SourceApp, IdleGateable, Watchable {
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
let instance: TestApp & { emit(event: string, ...args: unknown[]): unknown };

beforeAll(async () => {
    instance = create() as unknown as TestApp & { emit(event: string, ...args: unknown[]): unknown };
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

    it('gives a Preview its own live-reload subscription', async () => {
        // A Preview can be opened as a window of its own, outside the Frame.
        // browser-sync used to inject an equivalent into everything it served;
        // without this a detached Preview would never reload.
        const html = await fetch(`${origin}/components/preview/render`).then((r) => r.text());
        expect(html).toContain('EventSource');
        expect(html).toContain(host.liveReloadRoute);
    });

    it('leaves the render document as bare component markup', async () => {
        // The Browser's HTML panel reads this route as data and shows it to the
        // user as their own component's output. An injected subscription script
        // would appear in that panel as though they had written it.
        const html = await fetch(`${origin}/components/render/render`).then((r) => r.text());
        expect(html).not.toContain('EventSource');
        expect(html).not.toContain('/@vite/client');
    });

    it('still keeps Vite out of the Preview', async () => {
        // The injected script is ours, not a bundler's: the user's templates
        // must not enter Vite's module graph.
        const html = await fetch(`${origin}/components/preview/render`).then((r) => r.text());
        expect(html).not.toContain('/@vite/client');
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

    it('opens a live-reload stream the Frame can subscribe to', async () => {
        const res = await fetch(`${origin}${host.liveReloadRoute}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');

        const reader = res.body!.getReader();
        const first = new TextDecoder().decode((await reader.read()).value);
        expect(first).toContain('event: connected');
        await reader.cancel();
    });

    it('tells subscribers when the library is rebuilt', async () => {
        // The wiring that was missing: the host had a broadcast method and
        // nothing ever called it, so an edit to a template or to context data
        // never reached the Frame.
        const res = await fetch(`${origin}${host.liveReloadRoute}`);
        const reader = res.body!.getReader();
        await reader.read(); // the connected frame

        instance.emit('source:updated');

        const next = new TextDecoder().decode((await reader.read()).value);
        expect(next).toContain('event: rebuild');
        await reader.cancel();
    });
});

describe('the Shell is re-read per request', () => {
    it('picks up a rebuilt theme without a server restart', async () => {
        // The Shell used to be captured at start-up. Rebuilding the theme
        // changes its bundle hash, so the served Shell went on pointing at a
        // file that no longer existed and the Frame stopped loading at all —
        // which looks like every feature breaking at once.
        const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
        const { tmpdir } = await import('node:os');

        const dir = await mkdtemp(path.join(tmpdir(), 'fractality-shell-'));
        const file = path.join(dir, 'index.html');
        await writeFile(file, '<html><head></head><body><div id="frame">v1</div></body></html>');

        const local = await createDevHost({
            app: instance,
            shell: () => readFile(file, 'utf8'),
            config,
            root: example,
        });
        const port = await local.listen();

        expect(await (await fetch(`http://127.0.0.1:${port}/anything`)).text()).toContain('v1');

        await writeFile(file, '<html><head></head><body><div id="frame">v2</div></body></html>');
        expect(await (await fetch(`http://127.0.0.1:${port}/anything`)).text()).toContain('v2');

        await local.close();
        await rm(dir, { recursive: true, force: true });
    }, 30000);
});
