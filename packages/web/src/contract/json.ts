/**
 * Every value in a payload is JSON-serialisable. Raw values only — ISO 8601
 * timestamps, byte counts, paths — with formatting done client-side.
 *
 * Anything requiring a function to express has no place in the contract. See
 * `information[].format` in docs/specs/client-rendered-frame.md §9.
 */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };
