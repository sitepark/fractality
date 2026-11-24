import { utils } from '@fractality/core';
import _ from 'lodash';

export default function (fractality) {
    // Handlebars appends its options object, so args is [handle, context?, options].
    return function render(...args) {
        const handle = args[0];
        let context;
        const source = fractality.components;
        if (args.length >= 3) {
            context = args[1];
        } else if (args.length === 2) {
            context = null;
        } else if (args.length === 1) {
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
