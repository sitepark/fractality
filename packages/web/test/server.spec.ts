import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import { create } from '../../fractality/src/fractal.js';
import Server from '../src/server.js';
import Theme from '../src/theme.js';
import { CONTRACT_VERSION } from '../src/contract/index.js';

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
});
