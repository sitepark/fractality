import { notes } from '@frctl/adapter-tests';

import fractal from '../../fractal.config.js';

describe('notes', () => {
    beforeEach(async () => {
        await fractal.load();
    });

    notes(fractal);
});
