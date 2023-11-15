'use strict';

import render from './render.js';

export default function (fractal, config) {
    return {
        render: render(fractal, config),
    };
}
