'use strict';
import { entities } from '@frctl/core';
const EntityCollection = entities.Collection;

export default class DocCollection extends EntityCollection {
    constructor(config, items, parent) {
        super(config.name, config, items, parent);
    }

    pages() {
        return super.entities();
    }
}
