'use strict';

export default function () {
    return {
        name: 'static',
        value(path) {
            return path;
        },
    };
}
