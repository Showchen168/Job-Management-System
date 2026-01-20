/**
 * Table Component
 * 通用表格元件，支援排序、選擇等功能
 */

const Table = ({ children, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
};

const TableHead = ({ children }) => {
  return (
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200">
        {children}
      </tr>
    </thead>
  );
};

const TableHeader = ({
  children,
  sortable = false,
  sorted = null, // 'asc' | 'desc' | null
  onSort,
  align = 'left',
  className = '',
}) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th
      className={`
        px-6 py-3 text-xs font-bold text-slate-500 uppercase
        ${alignClass[align]}
        ${sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}
        ${className}
      `}
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

const TableBody = ({ children }) => {
  return (
    <tbody className="divide-y divide-slate-100">
      {children}
    </tbody>
  );
};

const TableRow = ({
  children,
  hover = true,
  selected = false,
  onClick,
  className = '',
}) => {
  return (
    <tr
      className={`
        ${hover ? 'hover:bg-slate-50 transition-colors' : ''}
        ${selected ? 'bg-blue-50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

const TableCell = ({
  children,
  align = 'left',
  className = '',
}) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td
      className={`
        px-6 py-4 whitespace-nowrap text-sm text-slate-600
        ${alignClass[align]}
        ${className}
      `}
    >
      {children}
    </td>
  );
};

// Empty State
const TableEmpty = ({
  icon: Icon,
  title = '沒有資料',
  description,
  action,
}) => {
  return (
    <tr>
      <td colSpan="100%" className="px-6 py-12 text-center">
        {Icon && (
          <div className="flex justify-center mb-4">
            <Icon className="text-slate-300" size={48} />
          </div>
        )}
        <p className="text-slate-500 font-medium">{title}</p>
        {description && (
          <p className="text-slate-400 text-sm mt-1">{description}</p>
        )}
        {action && (
          <div className="mt-4">{action}</div>
        )}
      </td>
    </tr>
  );
};

// 使用範例
/*
<Table>
  <TableHead>
    <TableHeader sortable sorted="asc" onSort={handleSort}>名稱</TableHeader>
    <TableHeader>狀態</TableHeader>
    <TableHeader align="right">操作</TableHeader>
  </TableHead>
  <TableBody>
    {data.length > 0 ? (
      data.map(item => (
        <TableRow key={item.id} hover onClick={() => handleClick(item)}>
          <TableCell>{item.name}</TableCell>
          <TableCell><Badge>{item.status}</Badge></TableCell>
          <TableCell align="right">
            <Button size="sm" variant="ghost">編輯</Button>
          </TableCell>
        </TableRow>
      ))
    ) : (
      <TableEmpty
        icon={FileText}
        title="尚無任務"
        description="點擊上方按鈕新增第一個任務"
        action={<Button>新增任務</Button>}
      />
    )}
  </TableBody>
</Table>
*/

export {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
};
export default Table;
