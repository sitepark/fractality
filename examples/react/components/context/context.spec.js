import { context } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';

describe('tree', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    context(fractality);
});
