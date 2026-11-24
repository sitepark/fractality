import { utils } from '@fractality/core';
import Handlebars from 'handlebars';
import _ from 'lodash';

export default function (fractality) {
    // Handlebars appends its options object, so args is [handle, context?, options].
    return function render(...args) {
        const handle = args[0];
        let context;
        const source = fractality.components;
        const options = args[args.length - 1];
        const opts = options.hash;
        const root = options.data.root;
        const merge = opts.merge || false;
        if (args.length >= 3) {
            context = args[1];
        } else if (args.length === 2) {
            context = null;
        } else if (args.length === 1) {
            throw new Error(`You must provide a component handle to the render helper.`);
        }
        const entity = source.find(handle);
        if (!entity) {
            throw new Error(`Could not render component '${handle}' - component not found.`);
        }
        const defaultContext = _.cloneDeep(
            entity.isComponent ? entity.variants().default().getContext() : entity.getContext(),
        );
        if (!context) {
            context = defaultContext;
        } else if (merge) {
            context = utils.defaultsDeep(context, defaultContext);
        }

        // fix env for rendered components
        const env = JSON.parse(JSON.stringify(root._env));
        _.set(context, '_env', env);

        return entity.render(context).then((html) => new Handlebars.SafeString(html));
    };
}
