import { useState } from 'react';
import type { EntityPayload } from '@fractality/web/contract';
import { resolveRouteUrl } from './frctl.js';
import { Browser } from './Browser.js';

/**
 * The component workbench: the Preview iframe plus the Browser beneath it.
 *
 * Switching variants is local state, not navigation — which is why variants ride
 * along inside their component's payload instead of being fetched separately.
 */
export function Pen({ entity }: { entity: EntityPayload }) {
    const [variant, setVariant] = useState(() => entity.variants.find((v) => v.isDefault) ?? entity.variants[0]);

    return (
        <main className="Pen">
            <h1 className="Pen-title">{entity.title}</h1>

            {entity.variants.length > 1 ? (
                <div className="Pen-variants">
                    {entity.variants.map((v) => (
                        <button
                            key={v.handle}
                            type="button"
                            aria-pressed={v.handle === variant?.handle}
                            onClick={() => setVariant(v)}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {variant ? (
                <iframe
                    className="Preview"
                    title={`Preview of ${variant.label}`}
                    src={resolveRouteUrl(variant.previewUrl)}
                />
            ) : null}

            <Browser entity={entity} />
        </main>
    );
}
