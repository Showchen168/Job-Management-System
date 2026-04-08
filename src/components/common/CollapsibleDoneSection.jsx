import React, { useState } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';

const CollapsibleDoneSection = ({ title, children, defaultExpanded = false }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    return (
        <div>
            <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition mb-2"
            >
                <CheckCircle2 size={18} className="text-green-500" />
                <span className="text-lg font-bold">{title}</span>
                <ChevronRight size={16} className={`transition-transform text-slate-400 ${expanded ? 'rotate-90' : ''}`} />
            </button>
            {expanded && children}
        </div>
    );
};

export default CollapsibleDoneSection;
