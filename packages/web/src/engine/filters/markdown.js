'use strict';

import { markdown } from "@frctl/core";

export default function () {
    return {
        name: 'markdown',
        filter: (str) => markdown(str),
    };
};
