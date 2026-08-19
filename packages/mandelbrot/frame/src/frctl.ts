import type { FrctlConfig } from '@fractality/web/shell';

declare global {
    interface Window {
        frctl?: FrctlConfig;
    }
}

/**
 * The global config `@fractality/web` serialises into the Shell at site build.
 *
 * Reading it is the Frame's first act — everything else needs to know where the
 * data lives, and the Shell is byte-identical across routes precisely because
 * all of this is global rather than per-route.
 */
export const frctl: FrctlConfig = window.frctl ?? {
    env: 'server',
    themeMount: '/themes/mandelbrot',
    siteRoot: '',
    treeFile: '/tree.json',
};

/**
 * Resolves a route path to a URL that exists in this mode.
 *
 * Routes are mode-independent by design — the dev server and the static build
 * emit byte-identical payloads — so they are written extensionless and the
 * `.html` the static build appends to every document it writes is added here.
 *
 * This applies to the Frame's **own** links as much as to the Preview URLs a
 * payload carries. A nav link that skipped it navigated fine, because the Frame
 * resolves either spelling, and then broke the moment the page was reloaded or
 * the URL was shared: nothing is served at the extensionless path in a static
 * build.
 */
export function resolveRouteUrl(url: string): string {
    return frctl.env === 'static' ? `${url}.html` : url;
}
