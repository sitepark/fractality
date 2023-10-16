import path from "path";

import fs from "fs-extra";
import mock from "mock-fs";
import shell from "../src/shell";

describe('Shell', () => {
    let originalPwd;

    beforeEach(() => {
        originalPwd = process.cwd();
        mock({
            shelltest: {
                'nested-directory': {},
                'empty-file.txt': '',
            },
        });
    });

    afterEach(() => {
        // Ensure the current working directory is the same as when we started the test suite.
        process.cwd(originalPwd);
        // Reset the filesystem.
        mock.restore();
    });

    it('can change directory', () => {
        const cwd = process.cwd();
        shell.cd('shelltest');
        expect(process.cwd()).toBe(`${cwd}${path.sep}shelltest`);
    });

    it('does not throw if directory is not specified', () => {
        expect(() => shell.cd()).not.toThrow();
    });

    it.skip('can create a file', async () => {
        shell.touch('test-file.md');
        const stats = await fs.stat(path.join(process.cwd(), 'test-file.md'));
        expect(stats.isFile()).toBe(true);
    });
});
