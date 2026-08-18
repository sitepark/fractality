import { routedDocs } from '../payload/doc.js';
import type { SourceApp, SourceComponent } from '../payload/source-types.js';

/**
 * Every handle the detail route resolves for.
 *
 * Mirrors what mandelbrot's `getHandles()` enumerates today: each component,
 * plus each of its variants when it has more than one. Note `variants()`
 * includes the implicit default, so a component declaring N extra variants
 * contributes N + 2 handles — verified against the emitted page count rather
 * than reasoned about, because getting it wrong is silent.
 */
export function entityHandles(app: SourceApp): string[] {
    const handles: string[] = [];

    for (const component of app.components.flatten().toArray()) {
        if (component.isHidden) continue;
        handles.push(component.handle);

        const variants = component.variants().filter('isHidden', false);
        if (variants.size > 1) {
            for (const variant of variants.toArray()) {
                handles.push(variant.handle);
            }
        }
    }

    return handles;
}

/** The component a handle belongs to — a variant handle maps to its parent. */
export function componentsByHandle(app: SourceApp): Map<string, SourceComponent> {
    const map = new Map<string, SourceComponent>();

    for (const component of app.components.flatten().toArray()) {
        if (component.isHidden) continue;
        map.set(component.handle, component);

        const variants = component.variants().filter('isHidden', false);
        if (variants.size > 1) {
            for (const variant of variants.toArray()) {
                map.set(variant.handle, component);
            }
        }
    }

    return map;
}

export interface StaticRoutesOptions {
    detailRoute?: string;
    docsRoute?: string;
}

/**
 * Every path the static build writes a Shell to.
 *
 * These are the URLs today's build already emits, which is the whole point —
 * deep links keep working and existing bookmarks survive.
 */
export function staticRoutes(app: SourceApp, options: StaticRoutesOptions = {}): string[] {
    const { detailRoute = '/components/detail', docsRoute = '/docs' } = options;

    return [
        '/index.html',
        ...entityHandles(app).map((handle) => `${detailRoute}/${handle}.html`),
        // Documentation pages get a Shell too: they are Frame routes like any
        // other, and a deep link to one has to resolve on a dumb static host.
        ...routedDocs(app.docs.flatten().toArray(), docsRoute).map(({ route }) => `${route}.html`),
    ];
}
