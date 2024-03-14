import { include } from '@fractality/adapter-tests';

import fractal from '../../fractal.config.js';

describe('include', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    include(fractal);
});
