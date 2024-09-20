'use strict';

import { utils } from '@fractality/core';
import _ from 'lodash';

export default function (fractality) {
    return function render(handle) {
        let context;
        let source = fractality.components;
        if (arguments.length >= 3) {
            context = arguments[1];
        } else if (arguments.length == 2) {
            context = null;
        } else if (arguments.length == 1) {
            throw new Error(`You must provide a component handle to the withContext helper.`);
        }
        const entity = source.find(handle);
        if (!entity) {
            throw new Error(`Could not get context for component '${handle}' - component not found.`);
        }
        const defaultContext = _.cloneDeep(
            entity.isComponent ? entity.variants().default().getContext() : entity.getContext(),
        );

        return utils.defaultsDeep(context || {}, defaultContext);
    };
}
