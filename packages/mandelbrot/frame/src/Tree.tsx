import { useCallback, useMemo, useState } from 'react';
import type { TreeNode, TreePayload } from '@fractality/web/contract';
import { StatusDot } from './Status.js';
import { read, write } from './storage.js';
import { CollapseIcon } from './Icons.js';
import { frctl } from './frctl.js';

export interface TreeProps {
    label: string;
    nodes: TreeNode[];
    statuses: TreePayload['status'];
    current: string;
    onNavigate: (href: string) => void;
    /** The whole node, not its handle: a doc's URL is its path. */
    hrefFor: (node: TreeNode) => string;
    /** Set while filtering, so matches inside collapsed collections stay visible. */
    forceOpen: boolean;
}

/**
 * The collections between the root and `target`.
 *
 * These are expanded by default: a tree that starts collapsed must still show
 * where you are, or a deep link opens on a nav that hides its own current item.
 */
export function pathTo(nodes: TreeNode[], target: string, trail: string[] = []): string[] | null {
    for (const node of nodes) {
        if (node.handle === target) return trail;
        if (node.children?.length) {
            const found = pathTo(node.children, target, [...trail, node.handle]);
            if (found) return found;
        }
    }
    return null;
}

/** Every collection handle in a tree, so "collapse all" can close them in one go. */
function collectionHandles(nodes: TreeNode[], into: string[] = []): string[] {
    for (const node of nodes) {
        if (node.children?.length) {
            into.push(node.handle);
            collectionHandles(node.children, into);
        }
    }
    return into;
}

interface BranchProps extends Omit<TreeProps, 'label' | 'nodes'> {
    nodes: TreeNode[];
    depth: number;
    isExpanded: (handle: string) => boolean;
    onToggle: (handle: string, expanded: boolean) => void;
}

function Branch({ nodes, depth, isExpanded, onToggle, ...rest }: BranchProps) {
    const { statuses, current, onNavigate, hrefFor, forceOpen } = rest;

    return (
        <>
            {nodes.map((node) => {
                if (node.children?.length) {
                    const expanded = forceOpen || isExpanded(node.handle);
                    const id = `tree-collection-${node.handle}`;

                    return (
                        <li
                            className={`Tree-item Tree-collection Tree-depth-${depth}${expanded ? '' : ' is-closed'}`}
                            id={id}
                            key={node.handle}
                        >
                            <button
                                type="button"
                                className="Tree-collectionLabel"
                                aria-expanded={expanded}
                                aria-controls={`${id}-items`}
                                onClick={() => onToggle(node.handle, expanded)}
                            >
                                {node.label}
                            </button>
                            {expanded ? (
                                <ul className="Tree-collectionItems" id={`${id}-items`}>
                                    <Branch
                                        nodes={node.children}
                                        depth={depth + 1}
                                        isExpanded={isExpanded}
                                        onToggle={onToggle}
                                        {...rest}
                                    />
                                </ul>
                            ) : null}
                        </li>
                    );
                }

                const href = hrefFor(node);
                const isCurrent = current === node.handle;

                return (
                    <li
                        className={`Tree-item Tree-entity${isCurrent ? ' is-current' : ''}`}
                        data-state={isCurrent ? 'current' : undefined}
                        key={node.handle}
                    >
                        <a
                            className="Tree-entityLink"
                            href={href}
                            data-handle={node.handle}
                            aria-current={isCurrent ? 'page' : undefined}
                            onClick={(event) => {
                                // Modified and middle clicks stay real navigations:
                                // these are genuine URLs with a document behind them.
                                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                                event.preventDefault();
                                onNavigate(href);
                            }}
                        >
                            <span>{node.label}</span>
                            <StatusDot status={node.status ? statuses[node.status] : undefined} />
                        </a>
                    </li>
                );
            })}
        </>
    );
}

/**
 * One navigable tree, with its collapse state owned here rather than in each
 * collection.
 *
 * It has to live at this level for the header's collapse-all button to exist at
 * all — a collection that owns its own open flag cannot be closed by anything
 * outside it. Persisted to sessionStorage under the key the previous theme used,
 * so expansion survives a reload exactly as it did before.
 */
/**
 * The collapse control's label. Configurable as `labels.tree.collapse`; the
 * expand wording has no label of its own, as it had none in the template layer.
 */
const collapseLabel = (anyOpen: boolean): string => {
    const tree = (frctl.labels?.tree ?? {}) as Record<string, string>;
    return anyOpen ? (tree.collapse ?? 'Collapse tree') : 'Expand tree';
};

export function Tree({ label, nodes, ...rest }: TreeProps) {
    const key = `tree.${label}.state`;

    // Explicit choices only. A collection with no entry falls back to the
    // default — open if it is on the path to the current item, closed otherwise
    // — so navigating reveals where you are without overriding a collection you
    // deliberately opened or closed.
    const [explicit, setExplicit] = useState<Record<string, boolean>>(() =>
        read<Record<string, boolean>>(key, {}, 'session'),
    );

    const persist = useCallback(
        (next: Record<string, boolean>) => {
            setExplicit(next);
            write(key, next, 'session');
        },
        [key],
    );

    const toggle = useCallback(
        (handle: string, expanded: boolean) => persist({ ...explicit, [handle]: !expanded }),
        [explicit, persist],
    );

    const handles = useMemo(() => collectionHandles(nodes), [nodes]);

    const onCurrentPath = useMemo(() => new Set(pathTo(nodes, rest.current) ?? []), [nodes, rest.current]);

    const isExpanded = useCallback(
        (handle: string) => explicit[handle] ?? onCurrentPath.has(handle),
        [explicit, onCurrentPath],
    );

    const anyOpen = handles.some(isExpanded);

    if (!nodes.length) return null;

    return (
        <div className="Navigation-group">
            <div className="Tree">
                <div className="Tree-header">
                    <h3 className="Tree-title">{label}</h3>
                    {handles.length ? (
                        <button
                            type="button"
                            className="Tree-collapse"
                            title={collapseLabel(anyOpen)}
                            aria-label={collapseLabel(anyOpen)}
                            onClick={() => persist(Object.fromEntries(handles.map((handle) => [handle, !anyOpen])))}
                        >
                            <CollapseIcon />
                        </button>
                    ) : null}
                </div>
                <ul className="Tree-items Tree-depth-1">
                    <Branch nodes={nodes} depth={2} isExpanded={isExpanded} onToggle={toggle} {...rest} />
                </ul>
            </div>
        </div>
    );
}
