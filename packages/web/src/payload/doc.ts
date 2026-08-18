import { CONTRACT_VERSION } from '../contract/version.js';
import type { DocPayload } from '../contract/entity.js';
import type { StatusTable } from './status.js';
import type { SourceDoc } from './source-types.js';

/**
 * A documentation page.
 *
 * Note the status root is `docs`, not `components`: the two carry separate,
 * independently configurable status sets that happen to share key names, so
 * resolving a doc against the component set would silently mislabel it.
 */
export function buildDocPayload(doc: SourceDoc, statuses: StatusTable): DocPayload {
    const payload: DocPayload = {
        contractVersion: CONTRACT_VERSION,
        handle: doc.handle,
        label: doc.label,
        title: doc.title,
        path: doc.path,
        content: doc.content ?? '',
    };

    const status = statuses.keyOf('docs', doc.status);
    if (status) payload.status = status;

    return payload;
}

/** Every visible doc page, paired with the URL path it is served at. */
export function routedDocs(docs: SourceDoc[], docsRoute = '/docs'): Array<{ route: string; doc: SourceDoc }> {
    return docs
        .filter((doc) => !doc.isHidden)
        .map((doc) => ({
            // The index page has an empty path. It is routed as `/docs/index`
            // rather than bare `/docs` so that one rule covers every doc: the
            // Shell, the payload and the nav link are all derived from the same
            // route, and none of them has to special-case the root.
            route: `${docsRoute}/${doc.path || 'index'}`,
            doc,
        }));
}
