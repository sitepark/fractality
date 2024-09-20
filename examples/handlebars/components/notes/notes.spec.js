import { notes } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';

describe('notes', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    notes(fractality);
});
