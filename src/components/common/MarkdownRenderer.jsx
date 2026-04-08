import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

const MarkdownRenderer = ({ content }) => {
    const htmlContent = useMemo(() => {
        if (!content) return '';
        try {
            return DOMPurify.sanitize(marked.parse(content));
        } catch {
            return DOMPurify.sanitize(content);
        }
    }, [content]);

    return (
        <div
            className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:text-sm prose-th:bg-slate-100 prose-th:p-2 prose-td:p-2 prose-td:border prose-th:border"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
};

export default MarkdownRenderer;
