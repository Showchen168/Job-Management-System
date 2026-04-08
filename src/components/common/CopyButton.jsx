import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '../../utils/helpers';

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className={`mt-3 flex items-center gap-2 text-sm font-medium transition-colors ${copied ? 'text-green-600' : 'text-purple-600 hover:underline'}`}
        >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '已複製成功！' : '複製報告內容'}
        </button>
    );
};

export default CopyButton;
