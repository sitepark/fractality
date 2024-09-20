import { context } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('context', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    context(fractality);
});
