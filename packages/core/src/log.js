'use strict';

import mix from "./mixins/mix.js";
import Emitter from "./mixins/emitter.js";

class Log extends mix(Emitter) {
    log(msg, data) {
        this.emit('log', msg, data);
    }

    write(msg, data) {
        this.emit('log', msg, data);
    }

    debug(msg, data) {
        this.emit('debug', msg, data);
    }

    success(msg, data) {
        this.emit('success', msg, data);
    }

    error(msg, data) {
        this.emit('error', msg, data);
    }

    warn(msg, data) {
        this.emit('warn', msg, data);
    }
}

export default new Log();
