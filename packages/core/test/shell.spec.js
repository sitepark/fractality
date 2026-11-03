import path from 'path';
import os from 'os';

import fs from 'fs-extra';
import shell from '../src/shell';

describe('Shell', () => {
    let originalPwd;
    let tmpRoot;

    beforeEach(async () => {
        originalPwd = process.cwd();
        tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fractality-shell-'));
        await fs.ensureDir(path.join(tmpRoot, 'shelltest', 'nested-directory'));
        await fs.outputFile(path.join(tmpRoot, 'shelltest', 'empty-file.txt'), '');
        process.chdir(tmpRoot);
    });

    afterEach(async () => {
        // Ensure the current working directory is the same as when we started the test suite.
        process.chdir(originalPwd);
        await fs.remove(tmpRoot);
    });

    it('can change directory', () => {
        const cwd = process.cwd();
        shell.cd('shelltest');
        expect(process.cwd()).toBe(`${cwd}${path.sep}shelltest`);
    });

    it('does not throw if directory is not specified', () => {
        expect(() => shell.cd()).not.toThrow();
    });

    it('can create a file', async () => {
        shell.touch('test-file.md');
        const stats = await fs.stat(path.join(process.cwd(), 'test-file.md'));
        expect(stats.isFile()).toBe(true);
    });
});
