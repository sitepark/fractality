import { useEffect, useState } from 'react';
import type { EntityPayload } from '@fractality/web/contract';
import { fetchContext, fetchNotes, fetchView } from './api.js';

const PANELS = ['notes', 'context', 'view'] as const;
type Panel = (typeof PANELS)[number];

/**
 * The tabbed panel beneath the Preview.
 *
 * Each tab's data is a separate payload fetched the first time it is opened —
 * that is the whole reason the entity payload is split, and it is what keeps a
 * navigation costing a few hundred bytes rather than the component's entire
 * notes, context and source.
 */
export function Browser({ entity }: { entity: EntityPayload }) {
    const [open, setOpen] = useState<Panel>('notes');
    const [body, setBody] = useState<string>('');

    useEffect(() => {
        let cancelled = false;
        setBody('');

        const load = async (): Promise<string> => {
            if (open === 'notes') {
                const payload = await fetchNotes(entity.handle);
                return payload.notes ?? 'No notes defined.';
            }
            if (open === 'context') {
                const payload = await fetchContext(entity.handle);
                // Formatted here rather than at build time: the payload carries
                // the real object, so the panel can present it however it likes.
                return JSON.stringify(payload.context, null, 2);
            }
            const payload = await fetchView(entity.handle);
            return payload.variants[0]?.content ?? '';
        };

        load().then(
            (next) => {
                if (!cancelled) setBody(next);
            },
            (error: unknown) => {
                if (!cancelled) setBody(String(error));
            },
        );

        return () => {
            cancelled = true;
        };
    }, [entity.handle, open]);

    return (
        <div className="Browser">
            <div className="Browser-tabs" role="tablist">
                {PANELS.map((panel) => (
                    <button
                        key={panel}
                        type="button"
                        role="tab"
                        aria-selected={open === panel}
                        onClick={() => setOpen(panel)}
                    >
                        {panel}
                    </button>
                ))}
            </div>
            <pre className="Browser-panel" data-panel={open}>
                {body}
            </pre>
        </div>
    );
}
