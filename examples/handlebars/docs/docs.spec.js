import { docs } from '@frctl/adapter-tests';

import fractal from '../fractal.config.js';

describe('docs', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    docs(fractal);
});
