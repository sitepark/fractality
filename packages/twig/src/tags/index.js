'use strict';

import render from './render.js';

export default function (fractality, config) {
    return {
        render: render(fractality, config),
    };
}
