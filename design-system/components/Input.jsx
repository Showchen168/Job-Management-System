/**
 * Input Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Input = ({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    hint,
    className = '',
    ...props
}) => {
    const inputStyles = `
        w-full p-2.5 border rounded-lg transition
        focus:ring-2 focus:ring-blue-500 outline-none
        ${error ? 'border-red-500' : 'border-slate-300'}
        ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
    `;

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                className={inputStyles}
                {...props}
            />
            {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

const Select = ({
    label,
    value,
    onChange,
    options = [],
    placeholder = '請選擇...',
    required = false,
    disabled = false,
    error,
    className = '',
    ...props
}) => {
    const selectStyles = `
        w-full p-2.5 border rounded-lg transition
        focus:ring-2 focus:ring-blue-500 outline-none
        ${error ? 'border-red-500' : 'border-slate-300'}
        ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
    `;

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                className={selectStyles}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

const Textarea = ({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
    required = false,
    disabled = false,
    error,
    hint,
    className = '',
    ...props
}) => {
    const textareaStyles = `
        w-full p-2.5 border rounded-lg transition resize-none
        focus:ring-2 focus:ring-blue-500 outline-none
        ${error ? 'border-red-500' : 'border-slate-300'}
        ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
    `;

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                required={required}
                className={textareaStyles}
                {...props}
            />
            {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

export { Input, Select, Textarea };
export default Input;
