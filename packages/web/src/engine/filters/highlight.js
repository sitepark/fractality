'use strict';

export default function (app) {
    return {
        name: 'highlight',
        filter: (str, lang) => app.get('web.highlighter')(str, lang),
    };
}
