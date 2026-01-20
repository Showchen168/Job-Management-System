/**
 * Search Component
 * 搜尋框元件，支援即時搜尋
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
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm ${className}`}>
      {/* Search Icon */}
      <svg
        className="text-slate-400 flex-shrink-0"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="outline-none text-sm w-full bg-transparent text-slate-700 placeholder:text-slate-400"
      />

      {/* Clear Button */}
      {value && (
        <button
          onClick={handleClear}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Filter Bar - 搜尋 + 篩選組合
const FilterBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = '搜尋...',
  filters = [],
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${className}`}>
      {/* Search */}
      <Search
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="flex-1"
      />

      {/* Filters */}
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
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
    </div>
  );
};

// 使用範例
/*
<Search
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  placeholder="搜尋任務..."
/>

<FilterBar
  searchValue={searchTerm}
  onSearchChange={(e) => setSearchTerm(e.target.value)}
  searchPlaceholder="搜尋..."
  filters={[
    {
      value: statusFilter,
      onChange: (e) => setStatusFilter(e.target.value),
      options: [
        { value: '', label: '全部狀態' },
        { value: 'pending', label: '待處理' },
        { value: 'completed', label: '已完成' },
      ],
    },
    {
      value: categoryFilter,
      onChange: (e) => setCategoryFilter(e.target.value),
      options: [
        { value: '', label: '全部分類' },
        { value: 'work', label: '工作' },
        { value: 'personal', label: '個人' },
      ],
    },
  ]}
/>
*/

export { Search, FilterBar };
export default Search;
