import React from 'react';

const NavButton = ({ active, onClick, icon, label, collapsed = false }) => (
    <button
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`w-full flex items-center rounded-2xl border px-4 py-3 text-left transition-all ${
            active
                ? 'bg-white text-slate-900 border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 border-transparent hover:bg-white/80 hover:border-slate-200 hover:text-slate-900'
        } ${collapsed ? 'justify-center px-3' : 'gap-3'}`}
    >
        <span className={active ? 'text-[#0075de]' : 'text-slate-400'}>{icon}</span>
        {!collapsed && <span className="font-medium">{label}</span>}
    </button>
);

export default NavButton;
