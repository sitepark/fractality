'use strict';
import render from './render.js';
import context from './context.js';
import contextData from './context-data.js';
import view from './view.js';
import path from './path.js';

export default function (fractal) {
    return {
        render: render(fractal),
        context: context(fractal),
        contextData: contextData(fractal),
        view: view(fractal),
        path: path(fractal),
    };
};
