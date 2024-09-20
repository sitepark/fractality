'use strict';

import _ from 'lodash';
import { utils } from '@fractality/core';

export default function (fractality) {
    return function (path) {
        let env = this.lookup('_env');
        let request = env.request || this.lookup('_request') || this.ctx.request;

        return !env || env.server
            ? path
            : utils.relUrlPath(path, _.get(request, 'path', '/'), fractality.web.get('builder.urls'));
    };
}
