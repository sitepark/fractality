import Path from 'path';
import { fileURLToPath } from 'url';

import reactAdapterFactory from '../src/adapter.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function fakeSource() {
    return { on() {} };
}

function fakeApp() {
    return { config: () => ({}) };
}

describe('ReactAdapter', () => {
    describe('.render()', () => {
        it('returns a rejected promise, rather than throwing synchronously, when the component throws while rendering', () => {
            const adapter = reactAdapterFactory({}).register(fakeSource(), fakeApp());
            const brokenComponentPath = Path.join(__dirname, 'fixtures', 'broken.jsx');

            let result;
            let threwSynchronously = false;
            try {
                result = adapter.render(brokenComponentPath, '', {}, {});
            } catch {
                threwSynchronously = true;
            }

            expect(threwSynchronously).toBe(false);
            return expect(result).rejects.toThrow('boom');
        });
    });
});
