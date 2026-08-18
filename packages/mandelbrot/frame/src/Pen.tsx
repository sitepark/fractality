import { useState } from 'react';
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

    const previewUrl = variant ? resolveRouteUrl(variant.previewUrl) : undefined;

    return (
        <div className="Pen">
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

            <div className="Pen-panel Pen-preview Preview">
                <div className="Preview-wrapper">
                    <div className="Preview-resizer">
                        {previewUrl ? (
                            <iframe
                                className="Preview-iframe"
                                title={`Preview of ${variant?.label ?? entity.label}`}
                                src={previewUrl}
                                frameBorder="0"
                            />
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="Pen-panel Pen-info">
                <Browser entity={entity} />
            </div>
        </div>
    );
}
