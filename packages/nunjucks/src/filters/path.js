import _ from 'lodash';
import { utils } from '@fractality/core';

export default function (fractality) {
    return function (path) {
        const env = this.lookup('_env');
        const request = env.request || this.lookup('_request') || this.ctx.request;

        return !env || env.server
            ? path
            : utils.relUrlPath(path, _.get(request, 'path', '/'), fractality.web.get('builder.urls'));
    };
}
