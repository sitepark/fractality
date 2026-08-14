'use strict';

import { Readable } from 'readable-stream';

export default class PromiseStream extends Readable {
    constructor(p) {
        super({ objectMode: true });
        this._settled = false;
        this._data = Promise.resolve(p).then((items) => {
            items.forEach((i) => this.push(i));
            this._settled = true;
        });
        this._data.catch((err) => {
            this._settled = true;
            this.emit('error', err);
        });
    }

    _read() {
        if (this._settled) {
            this.push(null);
        }
    }
}
