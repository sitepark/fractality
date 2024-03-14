'use strict';

import _ from 'lodash';
import { utils } from '@fractality/core';

export default function (app, engine) {
    return {
        name: 'path',
        value(path, req) {
            req = req || this.lookup('request');
            return engine.env === 'server'
                ? path
                : utils.relUrlPath(path, _.get(req, 'path', '/'), app.web.get('builder.urls'));
        },
    };
}
