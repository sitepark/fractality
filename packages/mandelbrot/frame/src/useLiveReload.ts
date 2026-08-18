import { useEffect, useState } from 'react';
import { invalidate } from './api.js';
import { frctl } from './frctl.js';

/**
 * Subscribes to rebuild notifications from the dev server.
 *
 * Returns a counter that increments on every rebuild. Components depending on it
 * refetch; keying the Preview iframe by it reloads that iframe without the Frame
 * around it being torn down, so open panels, scroll position and tree expansion
 * survive an edit.
 *
 * Server-sent events rather than Vite's HMR channel: the Frame's bundle is a
 * prebuilt static asset that never enters the consumer's Vite graph, so
 * `import.meta.hot` does not exist inside it. EventSource also reconnects by
 * itself when the dev server restarts.
 */
export function useLiveReload(): number {
    const [generation, setGeneration] = useState(0);

    useEffect(() => {
        // Static builds have no server to talk to.
        if (frctl.env !== 'server' || typeof EventSource === 'undefined') return;

        const source = new EventSource('/__fractality/events');
        const onRebuild = () => {
            invalidate();
            setGeneration((n) => n + 1);
        };

        source.addEventListener('rebuild', onRebuild);
        return () => {
            source.removeEventListener('rebuild', onRebuild);
            source.close();
        };
    }, []);

    return generation;
}
