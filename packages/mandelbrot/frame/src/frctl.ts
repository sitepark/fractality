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
 * Resolves a route URL carried in a payload to something fetchable in this mode.
 *
 * Payloads are mode-independent by design — the dev server and the static build
 * emit byte-identical bytes — so a Preview URL is stored extensionless and the
 * `.html` the static build writes is appended here instead of being baked in.
 */
export function resolveRouteUrl(url: string): string {
    return frctl.env === 'static' ? `${url}.html` : url;
}
