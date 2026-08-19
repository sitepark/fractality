import { useCallback, useEffect, useState } from 'react';

/**
 * How long a load may take before it is worth telling the user about.
 *
 * A Preview is usually rendered by a local server in a few tens of milliseconds,
 * and a bar that appears and vanishes inside one frame reads as a glitch rather
 * than as progress. Everything faster than this shows nothing at all; anything
 * slower — a large pattern, a cold adapter, a rebuild in flight — gets the bar.
 */
const VISIBLE_AFTER_MS = 150;

export interface PreviewLoading {
    /** Whether the bar should be on screen. */
    visible: boolean;
    /** Hand to the iframe's `onLoad`. */
    onLoad: () => void;
}

/**
 * Tracks whether the Preview iframe is still loading.
 *
 * Keyed on `src` rather than on a mount: switching variants swaps the iframe's
 * source without remounting anything, so a state that only reset on mount would
 * report the first document's load forever.
 *
 * There is no progress to report — a cross-document load exposes none — so what
 * this drives is deliberately indeterminate. `onLoad` fires for a failed Preview
 * too: the dev server answers a broken pattern with an error document, which is
 * a completed load carrying a readable message, and the bar's job is finished
 * either way.
 */
export function usePreviewLoading(src: string | undefined): PreviewLoading {
    const [pending, setPending] = useState(() => Boolean(src));
    const [visible, setVisible] = useState(false);

    useEffect(() => setPending(Boolean(src)), [src]);

    useEffect(() => {
        if (!pending) {
            setVisible(false);
            return;
        }

        const timer = setTimeout(() => setVisible(true), VISIBLE_AFTER_MS);
        return () => clearTimeout(timer);
    }, [pending]);

    return { visible, onLoad: useCallback(() => setPending(false), []) };
}
