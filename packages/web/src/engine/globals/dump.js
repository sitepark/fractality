'use strict';

export default function () {
    return {
        name: 'dump',
        value(obj, preformat) {
            preformat = preformat === false ? false : true;
            const output = JSON.stringify(obj, null, 4);
            return preformat ? '<pre>' + output + '</pre>' : output;
        },
    };
}
