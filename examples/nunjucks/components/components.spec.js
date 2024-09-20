import { components } from '@fractality/adapter-tests';

import fractality from '../fractal.config.js';

describe('components', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    components(fractality);
});
