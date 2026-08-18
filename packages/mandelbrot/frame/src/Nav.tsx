import { useMemo, useState } from 'react';
import type { TreeNode, TreePayload } from '@fractality/web/contract';
import { StatusDot } from './Status.js';
import { Search } from './Search.js';
import { filterTree } from './search.js';

interface NavProps {
    tree: TreePayload;
    current: string;
    onNavigate: (href: string) => void;
}

/**
 * While a search is active, collections start expanded: a match hidden inside a
 * collapsed branch is indistinguishable from no match at all.
 */

interface BranchProps {
    nodes: TreeNode[];
    statuses: TreePayload['status'];
    current: string;
    depth: number;
    onNavigate: (href: string) => void;
    /**
     * Where this tree's entities live. Docs are not components: routing them to
     * /components/detail produces a URL with no payload behind it, which fails
     * only when someone clicks it.
     */
    hrefFor: (handle: string) => string;
    /** Set while filtering, so matches inside collapsed collections stay visible. */
    forceOpen: boolean;
}

/**
 * A collection, collapsible.
 *
 * This is React state where mandelbrot used a jQuery `collection` behaviour
 * toggling a class. Same markup and the same `aria-expanded`, so the stylesheet
 * and assistive technology both see what they did before.
 */
function Collection({
    node,
    statuses,
    current,
    depth,
    onNavigate,
    hrefFor,
    forceOpen,
}: BranchProps & { node: TreeNode }) {
    const [open, setOpen] = useState(true);
    const expanded = forceOpen || open;
    const id = `tree-collection-${node.handle}`;

    return (
        <li className={`Tree-item Tree-collection Tree-depth-${depth}${expanded ? '' : ' is-closed'}`} id={id}>
            <button
                type="button"
                className="Tree-collectionLabel"
                aria-expanded={expanded}
                aria-controls={`${id}-items`}
                onClick={() => setOpen((was) => !was)}
            >
                {node.label}
            </button>
            {expanded ? (
                <ul className="Tree-collectionItems" id={`${id}-items`}>
                    <Branch
                        nodes={node.children ?? []}
                        statuses={statuses}
                        current={current}
                        depth={depth + 1}
                        onNavigate={onNavigate}
                        hrefFor={hrefFor}
                        forceOpen={forceOpen}
                    />
                </ul>
            ) : null}
        </li>
    );
}

function Branch({ nodes, statuses, current, depth, onNavigate, hrefFor, forceOpen }: BranchProps) {
    return (
        <>
            {nodes.map((node) => {
                if (node.isCollection || (node.children && node.children.length)) {
                    return (
                        <Collection
                            key={node.handle}
                            node={node}
                            nodes={[]}
                            statuses={statuses}
                            current={current}
                            depth={depth}
                            onNavigate={onNavigate}
                            hrefFor={hrefFor}
                            forceOpen={forceOpen}
                        />
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
                                // Modified and middle clicks stay real navigations.
                                // These are genuine URLs with a document behind
                                // them, which is the point of not using hash routing.
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

function Tree({
    label,
    nodes,
    statuses,
    current,
    onNavigate,
    hrefFor,
    forceOpen,
}: Omit<BranchProps, 'depth'> & { label: string }) {
    if (!nodes.length) return null;
    return (
        <div className="Navigation-group">
            <div className="Tree">
                <div className="Tree-header">
                    <h3 className="Tree-title">{label}</h3>
                </div>
                <ul className="Tree-items Tree-depth-1">
                    <Branch
                        nodes={nodes}
                        statuses={statuses}
                        current={current}
                        depth={2}
                        onNavigate={onNavigate}
                        hrefFor={hrefFor}
                        forceOpen={forceOpen}
                    />
                </ul>
            </div>
        </div>
    );
}

/** Mirrors `views/partials/navigation/navigation.nunj`. */
export function Nav({ tree, current, onNavigate }: NavProps) {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => filterTree(tree, query), [tree, query]);
    const searching = query.trim().length > 0;

    return (
        <nav className="Navigation">
            <div className="Navigation-panel Navigation-panel--main">
                <Search value={query} onChange={setQuery} />
                <Tree
                    label="Components"
                    nodes={filtered.components}
                    statuses={tree.status}
                    current={current}
                    onNavigate={onNavigate}
                    hrefFor={(handle) => `/components/detail/${handle}`}
                    forceOpen={searching}
                />
                <Tree
                    label="Documentation"
                    nodes={filtered.docs}
                    statuses={tree.status}
                    current={current}
                    onNavigate={onNavigate}
                    hrefFor={(handle) => `/docs/${handle}`}
                    forceOpen={searching}
                />
                <Tree
                    label="Assets"
                    nodes={filtered.assets}
                    statuses={filtered.status}
                    current={current}
                    onNavigate={onNavigate}
                    hrefFor={(handle) => `/assets/${handle}`}
                    forceOpen={searching}
                />
            </div>
        </nav>
    );
}
