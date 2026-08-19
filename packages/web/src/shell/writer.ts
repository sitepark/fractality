import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import WebError from '../error.js';
import { serialiseFrctlConfig, type FrctlConfig } from './config.js';

export interface PrepareShellOptions {
    /** The Shell HTML as the theme built it. */
    shell: string;
    config: FrctlConfig;
}

export interface WriteShellsOptions extends PrepareShellOptions {
    /** The build destination — `dist/`. */
    dest: string;
    /**
     * Every path in the route table, as emitted URLs (`/index.html`,
     * `/components/detail/button.html`). One byte-identical Shell per entry.
     */
    routes: string[];
}

export interface WriteShellsResult {
    files: string[];
    /** Size of a single Shell copy. They are all identical, so one number. */
    bytes: number;
}

const escapeAttribute = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|data:)/i;

/** A CSS custom-property name: two dashes, then identifier characters. */
const CUSTOM_PROPERTY = /^--[A-Za-z0-9_-]+$/;

/**
 * Anything that could end the declaration, the rule or the element it sits in.
 *
 * A theming value is consumer configuration reaching a `<style>` block, so a `;`
 * or `}` in it would append rules of the author's choosing to the page, and
 * `</style` would end the element. Escaping is not available inside a style
 * element the way it is inside an attribute — the only safe answer is to refuse.
 */
const UNSAFE_DECLARATION = /[;{}<>\\]|\/\*/;

/** A BCP-47 language tag, as far as an attribute needs to care. */
const LANGUAGE_TAG = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

/**
 * Sets `lang` and `dir` on the Shell's root element.
 *
 * A theme builds its Shell once, before it knows whose library it will render, so
 * it cannot bake these in — mandelbrot's says `lang="en" dir="ltr"` and its
 * consumers' `lang` and `rtl` configuration reached the page nowhere. Applied
 * here rather than by the Frame at runtime because `dir` decides the layout: a
 * right-to-left site would otherwise paint left-to-right first and flip.
 *
 * Values are validated rather than escaped. Both are short, closed vocabularies,
 * and refusing what does not fit is more useful than encoding it into an
 * attribute the browser will then ignore.
 */
function withRootAttributes(html: string, config: FrctlConfig): string {
    const attributes: Array<[string, string]> = [];

    if (config.lang !== undefined) {
        if (!LANGUAGE_TAG.test(config.lang)) {
            throw new WebError(`"${config.lang}" is not a language tag. Expected something like "en" or "pt-BR".`);
        }
        attributes.push(['lang', config.lang]);
    }

    if (config.dir !== undefined) {
        if (config.dir !== 'ltr' && config.dir !== 'rtl') {
            throw new WebError(`Writing direction must be "ltr" or "rtl", not "${String(config.dir)}".`);
        }
        attributes.push(['dir', config.dir]);
    }

    if (!attributes.length) return html;

    return html.replace(/<html\b([^>]*)>/i, (match, existing: string) => {
        let rewritten = existing;
        for (const [name, value] of attributes) {
            const declaration = `${name}="${value}"`;
            const present = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i');
            rewritten = present.test(rewritten)
                ? rewritten.replace(present, ` ${declaration}`)
                : `${rewritten} ${declaration}`;
        }
        return rewritten === existing ? match : `<html${rewritten}>`;
    });
}

/**
 * The theming custom properties, as a `:root` rule.
 *
 * These are the consumer's overrides, so the block is injected *after* the
 * theme's stylesheets: same specificity, so the later declaration is the one
 * that wins. Emitted as CSS rather than applied by the Frame at mount, because
 * anything JavaScript does happens after first paint — the user would watch the
 * default colours repaint into theirs.
 */
