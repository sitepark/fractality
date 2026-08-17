/**
 * Tags arrive from core containing `null` entries — a component with no tags of
 * its own resolves to `[null]` rather than `[]`.
 *
 * This is long-standing behaviour rather than a new quirk: mandelbrot's
 * navigation macro works around the same thing in the template layer with
 * `item.tags | dump | replace("null,", "")`. Under the data contract that
 * workaround has nowhere to live, and a raw `[null]` would both break the
 * "JSON-serialisable raw values" rule and cost bytes on every node that has no
 * tags at all.
 *
 * Returns `undefined` when there is nothing worth emitting, so callers can omit
 * the field entirely rather than serialising an empty array.
 */
export function sanitiseTags(tags: unknown): string[] | undefined {
    if (!Array.isArray(tags)) return undefined;
    const cleaned = tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
    return cleaned.length ? cleaned : undefined;
}
