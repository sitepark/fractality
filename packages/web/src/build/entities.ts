import type { SourceApp, SourceComponent, SourceVariant } from '../payload/source-types.js';

export interface RoutedEntity {
    handle: string;
    /** The thing to render — a variant for a variant handle. */
    entity: SourceComponent | SourceVariant;
    /** The component it belongs to, which owns `isCollated`. */
    component: SourceComponent;
}

/**
 * Every handle the detail, preview and render routes resolve for, paired with
 * the entity to render.
 *
 * A variant handle must render the *variant*, not its component: rendering the
 * component would silently produce the default variant for every one of them.
 */
export function routedEntities(app: SourceApp): RoutedEntity[] {
    const entities: RoutedEntity[] = [];

    for (const component of app.components.flatten().toArray()) {
        if (component.isHidden) continue;
        entities.push({ handle: component.handle, entity: component, component });

        const variants = component.variants().filter('isHidden', false);
        if (variants.size > 1) {
            for (const variant of variants.toArray()) {
                entities.push({ handle: variant.handle, entity: variant, component });
            }
        }
    }

    return entities;
}
