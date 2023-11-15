'use strict';

import WebError from '../../error.js';

export default function () {
    return {
        name: 'throw',
        value(code, message) {
            code = code || 500;
            throw new WebError(code, message || `${code} error`);
        },
    };
}
