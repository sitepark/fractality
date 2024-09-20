import { path } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('path', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    path(fractality);
});
