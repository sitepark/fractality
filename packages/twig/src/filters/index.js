'use strict';

import pathFilter from './path.js';

export default function (fractality) {
    return {
        path: pathFilter(fractality),
    };
}
