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

/**
 * Where a doc is served, below the docs root.
 *
 * The index page has an empty path and is routed as `index` rather than as the
 * bare docs root, so that one rule covers every doc: the Shell, the payload and
 * the nav link all derive from this, and none of them special-cases the root.
 *
 * Exported because the tree payload carries it too. A doc's URL is the one thing
 * `handle` does not determine — a handle is the file's own name, so two pages in
 * different directories can share one — so a navigation that derived a doc URL
 * from its handle would link to a page that does not exist.
 */
export const docRoutePath = (doc: Pick<SourceDoc, 'path'>): string => doc.path || 'index';

/** Every visible doc page, paired with the URL path it is served at. */
export function routedDocs(docs: SourceDoc[], docsRoute = '/docs'): Array<{ route: string; doc: SourceDoc }> {
    return docs.filter((doc) => !doc.isHidden).map((doc) => ({ route: `${docsRoute}/${docRoutePath(doc)}`, doc }));
}
