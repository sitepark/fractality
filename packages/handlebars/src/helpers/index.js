'use strict';
import render from './render.js';
import context from './context.js';
import contextData from './context-data.js';
import view from './view.js';
import path from './path.js';

export default function (fractality) {
    return {
        render: render(fractality),
        context: context(fractality),
        contextData: contextData(fractality),
        view: view(fractality),
        path: path(fractality),
    };
}
