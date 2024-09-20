import { components } from '@fractality/adapter-tests';

import fractality from '../fractality.config.js';

describe('components', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    components(fractality);
});
