import { useCallback, useMemo, useState } from 'react';
import type { TreeNode, TreePayload } from '@fractality/web/contract';
import { StatusDot } from './Status.js';
import { read, write } from './storage.js';

export interface TreeProps {
    label: string;
    nodes: TreeNode[];
    statuses: TreePayload['status'];
    current: string;
    onNavigate: (href: string) => void;
    hrefFor: (handle: string) => string;
    /** Set while filtering, so matches inside collapsed collections stay visible. */
    forceOpen: boolean;
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
    closed: ReadonlySet<string>;
    onToggle: (handle: string) => void;
}

function Branch({ nodes, depth, closed, onToggle, ...rest }: BranchProps) {
    const { statuses, current, onNavigate, hrefFor, forceOpen } = rest;

    return (
        <>
            {nodes.map((node) => {
                if (node.children?.length) {
                    const expanded = forceOpen || !closed.has(node.handle);
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
                                onClick={() => onToggle(node.handle)}
                            >
                                {node.label}
                            </button>
                            {expanded ? (
                                <ul className="Tree-collectionItems" id={`${id}-items`}>
                                    <Branch
                                        nodes={node.children}
                                        depth={depth + 1}
                                        closed={closed}
                                        onToggle={onToggle}
                                        {...rest}
                                    />
                                </ul>
                            ) : null}
                        </li>
                    );
                }

                const href = hrefFor(node.handle);
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
export function Tree({ label, nodes, ...rest }: TreeProps) {
    const key = `tree.${label}.state`;
    const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set(read<string[]>(key, [], 'session')));

    const persist = useCallback(
        (next: ReadonlySet<string>) => {
            setClosed(next);
            write(key, [...next], 'session');
        },
        [key],
    );

    const toggle = useCallback(
        (handle: string) => {
            const next = new Set(closed);
            if (!next.delete(handle)) next.add(handle);
            persist(next);
        },
        [closed, persist],
    );

    const handles = useMemo(() => collectionHandles(nodes), [nodes]);
    const anyOpen = handles.some((handle) => !closed.has(handle));

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
                            title={anyOpen ? 'Collapse tree' : 'Expand tree'}
                            aria-label={anyOpen ? 'Collapse tree' : 'Expand tree'}
                            onClick={() => persist(anyOpen ? new Set(handles) : new Set())}
                        >
                            {anyOpen ? '⌃' : '⌄'}
                        </button>
                    ) : null}
                </div>
                <ul className="Tree-items Tree-depth-1">
                    <Branch nodes={nodes} depth={2} closed={closed} onToggle={toggle} {...rest} />
                </ul>
            </div>
        </div>
    );
}
