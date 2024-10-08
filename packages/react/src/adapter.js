'use strict';

import _ from 'lodash';
import React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import { Adapter, utils } from '@fractality/core';

import PathProvider from '../components/path-provider.js';
import clearModule from './clear-module.js';

import registerBabel from '@babel/register';
import importSync from 'import-sync';

/*
 * React Adapter
 * -------------
 */
class ReactAdapter extends Adapter {
    constructor(source, app, options) {
        super(null, source);
        this._app = app;

        if (options.renderMethod == 'renderToString') {
            this._renderMethod = ReactDOMServer.renderToString;
        } else {
            this._renderMethod = ReactDOMServer.renderToStaticMarkup;
        }

        this.options = options;
        this.nameCache = {};

        this.on('view:added', (view) => {
            // ensure that all component templates are required by this adapter first
            const component = requireModule(view.path);
            this.nameCache[view.handle] = component.name;
        });

        this.on('view:removed', (view) => {
            // remove from cache if component is deleted
            clearModule(view.path);
            delete this.nameCache[view.handle];
        });
        this.on('view:updated', (view) => {
            // update cache if component is updated
            clearModule(view.path);
            const component = requireModule(view.path);
            this.nameCache[view.handle] = component.name;
        });
    }

    getWrapperComponent(component) {
        if (typeof component === 'string' && component.startsWith('@')) {
            const comp = this._app.components.flatten().find(component);

            if (comp) {
                return requireModule(comp.viewPath);
            } else {
                console.error(`${component} not found!`);
            }
        }

        return component;
    }

    renderParentElements(children, meta) {
        const wrapperElements = [
            {
                component: PathProvider,
                props: {
                    get: (path) => this.getPath(path, meta),
                },
            },
            ...this.options.wrapperElements,
        ];

        return wrapperElements.reverse().reduce((currentElement, wrapperObject) => {
            const wrapperComponent = this.getWrapperComponent(wrapperObject.component);

            return React.createElement(wrapperComponent, wrapperObject.props, currentElement);
        }, children);
    }

    render(path, str, context, meta = {}) {
        setEnv('_self', meta.self, context);
        setEnv('_target', meta.target, context);
        setEnv('_env', meta.env, context);
        setEnv('_config', this._app.config(), context);

        const component = requireModule(path);

        if (this.options.ssr || meta.env.ssr || meta.self.meta.ssr) {
            const element = React.createElement(component, context);
            const parentElements = this.renderParentElements(element, meta);
            const html = this._renderMethod(parentElements);

            return Promise.resolve(html);
        }

        return Promise.resolve('');
    }

    renderLayout(path, str, context, meta = {}) {
        const adapter = {
            componentName: this.nameCache[`@${meta.target.handle}`],
        };
        setEnv('_adapter', adapter, context);
        setEnv('_self', meta.self, context);
        setEnv('_target', meta.target, context);
        setEnv('_env', meta.env, context);
        setEnv('_config', this._app.config(), context);

        const component = requireModule(path);
        const element = React.createElement(component, context);
        const parentElements = this.renderParentElements(element, meta);
        // DOCTYPE is not allowed to be a part of a React component, so it must be prepended here.
        const html = '<!DOCTYPE html>' + ReactDOMServer.renderToStaticMarkup(parentElements);

        return Promise.resolve(html);
    }

    getPath(assetPath, root) {
        const fractality = this._source._app;

        if (!root || !root.env || root.env.server) {
            return assetPath;
        }

        return utils.relUrlPath(
            assetPath,
            _.get(root.env.request || root.request, 'path', '/'),
            fractality.web.get('builder.urls'),
        );
    }
}

/**
 * set environment variables
 * @param {[type]} key     [description]
 * @param {[type]} value   [description]
 * @param {[type]} context [description]
 * @returns {void}
 */
function setEnv(key, value, context) {
    if (_.isUndefined(context[key]) && !_.isUndefined(value)) {
        context[key] = value;
    }
}

const DEFAULT_OPTIONS = {
    renderMethod: 'renderToString',
    ssr: true,
    wrapperElements: [],
    babelOptions: {
        presets: ['@babel/preset-react', '@babel/preset-env'],
    },
};

/*
 * Adapter factory
 */
export default function (config = {}) {
    return {
        register(source, app) {
            const options = utils.defaultsDeep(config, DEFAULT_OPTIONS);

            registerBabel(options.babelOptions);

            return new ReactAdapter(source, app, options);
        },
    };
}

const requireModule = (path) => {
    let component = importSync(path);

    return component.default || component;
};
