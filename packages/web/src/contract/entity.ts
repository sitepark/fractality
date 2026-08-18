import type { JsonObject } from './json.js';
import type { Handle, StatusKey } from './tree.js';
import type { Versioned } from './version.js';

/**
 * A variant as the Pen needs it on arrival. The variant switcher is local
 * state rather than navigation, so variants ride along in their component's
 * payload instead of being separately addressable.
 */
export interface VariantSummary {
    handle: Handle;
    label: string;
    name: string;
    isDefault: boolean;
    status?: StatusKey;
    previewUrl: string;
}

/** A file belonging to a component — a stylesheet, a script, a README. */
export interface ResourceSummary {
    name: string;
    /** Relative to the component's own directory. */
    path: string;
    ext: string;
    /** Raw byte count. Formatted client-side. */
    size: number;
}

/**
 * `<handle>.json` — fetched on every navigation, so it carries only what the
 * Pen renders immediately. Measured at ~470 bytes against ~12 KB for the
 * unsplit payload. Everything panel-shaped lives in its own file below.
 */
export interface EntityPayload extends Versioned {
    handle: Handle;
    label: string;
    title: string;
    status?: StatusKey;
    tags?: string[];
    /** Relative to the components root. */
    viewPath: string;
    /** Handles this component references. Drives client-side link rewriting. */
    references: Handle[];
    /** Handles referencing this component. */
    referencedBy: Handle[];
    variants: VariantSummary[];
    resources: ResourceSummary[];
    /**
     * Theme-contributed data, namespaced by theme name. Outside the contract's
     * compatibility guarantee by definition — a theme's own data shape is its
     * own problem.
     */
    ext?: Record<string, unknown>;
}

/**
 * `<handle>.notes.json` — raw Markdown, rendered client-side. Not HTML: the
 * payload carries source of truth, not presentation, and `markdown()` highlights
 * fenced code internally, which would otherwise create a second highlighting
 * path alongside the View panel's.
 */
export interface NotesPayload extends Versioned {
    handle: Handle;
    notes: string | null;
    variants: Array<{ handle: Handle; notes: string | null }>;
}

/** `<handle>.context.json` — real objects, formatted to JSON/YAML on demand. */
export interface ContextPayload extends Versioned {
    handle: Handle;
    context: JsonObject;
    variants: Array<{ handle: Handle; context: JsonObject }>;
}

/**
 * `<handle>.view.json` — view source per variant, highlighted client-side.
 *
 * Content is deliberately repeated across variants that share a view rather
 * than hoisted and referenced: measured at 27.9% raw but only 2.0% gzipped,
 * which does not earn the indirection.
 */
export interface ViewPayload extends Versioned {
    handle: Handle;
    variants: Array<{ handle: Handle; content: string | null; lang: string }>;
}

/**
 * `docs/<path>.json` — a documentation page.
 *
 * Carries **raw Markdown**, not rendered HTML, for the same reason notes do: the
 * payload holds source of truth and the Frame decides how to present it. It also
 * keeps `markdown()`'s built-in code highlighting from creating a second
 * highlighting path alongside the View panel's.
 */
export interface DocPayload extends Versioned {
    handle: Handle;
    label: string;
    title: string;
    /** URL path below the docs root. Empty for the index page. */
    path: string;
    status?: StatusKey;
    content: string;
}

/** One file inside an asset source. */
export interface AssetFile {
    name: string;
    /** Path relative to the asset source root. */
    path: string;
    /** Where the file is actually served, from `web.assets.mount`. */
    url: string;
    ext: string;
    size: number;
}

/**
 * `assets/<name>.json` — an asset source and the files in it.
 *
 * An asset source is a directory a project registers with
 * `fractality.assets.add()`; it is opt-in, so most libraries have none.
 */
export interface AssetPayload extends Versioned {
    name: string;
    label: string;
    title: string;
    /** Raw Markdown, rendered client-side like every other note. */
    notes: string | null;
    files: AssetFile[];
}
