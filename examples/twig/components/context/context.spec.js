import { context } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('tree', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    context(fractality);
});
