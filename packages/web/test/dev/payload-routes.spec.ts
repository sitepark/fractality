import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { create } from '../../../fractality/src/fractal.js';
import { payloadRoutes } from '../../src/dev/index.js';
import { writePayloads } from '../../src/payload/writer.js';
import { payloadPathFor } from '../../src/payload/paths.js';
import { entityHandles } from '../../src/build/routes.js';
import type { SourceApp } from '../../src/payload/source-types.js';
import type { IdleGateable } from '../../src/dev/gate.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', '..', 'examples', 'handlebars');

interface TestApp extends SourceApp, IdleGateable {
    components: SourceApp['components'] & { set(key: string, value: unknown): void };
    docs: SourceApp['docs'] & { set(key: string, value: unknown): void };
    load(): Promise<unknown>;
}

let app: TestApp;
let server: Server;
let origin: string;
let dest: string;

beforeAll(async () => {
    const instance = create() as unknown as TestApp;
    instance.components.set('path', path.join(example, 'components'));
    instance.docs.set('path', path.join(example, 'docs'));
    await instance.load();
    app = instance;

    const host = express();
    host.use(payloadRoutes({ app }));
    // Stands in for the Frame catch-all, which must be registered last: '*path'
    // matches everything, so anything registered after it is unreachable.
    host.use((_req, res) => res.status(404).type('text/html').send('<!-- shell -->'));

    server = createServer(host);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (typeof address === 'string' || address === null) throw new Error('no port');
    origin = `http://127.0.0.1:${address.port}`;

    dest = await mkdtemp(path.join(tmpdir(), 'fractality-symmetry-'));
    await writePayloads(app, { dest });
}, 30000);

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (dest) await rm(dest, { recursive: true, force: true });
});

const onDisk = async (urlPath: string): Promise<unknown> =>
    JSON.parse(await readFile(path.join(dest, urlPath.replace(/^\//, '')), 'utf8'));

describe('payloadRoutes', () => {
    it('serves the tree payload', async () => {
        const res = await fetch(`${origin}/tree.json`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        const tree = (await res.json()) as { components: unknown[] };
        expect(tree.components.length).toBeGreaterThan(0);
    });

    it('serves exactly what the static build writes, at the same url', async () => {
        // The symmetry that makes one client work in both modes. If these ever
        // diverge, the client has to know which mode it is in — which is the
        // thing the addressing rule exists to avoid.
        for (const urlPath of [
            '/tree.json',
            payloadPathFor('/components/detail/render'),
            payloadPathFor('/components/detail/render', 'notes'),
            payloadPathFor('/components/detail/render', 'context'),
            payloadPathFor('/components/detail/render', 'view'),
        ]) {
            const served = await (await fetch(`${origin}${urlPath}`)).json();
            expect(served).toEqual(await onDisk(urlPath));
        }
    });

    it('answers a variant route with the owning component, as the build does', async () => {
        const variant = entityHandles(app).find((h) => h.includes('--'))!;
        const urlPath = payloadPathFor(`/components/detail/${variant}`);
        const served = (await (await fetch(`${origin}${urlPath}`)).json()) as { handle: string };
        expect(variant.startsWith(served.handle)).toBe(true);
        expect(served).toEqual(await onDisk(urlPath));
    });

    it('falls through to the Frame for an unknown handle rather than erroring', async () => {
        // A deep link to something that no longer exists is the Frame's problem
        // to report, not a 500 from the data layer.
        const res = await fetch(`${origin}/components/detail/does-not-exist.json`);
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('text/html');
    });

    it('falls through for an unknown panel', async () => {
        const res = await fetch(`${origin}/components/detail/render.bogus.json`);
        expect(res.status).toBe(404);
    });

    it('does not intercept the html route it shares a prefix with', async () => {
        const res = await fetch(`${origin}/components/detail/render.html`);
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('text/html');
    });

    it('waits for an in-progress rebuild before answering', async () => {
        // ADR 0001's guarantee, which the payload endpoints need as much as the
        // page routes did: a rebuild publishes entities before their context has
        // resolved, so an ungated read can serve a half-built tree.
        let released = false;
        // Object.create rather than a spread: the app's members come from
        // mixwith class factories and live on the prototype, so spreading
        // produces an object missing almost all of them.
        const gated = Object.create(app) as TestApp;
        Object.defineProperty(gated, 'whenIdle', {
            value: () =>
                new Promise<void>((resolve) =>
                    setTimeout(() => {
                        released = true;
                        resolve();
                    }, 25),
                ),
        });

        const host = express();
        host.use(payloadRoutes({ app: gated }));
        const local = createServer(host);
        await new Promise<void>((resolve) => local.listen(0, resolve));
        const address = local.address();
        if (typeof address === 'string' || address === null) throw new Error('no port');

        const res = await fetch(`http://127.0.0.1:${address.port}/tree.json`);
        expect(res.status).toBe(200);
        expect(released).toBe(true);

        await new Promise<void>((resolve) => local.close(() => resolve()));
    });
});
