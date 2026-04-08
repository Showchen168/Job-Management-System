export const exportToCSV = (data, filename, headers) => {
    if (!data || !data.length) return;
    const bom = '\uFEFF';
    const csvContent = [
        headers.map(h => h.label).join(','),
        ...data.map(row =>
            headers.map(h => {
                let val = row[h.key] || '';
                if (h.key === 'content' && typeof val === 'string') val = val.replace(/<[^>]+>/g, '');
                if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) val = `"${val.replace(/"/g, '""')}"`;
                // CSV Injection protection
                if (typeof val === 'string' && /^[=+\-@\t\r]/.test(val)) val = `'${val}`;
                return val;
            }).join(',')
        )
    ].join('\n');
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
