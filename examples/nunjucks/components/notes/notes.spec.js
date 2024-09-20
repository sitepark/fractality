import { notes } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('notes', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    notes(fractality);
});
