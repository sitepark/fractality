import { render } from '@fractality/adapter-tests';

import fractality from '../../fractal.config.js';

describe('render', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    render(fractality);
});
