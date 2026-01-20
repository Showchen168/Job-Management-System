/**
 * Table Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Table = ({ children, className = '' }) => (
    <div className={`overflow-x-auto ${className}`}>
        <table className="w-full">{children}</table>
    </div>
);

const TableHead = ({ children }) => (
    <thead>
        <tr className="bg-slate-50 border-b border-slate-200">{children}</tr>
    </thead>
);

const TableHeader = ({
    children,
    sortable = false,
    sorted = null,
    onSort,
    align = 'left',
    className = '',
}) => {
    const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

    return (
        <th
            className={`px-6 py-3 text-xs font-bold text-slate-500 uppercase ${alignClass[align]} ${sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''} ${className}`}
            onClick={sortable ? onSort : undefined}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortable && (
                    <span className="text-slate-400">
                        {sorted === 'asc' && '↑'}
                        {sorted === 'desc' && '↓'}
                        {!sorted && '↕'}
                    </span>
                )}
            </div>
        </th>
    );
};

const TableBody = ({ children }) => (
    <tbody className="divide-y divide-slate-100">{children}</tbody>
);

const TableRow = ({ children, hover = true, selected = false, onClick, className = '' }) => (
    <tr
        className={`${hover ? 'hover:bg-slate-50 transition-colors' : ''} ${selected ? 'bg-blue-50' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
    >
        {children}
    </tr>
);

const TableCell = ({ children, align = 'left', className = '' }) => {
    const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };
    return (
        <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-600 ${alignClass[align]} ${className}`}>
            {children}
        </td>
    );
};

const TableEmpty = ({ icon: Icon, title = '沒有資料', description, action }) => (
    <tr>
        <td colSpan="100%" className="px-6 py-12 text-center">
            {Icon && <div className="flex justify-center mb-4"><Icon className="text-slate-300" size={48} /></div>}
            <p className="text-slate-500 font-medium">{title}</p>
            {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </td>
    </tr>
);

export { Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty };
export default Table;
