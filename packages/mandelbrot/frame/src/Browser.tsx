import { useEffect, useState } from 'react';
import type { EntityPayload } from '@fractality/web/contract';
import { fetchContext, fetchNotes, fetchView } from './api.js';
import { frctl } from './frctl.js';
import { highlight } from './highlight.js';
import { read, write } from './storage.js';
import { renderMarkdown } from './markdown.js';

const PANELS = ['notes', 'context', 'view', 'resources', 'info'] as const;
type Panel = (typeof PANELS)[number];

const label = (panel: Panel): string => {
    const labels = (frctl.labels?.panels ?? {}) as Record<string, string>;
    return labels[panel] ?? panel.charAt(0).toUpperCase() + panel.slice(1);
};

/**
 * The tabbed panel beneath the Preview. Mirrors `views/partials/browser/`.
 *
 * Panels that need data fetch it the first time they are opened, which is the
 * reason the entity payload is split by panel at all — a navigation costs a few
 * hundred bytes rather than the component's whole notes, context and source.
 */
export function Browser({ entity }: { entity: EntityPayload }) {
    // Persisted because the Pen remounts on navigation: without this, every
    // component you opened would reset you to the first tab.
    const [open, setOpen] = useState<Panel>(() => read<Panel>('browser.panel', 'notes'));
    /** Rendered HTML for the open panel, or null while it is still loading. */
    const [body, setBody] = useState<string | null>(null);

    const needsFetch = open === 'notes' || open === 'context' || open === 'view';

    useEffect(() => {
        if (!needsFetch) return;
        let cancelled = false;
        setBody(null);

        const load = async (): Promise<string> => {
            if (open === 'notes') {
                const payload = await fetchNotes(entity.handle);
                return payload.notes ? renderMarkdown(payload.notes) : '';
            }
            if (open === 'context') {
                const payload = await fetchContext(entity.handle);
                // Formatted here rather than at build time: the payload carries
                // the real object, so the panel chooses how to present it.
                return highlight(JSON.stringify(payload.context, null, 2), 'json');
            }
            const payload = await fetchView(entity.handle);
            const variant = payload.variants[0];
            return highlight(variant?.content ?? '', variant?.lang ?? '', entity.references);
        };

        load().then(
            (next) => !cancelled && setBody(next),
            (error: unknown) => !cancelled && setBody(String(error)),
        );

        return () => {
            cancelled = true;
        };
    }, [entity.handle, open, needsFetch]);

    return (
        <div className="Browser">
            <div className="Browser-controls">
                <ul className="Browser-tabs">
                    {PANELS.map((panel) => (
                        <li
                            className={`Browser-tab Browser-tab--${panel}${open === panel ? ' is-active' : ''}`}
                            key={panel}
                        >
                            <a
                                href={`#browser-panel-${panel}`}
                                onClick={(event) => {
                                    event.preventDefault();
                                    setOpen(panel);
                                    write('browser.panel', panel);
                                }}
                            >
                                {label(panel)}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>

            <Panel panel={open} entity={entity} body={body} />
        </div>
    );
}

function Panel({ panel, entity, body }: { panel: Panel; entity: EntityPayload; body: string | null }) {
    if (panel === 'info') {
        return (
            <div className="Browser-panel Browser-info" id="browser-panel-info">
                <dl className="Meta">
                    <dt className="Meta-term">Handle</dt>
                    <dd className="Meta-description">@{entity.handle}</dd>
                    <dt className="Meta-term">Filesystem Path</dt>
                    <dd className="Meta-description">{entity.viewPath}</dd>
                    {entity.tags?.length ? (
                        <>
                            <dt className="Meta-term">Tags</dt>
                            <dd className="Meta-description">{entity.tags.join(', ')}</dd>
                        </>
                    ) : null}
                    {entity.references.length ? (
                        <>
                            <dt className="Meta-term">References</dt>
                            <dd className="Meta-description">{entity.references.join(', ')}</dd>
                        </>
                    ) : null}
                </dl>
            </div>
        );
    }

    if (panel === 'resources') {
        return (
            <div className="Browser-panel Browser-resources" id="browser-panel-resources">
                {entity.resources.length ? (
                    <ul className="FileBrowser-items">
                        {entity.resources.map((resource) => (
                            <li className="FileBrowser-item" key={resource.path}>
                                {resource.name} <span>{resource.size} bytes</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="Browser-isEmptyNote">No resources.</p>
                )}
            </div>
        );
    }

    if (body === null) {
        return <div className="Browser-panel" id={`browser-panel-${panel}`} />;
    }

    if (panel === 'notes') {
        return (
            <div className="Browser-panel Browser-notes" id="browser-panel-notes">
                <div className="Prose Prose--condensed">
                    {body ? (
                        <div dangerouslySetInnerHTML={{ __html: body }} />
                    ) : (
                        <p className="Browser-isEmptyNote">No notes defined.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="Browser-panel Browser-code" id={`browser-panel-${panel}`}>
            <code className={`Code Code--lang-${panel === 'context' ? 'json' : 'view'} hljs`}>
                {/*
                    Highlighted markup, produced client-side from source the
                    payload carries. The source is the project's own templates
                    and data — the same trust boundary as the Preview, which
                    already executes them.
                */}
                <pre dangerouslySetInnerHTML={{ __html: body }} />
            </code>
        </div>
    );
}
