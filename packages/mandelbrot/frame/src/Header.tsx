import { projectTitle } from './frctl.js';
import { BurgerIcon, CloseIcon } from './Icons.js';

interface HeaderProps {
    onToggleSidebar: () => void;
}

/** Mirrors `views/partials/header.nunj`. */
export function Header({ onToggleSidebar }: HeaderProps) {
    return (
        <div className="Header">
            <button
                type="button"
                className="Header-button Header-navToggle"
                onClick={onToggleSidebar}
                aria-label="Toggle navigation"
            >
                {/*
                    Both icons render; the stylesheet shows one and hides the
                    other depending on `.Frame.is-closed`.
                */}
                <div className="Header-navToggleIcon Header-navToggleIcon--open">
                    <CloseIcon />
                </div>
                <div className="Header-navToggleIcon Header-navToggleIcon--closed">
                    <BurgerIcon />
                </div>
            </button>
            <a href="/" className="Header-title">
                {projectTitle}
            </a>
        </div>
    );
}
