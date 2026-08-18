import { useCallback, useEffect, useState } from 'react';
import type { AssetPayload, DocPayload, EntityPayload, TreePayload } from '@fractality/web/contract';
import { fetchAsset, fetchDoc, fetchEntity, fetchTree } from './api.js';
import { Asset } from './Asset.js';
import { Doc } from './Doc.js';
import { Header } from './Header.js';
import { Nav } from './Nav.js';
import { Pen } from './Pen.js';

const handleFromPath = (pathname: string): string =>
    pathname
        .replace(/\.html$/, '')
        .split('/')
        .pop() ?? '';

const isDetailRoute = (pathname: string): boolean => /\/components\/detail\//.test(pathname);
const isDocRoute = (pathname: string): boolean => /^\/docs(\/|$)/.test(pathname.replace(/\.html$/, ''));
const isAssetRoute = (pathname: string): boolean => /^\/assets\/.+/.test(pathname.replace(/\.html$/, ''));

/**
 * Renders the Frame's own chrome. Mirrors `views/layouts/frame.nunj`, minus its
 * outermost element: the mount point *is* `.Frame`, so this returns its children.
 */
export function App() {
    const [tree, setTree] = useState<TreePayload | null>(null);
    const [route, setRoute] = useState(() => window.location.pathname);
    const [entity, setEntity] = useState<EntityPayload | null>(null);
    const [doc, setDoc] = useState<DocPayload | null>(null);
    const [asset, setAsset] = useState<AssetPayload | null>(null);
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
        let cancelled = false;
        setError(null);

        if (isDetailRoute(route)) {
            setDoc(null);
            setAsset(null);
            fetchEntity(route).then(
                (payload) => !cancelled && setEntity(payload),
                (e: unknown) => !cancelled && setError(String(e)),
            );
        } else if (isDocRoute(route)) {
            setEntity(null);
            setAsset(null);
            fetchDoc(route).then(
                (payload) => !cancelled && setDoc(payload),
                (e: unknown) => !cancelled && setError(String(e)),
            );
        } else if (isAssetRoute(route)) {
            setEntity(null);
            setDoc(null);
            fetchAsset(route).then(
                (payload) => !cancelled && setAsset(payload),
                (e: unknown) => !cancelled && setError(String(e)),
            );
        } else {
            setEntity(null);
            setDoc(null);
            setAsset(null);
        }

        return () => {
            cancelled = true;
        };
    }, [route]);

    useEffect(() => {
        const title = entity?.title ?? doc?.title ?? asset?.title;
        document.title = title ? `${title} | Fractality` : 'Fractality';
    }, [entity, doc, asset]);

    // `is-closed` belongs on the .Frame root, which is the mount point rather
    // than an element this component renders — and three stylesheets key off it
    // (the header icon swap, the file browser and the meta layout). Setting it on
    // anything else, or under any other name, silently does nothing.
    useEffect(() => {
        document.getElementById('frame')?.classList.toggle('is-closed', !sidebarOpen);
    }, [sidebarOpen]);

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

            <div className="Frame-body">
                <div className="Frame-panel Frame-panel--main">
                    <div className="Frame-inner">
                        {error ? (
                            <div className="Error">
                                <p className="Error-message">{error}</p>
                            </div>
                        ) : entity && tree ? (
                            <Pen
                                // Keyed by handle so navigating remounts the Pen.
                                // Its selected variant is useState-initialised
                                // from the entity, and React reuses an instance
                                // in the same position — so without this the
                                // iframe kept showing the previous component
                                // while the URL and payload had already moved on.
                                key={entity.handle}
                                entity={entity}
                                statuses={tree.status}
                            />
                        ) : doc && tree ? (
                            <Doc doc={doc} statuses={tree.status} />
                        ) : asset ? (
                            <Asset asset={asset} />
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
