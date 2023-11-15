'use strict';

import _ from "lodash";
import Log from "./log.js";
import { awaitProps } from "./utils.js"

export default {
    entity(entity) {
        if (entity.isComponent) {
            entity = entity.variants().default();
        }
        return entity;
    },

    context(context, source) {
        const self = this;

        function resolve(obj) {
            if (!obj) {
                return Promise.resolve(null);
            }

            if (_.isArray(obj)) {
                return Promise.all(_.map(obj, mapper));
            }
            return awaitProps(_.mapValues(obj, mapper));
        }

        function mapper(item) {
            if (item === undefined || item === null) {
                return Promise.resolve(null);
            }

            if (item.then) {
                return item;
            }

            if (_.isString(item) && _.startsWith(item, '\\@')) {
                return item.replace(/^\\@/, '@');
            }

            if (_.isString(item) && _.startsWith(item, '@@')) {
                const entity = source.find(item.substring(1));
                return resolve(entity.context).then((entityContext) => {
                    const fullRenderedComponent = source
                        .engine()
                        .render(entity.viewPath, entity.content, entityContext, {
                            self: entity.toJSON(),
                            env: {},
                        });
                    return fullRenderedComponent;
                });
            }

            if (_.isString(item) && _.startsWith(item, '@')) {
                const parts = item.split('.');
                const handle = parts.shift();
                let entity = source.find(handle);
                if (entity) {
                    entity = self.entity(entity);
                    if (entity._hasResolvedContext) {
                        let context = entity.getContext();
                        if (parts.length) {
                            return _.get(context, parts.join('.'), null);
                        }
                        return context;
                    } else {
                        return resolve(entity.context).then((entityContext) => {
                            let clonedContext = _.cloneDeep(entityContext);
                            if (parts.length) {
                                return _.get(clonedContext, parts.join('.'), null);
                            }
                            return clonedContext;
                        });
                    }
                }
                Log.warn(`Could not resolve context reference for ${item}`);
                return null;
            }

            if (_.isDate(item)) {
                return item.toJSON();
            }

            if (_.isArray(item) || _.isObject(item)) {
                return resolve(item);
            }

            return item;
        }

        return resolve(context).then((ctx) => _.cloneDeep(ctx));
    },
};
