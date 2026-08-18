import { useCallback, useEffect, useRef, useState } from 'react';
import { read, write } from './storage.js';

interface Options {
    /** localStorage key the size is persisted under. */
    key: string;
    fallback: number;
    min?: number;
    max?: number;
}

interface Resizable {
    size: number;
    /** True while a drag is in progress, so the Preview iframe can be masked. */
    dragging: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
}

/**
 * A draggable split, replacing jquery-resizable-dom.
 *
 * Uses pointer events with capture rather than document-level mouse listeners:
 * capture keeps the drag alive when the pointer crosses the Preview iframe,
 * which otherwise swallows the events entirely — the reason the jQuery version
 * had to disable pointer events on the iframe for the duration of a drag.
 */
export function useResizable({ key, fallback, min = 80, max = Infinity }: Options): Resizable {
    const [size, setSize] = useState(() => read(key, fallback));
    const [dragging, setDragging] = useState(false);
    const origin = useRef({ y: 0, size: 0 });

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            origin.current = { y: event.clientY, size };
            setDragging(true);
        },
        [size],
    );

    useEffect(() => {
        if (!dragging) return;

        const onMove = (event: PointerEvent) => {
            const next = origin.current.size + (event.clientY - origin.current.y);
            setSize(Math.min(max, Math.max(min, next)));
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
    }, [dragging, min, max]);

    // Written on drag end rather than on every move: this is localStorage, and a
    // pointermove writes hundreds of times a second.
    useEffect(() => {
        if (!dragging) write(key, size);
    }, [dragging, key, size]);

    return { size, dragging, onPointerDown };
}
