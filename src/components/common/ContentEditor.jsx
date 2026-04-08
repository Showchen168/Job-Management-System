import React, { useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { compressImage } from '../../utils/helpers';

const ContentEditor = ({ value, onChange }) => {
    const editableRef = useRef(null);
    useEffect(() => {
        if (editableRef.current && editableRef.current.innerHTML !== value) {
            editableRef.current.innerHTML = DOMPurify.sanitize(value || '');
        }
    }, [value]);
    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                const base64 = await compressImage(file);
                if (base64.length > 800 * 1024) { alert("圖片過大"); return; }
                document.execCommand('insertImage', false, base64);
            }
        }
    };
    const handleInput = (e) => onChange(e.currentTarget.innerHTML);
    return (
        <div className="w-full p-3 border border-slate-300 rounded min-h-[150px] max-h-[400px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-emerald-500 prose prose-sm max-w-none bg-slate-50" contentEditable ref={editableRef} onInput={handleInput} onPaste={handlePaste} data-placeholder="請輸入會議內容，可直接貼上圖片..." />
    );
};

export default ContentEditor;
