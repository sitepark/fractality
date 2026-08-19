import { useCallback, useEffect, useState } from 'react';
import type { AssetPayload, DocPayload, EntityPayload, TreePayload } from '@fractality/web/contract';
import { fetchAsset, fetchDoc, fetchEntity, fetchTree, PayloadError } from './api.js';
import { projectTitle } from './frctl.js';
import { useLiveReload } from './useLiveReload.js';
import { useSidebar } from './useSidebar.js';
import { Asset } from './Asset.js';
import { Doc } from './Doc.js';
import { Header } from './Header.js';
import { Nav } from './Nav.js';
import { Pen } from './Pen.js';
import { Welcome } from './Welcome.js';

const handleFromPath = (pathname: string): string =>
    pathname
        .replace(/\.html$/, '')
        .split('/')
        .pop() ?? '';

const isDetailRoute = (pathname: string): boolean => /\/components\/detail\//.test(pathname);
const isAssetRoute = (pathname: string): boolean => /^\/assets\/.+/.test(pathname.replace(/\.html$/, ''));

/** The site root, in either of the two forms a static host serves it under. */
const isHomeRoute = (pathname: string): boolean => {
    const path = pathname.replace(/\.html$/, '');
    return path === '/' || path === '/index';
};

/**
 * Documentation, including the site root.
 *
 * `/` is a documentation route — the project's index page is what 0.x rendered
 * there, and it is the url `fractality start` prints and a bare domain resolves
 * to. Leaving it out is what made the home page of every site an empty panel
 * saying "Select a component". `fetchDoc` maps the three spellings of the index
 * page onto the one payload that backs it.
 */
const isDocRoute = (pathname: string): boolean =>
    isHomeRoute(pathname) || /^\/docs(\/|$)/.test(pathname.replace(/\.html$/, ''));

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
    const sidebar = useSidebar();
    const generation = useLiveReload();

    useEffect(() => {
        fetchTree().then(setTree, (e: unknown) => setError(String(e)));
    }, [generation]);

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
                (e: unknown) => {
                    if (cancelled) return;
                    // A project with no `docs/index.md` has no payload behind its
                    // home page, which is an ordinary state and not a failure —
                    // it is the state every new project starts in.
                    if (e instanceof PayloadError && e.status === 404 && isHomeRoute(route)) {
                        setDoc(null);
                        setError(null);
                        return;
                    }
                    setError(String(e));
                },
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

    // `<page> | <project>`, and the project's name alone when no page is open —
    // the shape 0.x's <title> had. It said "Fractality" here, which named the
    // tool rather than the library being browsed.
    useEffect(() => {
        const title = entity?.title ?? doc?.title ?? asset?.title;
        document.title = title ? `${title} | ${projectTitle}` : projectTitle;
    }, [entity, doc, asset]);

    // `is-closed` belongs on the .Frame root, which is the mount point rather
    // than an element this component renders — and three stylesheets key off it
    // (the header icon swap, the file browser and the meta layout). Setting it on
    // anything else, or under any other name, silently does nothing.
    useEffect(() => {
        document.getElementById('frame')?.classList.toggle('is-closed', !sidebar.open);
    }, [sidebar.open]);

    // What the navigation highlights. At the site root that is the index page,
    // whose own tree item links to /docs/index — the two urls are the same page.
    const currentHandle = isHomeRoute(route) ? 'index' : handleFromPath(route);

    const navigate = useCallback((href: string) => {
        // pushState keeps the real URL, so a deep link, a refresh and a bookmark
        // all still work: the Shell exists at that path on disk.
        window.history.pushState(null, '', href);
        setRoute(href);
    }, []);

    return (
        <>
            <div className="Frame-header">
                <Header onToggleSidebar={sidebar.toggle} />
            </div>

            <div className="Frame-body" style={sidebar.bodyStyle}>
                <div className="Frame-panel Frame-panel--main">
                    <div className="Frame-inner">
                        {error ? (
                            <div className="Error">
                                <p className="Error-message">{error}</p>
                            </div>
                        ) : entity && tree ? (
                            <Pen
                                // Keyed by handle so navigating remounts the Pen,
                                // and by generation so a rebuild reloads the
                                // Preview iframe with it.
                                // Its selected variant is useState-initialised
                                // from the entity, and React reuses an instance
                                // in the same position — so without this the
                                // iframe kept showing the previous component
                                // while the URL and payload had already moved on.
                                // Keyed by the entity, not by the route: the
                                // payload arrives after the route changes, so
                                // keying on the route remounts against the
                                // previous component's data. Variant selection
                                // follows `selected` instead of a remount.
                                key={`${entity.handle}:${generation}`}
                                entity={entity}
                                statuses={tree.status}
                                selected={handleFromPath(route)}
                                onNavigate={navigate}
                            />
                        ) : doc && tree ? (
                            <Doc doc={doc} statuses={tree.status} />
                        ) : asset ? (
                            <Asset asset={asset} />
                        ) : tree && isHomeRoute(route) ? (
                            <Welcome />
                        ) : (
                            <div className="Document">
                                <div className="Document-header">
                                    <h1 className="Document-title">{tree ? 'Select a component' : 'Loading…'}</h1>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="Frame-panel Frame-panel--sidebar" ref={sidebar.ref}>
                    {tree ? <Nav tree={tree} current={currentHandle} onNavigate={navigate} /> : null}
                </div>
            </div>
        </>
    );
}
