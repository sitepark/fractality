import { Log } from '@fractality/core';

import DocSource from '../../../src/api/docs/source.js';
import { create } from '../../../src/fractal';

describe('DocSource', () => {
    let docs;
    const app = create();

    beforeEach(() => {
        docs = new DocSource(app);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('.toc()', () => {
        const page = {
            filePath: 'page.md',
            getContent: () => Promise.resolve('# Intro\n\n## Usage'),
        };

        // Runs first: the warning is only emitted once per process.
        it('warns once that it is deprecated', async () => {
            const warn = vi.spyOn(Log, 'warn');
            await docs.toc(page);
            await docs.toc(page);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
        });

        it('returns the headings of the page', async () => {
            const toc = await docs.toc(page, 2);
            expect(toc.map((heading) => heading.id)).toEqual(['intro', 'usage']);
        });
    });
});
