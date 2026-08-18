import { createServer, type Server } from 'node:http';
import express from 'express';
import { EventEmitter } from 'node:events';

import { liveReloadRoutes, LIVE_RELOAD_ROUTE } from '../../src/dev/live-reload.js';
import type { Watchable } from '../../src/payload/source-types.js';

let server: Server;
let origin: string;
let app: EventEmitter & Watchable;

beforeAll(async () => {
    app = Object.assign(new EventEmitter(), { watch: () => undefined }) as EventEmitter & Watchable;
    const host = express();
    host.use(liveReloadRoutes({ app }));
    server = createServer(host);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (typeof address === 'string' || address === null) throw new Error('no port');
    origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
    // The endpoint holds connections open on purpose, so close() alone waits
    // forever for streams that are never going to end by themselves.
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

const readEvent = async (reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> =>
    new TextDecoder().decode((await reader.read()).value);

describe('liveReloadRoutes', () => {
    it('opens an event stream and greets the subscriber', async () => {
        const res = await fetch(`${origin}${LIVE_RELOAD_ROUTE}`);
        expect(res.headers.get('content-type')).toContain('text/event-stream');
        const reader = res.body!.getReader();
        expect(await readEvent(reader)).toContain('event: connected');
        await reader.cancel();
    });

    it('forwards a rebuild to every subscriber', async () => {
        const [a, b] = await Promise.all([
            fetch(`${origin}${LIVE_RELOAD_ROUTE}`),
            fetch(`${origin}${LIVE_RELOAD_ROUTE}`),
        ]);
        const readers = [a.body!.getReader(), b.body!.getReader()];
        await Promise.all(readers.map(readEvent));

        app.emit('source:updated');

        for (const reader of readers) {
            expect(await readEvent(reader)).toContain('event: rebuild');
            await reader.cancel();
        }
    });

    it('stops writing to a subscriber that has gone away', async () => {
        const res = await fetch(`${origin}${LIVE_RELOAD_ROUTE}`);
        const reader = res.body!.getReader();
        await readEvent(reader);
        await reader.cancel();

        // A rebuild after a client disconnects must not throw on a dead socket,
        // which would take the whole watcher callback down with it.
        expect(() => app.emit('source:updated')).not.toThrow();
    });
});
