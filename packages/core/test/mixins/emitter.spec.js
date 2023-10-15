import mix from "../../src/mixins/mix";
import Tmp from '../../src/mixins/emitter';
const Emitter = mix(Tmp);

describe('Emitter', () => {
    let emitter;

    beforeEach(() => {
        emitter = new Emitter();
    });

    it('is an event emitter', () => {
        expect(typeof emitter.on).toBe('function');
        expect(typeof emitter.emit).toBe('function');
    });

    it('is mixed in', () => {
        expect(emitter.hasMixedIn('Emitter')).toBe(true);
    });
});
