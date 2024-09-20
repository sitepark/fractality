'use strict';

import Handlebars from 'handlebars';

export default function (fractality) {
    return function context(handle) {
        const source = fractality.components;
        const entity = source.find(handle);
        if (!entity) {
            throw new Error(`Could not get context for component '${handle}' - component not found.`);
        }
        const context = entity.isComponent ? entity.variants().default().getContext() : entity.getContext();
        return new Handlebars.SafeString(JSON.stringify(context, null, 4));
    };
}
