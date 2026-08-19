import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { ContextPayload, EntityPayload, VariantSummary, ViewPayload } from '@fractality/web/contract';
import { fetchContext, fetchNotes, fetchRendered, fetchView } from './api.js';
import { frctl, resolveRouteUrl } from './frctl.js';
import { OpenInBrowserIcon } from './Icons.js';
import { highlight } from './highlight.js';
import { read, write } from './storage.js';
import { renderMarkdown } from './markdown.js';
import { Resources } from './Resources.js';

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

/** A `labels.components.*` string, by dotted path. */
const componentLabel = (path: string, fallback: string): string => {
    let value: unknown = frctl.labels?.components;
    for (const key of path.split('.')) {
        value = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined;
    }
    return typeof value === 'string' ? value : fallback;
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
    const format = (context: unknown) =>
        context && Object.keys(context).length
            ? JSON.stringify(context, null, 2)
            : // What the template layer showed for a component with no context. `{}`
              // is technically the answer and tells a reader nothing.
              `/* ${componentLabel('context.empty', 'No context defined.')} */`;

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
/** The documents on screen, as the Pen resolved them. */
export interface ShownDocuments {
    previewUrl: string;
    renderUrl: string;
}

interface BrowserProps {
    entity: EntityPayload;
    /** The variant on screen, if a single one is. Absent for a collation. */
    variant?: VariantSummary;
    /** What the Preview is showing — decided by the Pen, which owns that choice. */
    showing: ShownDocuments;
    onNavigate: (href: string) => void;
}

export function Browser({ entity, variant, showing, onNavigate }: BrowserProps) {
    // Persisted because the Pen remounts on navigation: without this, every
    // component you opened would reset you to the first tab. The fallback is
    // the first panel, as it was when the template layer rendered the tabs.
    // A panel remembered from before the consumer narrowed `panels` would leave
    // the Browser showing a body with no tab to match it.
    const [open, setOpen] = useState<Panel>(() => {
        const remembered = read<Panel>('browser.panel', PANELS[0]);
        return PANELS.includes(remembered) ? remembered : PANELS[0];
    });

    // A component with no files of its own gets no Resources tab, as it got none
    // from the template layer — an empty panel is worse than an absent one. Known
    // from the entity payload, so nothing has to be fetched to draw the strip.
    const panels: readonly [Panel, ...Panel[]] = (() => {
        const shown = PANELS.filter((panel) => panel !== 'resources' || entity.resources.length > 0);
        return shown.length ? (shown as [Panel, ...Panel[]]) : PANELS;
    })();

    // The remembered panel may be one this component does not show.
    const active = panels.includes(open) ? open : panels[0];
    /** Rendered HTML for the open panel, or null while it is still loading. */
    const [body, setBody] = useState<string | null>(null);

    const needsFetch = active === 'notes' || active === 'context' || active === 'view' || active === 'html';

    useEffect(() => {
        if (!needsFetch) return;
        let cancelled = false;
        setBody(null);

        const load = async (): Promise<string> => {
            if (active === 'html') {
                // Whatever the Preview is showing, so the two agree — including
                // when that is a collation rather than a single variant.
                return highlight(await fetchRendered(resolveRouteUrl(showing.renderUrl)), 'html');
            }
            if (active === 'notes') {
                const payload = await fetchNotes(entity.handle);
                return payload.notes ? renderMarkdown(payload.notes) : '';
            }
            if (active === 'context') {
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
    }, [entity.handle, active, needsFetch, showing.renderUrl, variant?.handle]);

    return (
        <div className="Browser">
            <div className="Browser-controls">
                <ul className="Browser-tabs">
                    {panels.map((panel) => (
                        <li
                            className={`Browser-tab Browser-tab--${panel}${active === panel ? ' is-active' : ''}`}
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

            <Panel
                panel={active}
                entity={entity}
                variant={variant}
                showing={showing}
                onNavigate={onNavigate}
                body={body}
            />
        </div>
    );
}

/**
 * A row of the Info panel.
 *
 * `ul`/`li`/`strong`/`span` with these class names because that is what the
 * stylesheet styles: `.Meta-item` draws the rule between rows and `.Meta-key`
 * floats into a label column on a wide viewport. The `dl` this replaces used
 * class names the stylesheet has never had, so every row ran together
 * unstyled — structure the CSS does not know about is invisible work.
 */
function MetaItem({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
    return (
        <li className="Meta-item">
            <strong className="Meta-key">
                {/* No space before the colon, and one before a count, as the
                    template layer wrote it: `Variants <em>(3)</em>:`. */}
                {count === undefined ? (
                    `${label}:`
                ) : (
                    <>
                        {label} <em className="Meta-count">({count})</em>:
                    </>
                )}
            </strong>
            <span className="Meta-value">{children}</span>
        </li>
    );
}

/**
 * A comma-separated list of links, as the template layer's `Meta-value--linkList`
 * rows were.
 *
 * These navigate in the Frame rather than reloading it — the equivalent of the
 * `data-pjax` the template layer put on them, and the reason the Browser is
 * handed a navigate callback at all.
 */
function LinkList({
    items,
    onNavigate,
}: {
    items: Array<{ href: string; label: string }>;
    onNavigate: (href: string) => void;
}) {
    return (
        <span className="Meta-value--linkList">
            {items.map((item, index) => (
                <Fragment key={item.href}>
                    <a
                        href={item.href}
                        onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                            event.preventDefault();
                            onNavigate(item.href);
                        }}
                    >
                        <span>{item.label}</span>
                    </a>
                    {index < items.length - 1 ? ', ' : null}
                </Fragment>
            ))}
        </span>
    );
}

/**
 * What the component is, and where to find it. Mirrors
 * `views/partials/browser/panel-info.nunj`.
 *
 * Every row it lists was in that template and had gone missing here: the
 * variants, the two ways to open the Preview on its own, and what references this
 * component — which the payload has carried all along.
 */
function Info({
    entity,
    variant,
    showing,
    onNavigate,
}: {
    entity: EntityPayload;
    variant?: VariantSummary;
    showing: ShownDocuments;
    onNavigate: (href: string) => void;
}) {
    const detailUrl = (handle: string) => resolveRouteUrl(`/components/detail/${handle}`);
    const variants = entity.variants;

    return (
        <div className="Browser-panel Browser-info is-active" id="browser-panel-info">
            <ul className="Meta">
                <MetaItem label={componentLabel('handle', 'Handle')}>@{variant?.handle ?? entity.handle}</MetaItem>

                {entity.tags?.length ? (
                    <MetaItem label={componentLabel('tags', 'Tags')}>{entity.tags.join(', ')}</MetaItem>
                ) : null}

                {variants.length > 1 ? (
                    <MetaItem label={componentLabel('variants', 'Variants')} count={variants.length}>
                        <LinkList
                            items={variants.map((v) => ({ href: detailUrl(v.handle), label: v.label }))}
                            onNavigate={onNavigate}
                        />
                    </MetaItem>
                ) : null}

                <MetaItem label={componentLabel('preview.label', 'Preview')}>
                    {/*
                        Both documents the Preview iframe can hold, opened on their
                        own. Real links out of the Frame — the template layer marked
                        these `data-no-pjax` for the same reason.
                    */}
                    <ul>
                        <li>
                            <a href={resolveRouteUrl(showing.previewUrl)} target="_blank" rel="noopener noreferrer">
                                <span>{componentLabel('preview.withLayout', 'With layout')}</span>
                                <OpenInBrowserIcon />
                            </a>
                        </li>
                        <li>
                            <a href={resolveRouteUrl(showing.renderUrl)} target="_blank" rel="noopener noreferrer">
                                <span>{componentLabel('preview.componentOnly', 'Component only')}</span>
                                <OpenInBrowserIcon />
                            </a>
                        </li>
                    </ul>
                </MetaItem>

                <MetaItem label={componentLabel('path', 'Filesystem Path')}>{entity.viewPath}</MetaItem>

                {entity.references.length ? (
                    <MetaItem label={componentLabel('references', 'References')} count={entity.references.length}>
                        <LinkList
                            items={entity.references.map((handle) => ({
                                href: detailUrl(handle),
                                label: `@${handle}`,
                            }))}
                            onNavigate={onNavigate}
                        />
                    </MetaItem>
                ) : null}

                {entity.referencedBy.length ? (
                    <MetaItem label={componentLabel('referenced', 'Referenced by')} count={entity.referencedBy.length}>
                        <LinkList
                            items={entity.referencedBy.map((handle) => ({
                                href: detailUrl(handle),
                                label: `@${handle}`,
                            }))}
                            onNavigate={onNavigate}
                        />
                    </MetaItem>
                ) : null}
            </ul>
        </div>
    );
}

interface PanelProps {
    panel: Panel;
    entity: EntityPayload;
    variant?: VariantSummary;
    showing: ShownDocuments;
    onNavigate: (href: string) => void;
    body: string | null;
}

function Panel({ panel, entity, variant, showing, onNavigate, body }: PanelProps) {
    if (panel === 'info') {
        return <Info entity={entity} variant={variant} showing={showing} onNavigate={onNavigate} />;
    }

    if (panel === 'resources') {
        // Its own component: it fetches a payload of its own and renders
        // structure rather than a block of highlighted text.
        return <Resources entity={entity} />;
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
                        <p className="Browser-isEmptyNote">{componentLabel('notes.empty', 'No notes defined.')}</p>
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
