import { utils } from '@fractality/core';
import Handlebars from 'handlebars';
import _ from 'lodash';

export default function (fractality) {
    // Handlebars appends its options object as the last argument.
    return function staticPath(...args) {
        let path = args[0];
        const options = args[args.length - 1];
        const root = options.data.root;

        // TODO: what is this for?
        // Handlebars supports subexpressions, so this should not be necessary.
        // Other template adapters do not have this implemented either.
        // Remove in next major release if noone understands.
        if (path.includes('{{')) {
            const context = _.defaults(
                {},
                this,
                _.pickBy(root, (_item, key) => key.startsWith('_')),
            );
            const tpl = Handlebars.compile(path, {
                data: false,
            });
            path = tpl(context);
        }

        if (!root?._env || root._env.server) {
            return path;
        }

        return utils.relUrlPath(
            path,
            _.get(root._env.request || root._request, 'path', '/'),
            fractality.web.get('builder.urls'),
        );
    };
}
