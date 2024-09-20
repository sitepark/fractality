import { renderTag } from '@fractality/adapter-tests';

import fractality from '../../fractality.config.js';

describe('render-tag', () => {
    beforeEach(async () => {
        await fractality.load();
    });

    renderTag(fractality);

    it('throws if specified handle is wrong', () => {
        return expect(async () => {
            return await fractality.components.find('@render-tag-comp-2--wrong-handle').render();
        }).rejects.toThrow('You must provide a valid component handle to the render tag.');
    });
});
