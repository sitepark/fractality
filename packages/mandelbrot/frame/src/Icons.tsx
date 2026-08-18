/**
 * The theme's icons, as inline SVG.
 *
 * Restored from the deleted `views/icons/*.svg` because the stylesheet is built
 * around them: `.Tree-collapse` and `.Search-clearButton` set `line-height: 0`
 * and size an `svg` child explicitly. A text glyph in those buttons gets a
 * zero-height line box and renders invisibly — the control is present and
 * clickable, and looks like it does not exist.
 *
 * `currentColor` so they inherit the colour the stylesheet already sets.
 */
const base = {
    viewBox: '0 0 24 24',
    width: 24,
    height: 24,
    fill: 'currentColor',
    'aria-hidden': true,
} as const;

export const CollapseIcon = () => (
    <svg {...base}>
        <path d="m9 11c-.6 0-1 .4-1 1s.4 1 1 1h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
        <path d="m19 21h-14c-1.1 0-2-.9-2-2v-14c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2zm-14-16v14h14v-14z" />
    </svg>
);

export const CloseIcon = () => (
    <svg {...base}>
        <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
    </svg>
);

export const BurgerIcon = () => (
    <svg {...base}>
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
);

export const AssetIcon = () => (
    <svg {...base}>
        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H5V8h14v10h-4v2h4c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-7 6l-4 4h3v6h2v-6h3l-4-4z" />
    </svg>
);

export const OpenInBrowserIcon = () => (
    <svg {...base}>
        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h4v-2H5V8h14v10h-4v2h4c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm-7 6l-4 4h3v6h2v-6h3l-4-4z" />
    </svg>
);
