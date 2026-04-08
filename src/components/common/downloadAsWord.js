import DOMPurify from 'dompurify';

export const downloadAsWord = (content, filename = 'AI_Report', isHtml = false) => {
    const sanitized = DOMPurify.sanitize(content);
    const bodyContent = isHtml ? sanitized : `<div style="white-space: pre-wrap;">${sanitized.replace(/\n/g, '<br>')}</div>`;
    const htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>${DOMPurify.sanitize(filename)}</title>
            <style>
                body { font-family: '微軟正黑體', 'Microsoft JhengHei', Arial, sans-serif; line-height: 1.8; padding: 30px; color: #333; }
                h1 { font-size: 24px; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-top: 20px; }
                h2 { font-size: 20px; color: #1e3a8a; margin-top: 18px; }
                h3 { font-size: 16px; color: #374151; margin-top: 14px; }
                p { margin: 10px 0; }
                ul, ol { margin: 10px 0; padding-left: 25px; }
                li { margin: 5px 0; }
                table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
                th { background-color: #f3f4f6; font-weight: bold; }
                blockquote { border-left: 4px solid #6366f1; padding-left: 15px; margin: 10px 0; color: #4b5563; background: #f9fafb; padding: 10px 15px; }
                code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
                pre { background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
                strong { color: #1f2937; }
                hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
            </style>
        </head>
        <body>${bodyContent}</body>
        </html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
