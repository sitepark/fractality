import { components } from '@frctl/adapter-tests';

import fractal from '../fractal.config.js';

describe('components', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    components(fractal);
});
