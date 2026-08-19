import { createServer, type Server } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

    it('answers 404 for an unknown handle rather than erroring', async () => {
        // A payload that does not exist is a status, not a document. Falling
        // through to the Shell catch-all answered 200 with HTML, so a client got
        // a JSON parse error and could not tell a missing page from a broken
        // server.
        const res = await fetch(`${origin}/components/detail/does-not-exist.json`);
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('answers 404 for an unknown panel', async () => {
        const res = await fetch(`${origin}/components/detail/render.bogus.json`);
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('application/json');
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

describe('documentation pages below the docs root', () => {
    // Its own library and host: the example has one index page, and a single
    // path segment is exactly what used to work.
    let root: string;
    let nested: Server;
    let nestedOrigin: string;
    let dist: string;

    beforeAll(async () => {
        root = await mkdtemp(path.join(tmpdir(), 'fractality-nested-docs-'));
        await mkdir(path.join(root, 'guide'), { recursive: true });
        await writeFile(path.join(root, '01-index.md'), '# Overview\n');
        await writeFile(path.join(root, 'guide', 'getting-started.md'), '# Getting started\n');

        const instance = create() as unknown as TestApp;
        instance.docs.set('path', root);
        await instance.load();

        const host = express();
        host.use(payloadRoutes({ app: instance }));
        host.use((_req, res) => res.status(404).type('text/html').send('<!-- shell -->'));

        nested = createServer(host);
        await new Promise<void>((resolve) => nested.listen(0, resolve));
        const address = nested.address();
        if (typeof address === 'string' || address === null) throw new Error('no port');
        nestedOrigin = `http://127.0.0.1:${address.port}`;

        dist = await mkdtemp(path.join(tmpdir(), 'fractality-nested-dist-'));
        await writePayloads(instance, { dest: dist });
    }, 30000);

    afterAll(async () => {
        await new Promise<void>((resolve) => nested.close(() => resolve()));
        if (root) await rm(root, { recursive: true, force: true });
        if (dist) await rm(dist, { recursive: true, force: true });
    });

    it('serves a nested page, which a single-segment route could not match', async () => {
        // It fell through to the Frame catch-all instead, so the Frame parsed a
        // Shell as JSON and reported a syntax error where a page should be.
        const res = await fetch(`${nestedOrigin}${payloadPathFor('/docs/guide/getting-started')}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        const payload = (await res.json()) as { handle: string; path: string };
        expect(payload.path).toBe('guide/getting-started');
    });

    it('serves it at the url the static build writes it to', async () => {
        const urlPath = payloadPathFor('/docs/guide/getting-started');
        const served = await (await fetch(`${nestedOrigin}${urlPath}`)).json();
        const written = JSON.parse(await readFile(path.join(dist, urlPath.replace(/^\//, '')), 'utf8'));
        expect(served).toEqual(written);
    });

    it('still serves the index page', async () => {
        const res = await fetch(`${nestedOrigin}${payloadPathFor('/docs/index')}`);
        expect(res.status).toBe(200);
    });

    it('answers 404 for a path no page is served at', async () => {
        // `/docs/getting-started` is the handle-shaped url the navigation used to
        // build. Nothing is there, and the status says so.
        const res = await fetch(`${nestedOrigin}${payloadPathFor('/docs/getting-started')}`);
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('application/json');
    });
});
