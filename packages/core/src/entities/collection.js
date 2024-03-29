'use strict';

import mix from '../mixins/mix.js';
import Collection from '../mixins/collection.js';
import Heritable from '../mixins/heritable.js';
import Entity from '../mixins/entity.js';

export default class EntityCollection extends mix(Heritable, Collection, Entity) {
    constructor(name, config, items, parent) {
        super();
        this.initEntity(name, config, parent);
        this.initCollection(config);
        this.setHeritable(parent);
        this.setItems(items);

        Object.defineProperty(this, 'status', {
            enumerable: true,
            get() {
                return this.source.statusInfo(this.getProp('status'));
            },
        });

        this.setProps(config);
    }

    /**
     * Return a new collection that only includes
     * non-collection-type items
     * @return {Collection}
     */
    entities() {
        return this.newSelf(this.toArray().filter((i) => !i.isCollection));
    }

    toJSON() {
        const self = super.toJSON();
        self.isCollection = true;
        self.isRoot = this.isRoot;
        self.items = this.toArray().map((i) => (i.toJSON ? i.toJSON() : i));
        return self;
    }
}
