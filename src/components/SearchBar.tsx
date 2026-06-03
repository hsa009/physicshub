interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * A thin search input with a gold underline that brightens on focus.
 * Mirrors the reference's editorial feel: serif placeholder, gold accent.
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = "Search lessons, modules, or topics…",
}: SearchBarProps) {
  return (
    <label className="group relative block w-full">
      <span className="sr-only">{placeholder}</span>
      <div className="flex items-center gap-3 border-b border-border-mid pb-3 transition-colors duration-300 focus-within:border-gold">
        <svg
          className="h-4 w-4 text-text-label transition-colors group-focus-within:text-gold"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent text-[0.9rem] text-text-primary placeholder:text-text-label focus:outline-none"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="text-[0.6rem] uppercase tracking-nav text-text-label transition-colors hover:text-gold"
          >
            Clear
          </button>
        )}
      </div>
    </label>
  );
}
