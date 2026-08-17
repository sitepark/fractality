/**
 * The version of the public data contract this build of `@fractality/web`
 * produces and understands.
 *
 * Breaking: removing or renaming a field, narrowing a type, changing semantics.
 * Not breaking: adding an optional field.
 *
 * Type-level changes count as breaking on the same footing as runtime ones —
 * shipping declarations means narrowing `string` to a union breaks a theme
 * author's compile with an unchanged payload.
 *
 * The `ext` slot sits outside this guarantee.
 */
export const CONTRACT_VERSION = 1;

export type ContractVersion = typeof CONTRACT_VERSION;

/** Carried at the root of every payload so a consumer can check it in isolation. */
export interface Versioned {
    contractVersion: number;
}
