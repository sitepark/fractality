import { useEffect, useRef, useState } from 'react';
import { useResizable } from './useResizable.js';
import { usePreviewWidth } from './usePreviewWidth.js';
import { usePreviewSize } from './usePreviewSize.js';
import { usePreviewLoading } from './usePreviewLoading.js';
import { read, write } from './storage.js';
import type { EntityPayload, TreePayload } from '@fractality/web/contract';
import { resolveRouteUrl } from './frctl.js';
import { Browser } from './Browser.js';
import { StatusTag } from './Status.js';
import { OpenInBrowserIcon } from './Icons.js';
import { frctl } from './frctl.js';

interface PenProps {
    entity: EntityPayload;
    statuses: TreePayload['status'];
    /**
     * The handle the current route names, which may be a variant.
     *
     * A variant route resolves to its component's payload — that is what makes
     * one payload serve every variant — so the URL is the only thing that says
     * *which* variant is being looked at. Without it every variant of a
     * component renders the default one.
     */
    selected: string;
}

/**
 * The component workbench. Mirrors `views/layouts/pen.nunj` and its partials.
 *
 * Switching variants is local state rather than navigation, which is why
 * variants ride along inside their component's payload instead of each being
 * fetched separately.
 */
export function Pen({ entity, statuses, selected }: PenProps) {
    // Derived rather than initialised-at-mount. The payload arrives after the
    // route changes, so a `useState` initialiser reads whichever entity was
    // still on screen — the previous component. The switcher's own choice is a
    // separate override, cleared whenever the route names a different entity.
    const [override, setOverride] = useState<string | null>(null);

    useEffect(() => setOverride(null), [entity.handle, selected]);

    // A collated component is one document containing all of its variants, so
    // there is nothing to switch between and no default to fall back to — unless
    // the url names a variant, which is how a variant of a collated component is
    // still reachable by a deep link. That is the rule 0.x applied: the component
    // route rendered the collation, a variant route rendered that variant.
    const named =
        entity.variants.find((v) => v.handle === override) ?? entity.variants.find((v) => v.handle === selected);

    const variant = entity.isCollated
        ? named
        : (named ?? entity.variants.find((v) => v.isDefault) ?? entity.variants[0]);

    // What the Preview and the HTML panel are showing: the variant if one is
    // being shown, the component's own document otherwise.
    const showing = variant ?? { previewUrl: entity.previewUrl, renderUrl: entity.renderUrl };

    // Keys match the legacy theme's, so an upgrading user keeps their layout.
    const preview = useResizable({ key: 'pen.previewHeight', fallback: 400, min: 80 });
    const [collapsed, setCollapsed] = useState(() => read<string>('pen.previewState', 'open') === 'closed');

    const toggle = () =>
        setCollapsed((was) => {
            write('pen.previewState', was ? 'open' : 'closed');
            return !was;
        });

    const previewWidth = usePreviewWidth();
    const iframe = useRef<HTMLIFrameElement | null>(null);
    const size = usePreviewSize(iframe, previewWidth.dragging);

    const previewUrl = resolveRouteUrl(showing.previewUrl);
    const loading = usePreviewLoading(previewUrl);

    const previewLabel =
        (frctl.labels?.components as Record<string, Record<string, string>> | undefined)?.preview?.label ?? 'Preview';

    return (
        <div className={`Pen${preview.dragging ? ' is-resizing' : ''}`}>
            <div className="Pen-panel Pen-header">
                <h1 className="Pen-title">
                    <a
                        className="Pen-previewLink"
                        href={previewUrl}
                        // Opened as a window of its own, which is why the dev
                        // server injects a live-reload subscription into Preview
                        // documents: nothing else would tell a detached window
                        // that the library rebuilt.
                        target="_blank"
                        rel="noopener noreferrer"
                        title={previewLabel}
                    >
                        {entity.title}
                        <OpenInBrowserIcon />
                    </a>
                </h1>
                <span className="Pen-preview-size">{size}</span>
                <StatusTag status={entity.status ? statuses[entity.status] : undefined} />
            </div>

            {entity.variants.length > 1 && !entity.isCollated ? (
                <div className="Pen-panel Pen-variants">
                    {entity.variants.map((v) => (
                        <button
                            type="button"
                            key={v.handle}
                            className={`Pen-variant${v.handle === variant?.handle ? ' is-active' : ''}`}
                            aria-pressed={v.handle === variant?.handle}
                            onClick={() => setOverride(v.handle)}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            ) : null}

            <div
                className={`Pen-panel Pen-preview Preview${previewWidth.dragging ? ' is-resizing is-disabled' : ''}`}
                style={{ height: collapsed ? '100%' : preview.size }}
            >
                <div className="Preview-wrapper" ref={previewWidth.ref} style={previewWidth.style}>
                    <div className="Preview-resizer" aria-busy={loading.visible || undefined}>
                        {previewUrl ? (
                            <iframe
                                className="Preview-iframe"
                                title={`Preview of ${variant?.label ?? entity.label}`}
                                src={previewUrl}
                                frameBorder="0"
                                ref={iframe}
                                onLoad={loading.onLoad}
                                // An iframe swallows pointer events, which would
                                // end a drag the moment the pointer crossed it.
                                style={{
                                    pointerEvents: preview.dragging || previewWidth.dragging ? 'none' : undefined,
                                }}
                            />
                        ) : null}

                        {/*
                            Rendered only while it is wanted, rather than hidden
                            with a class: the bar animates, and an animation left
                            running behind `display: none` is work the browser
                            still does on every frame.

                            Indeterminate, because a cross-document load reports
                            no progress — hence a `progressbar` with no value.
                        */}
                        {loading.visible ? (
                            <div className="Preview-progress" role="progressbar" aria-label="Loading preview" />
                        ) : null}
                    </div>

                    <div
                        className="Preview-handle"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize preview width"
                        onPointerDown={previewWidth.onPointerDown}
                        onDoubleClick={previewWidth.onDoubleClick}
                    />
                    {/* The stylesheet shows this while resizing, so the cursor
                        stays correct over the iframe. */}
                    <div className="Preview-overlay" />
                </div>
            </div>

            <div
                className="Pen-handle Pen-handle--browser"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize preview"
                onPointerDown={preview.onPointerDown}
                onDoubleClick={toggle}
            />

            <div className="Pen-panel Pen-info">
                <Browser entity={entity} variant={variant} renderUrl={showing.renderUrl} />
            </div>
        </div>
    );
}
