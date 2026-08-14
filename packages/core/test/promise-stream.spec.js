import PromiseStream from '../src/promise-stream.js';

describe('PromiseStream', () => {
    it('can be constructed from a promise without throwing', () => {
        expect(() => new PromiseStream(Promise.resolve(['a', 'b']))).not.toThrow();
    });

    it('emits every item from the resolved array, then ends', async () => {
        const stream = new PromiseStream(Promise.resolve(['a', 'b', 'c']));
        const received = [];
        for await (const item of stream) {
            received.push(item);
        }
        expect(received).toEqual(['a', 'b', 'c']);
    });

    it('emits an error event when the promise rejects', async () => {
        const stream = new PromiseStream(Promise.reject(new Error('boom')));
        const err = await new Promise((resolve) => stream.on('error', resolve));
        expect(err.message).toEqual('boom');
    });
});
