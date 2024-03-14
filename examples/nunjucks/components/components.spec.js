import { components } from '@fractality/adapter-tests';

import fractal from '../fractal.config.js';

describe('components', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    components(fractal);
});
