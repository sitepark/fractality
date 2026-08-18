import type { TreeNode, TreePayload } from '@fractality/web/contract';

/**
 * Filters the tree to entities matching a query.
 *
 * Data-driven, where mandelbrot marked the rendered DOM with mark.js. Filtering
 * the source of truth means a collapsed collection cannot hide a match, which
 * the DOM approach could not guarantee.
 *
 * Matches on the fields the tree payload actually carries — handle, label and
 * tags. Anything beyond those is a change to the data contract rather than
 * something the Frame can decide on its own.
 */
function matches(node: TreeNode, query: string): boolean {
    if (node.label.toLowerCase().includes(query)) return true;
    if (node.handle.toLowerCase().includes(query)) return true;
    return (node.tags ?? []).some((tag) => tag.toLowerCase().includes(query));
}

function filterNodes(nodes: TreeNode[], query: string): TreeNode[] {
    const kept: TreeNode[] = [];

    for (const node of nodes) {
        const children = node.children ? filterNodes(node.children, query) : undefined;

        // A collection survives if anything inside it does. Keeping a collection
        // whose own name matches but whose children do not would show an empty
        // branch, which reads as a broken filter.
        if (children?.length) {
            kept.push({ ...node, children });
            continue;
        }

        if (!node.children && matches(node, query)) {
            kept.push(node);
        }
    }

    return kept;
}

export function filterTree(tree: TreePayload, query: string): TreePayload {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return tree;

    return {
        ...tree,
        components: filterNodes(tree.components, trimmed),
        docs: filterNodes(tree.docs, trimmed),
        assets: filterNodes(tree.assets, trimmed),
    };
}
