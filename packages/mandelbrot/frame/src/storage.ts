/**
 * Persisted UI state.
 *
 * Keys match the legacy theme's (`pen.previewHeight`, `pen.previewState`) so a
 * user upgrading keeps the panel layout they had rather than being silently
 * reset by the rewrite.
 */
type Store = 'local' | 'session';

const store = (which: Store): Storage => (which === 'session' ? sessionStorage : localStorage);

export function read<T>(key: string, fallback: T, which: Store = 'local'): T {
    try {
        const stored = store(which).getItem(key);
        return stored === null ? fallback : (JSON.parse(stored) as T);
    } catch {
        // Private browsing, a disabled store, or a value that is no longer valid
        // JSON. None of those are worth breaking the Frame over.
        return fallback;
    }
}

export function write(key: string, value: unknown, which: Store = 'local'): void {
    try {
        store(which).setItem(key, JSON.stringify(value));
    } catch {
        /* nothing to do — the layout simply will not persist */
    }
}
