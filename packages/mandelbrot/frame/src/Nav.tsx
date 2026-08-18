import { useEffect, useMemo, useRef, useState } from 'react';
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

    // The search box is pinned to the top of this panel, so "stuck" is exactly
    // "the panel has scrolled". There is no CSS selector for it, and reading the
    // scroll position is both cheaper and more precise here than an
    // IntersectionObserver sentinel would be.
    const panel = useRef<HTMLDivElement | null>(null);
    const [stuck, setStuck] = useState(false);

    useEffect(() => {
        const element = panel.current;
        if (!element) return;

        const onScroll = () => setStuck(element.scrollTop > 0);
        onScroll();
        element.addEventListener('scroll', onScroll, { passive: true });
        return () => element.removeEventListener('scroll', onScroll);
    }, []);
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
            <div className="Navigation-panel Navigation-panel--main" ref={panel}>
                <Search value={query} onChange={setQuery} stuck={stuck} />
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
