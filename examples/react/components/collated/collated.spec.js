import { collated } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';

describe('collated', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    collated(fractality);
});
