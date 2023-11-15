'use strict';

export default function (app) {
    return {
        name: 'log',
        value(item, type) {
            app.cli.console[type || 'log'](item);
        },
    };
}
