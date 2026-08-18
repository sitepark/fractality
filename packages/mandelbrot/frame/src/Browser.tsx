import { useEffect, useState } from 'react';
import type { EntityPayload, VariantSummary } from '@fractality/web/contract';
import { fetchContext, fetchNotes, fetchRendered, fetchView } from './api.js';
import { frctl, resolveRouteUrl } from './frctl.js';
import { highlight } from './highlight.js';
import { read, write } from './storage.js';
import { renderMarkdown } from './markdown.js';

// Every panel this theme implements. Order matches the historic default; which
// of them are actually shown is the consumer's `panels` config.
const IMPLEMENTED = ['html', 'view', 'context', 'resources', 'info', 'notes'] as const;
type Panel = (typeof IMPLEMENTED)[number];

const isPanel = (name: string): name is Panel => (IMPLEMENTED as readonly string[]).includes(name);

/**
 * The panels to show, in the consumer's order.
 *
 * A configured name this theme has no panel for is dropped rather than being
 * rendered as an empty tab — `panels` is passed through uninterpreted by
 * `@fractality/web`, so deciding what a name means is the theme's job. A config
 * naming nothing we implement falls back to the full set: an empty Browser is a
 * worse answer to a typo than the default one.
 */
// Typed as non-empty, because the fallback guarantees it and the default open
// panel is PANELS[0].
const PANELS: readonly [Panel, ...Panel[]] = (() => {
    const configured = Array.isArray(frctl.panels) ? frctl.panels.filter(isPanel) : [];
    return configured.length ? (configured as [Panel, ...Panel[]]) : IMPLEMENTED;
})();

const label = (panel: Panel): string => {
    const labels = (frctl.labels?.panels ?? {}) as Record<string, string>;
    return labels[panel] ?? panel.charAt(0).toUpperCase() + panel.slice(1);
};

/**
 * The tabbed panel beneath the Preview. Mirrors `views/partials/browser/`.
 *
 * Only the open panel is rendered, where the template layer rendered all of them
 * and toggled visibility. Either way the stylesheet decides what is visible:
 * `.Browser-panel` is `display: none` unless it also carries `is-active`, so a
 * rendered panel without that class is present in the DOM and invisible.
 *
 * Panels that need data fetch it the first time they are opened, which is the
 * reason the entity payload is split by panel at all — a navigation costs a few
 * hundred bytes rather than the component's whole notes, context and source.
 */
export function Browser({ entity, variant }: { entity: EntityPayload; variant?: VariantSummary }) {
    // Persisted because the Pen remounts on navigation: without this, every
    // component you opened would reset you to the first tab. The fallback is
    // the first panel, as it was when the template layer rendered the tabs.
    // A panel remembered from before the consumer narrowed `panels` would leave
    // the Browser showing a body with no tab to match it.
    const [open, setOpen] = useState<Panel>(() => {
        const remembered = read<Panel>('browser.panel', PANELS[0]);
        return PANELS.includes(remembered) ? remembered : PANELS[0];
    });
    /** Rendered HTML for the open panel, or null while it is still loading. */
    const [body, setBody] = useState<string | null>(null);

    const needsFetch = open === 'notes' || open === 'context' || open === 'view' || open === 'html';

    useEffect(() => {
        if (!needsFetch) return;
        let cancelled = false;
        setBody(null);

        const load = async (): Promise<string> => {
            if (open === 'html') {
                // The variant currently shown, so the panel and the Preview
                // agree about what is being looked at.
                const url = variant?.renderUrl ?? entity.variants[0]?.renderUrl;
                if (!url) return '';
                return highlight(await fetchRendered(resolveRouteUrl(url)), 'html');
            }
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
            const source = payload.variants[0];
            return highlight(source?.content ?? '', source?.lang ?? '', entity.references);
        };

        load().then(
            (next) => !cancelled && setBody(next),
            (error: unknown) => !cancelled && setBody(String(error)),
        );

        return () => {
            cancelled = true;
        };
    }, [entity.handle, open, needsFetch, variant?.renderUrl]);

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
            <div className="Browser-panel Browser-info is-active" id="browser-panel-info">
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
            <div className="Browser-panel Browser-resources is-active" id="browser-panel-resources">
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
        return <div className="Browser-panel is-active" id={`browser-panel-${panel}`} />;
    }

    if (panel === 'notes') {
        return (
            <div className="Browser-panel Browser-notes is-active" id="browser-panel-notes">
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
        <div className="Browser-panel Browser-code is-active" id={`browser-panel-${panel}`}>
            <code className={`Code Code--lang-${panel === 'context' ? 'json' : panel} hljs`}>
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
