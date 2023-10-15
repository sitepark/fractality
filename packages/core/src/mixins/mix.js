'use strict';

import _ from 'lodash';
import { mix } from 'mixwith';

class Base {
    constructor() {
        Object.defineProperty(this, '_mixedIn', {
            enumerable: false,
            configurable: false,
            writable: true,
            value: [],
        });
    }

    hasMixedIn(name) {
        return _.includes(this._mixedIn, name);
    }

    addMixedIn(name) {
        this._mixedIn.push(name);
        this._mixedIn = _.uniq(this._mixedIn);
    }
}

export default function () {
    const mixer = mix(Base);
    return mixer.with.apply(mixer, Array.from(arguments));
}
