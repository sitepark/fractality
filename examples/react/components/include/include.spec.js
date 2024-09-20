import { include } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('include', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    include(fractality);
});
