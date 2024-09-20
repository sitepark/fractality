import { tree } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';

describe('tree', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    tree(fractality);
});
