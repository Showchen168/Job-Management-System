/**
 * Search Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Search = ({
    value,
    onChange,
    placeholder = '搜尋...',
    className = '',
    onClear,
    autoFocus = false,
}) => {
    const handleClear = () => {
        if (onClear) onClear();
        else if (onChange) onChange({ target: { value: '' } });
    };

    return (
        <div className={`flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm ${className}`}>
            <svg className="text-slate-400 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="outline-none text-sm w-full bg-transparent text-slate-700 placeholder:text-slate-400"
            />
            {value && (
                <button onClick={handleClear} className="text-slate-400 hover:text-slate-600 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};

const FilterBar = ({
    searchValue,
    onSearchChange,
    searchPlaceholder = '搜尋...',
    filters = [],
    className = '',
}) => (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${className}`}>
        <Search value={searchValue} onChange={onSearchChange} placeholder={searchPlaceholder} className="flex-1" />
        {filters.length > 0 && (
            <div className="flex items-center gap-2">
                {filters.map((filter, index) => (
                    <select
                        key={index}
                        value={filter.value}
                        onChange={filter.onChange}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {filter.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ))}
            </div>
        )}
    </div>
);

export { Search, FilterBar };
export default Search;
