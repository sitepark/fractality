import { entities } from '@fractality/core';
const EntityCollection = entities.Collection;

export default class ComponentCollection extends EntityCollection {
    constructor(config, items, parent) {
        super(config.name, config, items, parent);
    }

    find(...args) {
        return this.source.find.apply(this, args);
    }

    components() {
        return super.entities();
    }

    variants(...args) {
        return this.source.variants.apply(this, args);
    }
}
