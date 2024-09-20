import { tree } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('tree', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    tree(fractality);
});
