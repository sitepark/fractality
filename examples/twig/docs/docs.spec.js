import { docs } from '@fractality/adapter-tests';

import fractality from '../fractality.config.js';

describe('docs', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    docs(fractality);
});
