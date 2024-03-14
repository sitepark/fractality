import { docs } from '@fractality/adapter-tests';

import fractal from '../fractal.config.js';

describe('docs', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    docs(fractal);
});
