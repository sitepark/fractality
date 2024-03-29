'use strict';

import _ from 'lodash';
import yaml from 'js-yaml';

export default function () {
    return {
        name: 'format',
        filter(obj, format) {
            format = (format || 'json').toLowerCase();
            if (_.isString(obj)) {
                return obj;
            }
            if (obj instanceof Buffer) {
                return obj.toString('UTF-8');
            }
            if (format === 'yaml' || format === 'yml') {
                return yaml.dump(obj);
            }
            if (format === 'json') {
                return JSON.stringify(obj, null, 2);
            }
            throw new Error(`Unknown format: ${format}`);
        },
    };
}
