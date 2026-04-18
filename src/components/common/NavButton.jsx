import React from 'react';

const NavButton = ({ active, onClick, icon, label, collapsed = false }) => (
    <button
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`flex w-full items-center rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
            active
                ? 'border-[#d6e7fb] bg-[#eef6ff] text-slate-900'
                : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900'
        } ${collapsed ? 'justify-center px-2.5' : 'gap-3'}`}
    >
        <span className={active ? 'text-[#0075de]' : 'text-slate-400'}>{icon}</span>
        {!collapsed && <span className="truncate font-medium">{label}</span>}
    </button>
);

export default NavButton;
