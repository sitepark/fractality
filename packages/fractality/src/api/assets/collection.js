import FileCollection from '../files/collection.js';

export default class AssetCollection extends FileCollection {
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
