/**
 * Input Component
 * 通用輸入框元件，支援多種類型
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
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const inputStyles = `
    w-full p-2.5 border rounded-lg transition
    focus:ring-2 focus:ring-blue-500 outline-none
    ${error ? 'border-red-500' : 'border-slate-300'}
    ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
  `;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-slate-500 uppercase mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputStyles}
        {...props}
      />

      {hint && !error && (
        <p className="text-xs text-slate-400 mt-1">{hint}</p>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

// Select Component
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
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const selectStyles = `
    w-full p-2.5 border rounded-lg transition
    focus:ring-2 focus:ring-blue-500 outline-none
    ${error ? 'border-red-500' : 'border-slate-300'}
    ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
  `;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-slate-500 uppercase mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <select
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={selectStyles}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

// Textarea Component
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
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  const textareaStyles = `
    w-full p-2.5 border rounded-lg transition resize-none
    focus:ring-2 focus:ring-blue-500 outline-none
    ${error ? 'border-red-500' : 'border-slate-300'}
    ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
  `;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-bold text-slate-500 uppercase mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={textareaStyles}
        {...props}
      />

      {hint && !error && (
        <p className="text-xs text-slate-400 mt-1">{hint}</p>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

// 使用範例
/*
<Input
  label="電子郵件"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="請輸入電子郵件"
  required
/>

<Select
  label="狀態"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  options={[
    { value: 'pending', label: '待處理' },
    { value: 'done', label: '已完成' },
  ]}
  required
/>

<Textarea
  label="備註"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="請輸入備註..."
  rows={4}
/>
*/

export { Input, Select, Textarea };
export default Input;
