import { renderTag } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';

describe('render-tag', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    renderTag(fractality);
});