function themingBlock(theming: FrctlConfig['theming']): string {
    const declarations = Object.entries(theming ?? {}).map(([property, value]) => {
        if (!CUSTOM_PROPERTY.test(property)) {
            throw new WebError(
                `Theming property "${property}" is not a CSS custom property. ` + 'Names must look like "--accent".',
            );
        }
        if (typeof value !== 'string' || UNSAFE_DECLARATION.test(value)) {
            throw new WebError(
                `Theming value for "${property}" is not a plain CSS value: ${JSON.stringify(value)}. ` +
                    'It is written into a <style> block, so ; { } < > \\ and comments are refused.',
            );
        }
        return `${property}:${value.trim()}`;
    });

    return declarations.length ? `<style>:root{${declarations.join(';')}}</style>` : '';
}

/**
 * Rewrites a theme-relative asset URL to be root-absolute from the theme mount.
 *
 * A theme builds with `base: './'` so that references *inside* its CSS resolve
 * against the stylesheet's own URL and stay correct at any mount. The Shell's
 * own `<link>` and `<script>` cannot use that trick: identical copies sit at
 * different depths in the route table, and they must resolve before any
 * JavaScript runs, so there is nothing clever available. They are made
 * root-absolute instead.
 *
 * The cost, which is real and belongs in the migration guide: `dist/` can no
 * longer be relocated after building.
 */
function toMountAbsolute(url: string, themeMount: string): string {
    if (!url || ABSOLUTE.test(url)) return url;
    const cleaned = url.replace(/^\.\//, '');
    return `${themeMount.replace(/\/+$/, '')}/${cleaned}`;
}

/**
 * Produces the single Shell every route gets a copy of: asset links made
 * root-absolute, and `window.frctl` injected.
 *
 * Deliberately returns one string rather than rendering per route — the copies
 * being byte-identical is the property that keeps this a file copy rather than a
 * render pass (docs/specs/client-rendered-frame.md §2.1).
 */
export function prepareShell({ shell, config }: PrepareShellOptions): string {
    const rewritten = shell.replace(
        /\b(href|src)=("|')(.*?)\2/gi,
        (match, attr: string, quote: string, url: string) => {
            const next = toMountAbsolute(url, config.themeMount);
            return next === url ? match : `${attr}=${quote}${next}${quote}`;
        },
    );

    // The theme's own stylesheets, linked rather than inlined so they cache
    // across every route. These are already root-absolute (a theme builds them
    // from its configured mount), so they are passed through untouched — the
    // rewriting above is only for the relative URLs a Vite build emits.
    const links = (config.styles ?? [])
        .map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}">`)
        .join('');

    const favicon = config.favicon ? `<link rel="shortcut icon" href="${escapeAttribute(config.favicon)}">` : '';

    const block =
        `${links}${favicon}${themingBlock(config.theming)}` +
        `<script>window.frctl=${serialiseFrctlConfig(config)};</script>`;

    const withHead = /<\/head>/i.test(rewritten)
        ? rewritten.replace(/<\/head>/i, `${block}</head>`)
        : // A Shell without a head is malformed, but silently dropping the config
          // would fail far away from the cause.
          `${block}${rewritten}`;

    // A consumer's own scripts, at the end of the body as the templates put them.
    // Classic scripts, so they run *before* the Frame's module — which is the
    // order the theme's own foot partial produced, and the only one in which a
    // script can set something up for the Frame to find.
    const scripts = (config.scripts ?? []).map((src) => `<script src="${escapeAttribute(src)}"></script>`).join('');

    const withScripts = /<\/body>/i.test(withHead)
        ? withHead.replace(/<\/body>/i, `${scripts}</body>`)
        : `${withHead}${scripts}`;

    return withRootAttributes(withScripts, config);
}

/**
 * Writes the same Shell to every path in the route table.
 *
 * This is what preserves deep links without a prerender pass: today's URLs keep
 * existing, so bookmarks survive, and it works on any static HTTP server with no
 * configuration.
 */
export async function writeShells(options: WriteShellsOptions): Promise<WriteShellsResult> {
    const { dest, routes, shell, config } = options;
    const html = prepareShell({ shell, config });
    const bytes = Buffer.byteLength(html, 'utf8');
    const files: string[] = [];

    for (const route of routes) {
        const file = path.join(dest, route.replace(/^\/+/, ''));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, html, 'utf8');
        files.push(file);
    }

    return { files, bytes };
}
