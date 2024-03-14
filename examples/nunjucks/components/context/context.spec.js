import { context } from '@fractality/adapter-tests';

import fractal from '../../fractal.config.js';

describe('context', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    context(fractal);
});
