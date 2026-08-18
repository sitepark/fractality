import { useCallback, useEffect, useRef, useState } from 'react';
import { read, write } from './storage.js';

/** Matches `$handle-size` in the theme's SCSS. */
const HANDLE = 12;

/** Matches `.Preview-resizer`'s own `min-width`. */
const MIN = 180;

export interface PreviewWidth {
    /**
     * Style for `.Preview-wrapper`.
     *
     * The wrapper, not the inner `.Preview-resizer`: the wrapper is what the
     * handle is positioned against (`offset-inline(end, 0)`), and the resizer is
     * sized as a percentage of it. Setting the width on the inner element moves
     * neither the handle nor the visible surface — the wrapper caps it.
     */
    style: React.CSSProperties;
    dragging: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    /** Double-clicking the handle restores full width, as before. */
    onDoubleClick: () => void;
    ref: React.RefObject<HTMLDivElement | null>;
}

/**
 * Drag-to-resize the Preview from its inline end.
 *
 * Replaces jquery-resizable-dom's width mode. Pointer capture rather than
 * document mouse listeners: the iframe swallows pointer events, so a drag
 * crossing it would otherwise stop dead — which is why the previous
 * implementation had to overlay the frame for the duration of a drag. The
 * overlay is still rendered, because the stylesheet uses it to keep the resize
 * cursor over the iframe.
 */
export function usePreviewWidth(): PreviewWidth {
    const ref = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState<number | null>(() => read<number | null>('preview.width', null));
    const [dragging, setDragging] = useState(false);
    const origin = useRef({ x: 0, width: 0 });

    const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
        event.preventDefault();
        // Capture keeps the drag alive when the pointer crosses the iframe.
        // Guarded because it is optional: without it the window listeners below
        // still track the drag, and jsdom does not implement it at all.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        origin.current = { x: event.clientX, width: ref.current?.offsetWidth ?? 0 };
        setDragging(true);
    }, []);

    const onDoubleClick = useCallback(() => {
        setWidth(null);
        write('preview.width', null);
    }, []);

    useEffect(() => {
        if (!dragging) return;

        const rtl = document.documentElement.dir === 'rtl';
        const onMove = (event: PointerEvent) => {
            const delta = event.clientX - origin.current.x;
            const next = origin.current.width + (rtl ? -delta : delta);

            // Clamped against the panel the wrapper sits in. The stylesheet caps
            // it at `calc(100% + $handle-size)`, but an inline width beats a
            // stylesheet max-width, so the bound has to be enforced here or the
            // preview drags off the edge of its own panel.
            const available = ref.current?.parentElement?.offsetWidth;
            const max = available ? available + HANDLE : Infinity;

            setWidth(Math.min(max, Math.max(MIN, next)));
        };
        const onUp = () => setDragging(false);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [dragging]);

    // Written on drag end, not on every pointermove.
    useEffect(() => {
        if (!dragging && width !== null) write('preview.width', width);
    }, [dragging, width]);

    return {
        // Null means "as wide as the panel allows": no inline width at all, so
        // the stylesheet's `calc(100% + $handle-size)` applies. That is the
        // default and what a double-click restores.
        // No inline max-width: that would override the stylesheet's own cap,
        // which is the backstop for anything the drag clamp does not catch.
        style: width === null ? {} : { width },
        dragging,
        onPointerDown,
        onDoubleClick,
        ref,
    };
}
