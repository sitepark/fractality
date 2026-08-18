import { frctl } from './frctl.js';
import { CloseIcon } from './Icons.js';

interface SearchProps {
    value: string;
    onChange: (value: string) => void;
}

const labels = () => (frctl.labels?.search ?? {}) as Record<string, string>;

/** Mirrors `views/partials/navigation/search.nunj`. */
export function Search({ value, onChange }: SearchProps) {
    const text = labels();

    return (
        <div className="Navigation-group Navigation-search">
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
