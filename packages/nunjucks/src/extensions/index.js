'use strict';

import _render from "./render.js";
import _view from "./view.js";
import _context from "./context.js";

export default function (fractal) {
    return {
        render: _render(fractal),
        view: _view(fractal),
        context: _context(fractal),
    };
};
