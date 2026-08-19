/**
 * The one addressing rule, shared by the dev server and the static build.
 *
 * Payloads are siblings of the route they back, and a client derives a payload
 * URL from its own location: strip a trailing `.html`, then append the panel
 * segment and `.json`.
 *
 * That single rule is what absorbs the fact that the two modes do **not** share
 * URLs — dev serves `/components/detail/button` while the static build emits
 * `button.html`. Both derive to `/components/detail/button.json`, so the client
 * never has to know which mode it is running in, and nothing has to be
 * configured on the server.
 *
 * Specified in docs/specs/client-rendered-frame.md §4.1.
 */

/** Panel payloads that ship with `@fractality/web` itself. */
export type BuiltinPanel = 'notes' | 'context' | 'view' | 'resources';

/** A theme-contributed panel, namespaced by theme — see the `ext` slot. */
export type ExtPanel = `ext.${string}.${string}`;

export type PanelSegment = BuiltinPanel | ExtPanel;

export const BUILTIN_PANELS: readonly BuiltinPanel[] = ['notes', 'context', 'view', 'resources'];

/** Builds the `ext` segment for a theme-contributed panel. */
export const extPanel = (theme: string, panel: string): ExtPanel => `ext.${theme}.${panel}`;

/**
 * Derives a payload path from a route path.
 *
 * Accepts either mode's form of a route and yields the same result:
 *
 * ```
 * payloadPathFor('/components/detail/button')       // /components/detail/button.json
 * payloadPathFor('/components/detail/button.html')  // /components/detail/button.json
 * payloadPathFor('/components/detail/button', 'notes')
 * //                                               // /components/detail/button.notes.json
 * ```
 */
export function payloadPathFor(routePath: string, panel?: PanelSegment): string {
    // A client passes `location.pathname`, but be defensive: a caller passing a
    // full href should not silently produce a payload path with a query in it.
    const withoutFragment = routePath.split(/[?#]/, 1)[0] ?? '';
    const withoutTrailingSlash = withoutFragment.length > 1 ? withoutFragment.replace(/\/+$/, '') : withoutFragment;
    const base = withoutTrailingSlash.replace(/\.html$/i, '');

    return panel ? `${base}.${panel}.json` : `${base}.json`;
}
