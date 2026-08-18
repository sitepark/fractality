/**
 * Persisted UI state.
 *
 * Keys match the legacy theme's (`pen.previewHeight`, `pen.previewState`) so a
 * user upgrading keeps the panel layout they had rather than being silently
 * reset by the rewrite.
 */
export function read<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored === null ? fallback : (JSON.parse(stored) as T);
    } catch {
        // Private browsing, a disabled store, or a value that is no longer valid
        // JSON. None of those are worth breaking the Frame over.
        return fallback;
    }
}

export function write(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* nothing to do — the layout simply will not persist */
    }
}
