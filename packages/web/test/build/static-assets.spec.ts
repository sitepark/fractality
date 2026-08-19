import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { copyStaticAssets } from '../../src/build/static-assets.js';

let root: string;
let dest: string;
let assets: string;

beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'fractality-static-'));
    dest = path.join(root, 'dist');
    assets = path.join(root, 'public');

    await mkdir(path.join(assets, 'css'), { recursive: true });
    await writeFile(path.join(assets, 'css', 'site.css'), 'body{}');
    await writeFile(path.join(assets, 'css', 'site.css.map'), '{}');
    await writeFile(path.join(assets, 'logo.svg'), '<svg/>');
});

afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
});

const listing = async (dir: string): Promise<string[]> =>
    (await readdir(dir, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
        .sort();

describe('copyStaticAssets', () => {
    it('copies a directory to its mount', async () => {
        const result = await copyStaticAssets([{ path: assets, mount: '/' }], { dest });

        expect(result.errors).toEqual([]);
        expect(await listing(dest)).toEqual(['css/site.css', 'css/site.css.map', 'logo.svg']);
    });

    it('copies each mount to its own subdirectory of the build', async () => {
        await copyStaticAssets([{ path: assets, mount: '/themes/mandelbrot' }], { dest });
        expect(await listing(path.join(dest, 'themes', 'mandelbrot'))).toContain('logo.svg');
    });

    it('reports a missing directory instead of throwing, and keeps going', async () => {
        // What a build hitting this used to do: reject, after every page,
        // payload and Preview had already been written. The mount is listed
        // first here deliberately — a failing one must not stop the rest.
        const missing = path.join(root, 'does-not-exist');

        const result = await copyStaticAssets(
            [
                { path: missing, mount: '/gone' },
                { path: assets, mount: '/public' },
            ],
            { dest },
        );

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]!.path).toBe(missing);
        expect(result.errors[0]!.mount).toBe('/gone');
        expect(result.copied.map((m) => m.mount)).toEqual(['/public']);
        expect(await listing(path.join(dest, 'public'))).toContain('logo.svg');
    });

    it('says which configuration to look at, rather than which syscall failed', async () => {
        const result = await copyStaticAssets([{ path: path.join(root, 'nope'), mount: '/x' }], { dest });
        expect(result.errors[0]!.message).toMatch(/does not exist/);
        expect(result.errors[0]!.message).toMatch(/web\.static\.path/);
    });

    it('applies web.builder.static.ignored', async () => {
        const result = await copyStaticAssets([{ path: assets, mount: '/' }], { dest, ignored: ['**/*.map'] });

        expect(result.errors).toEqual([]);
        expect(await listing(dest)).toEqual(['css/site.css', 'logo.svg']);
    });

    it('accepts every matcher shape the option always took', async () => {
        // Globs, regexes and predicates, singly or in an array — this is an
        // anymatch matcher, as it was in 0.x, not a glob list.
        const regex = await copyStaticAssets([{ path: assets, mount: '/re' }], { dest, ignored: /\.svg$/ });
        expect(await listing(path.join(dest, 're'))).not.toContain('logo.svg');
        expect(regex.errors).toEqual([]);

        await copyStaticAssets([{ path: assets, mount: '/fn' }], {
            dest,
            ignored: (file) => file.endsWith('.css'),
        });
        expect(await listing(path.join(dest, 'fn'))).toEqual(['css/site.css.map', 'logo.svg']);
    });

    it('copies everything when nothing is ignored', async () => {
        const result = await copyStaticAssets([{ path: assets, mount: '/' }], { dest, ignored: [] });
        expect(result.errors).toEqual([]);
        expect(await listing(dest)).toHaveLength(3);
    });
});
