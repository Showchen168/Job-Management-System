import React from 'react';

const NavButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
            active
                ? 'bg-white text-slate-900 border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 border-transparent hover:bg-white/80 hover:border-slate-200 hover:text-slate-900'
        }`}
    >
        <span className={active ? 'text-[#0075de]' : 'text-slate-400'}>{icon}</span>
        <span className="font-medium">{label}</span>
    </button>
);

export default NavButton;
