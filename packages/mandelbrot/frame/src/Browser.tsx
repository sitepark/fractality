import { useEffect, useState } from 'react';
import type { ContextPayload, EntityPayload, VariantSummary, ViewPayload } from '@fractality/web/contract';
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
 * A variant's label, for the headers a collated panel puts between variants.
 *
 * The panel payloads key their variants by handle; the labels live on the entity
 * payload the Pen already has.
 */
const labelFor = (entity: EntityPayload, handle: string): string =>
    entity.variants.find((v) => v.handle === handle)?.label ?? handle;

/**
 * What the Context panel shows.
 *
 * Three cases, which are the template layer's: the variant on screen if there is
 * one, every variant when the component is a collation of them — the panel is
 * describing one document containing all of them, so showing one variant's data
 * would describe a third of what is rendered — and otherwise the component's own.
 */
function contextSource(payload: ContextPayload, entity: EntityPayload, variant?: VariantSummary): string {
    const format = (context: unknown) => JSON.stringify(context, null, 2);

    if (variant) {
        const own = payload.variants.find((v) => v.handle === variant.handle);
        return format(own ? own.context : payload.context);
    }

    if (entity.isCollated && payload.variants.length > 1) {
        return payload.variants.map((v) => `/* ${labelFor(entity, v.handle)} */\n${format(v.context)}`).join('\n\n');
    }

    return format(payload.context);
}

/**
 * What the View panel shows, and which language to highlight it as.
 *
 * A collation whose variants share one view file shows it once rather than four
 * identical copies — the rule `getCollatedContent()` applied, and the common case,
 * since variants usually differ by context alone.
 */
function viewSource(
    payload: ViewPayload,
    entity: EntityPayload,
    variant?: VariantSummary,
): { content: string; lang: string } {
    const first = payload.variants[0];

    if (variant) {
        const own = payload.variants.find((v) => v.handle === variant.handle) ?? first;
        return { content: own?.content ?? '', lang: own?.lang ?? '' };
    }

    const shared = payload.variants.every((v) => v.content === first?.content);

    if (entity.isCollated && payload.variants.length > 1 && !shared) {
        return {
            content: payload.variants
                .map((v) => `<!-- ${labelFor(entity, v.handle)} -->\n${(v.content ?? '').trim()}`)
                .join('\n\n'),
            lang: first?.lang ?? '',
        };
    }

    return { content: first?.content ?? '', lang: first?.lang ?? '' };
}

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
interface BrowserProps {
    entity: EntityPayload;
    /** The variant on screen, if a single one is. Absent for a collation. */
    variant?: VariantSummary;
    /** The document the HTML panel reads — decided by the Pen, which owns what is on screen. */
    renderUrl: string;
}

export function Browser({ entity, variant, renderUrl }: BrowserProps) {
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
                // Whatever the Preview is showing, so the two agree — including
                // when that is a collation rather than a single variant.
                return highlight(await fetchRendered(resolveRouteUrl(renderUrl)), 'html');
            }
            if (open === 'notes') {
                const payload = await fetchNotes(entity.handle);
                return payload.notes ? renderMarkdown(payload.notes) : '';
            }
            if (open === 'context') {
                // Formatted here rather than at build time: the payload carries
                // the real objects, so the panel chooses how to present them.
                return highlight(contextSource(await fetchContext(entity.handle), entity, variant), 'json');
            }
            const source = viewSource(await fetchView(entity.handle), entity, variant);
            return highlight(source.content, source.lang, entity.references);
        };

        load().then(
            (next) => !cancelled && setBody(next),
            (error: unknown) => !cancelled && setBody(String(error)),
        );

        return () => {
            cancelled = true;
        };
    }, [entity.handle, open, needsFetch, renderUrl, variant?.handle]);

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
