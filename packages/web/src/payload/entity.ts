import { CONTRACT_VERSION } from '../contract/version.js';
import type {
    ContextPayload,
    EntityPayload,
    NotesPayload,
    ResourceSummary,
    VariantSummary,
    ViewPayload,
} from '../contract/entity.js';
import type { StatusTable } from './status.js';
import { sanitiseTags } from './tags.js';
import type { SourceComponent, SourceVariant } from './source-types.js';

const visibleVariants = (component: SourceComponent): SourceVariant[] =>
    component.variants().filter('isHidden', false).toArray();

function resourcesOf(component: SourceComponent): ResourceSummary[] {
    const summaries: ResourceSummary[] = [];
    for (const collection of component.resources().toArray()) {
        for (const resource of collection.toArray()) {
            summaries.push({
                name: resource.name,
                path: resource.relPath,
                ext: resource.ext,
                // Raw byte count; formatted client-side. Needs the filesystem,
                // which is why it resolves here and not in the browser.
                size: resource.stat?.size ?? 0,
            });
        }
    }
    return summaries;
}

/**
 * `<handle>.json` — fetched on every navigation, so it carries only what the Pen
 * renders immediately. Notes, context and view source each live in their own
 * payload below.
 */
export function buildEntityPayload(component: SourceComponent, statuses: StatusTable): EntityPayload {
    const visible = visibleVariants(component);

    // A variant handle is only routable when the component has more than one
    // visible variant — the rule `entityHandles` applies when building the route
    // table. Pointing a preview at `<component>--default` for a single-variant
    // component addresses a route that was never created, and the request falls
    // through to the Frame catch-all: the iframe renders the Frame inside itself.
    const addressable = visible.length > 1;

    const variants: VariantSummary[] = visible.map((variant) => {
        const summary: VariantSummary = {
            handle: variant.handle,
            label: variant.label,
            name: variant.name,
            isDefault: variant.isDefault,
            previewUrl: `/components/preview/${addressable ? variant.handle : component.handle}`,
            renderUrl: `/components/render/${addressable ? variant.handle : component.handle}`,
        };
        const status = statuses.keyOf('components', variant.status);
        if (status) summary.status = status;
        return summary;
    });

    const payload: EntityPayload = {
        contractVersion: CONTRACT_VERSION,
        handle: component.handle,
        label: component.label,
        title: component.title,
        viewPath: component.relViewPath,
        // The component's own documents. For a collated component these are the
        // collated ones — every variant in a single render — which is what the
        // build already writes at the component's handle.
        previewUrl: `/components/preview/${component.handle}`,
        renderUrl: `/components/render/${component.handle}`,
        references: component.references.map((r) => r.handle),
        referencedBy: component.referencedBy.map((r) => r.handle),
        variants,
        resources: resourcesOf(component),
    };

    if (component.isCollated) payload.isCollated = true;

    const status = statuses.keyOf('components', component.status);
    if (status) payload.status = status;
    const tags = sanitiseTags(component.tags);
    if (tags) payload.tags = tags;

    return payload;
}

/** `<handle>.notes.json` — raw Markdown, rendered client-side. */
export function buildNotesPayload(component: SourceComponent): NotesPayload {
    return {
        contractVersion: CONTRACT_VERSION,
        handle: component.handle,
        notes: component.notes ?? null,
        variants: visibleVariants(component).map((variant) => ({
            handle: variant.handle,
            notes: variant.notes ?? null,
        })),
    };
}

/** `<handle>.context.json` — real objects, formatted on demand. */
export function buildContextPayload(component: SourceComponent): ContextPayload {
    return {
        contractVersion: CONTRACT_VERSION,
        handle: component.handle,
        context: component.context ?? {},
        variants: visibleVariants(component).map((variant) => ({
            handle: variant.handle,
            context: variant.context ?? {},
        })),
    };
}

/**
 * `<handle>.view.json` — view source per variant, highlighted client-side.
 *
 * Content is repeated across variants sharing a view rather than hoisted:
 * measured at 27.9% raw but only 2.0% gzipped, which does not earn the
 * indirection.
 */
export function buildViewPayload(component: SourceComponent): ViewPayload {
    return {
        contractVersion: CONTRACT_VERSION,
        handle: component.handle,
        variants: visibleVariants(component).map((variant) => ({
            handle: variant.handle,
            content: variant.content ?? null,
            lang: variant.lang ?? 'text',
        })),
    };
}
