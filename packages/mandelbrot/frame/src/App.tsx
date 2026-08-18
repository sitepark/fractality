import { useCallback, useEffect, useState } from 'react';
import type { EntityPayload, TreePayload } from '@fractality/web/contract';
import { fetchEntity, fetchTree } from './api.js';
import { Header } from './Header.js';
import { Nav } from './Nav.js';
import { Pen } from './Pen.js';

const handleFromPath = (pathname: string): string =>
    pathname
        .replace(/\.html$/, '')
        .split('/')
        .pop() ?? '';

const isDetailRoute = (pathname: string): boolean => /\/components\/detail\//.test(pathname);

/**
 * Renders the Frame's own chrome. Mirrors `views/layouts/frame.nunj`, minus its
 * outermost element: the mount point *is* `.Frame`, so this returns its children.
 */
export function App() {
    const [tree, setTree] = useState<TreePayload | null>(null);
    const [route, setRoute] = useState(() => window.location.pathname);
    const [entity, setEntity] = useState<EntityPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        fetchTree().then(setTree, (e: unknown) => setError(String(e)));
    }, []);

    // The Frame is never torn down by navigation — only the panel changes. That
    // is the behaviour static builds did not have at all before.
    useEffect(() => {
        const onPop = () => setRoute(window.location.pathname);
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    useEffect(() => {
        if (!isDetailRoute(route)) {
            setEntity(null);
            return;
        }
        let cancelled = false;
        setError(null);
        fetchEntity(route).then(
            (payload) => !cancelled && setEntity(payload),
            (e: unknown) => !cancelled && setError(String(e)),
        );
        return () => {
            cancelled = true;
        };
    }, [route]);

    useEffect(() => {
        document.title = entity ? `${entity.title} | Fractality` : 'Fractality';
    }, [entity]);

    const navigate = useCallback((href: string) => {
        // pushState keeps the real URL, so a deep link, a refresh and a bookmark
        // all still work: the Shell exists at that path on disk.
        window.history.pushState(null, '', href);
        setRoute(href);
    }, []);

    return (
        <>
            <div className="Frame-header">
                <Header onToggleSidebar={() => setSidebarOpen((was) => !was)} />
            </div>

            <div className={`Frame-body${sidebarOpen ? '' : ' is-sidebar-closed'}`}>
                <div className="Frame-panel Frame-panel--main">
                    <div className="Frame-inner">
                        {error ? (
                            <div className="Error">
                                <p className="Error-message">{error}</p>
                            </div>
                        ) : entity && tree ? (
                            <Pen entity={entity} statuses={tree.status} />
                        ) : (
                            <div className="Document">
                                <div className="Document-header">
                                    <h1 className="Document-title">{tree ? 'Select a component' : 'Loading…'}</h1>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="Frame-panel Frame-panel--sidebar">
                    {tree ? <Nav tree={tree} current={handleFromPath(route)} onNavigate={navigate} /> : null}
                </div>
            </div>
        </>
    );
}
