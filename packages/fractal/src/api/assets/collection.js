'use strict';

import FileCollection from '../files/collection.js';

export default class AssetCollection extends FileCollection {
    constructor(config, items) {
        super(config, items);
    }

    assets() {
        return this.newSelf(this.toArray().filter((i) => i.isAsset));
    }

    toVinylArray() {
        return this.filter('isAsset')
            .flatten()
            .map((asset) => asset.toVinyl())
            .toArray();
    }
}
