import { useState } from 'react';
import { useResizable } from './useResizable.js';
import { read, write } from './storage.js';
import type { EntityPayload, TreePayload } from '@fractality/web/contract';
import { resolveRouteUrl } from './frctl.js';
import { Browser } from './Browser.js';
import { StatusTag } from './Status.js';

interface PenProps {
    entity: EntityPayload;
    statuses: TreePayload['status'];
}

/**
 * The component workbench. Mirrors `views/layouts/pen.nunj` and its partials.
 *
 * Switching variants is local state rather than navigation, which is why
 * variants ride along inside their component's payload instead of each being
 * fetched separately.
 */
export function Pen({ entity, statuses }: PenProps) {
    const [variant, setVariant] = useState(() => entity.variants.find((v) => v.isDefault) ?? entity.variants[0]);

    // Keys match the legacy theme's, so an upgrading user keeps their layout.
    const preview = useResizable({ key: 'pen.previewHeight', fallback: 400, min: 80 });
    const [collapsed, setCollapsed] = useState(() => read<string>('pen.previewState', 'open') === 'closed');

    const toggle = () =>
        setCollapsed((was) => {
            write('pen.previewState', was ? 'open' : 'closed');
            return !was;
        });

    const previewUrl = variant ? resolveRouteUrl(variant.previewUrl) : undefined;

    return (
        <div className={`Pen${preview.dragging ? ' is-resizing' : ''}`}>
            <div className="Pen-panel Pen-header">
                <h1 className="Pen-title">
                    <a className="Pen-previewLink" href={previewUrl} title="Preview">
                        {entity.title}
                    </a>
                </h1>
                <StatusTag status={entity.status ? statuses[entity.status] : undefined} />
            </div>

            {entity.variants.length > 1 ? (
                <div className="Pen-panel Pen-variants">
                    {entity.variants.map((v) => (
                        <button
                            type="button"
                            key={v.handle}
                            className={`Pen-variant${v.handle === variant?.handle ? ' is-active' : ''}`}
                            aria-pressed={v.handle === variant?.handle}
                            onClick={() => setVariant(v)}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="Pen-panel Pen-preview Preview" style={{ height: collapsed ? '100%' : preview.size }}>
                <div className="Preview-wrapper">
                    <div className="Preview-resizer">
                        {previewUrl ? (
                            <iframe
                                className="Preview-iframe"
                                title={`Preview of ${variant?.label ?? entity.label}`}
                                src={previewUrl}
                                frameBorder="0"
                                // An iframe swallows pointer events, which would
                                // end a drag the moment the pointer crossed it.
                                style={{ pointerEvents: preview.dragging ? 'none' : undefined }}
                            />
                        ) : null}
                    </div>
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
                <Browser entity={entity} />
            </div>
        </div>
    );
}
