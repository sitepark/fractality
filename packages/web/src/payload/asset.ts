import { CONTRACT_VERSION } from '../contract/version.js';
import type { AssetPayload } from '../contract/entity.js';
import type { SourceApp, SourceAsset } from './source-types.js';

/**
 * An asset source and the files it contains.
 *
 * File URLs come from `web.assets.mount`, which is where the files are actually
 * served — the same value the template layer's `url` filter used. Deriving them
 * from the source's own path would produce links to somewhere nothing is served.
 */
export function buildAssetPayload(asset: SourceAsset, mount: string): AssetPayload {
    const prefix = `/${mount.replace(/^\/+|\/+$/g, '')}`;

    return {
        contractVersion: CONTRACT_VERSION,
        name: asset.name,
        label: asset.label ?? asset.name,
        title: asset.title ?? asset.label ?? asset.name,
        notes: asset.notes ?? null,
        files: asset
            .flatten()
            .items()
            .map((file) => ({
                name: file.base,
                path: file.relPath,
                url: `${prefix}/${file.srcPath.replace(/^\/+/, '')}`,
                ext: file.ext,
                size: file.stat?.size ?? 0,
            })),
    };
}

export const assetsMount = (app: SourceApp): string => String(app.get('web.assets.mount') ?? 'assets');

/** Every visible asset source, paired with the route it is served at. */
export function routedAssets(app: SourceApp, assetsRoute = '/assets'): Array<{ route: string; asset: SourceAsset }> {
    return (app.assets?.visible?.() ?? [])
        .filter((asset) => !asset.isHidden)
        .map((asset) => ({ route: `${assetsRoute}/${asset.name}`, asset }));
}
