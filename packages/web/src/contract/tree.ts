import type { Versioned } from './version.js';

/**
 * An entity's unique name within the library. The contract's only identifier:
 * it already carries every URL and `data-*` attribute.
 *
 * There is deliberately no `id` field anywhere in the tree — it was measured at
 * 77% of the gzipped tree payload (a 32-character hex hash, incompressible by
 * construction) while adding nothing `handle` does not already provide.
 * See docs/specs/client-rendered-frame.md §3.1.
 */
export type Handle = string;

/**
 * Key into {@link TreePayload.status}. Statuses are a small project-wide set,
 * so they are interned rather than repeated on every node.
 */
export type StatusKey = string;

export interface StatusDefinition {
    label: string;
    color: string;
}

/**
 * One node of the navigation tree. Carries only what the navigation needs to
 * draw and order it — every field costs once per entity in the library.
 */
export interface TreeNode {
    handle: Handle;
    label: string;
    /** Omitted when the entity has no status. */
    status?: StatusKey;
    /** Omitted when empty. */
    tags?: string[];
    /**
     * Where a documentation page is served, below the docs root — `guide/setup`,
     * or `index` for the index page. **Documentation nodes only.**
     *
     * The one thing `handle` does not determine: a doc's handle is its file's
     * name, so two pages in different directories can share one, and neither is
     * addressable by it. Components and assets have no such problem and carry
     * nothing here.
     */
    path?: string;
    /** Omitted for leaves. */
    children?: TreeNode[];
    /** Present only on collections. */
    isCollection?: true;
    /** Present only on root collections, which are pulled out of the tree. */
    isRoot?: true;
}

/**
 * The whole navigation tree, fetched once and cached. Three roots, one payload.
 */
export interface TreePayload extends Versioned {
    status: Record<StatusKey, StatusDefinition>;
    components: TreeNode[];
    docs: TreeNode[];
    assets: TreeNode[];
}
