import { CONTRACT_VERSION } from '../contract/version.js';
import type { TreeNode, TreePayload } from '../contract/tree.js';
import { buildStatusTable, type StatusRoot, type StatusTable } from './status.js';
import { sanitiseTags } from './tags.js';
import {
    isCollection,
    isComponent,
    type SourceApp,
    type SourceComponent,
    type SourceTreeItem,
} from './source-types.js';

/**
 * Whether a component appears in the tree as a branch of its variants rather
 * than as a leaf. Mirrors the rule mandelbrot's navigation macro applies today:
 * a non-collated component with more than one visible variant expands.
 */
function expandsToVariants(component: SourceComponent): boolean {
    return !component.isCollated && component.variants().filter('isHidden', false).size > 1;
}

function walk(items: SourceTreeItem[], root: StatusRoot, statuses: StatusTable): TreeNode[] {
    const nodes: TreeNode[] = [];

    for (const item of items) {
        if (item.isHidden) continue;

        if (isCollection(item)) {
            const node: TreeNode = {
                handle: item.handle,
                label: item.label,
                isCollection: true,
                children: walk(item.items(), root, statuses),
            };
            if (item.isRoot) node.isRoot = true;
            nodes.push(node);
            continue;
        }

        const node: TreeNode = { handle: item.handle, label: item.label };

        const status = statuses.keyOf(root, item.status);
        if (status) node.status = status;
        const tags = sanitiseTags(item.tags);
        if (tags) node.tags = tags;

        if (isComponent(item) && expandsToVariants(item)) {
            node.children = item
                .variants()
                .filter('isHidden', false)
                .toArray()
                .map((variant) => {
                    const child: TreeNode = { handle: variant.handle, label: variant.label };
                    const variantStatus = statuses.keyOf(root, variant.status);
                    if (variantStatus) child.status = variantStatus;
                    return child;
                });
        }

        nodes.push(node);
    }

    return nodes;
}

/**
 * The whole navigation tree — one payload, fetched once and cached.
 *
 * Carries no `id`: it measured at 77% of the gzipped payload as a 32-character
 * incompressible hash, and `handle` already identifies every entity.
 */
export function buildTreePayload(app: SourceApp): TreePayload {
    const statuses = buildStatusTable(app);
    const assets = app.assets?.visible?.() ?? [];

    return {
        contractVersion: CONTRACT_VERSION,
        status: statuses.definitions,
        components: walk(app.components.items(), 'components', statuses),
        docs: walk(app.docs.items(), 'docs', statuses),
        assets: assets.map((asset) => ({
            handle: asset.handle ?? asset.name,
            label: asset.label ?? asset.name,
        })),
    };
}
