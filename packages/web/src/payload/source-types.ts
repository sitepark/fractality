/**
 * The seam between JavaScript and TypeScript.
 *
 * `@fractality/core` and `@fractality/fractality` are JavaScript, so these
 * interfaces describe what the payload builders *read* from a loaded library —
 * not anything those packages guarantee. **Nothing checks that they still
 * match.** Drift surfaces here first, and it surfaces at runtime rather than at
 * compile time.
 *
 * This is a deliberate trade recorded in docs/specs/client-rendered-frame.md §11:
 * the type boundary stops at the payload contract so the `mixwith` class-factory
 * layer stays out of scope. The payload tests are what stand in for a compiler
 * here, so keep them exercising real entities rather than hand-built objects.
 */
import type { JsonObject } from '../contract/json.js';

/** A resolved status. Note it carries no key — see `status.ts`. */
export interface SourceStatus {
    label: string;
    color: string;
    description?: string;
}

export interface SourceResource {
    name: string;
    relPath: string;
    ext: string;
    stat?: { size: number } | null;
}

export interface SourceResourceCollection {
    toArray(): SourceResource[];
}

export interface RenderOptions {
    /** Wrap in the user's own `@preview` layout, if their library has one. */
    preview?: boolean;
    collate?: boolean;
}

export interface Renderable {
    render(context: unknown, env: unknown, opts: RenderOptions): Promise<string>;
}

export interface SourceVariant extends Renderable {
    handle: string;
    label: string;
    name: string;
    isDefault: boolean;
    isHidden: boolean;
    status?: SourceStatus | null;
    context?: JsonObject;
    notes?: string | null;
    content?: string | null;
    lang?: string;
}

export interface SourceVariantCollection {
    toArray(): SourceVariant[];
    filter(field: string, value: unknown): SourceVariantCollection;
    size: number;
}

export interface SourceComponent extends Renderable {
    handle: string;
    label: string;
    title: string;
    isHidden: boolean;
    isComponent: true;
    isCollated: boolean;
    status?: SourceStatus | null;
    tags?: string[];
    notes?: string | null;
    context?: JsonObject;
    relViewPath: string;
    references: Array<{ handle: string }>;
    referencedBy: Array<{ handle: string }>;
    variants(): SourceVariantCollection;
    resources(): { toArray(): SourceResourceCollection[] };
}

export interface SourceDoc {
    handle: string;
    label: string;
    title: string;
    /** URL path below the docs root. Empty string for the index page. */
    path: string;
    isHidden: boolean;
    isIndex?: boolean;
    status?: SourceStatus | null;
    tags?: string[];
    /** Raw Markdown. */
    content?: string;
}

export interface SourceAsset {
    name: string;
    label?: string;
    handle?: string;
}

export interface SourceCollection {
    handle: string;
    label: string;
    isHidden: boolean;
    isCollection: true;
    isRoot?: boolean;
    items(): SourceTreeItem[];
}

export type SourceTreeItem = SourceCollection | SourceComponent | SourceDoc;

export const isCollection = (item: SourceTreeItem): item is SourceCollection =>
    (item as SourceCollection).isCollection === true;

export const isComponent = (item: SourceTreeItem): item is SourceComponent =>
    (item as SourceComponent).isComponent === true;

/** Loading is what turns a configured app into a populated tree. */
export interface Loadable {
    load(): Promise<unknown>;
}

/** The subset of a loaded Fractality app the payload builders touch. */
export interface SourceApp {
    get(path: string): unknown;
    components: { items(): SourceTreeItem[]; flatten(): { toArray(): SourceComponent[] } };
    docs: { items(): SourceTreeItem[]; flatten(): { toArray(): SourceDoc[] } };
    /** Returns a plain array, not a collection — verified against a loaded app. */
    assets?: { visible?(): SourceAsset[] };
}
