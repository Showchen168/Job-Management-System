import React from 'react';

export const StandardToolbar = ({ children, actions = null, testId = 'standard-toolbar' }) => (
    <div
        data-testid={testId}
        className="rounded-2xl border border-[#d9e2ef] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
    >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {children}
            </div>
            {actions && (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    {actions}
                </div>
            )}
        </div>
    </div>
);

export const StandardToolbarField = ({ icon, children, className = '' }) => (
    <label className={`flex w-full items-center gap-2 rounded-xl border border-[#bfcde0] bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition focus-within:border-[#8fb0d8] focus-within:ring-2 focus-within:ring-[#dbe8f8] sm:w-auto ${className}`}>
        {icon && <span className="text-slate-400">{icon}</span>}
        {children}
    </label>
);

export const StandardToolbarInput = (props) => (
    <input
        {...props}
        className={`w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 ${props.className || ''}`}
    />
);

export const StandardToolbarSelect = ({ children, className = '', ...props }) => (
    <select
        {...props}
        className={`w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none ${className}`}
    >
        {children}
    </select>
);

export const StandardToolbarButton = ({
    children,
    variant = 'secondary',
    className = '',
    disabled = false,
    ...props
}) => {
    const variantClass = variant === 'primary'
        ? 'border-[#0075de] bg-[#0075de] text-white hover:bg-[#005bab] hover:border-[#005bab]'
        : 'border-[#bfcde0] bg-white text-slate-600 hover:bg-slate-50';
    const disabledClass = disabled ? 'cursor-not-allowed opacity-50 hover:bg-inherit hover:border-inherit' : '';

    return (
        <button
            {...props}
            disabled={disabled}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition sm:w-auto ${variantClass} ${disabledClass} ${className}`}
        >
            {children}
        </button>
    );
};
