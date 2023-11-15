'use strict';

export default function () {
    return {
        name: 'isError',
        filter(item) {
            return item instanceof Error;
        },
    };
}
