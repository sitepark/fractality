'use strict';

import pathFilter from './path.js';

export default function (fractal) {
    return {
        path: pathFilter(fractal),
    };
}
