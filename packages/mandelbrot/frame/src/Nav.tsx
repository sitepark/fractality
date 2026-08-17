import type { TreeNode, TreePayload } from '@fractality/web/contract';

interface NavProps {
    tree: TreePayload;
    current: string;
    onNavigate: (href: string) => void;
}

function Branch({
    nodes,
    statuses,
    current,
    onNavigate,
}: {
    nodes: TreeNode[];
    statuses: TreePayload['status'];
    current: string;
    onNavigate: (href: string) => void;
}) {
    return (
        <ul className="Tree-items">
            {nodes.map((node) => {
                const href = `/components/detail/${node.handle}`;
                const status = node.status ? statuses[node.status] : undefined;

                return (
                    <li className="Tree-item" key={node.handle}>
                        {node.isCollection ? (
                            <span className="Tree-collectionLabel">{node.label}</span>
                        ) : (
                            <a
                                className="Tree-entityLink"
                                href={href}
                                aria-current={current === node.handle ? 'page' : undefined}
                                onClick={(event) => {
                                    // Plain click navigates in-Frame; modified clicks and
                                    // middle clicks keep working as real links, which is the
                                    // point of not using hash routing.
                                    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                                    event.preventDefault();
                                    onNavigate(href);
                                }}
                            >
                                {node.label}
                                {status ? (
                                    <span
                                        className="Status-dot"
                                        style={{ borderColor: status.color }}
                                        title={status.label}
                                    />
                                ) : null}
                            </a>
                        )}
                        {node.children ? (
                            <Branch
                                nodes={node.children}
                                statuses={statuses}
                                current={current}
                                onNavigate={onNavigate}
                            />
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}

export function Nav({ tree, current, onNavigate }: NavProps) {
    return (
        <nav className="Navigation">
            <Branch nodes={tree.components} statuses={tree.status} current={current} onNavigate={onNavigate} />
        </nav>
    );
}
