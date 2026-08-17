/**
 * Builders turning a loaded Fractality library into the public data contract.
 *
 * Specified in docs/specs/client-rendered-frame.md §3. The input side of these
 * functions is an untyped JavaScript boundary — see `source-types.ts`.
 */
export { buildTreePayload } from './tree.js';
export { buildContextPayload, buildEntityPayload, buildNotesPayload, buildViewPayload } from './entity.js';
export { buildStatusTable } from './status.js';
export type { StatusRoot, StatusTable } from './status.js';
export type * from './source-types.js';
