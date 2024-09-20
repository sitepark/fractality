'use strict';

import _render from './render.js';
import _view from './view.js';
import _context from './context.js';

export default function (fractality) {
    return {
        render: _render(fractality),
        view: _view(fractality),
        context: _context(fractality),
    };
}
