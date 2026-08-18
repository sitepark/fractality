import { useMemo, useState } from 'react';
import type { TreePayload } from '@fractality/web/contract';
import { Search } from './Search.js';
import { Tree } from './Tree.js';
import { filterTree } from './search.js';

interface NavProps {
    tree: TreePayload;
    current: string;
    onNavigate: (href: string) => void;
}

/** Mirrors `views/partials/navigation/navigation.nunj`. */
export function Nav({ tree, current, onNavigate }: NavProps) {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => filterTree(tree, query), [tree, query]);

    // While filtering, collections are forced open: a match hidden inside a
    // collapsed branch is indistinguishable from no match at all.
    const searching = query.trim().length > 0;

    const shared = {
        statuses: filtered.status,
        current,
        onNavigate,
        forceOpen: searching,
    };

    return (
        <nav className="Navigation">
            <div className="Navigation-panel Navigation-panel--main">
                <Search value={query} onChange={setQuery} />
                <Tree
                    label="Components"
                    nodes={filtered.components}
                    hrefFor={(handle) => `/components/detail/${handle}`}
                    {...shared}
                />
                <Tree label="Documentation" nodes={filtered.docs} hrefFor={(handle) => `/docs/${handle}`} {...shared} />
                <Tree label="Assets" nodes={filtered.assets} hrefFor={(handle) => `/assets/${handle}`} {...shared} />
            </div>
        </nav>
    );
}
