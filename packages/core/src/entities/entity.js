'use strict';

import _ from 'lodash';
import EntityMixin from '../mixins/entity.js';
import Heritable from '../mixins/heritable.js';
import mix from '../mixins/mix.js';

export default class Entity extends mix(Heritable, EntityMixin) {
    constructor(name, config, parent) {
        super();
        this.isEntity = true;
        this._contextData = {};
        this._hasResolvedContext = false;
        this.initEntity(name, config, parent);
        this.setHeritable(parent);

        Object.defineProperty(this, 'status', {
            enumerable: true,
            get() {
                return this.source.statusInfo(this.getProp('status'));
            },
        });

        this.setProps(config);
    }

    getResolvedContext() {
        return this.source.resolve(this.context);
    }

    hasContext() {
        return this.getResolvedContext().then((context) => Object.keys(context).length);
    }

    setContext(data) {
        this._contextData = data;
        this._hasResolvedContext = true;
    }

    getContext() {
        return _.clone(this._contextData);
    }

    toJSON() {
        const self = super.toJSON();
        self.isEntity = true;
        return self;
    }

    static defineProperty(key, opts) {
        if (_.isPlainObject(opts)) {
            Object.defineProperty(this.prototype, key, opts);
        } else {
            Object.defineProperty(this.prototype, key, {
                enumerable: true,
                writable: true,
                value: opts,
            });
        }
    }
}
