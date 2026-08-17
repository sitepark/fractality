/**
 * The public data contract a theme renders from.
 *
 * Owned and versioned by `@fractality/web`. These declarations are public API:
 * a type-level change is breaking on the same footing as a runtime one.
 *
 * Specified in docs/specs/client-rendered-frame.md §3.
 */
export { CONTRACT_VERSION } from './version.js';
export type { ContractVersion, Versioned } from './version.js';

export type { JsonObject, JsonPrimitive, JsonValue } from './json.js';

export type { Handle, StatusDefinition, StatusKey, TreeNode, TreePayload } from './tree.js';

export type {
    ContextPayload,
    EntityPayload,
    NotesPayload,
    ResourceSummary,
    VariantSummary,
    ViewPayload,
} from './entity.js';
