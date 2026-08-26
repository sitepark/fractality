'use strict';

import { Adapter } from '@fractality/core';
import Handlebars from 'handlebars';
import _ from 'lodash';
import path from 'path';
import promisedHbs from 'promised-handlebars';
import helpers from './helpers/index.js';
import partials from './partials/index.js';

class HandlebarsAdapter extends Adapter {
    constructor(hbs, source, app) {
        super(hbs, source);
        this._app = app;
        this.on('view:added', (view) => this.engine.registerPartial(view.handle, view.content));
        this.on('view:added', (view) =>
            this.engine.registerPartial(path.relative(source.get('path'), view.path), view.content),
        );
        this.on('view:removed', (view) => this.engine.unregisterPartial(view.handle));
        this.on('view:removed', (view) => this.engine.unregisterPartial(path.relative(source.get('path'), view.path)));
        this.on('view:updated', (view) => this.engine.registerPartial(view.handle, view.content));
        this.on('view:updated', (view) =>
            this.engine.registerPartial(path.relative(source.get('path'), view.path), view.content),
        );
    }

    get handlebars() {
        return this._engine;
    }

    render(path, str, context, meta) {
        meta = meta || {};
        setEnv('_self', meta.self, context);
        setEnv('_target', meta.target, context);
        setEnv('_env', meta.env, context);
        setEnv('_config', this._app.config(), context);
        const template = this.engine.compile(str);
        return this._resolve(template(context));
    }
}

function setEnv(key, value, context) {
    if (_.isUndefined(context[key]) && !_.isUndefined(value)) {
        context[key] = value;
    }
}

export default function (config) {
    config = config || {};

    return {
        register(source, app) {
            const hbs = promisedHbs(Handlebars, {
                Promise: Promise,
            });

            /*
             * invokePartial runs once per partial call. Resolving the entity means
             * walking the whole component tree (Collection#find), so on a large
             * library that walk is quadratic overall - it dominated build time.
             * Cache the lookup, keyed on the partial name.
             *
             * Cache the entity, not its toJSON(): the JSON is handed to templates
             * as `_self`, and a shared copy would let one template's write outlive
             * the render that made it. The clear is bound to app.components because
             * that is the source resolveSelf reads - `source` is a different source
             * when this adapter is registered as the docs engine.
             */
            const entityCache = new Map();
            for (const event of ['loaded', 'changed', 'updated']) {
                app.components.on(event, () => entityCache.clear());
            }

            const resolveSelf = (identifier) => {
                let entity;
                if (entityCache.has(identifier)) {
                    entity = entityCache.get(identifier);
                } else {
                    entity =
                        identifier.indexOf('@') === 0
                            ? app.components.find(identifier)
                            : app.components.find('viewPath', identifier);
                    entityCache.set(identifier, entity);
                }
                if (!entity) {
                    return null;
                }
                return entity.isComponent ? entity.variants().default().toJSON() : entity.toJSON();
            };

            const invokePartial = hbs.VM.invokePartial;
            hbs.VM.invokePartial = function () {
                const args = Array.from(arguments);
                const data = args[2].data;

                /*
                 * Previously: _.cloneDeep(data). The deep clone only existed so that
                 * setting data.root._self would not leak back into the caller — but it
                 * copied the entire context tree to do so. A shallow clone of the frame
                 * and of root isolates exactly that one assignment and matches what
                 * Handlebars itself does with createFrame.
                 */
                args[2].data = { ...data, root: { ...data.root, _self: resolveSelf(args[2].name) } };

                return invokePartial.apply(hbs.VM, args);
            };

            const adapter = new HandlebarsAdapter(hbs, source, app);

            if (!config.pristine) {
                _.each(helpers(app) || {}, function (helper, name) {
                    hbs.registerHelper(name, helper);
                });
                _.each(partials(app) || {}, function (partial, name) {
                    hbs.registerPartial(name, partial);
                });
            }

            _.each(config.helpers, function (helper, name) {
                hbs.registerHelper(name, helper);
            });
            _.each(config.partials, function (partial, name) {
                hbs.registerPartial(name, partial);
            });

            return adapter;
        },
    };
}
