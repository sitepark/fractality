import { frctl } from './frctl.js';

interface HeaderProps {
    onToggleSidebar: () => void;
}

/** Mirrors `views/partials/header.nunj`. */
export function Header({ onToggleSidebar }: HeaderProps) {
    const title = (frctl.labels?.projectTitle as string) ?? 'Component Library';

    return (
        <div className="Header">
            <button
                type="button"
                className="Header-button Header-navToggle"
                onClick={onToggleSidebar}
                aria-label="Toggle navigation"
            >
                <div className="Header-navToggleIcon Header-navToggleIcon--closed">☰</div>
            </button>
            <a href="/" className="Header-title">
                {title}
            </a>
        </div>
    );
}
