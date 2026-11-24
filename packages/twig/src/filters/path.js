import _ from 'lodash';
import { utils } from '@fractality/core';

export default function (fractality) {
    return function (path) {
        const env = this.context._env;
        if (!env || env.server) {
            return path;
        }

        const request = env.request || this.context._request;
        return utils.relUrlPath(path, _.get(request, 'path', '/'), fractality.web.get('builder.urls'));
    };
}
