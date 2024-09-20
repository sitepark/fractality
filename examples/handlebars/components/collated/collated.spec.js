import { collated } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('collated', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    collated(fractality);
});
