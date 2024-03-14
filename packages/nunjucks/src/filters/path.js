'use strict';

import _ from 'lodash';
import { utils } from '@fractality/core';

export default function (fractal) {
    return function (path) {
        let env = this.lookup('_env');
        let request = env.request || this.lookup('_request') || this.ctx.request;

        return !env || env.server
            ? path
            : utils.relUrlPath(path, _.get(request, 'path', '/'), fractal.web.get('builder.urls'));
    };
}
