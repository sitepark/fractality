import { useCallback, useEffect, useRef, useState } from 'react';
import { read, write } from './storage.js';

/** Matches `$mq_nav-collapse` in the theme's SCSS. */
const NAV_COLLAPSE = 760;

/** Matches `$width-sidebar`, used only until the real element can be measured. */
const DEFAULT_WIDTH = 240;

export interface Sidebar {
    open: boolean;
    toggle: () => void;
    /** Inline styles for `.Frame-body`. */
    bodyStyle: React.CSSProperties;
    ref: React.RefObject<HTMLDivElement | null>;
}

/**
 * Shows and hides the sidebar.
 *
 * The stylesheet has no rule that moves it: the previous theme did this with
 * inline styles on `.Frame-body` — a transform plus a negative margin on the
 * inline end — and used `.Frame.is-closed` only to swap the toggle icon. Setting
 * the class alone therefore changes the icon and nothing else, which is what the
 * first attempt did.
 *
 * Width is measured rather than assumed because the sidebar is resizable between
 * `$width-sidebar` and twice that; the constant is only a fallback for the first
 * paint.
 */
export function useSidebar(): Sidebar {
    const ref = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(() => {
        // Small screens start closed regardless of what was stored, as before.
        if (typeof window !== 'undefined' && window.innerWidth < NAV_COLLAPSE) return false;
        return read<string>('frame.state', 'open') === 'open';
    });

    // Skips the transition on the very first paint, so a Frame restored to
    // "closed" does not animate the sidebar out on every load.
    const settled = useRef(false);
    useEffect(() => {
        settled.current = true;
    }, []);

    const toggle = useCallback(() => {
        setOpen((was) => {
            write('frame.state', was ? 'closed' : 'open');
            return !was;
        });
    }, []);

    const width = ref.current?.offsetWidth || DEFAULT_WIDTH;
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

    const bodyStyle: React.CSSProperties = open
        ? {
              transform: 'translate3d(0, 0, 0)',
              marginLeft: 0,
              marginRight: 0,
              transition: settled.current ? '0.3s ease all' : 'none',
          }
        : {
              transform: `translate3d(${rtl ? width : -width}px, 0, 0)`,
              [rtl ? 'marginLeft' : 'marginRight']: -width,
              transition: settled.current ? '0.3s ease all' : 'none',
          };

    return { open, toggle, bodyStyle, ref };
}
