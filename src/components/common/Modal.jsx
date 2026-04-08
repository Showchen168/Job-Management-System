import React from 'react';
import { AlertCircle, Info, Bot } from 'lucide-react';

const Modal = ({ isOpen, title, content, onConfirm, onCancel, confirmText = '確認', cancelText = '取消', type = 'confirm', children, testId }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" data-testid={testId}>
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
            <div className="p-6 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
                {type === 'danger' && <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertCircle size={24} /></div>}
                {type === 'confirm' && <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Info size={24} /></div>}
                {type === 'ai' && <div className="p-2 bg-purple-100 rounded-full text-purple-600"><Bot size={24} /></div>}
                <h3 className={`text-lg font-bold ${type === 'danger' ? 'text-red-700' : 'text-slate-800'}`}>{title}</h3>
            </div>
            {content && <p className="text-slate-600 text-sm leading-relaxed ml-1 whitespace-pre-wrap">{content}</p>}
            {children}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 flex-shrink-0">
            {onCancel && <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">{cancelText}</button>}
            <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : type === 'ai' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
            </div>
        </div>
        </div>
    );
};

export default Modal;
