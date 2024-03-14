'use strict';

import { markdown } from '@fractality/core';

export default function () {
    return {
        name: 'markdown',
        filter: (str) => markdown(str),
    };
}
