import { include } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';

describe('include', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    include(fractality);
});
