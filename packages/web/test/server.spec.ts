import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import { create } from '../../fractality/src/fractal.js';
import Server from '../src/server.js';
import Theme from '../src/theme.js';
import { CONTRACT_VERSION } from '../src/contract/index.js';
import { DEVTOOLS_ROUTE } from '../src/dev/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const example = path.join(__dirname, '..', '..', '..', 'examples', 'handlebars');

type App = ConstructorParameters<typeof Server>[2] & {
    components: { set(key: string, value: unknown): void };
    docs: { set(key: string, value: unknown): void };
};

let dir: string;
let theme: Theme;

beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'fractality-server-'));
    const shell = path.join(dir, 'index.html');
    await writeFile(shell, '<html><head></head><body><div id="frame"></div></body></html>');
    theme = new Theme().setContractVersion(CONTRACT_VERSION).addStatic(dir, '/frame').setShell(shell);
});

afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('Server', () => {
    describe('.start()', () => {
        async function startServer(config: ConstructorParameters<typeof Server>[1]): Promise<Server> {
            const app = create() as unknown as App;
            app.components.set('path', path.join(example, 'components'));
            app.docs.set('path', path.join(example, 'docs'));
            const server = new Server(theme, { watch: false, ...config }, app);
            await server.start();
            return server;
        }

        function boundAddress(server: Server): string {
            const address = (
                server as unknown as { _host: { server: { address(): AddressInfo } } }
            )._host.server.address();
            return address.address;
        }

        it('binds the configured host, the same address the free port was checked on', async () => {
            const server = await startServer({ host: '127.0.0.1' });
            try {
                expect(boundAddress(server)).toBe('127.0.0.1');
                expect(server.urls.server).toBe(`http://127.0.0.1:${server.port}`);
            } finally {
                await server.stop();
            }
        }, 30000);

        it('binds the wildcard address when no host is configured', async () => {
            const server = await startServer({});
            try {
                expect(['::', '0.0.0.0']).toContain(boundAddress(server));
                expect(server.urls.server).toBe(`http://localhost:${server.port}`);
            } finally {
                await server.stop();
            }
        }, 30000);
    });

    describe('Chrome DevTools workspace route', () => {
        const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

        async function fetchWorkspace(
            config: ConstructorParameters<typeof Server>[1],
            configPath: string | null,
        ): Promise<{ type: string | null; body: { workspace: { root: string; uuid: string } } | null }> {
            const app = create() as unknown as App;
            app.components.set('path', path.join(example, 'components'));
            app.docs.set('path', path.join(example, 'docs'));
            // Stands in for the config file `fractality start` would have loaded.
            Object.defineProperty(app, 'cli', { value: { configPath } });
            const server = new Server(theme, { watch: false, host: '127.0.0.1', ...config }, app);
            await server.start();
            try {
                const res = await fetch(`${server.urls.server}${DEVTOOLS_ROUTE}`);
                const type = res.headers.get('content-type');
                return { type, body: type?.startsWith('application/json') ? await res.json() : null };
            } finally {
                await server.stop();
            }
        }

        it('serves the directory of the config file as root, with a v4-formatted uuid', async () => {
            const { body } = await fetchWorkspace({}, '/projects/styleguide/fractality.config.js');
            expect(body?.workspace.root).toBe('/projects/styleguide');
            expect(body?.workspace.uuid).toMatch(uuidV4);
        }, 30000);

        it('falls back to the working directory when no config file was loaded', async () => {
            const { body } = await fetchWorkspace({}, null);
            expect(body?.workspace.root).toBe(process.cwd());
        }, 30000);

        it('derives the uuid from the root, so it is stable across restarts', async () => {
            const first = await fetchWorkspace({}, '/projects/styleguide/fractality.config.js');
            const second = await fetchWorkspace({}, '/projects/styleguide/fractality.config.js');
            const other = await fetchWorkspace({}, '/projects/other/fractality.config.js');
            expect(second.body?.workspace.uuid).toBe(first.body?.workspace.uuid);
            expect(other.body?.workspace.uuid).not.toBe(first.body?.workspace.uuid);
        }, 30000);

        it('is not served when disabled via the devtools option', async () => {
            const { type } = await fetchWorkspace({ devtools: false }, null);
            // The Frame catch-all answers instead, with the Shell.
            expect(type).toMatch(/^text\/html/);
        }, 30000);
    });
});
