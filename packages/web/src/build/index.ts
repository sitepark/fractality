/**
 * The static build — docs/specs/client-rendered-frame.md §5.
 */
export { buildStatic } from './static.js';
export type { BuildStaticOptions, BuildStaticResult } from './static.js';
export { componentsByHandle, entityHandles, staticRoutes } from './routes.js';
export { routedEntities } from './entities.js';
export type { RoutedEntity } from './entities.js';
export { writePreviews } from './previews.js';
export type { PreviewError, WritePreviewsOptions, WritePreviewsResult } from './previews.js';
export type { StaticRoutesOptions } from './routes.js';
