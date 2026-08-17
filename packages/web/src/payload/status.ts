import type { StatusDefinition, StatusKey } from '../contract/tree.js';
import type { SourceApp, SourceStatus } from './source-types.js';

/**
 * Statuses are interned rather than repeated on every node: a library has a
 * handful of them and thousands of entities.
 *
 * Two things make this less trivial than it looks.
 *
 * A resolved status carries no key — a component's `status` is the *value*
 * (`{ label, color, description }`), while the key lives only in config at
 * `components.statuses` / `docs.statuses`. So the table is built from config and
 * entities are matched back to it.
 *
 * And components and docs carry *separate, independently configurable* status
 * sets that share key names — both ship a `ready`. In the shipped defaults the
 * two happen to agree on label and colour and differ only in `description`,
 * which the contract does not carry, so merging them would look harmless right
 * up until a project configures one set differently and the other silently
 * inherits it. Keys are therefore namespaced by root — `components:ready`,
 * `docs:ready` — and lookups are scoped to a root so the label fallback below
 * cannot match across sets.
 */
export type StatusRoot = 'components' | 'docs';

export interface StatusTable {
    /** Ready to serialise as `TreePayload.status`. */
    definitions: Record<StatusKey, StatusDefinition>;
    /** Resolves an entity's status object to its namespaced key. */
    keyOf(root: StatusRoot, status: SourceStatus | null | undefined): StatusKey | undefined;
}

const isStatusMap = (value: unknown): value is Record<string, SourceStatus> =>
    typeof value === 'object' && value !== null;

export function buildStatusTable(app: SourceApp): StatusTable {
    const definitions: Record<StatusKey, StatusDefinition> = {};
    // Label is the practical identity: it is unique within a status set and is
    // what survives on the resolved object. Identity comparison is tried first
    // because core hands out the config object itself in the common case.
    const byRoot = new Map<StatusRoot, Array<{ key: StatusKey; source: SourceStatus }>>();

    for (const root of ['components', 'docs'] as const) {
        const configured = app.get(`${root}.statuses`);
        const entries: Array<{ key: StatusKey; source: SourceStatus }> = [];
        if (isStatusMap(configured)) {
            for (const [name, status] of Object.entries(configured)) {
                const key = `${root}:${name}`;
                definitions[key] = { label: status.label, color: status.color };
                entries.push({ key, source: status });
            }
        }
        byRoot.set(root, entries);
    }

    return {
        definitions,
        keyOf(root, status) {
            if (!status) return undefined;
            const entries = byRoot.get(root) ?? [];
            const hit =
                entries.find((e) => e.source === status) ?? entries.find((e) => e.source.label === status.label);
            return hit?.key;
        },
    };
}
