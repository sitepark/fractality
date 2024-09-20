import { docs } from '@fractality/adapter-tests';

import fractality from '../fractal.config.js';

describe('docs', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    docs(fractality);
});
