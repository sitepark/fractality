import WebError from '../error.js';
import type { StaticMount } from '../theme.js';
import { resolveShellMount } from './mount.js';

/**
 * The global configuration the Shell needs *before* any JavaScript runs,
 * serialised into the `window.frctl` block at site build time.
 *
 * Everything here is global rather than per-route — that is what keeps the Shell
 * copies byte-identical. Anything that varies per route belongs in a payload.
 *
 * Specified in docs/specs/client-rendered-frame.md §6.
 */
export interface FrctlConfig {
    env: 'static' | 'server';
    /**
     * Where the theme's own JS and CSS live, root-absolute. Baked at site build
     * from the consumer's `static.mount`.
     */
    themeMount: string;
    /**
     * Where site data lives, root-absolute. Deliberately distinct from
     * `themeMount`: the tree payload is site data and does not belong under the
     * theme's directory.
     */
    siteRoot: string;
    /** Where the tree payload sits, relative to `siteRoot`. */
    treeFile: string;
    /**
     * Stylesheet URLs the theme wants linked into the Shell, already
     * root-absolute. The theme owns its own appearance, so these are passed
     * through rather than interpreted.
     */
    styles?: string[];
    /**
     * Script URLs the theme wants in the Shell, already root-absolute.
     *
     * A consumer's own scripts, passed through like `styles`. Not the theme's own
     * bundle: the Shell loads that itself.
     */
    scripts?: string[];
    /** Favicon URL, root-absolute. */
    favicon?: string;
    /**
     * Document language, for the `<html lang>` attribute.
     *
     * Here rather than left to the Shell because a theme builds its Shell once,
     * before it knows whose library it will render — and rather than applied by
     * the Frame at runtime, because both this and `dir` have to be right at first
     * paint.
     */
    lang?: string;
    /** Writing direction, for the `<html dir>` attribute. */
    dir?: 'ltr' | 'rtl';
    /**
     * The project's own name, from `project.title`.
     *
     * The library's, not the theme's — which is why it is here rather than in
     * `labels`: a theme has no business defaulting it, and every theme needs it
     * for its header and the document title.
     */
    projectTitle?: string;
    /** Consumer overrides only — a theme's own label defaults live in its bundle. */
    labels?: Record<string, unknown>;
    /**
     * Which panels the Browser shows, in order.
     *
     * Global rather than per-route, which is why it belongs here: the same list
     * applies to every component. A theme decides what a name means and ignores
     * ones it does not implement, so this is passed through uninterpreted.
     */
    panels?: string[];
    /** Custom-property theming, resolved to final values at site build. */
    theming?: Record<string, string>;
}

/**
 * Serialises config for embedding in an inline `<script>`.
 *
 * `JSON.stringify` alone is unsafe here. The value ends up inside a script
 * element, so a `</script>` sequence anywhere in it — a label, a theme name, a
 * consumer's own string — would terminate the block early and inject the
 * remainder as markup. Escaping `<` covers that and every other forbidden
 * sequence (`<!--`, `<script`, `</script`) in one move.
 *
 * `U+2028` and `U+2029` are escaped too: they are valid in JSON but are line
 * terminators in JavaScript source, so they would produce a syntax error.
 */
export function serialiseFrctlConfig(config: FrctlConfig): string {
    // Written as escapes rather than literals for the same reason they are being
    // escaped: a raw U+2028 in this source file is itself a line terminator and
    // would terminate the regex literal it appears in.
    return JSON.stringify(config)
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

/** The part of a Theme this reads: its configuration and its static mounts. */
export interface ThemeConfigSource {
    get(key: string): unknown;
    static(): StaticMount[];
}

/** The part of a loaded library this reads: its configuration, and nothing else. */
export interface AppConfigSource {
    get(key: string): unknown;
}

export interface FrctlConfigOptions {
    theme: ThemeConfigSource;
    app: AppConfigSource;
    env: FrctlConfig['env'];
    /** Where the theme's Shell sits on disk, which fixes the asset mount. */
    shellPath: string;
}

/**
 * Assembles the global config from the theme's configuration and the library's.
 *
 * Shared by the dev server and the static builder rather than written out in
 * both: they must agree on every field, and `env` is the only thing that differs
 * between them. Two copies made a missing field invisible — `theming` was
 * declared above and populated by neither, so `skin` silently did nothing.
 */
export function frctlConfigFor({ theme, app, env, shellPath }: FrctlConfigOptions): FrctlConfig {
    const mount = resolveShellMount(shellPath, theme.static());
    if (!mount) {
        throw new WebError(
            `The theme's Shell (${shellPath}) is not inside any of its static mounts, ` +
                'so its assets cannot be addressed. Call addStatic() for the directory ' +
                'the Shell is built into.',
        );
    }

    return {
        env,
        themeMount: mount,
        siteRoot: '',
        treeFile: '/tree.json',
        // Read off the library, not the theme: this is the project's name.
        projectTitle: (app.get('project.title') as string) ?? undefined,
        styles: ([] as string[]).concat((theme.get('styles') as string[]) ?? []),
        scripts: ([] as string[]).concat((theme.get('scripts') as string[]) ?? []),
        favicon: (theme.get('favicon') as string) ?? undefined,
        lang: (theme.get('lang') as string) ?? undefined,
        dir: (theme.get('dir') as 'ltr' | 'rtl') ?? undefined,
        labels: (theme.get('labels') as Record<string, unknown>) ?? undefined,
        panels: (theme.get('panels') as string[]) ?? undefined,
        theming: (theme.get('theming') as Record<string, string>) ?? undefined,
    };
}
