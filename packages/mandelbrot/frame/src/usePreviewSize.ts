import { useCallback, useEffect, useState } from 'react';

/**
 * Reports the Preview's viewport, as the previous theme did.
 *
 * Measured from the iframe's own `contentWindow` rather than from the element,
 * because that is what a pattern's media queries actually see — the element's
 * box includes any scrollbar the document inside is showing. Falls back to the
 * element if the document is not reachable, which cannot happen for a
 * same-origin Preview but keeps a cross-origin one from throwing.
 */
export function usePreviewSize(
    iframe: React.RefObject<HTMLIFrameElement | null>,
    /** Re-measure when this changes, e.g. after a resize drag. */
    dependency: unknown,
): string {
    const [size, setSize] = useState('');

    const measure = useCallback(() => {
        const element = iframe.current;
        if (!element) return;

        let width = element.clientWidth;
        let height = element.clientHeight;
        try {
            const view = element.contentWindow;
            if (view?.innerWidth) {
                width = view.innerWidth;
                height = view.innerHeight;
            }
        } catch {
            /* cross-origin: the element's own box is the best available */
        }

        setSize(width && height ? `${width} × ${height}` : '');
    }, [iframe]);

    useEffect(() => {
        const element = iframe.current;
        if (!element) return;

        measure();
        element.addEventListener('load', measure);

        // The iframe's own window reports the viewport a pattern sees; the
        // element observer catches the panel being dragged, which does not
        // always fire a resize inside the frame.
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(element);

        return () => {
            element.removeEventListener('load', measure);
            observer?.disconnect();
        };
    }, [iframe, measure, dependency]);

    return size;
}
