import _ from 'lodash';
import { Mixin } from 'mixwith';
import { EventEmitter } from 'node:events';

export default Mixin((superclass) => {
    const Emitter = class extends superclass {
        constructor() {
            super();
            super.addMixedIn('Emitter');
        }
    };

    _.extend(Emitter.prototype, EventEmitter.prototype);

    return Emitter;
});
