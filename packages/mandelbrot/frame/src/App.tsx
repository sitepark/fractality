import { useCallback, useEffect, useState } from 'react';
import type { EntityPayload, TreePayload } from '@fractality/web/contract';
import { fetchEntity, fetchTree } from './api.js';
import { Nav } from './Nav.js';
import { Pen } from './Pen.js';

const handleFromPath = (pathname: string): string =>
    pathname
        .replace(/\.html$/, '')
        .split('/')
        .pop() ?? '';

export function App() {
    const [tree, setTree] = useState<TreePayload | null>(null);
    const [route, setRoute] = useState(() => window.location.pathname);
    const [entity, setEntity] = useState<EntityPayload | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTree().then(setTree, (e: unknown) => setError(String(e)));
    }, []);

    // The Frame is never torn down by navigation — only the panel changes. That
    // is the behaviour static builds do not have today, and it is why the Shell
    // is identical at every route rather than being rendered per page.
    useEffect(() => {
        const onPop = () => setRoute(window.location.pathname);
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    useEffect(() => {
        if (!/\/components\/detail\//.test(route)) {
            setEntity(null);
            return;
        }
        let cancelled = false;
        setError(null);
        fetchEntity(route).then(
            (payload) => {
                if (!cancelled) setEntity(payload);
            },
            (e: unknown) => {
                if (!cancelled) setError(String(e));
            },
        );
        return () => {
            cancelled = true;
        };
    }, [route]);

    const navigate = useCallback((href: string) => {
        // pushState keeps the real URL, so a deep link, a refresh and a bookmark
        // all still work — the Shell exists at that path on disk.
        window.history.pushState(null, '', href);
        setRoute(href);
    }, []);

    useEffect(() => {
        document.title = entity ? `${entity.title} | Fractality` : 'Fractality';
    }, [entity]);

    if (error) return <div className="Frame-error">{error}</div>;
    if (!tree) return <div className="Frame-loading">Loading…</div>;

    return (
        <div className="Frame">
            <Nav tree={tree} current={handleFromPath(route)} onNavigate={navigate} />
            {entity ? <Pen entity={entity} /> : <div className="Frame-empty">Select a component.</div>}
        </div>
    );
}
