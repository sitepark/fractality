import { frctl } from './frctl.js';
import { CloseIcon } from './Icons.js';

interface SearchProps {
    value: string;
    onChange: (value: string) => void;
    /** True once the panel has scrolled and the box is pinned. */
    stuck: boolean;
}

const labels = () => (frctl.labels?.search ?? {}) as Record<string, string>;

/** Mirrors `views/partials/navigation/search.nunj`. */
export function Search({ value, onChange, stuck }: SearchProps) {
    const text = labels();

    return (
        <div className={`Navigation-group Navigation-search${stuck ? ' is-stuck' : ''}`}>
            <form className="Search" onSubmit={(event) => event.preventDefault()} role="search">
                <label className="Search-label" htmlFor="search-input">
                    {text.label ?? 'Search'}
                </label>
                <input
                    className="Search-input"
                    id="search-input"
                    type="search"
                    placeholder={text.placeholder ?? 'Search…'}
                    autoComplete="off"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
                <button
                    type="button"
                    className="Search-clearButton"
                    aria-label={text.clear ?? 'Clear search'}
                    hidden={!value}
                    onClick={() => onChange('')}
                >
                    <CloseIcon />
                </button>
            </form>
        </div>
    );
}
