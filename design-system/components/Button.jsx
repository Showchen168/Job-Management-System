/**
 * Button Component
 * 通用按鈕元件，支援多種樣式變體
 */

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  // 變體樣式
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
    link: 'text-blue-600 hover:underline p-0',
  };

  // 尺寸樣式
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
    icon: 'p-2',
  };

  const baseStyles = `
    inline-flex items-center justify-center gap-2 rounded-lg font-medium
    transition disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 16 : 18} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 16 : 18} />}
        </>
      )}
    </button>
  );
};

// 使用範例
/*
<Button variant="primary" onClick={handleClick}>確認</Button>
<Button variant="secondary">取消</Button>
<Button variant="danger" icon={Trash2}>刪除</Button>
<Button variant="success" loading={isSaving}>儲存</Button>
<Button variant="ghost" size="icon" icon={Settings} />
*/

export default Button;
