import React, { useState, useMemo } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface TableRow {
  id: number;
  name: string;
  email: string;
}

type SortDirection = 'asc' | 'desc' | null;
type SortableColumn = keyof TableRow;

interface SortConfig {
  column: SortableColumn | null;
  direction: SortDirection;
}

interface ColumnFilterState {
  id: string;
  name: string;
  email: string;
}

// ============================================================================
// Test Data Generation
// ============================================================================

const generateTestData = (): TableRow[] => {
  // Faker-like data generation in TypeScript
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
    'Edward', 'Deborah'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts'
  ];

  const data: TableRow[] = [];
  
  for (let i = 1; i <= 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    const email = `${fullName.toLowerCase().replace(' ', '.')}@example.com`;
    
    data.push({
      id: i,
      name: fullName,
      email: email
    });
  }
  
  return data;
};

// ============================================================================
// Custom Hooks
// ============================================================================

const useSort = (data: TableRow[], sortConfig: SortConfig): TableRow[] => {
  return useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return data;
    }

    const sortedData = [...data].sort((a, b) => {
      const aValue = a[sortConfig.column!];
      const bValue = b[sortConfig.column!];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortedData;
  }, [data, sortConfig]);
};

const useFilter = (
  data: TableRow[],
  globalFilter: string,
  columnFilters: ColumnFilterState
): TableRow[] => {
  return useMemo(() => {
    let filteredData = [...data];

    // Apply global filter
    if (globalFilter.trim()) {
      filteredData = filteredData.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(globalFilter.toLowerCase())
        )
      );
    }

    // Apply column filters
    (Object.keys(columnFilters) as SortableColumn[]).forEach((key) => {
      const filterValue = columnFilters[key];
      if (filterValue.trim()) {
        filteredData = filteredData.filter((row) =>
          String(row[key]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    return filteredData;
  }, [data, globalFilter, columnFilters]);
};

const usePagination = (totalItems: number, pageSize: number) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(totalItems / pageSize);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  const paginatedRange = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return { start, end };
  }, [currentPage, pageSize]);

  // Reset to page 1 when totalPages changes
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return {
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    paginatedRange
  };
};

// ============================================================================
// Components
// ============================================================================

interface GlobalFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const GlobalFilter: React.FC<GlobalFilterProps> = ({ value, onChange }) => {
  return (
    <div className="mb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search all columns..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

interface TableHeaderProps {
  column: SortableColumn;
  label: string;
  sortConfig: SortConfig;
  onSort: (column: SortableColumn) => void;
}

const TableHeader: React.FC<TableHeaderProps> = ({ column, label, sortConfig, onSort }) => {
  const getSortIndicator = () => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <th
      onClick={() => onSort(column)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-blue-600 font-bold">{getSortIndicator()}</span>
      </div>
    </th>
  );
};

interface ColumnFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const ColumnFilter: React.FC<ColumnFilterProps> = ({ value, onChange, placeholder }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      onClick={(e) => e.stopPropagation()}
    />
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onNextPage,
  onPrevPage
}) => {
  const [pageInput, setPageInput] = useState('');
  const [pageSizeInput, setPageSizeInput] = useState('');
  const [showCustomPageSize, setShowCustomPageSize] = useState(false);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page)) {
      onPageChange(page);
      setPageInput('');
    }
  };

  const handlePageSizeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomPageSize(true);
    } else {
      setShowCustomPageSize(false);
      onPageSizeChange(Number(value));
    }
  };

  const handleCustomPageSizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const size = parseInt(pageSizeInput, 10);
    if (!isNaN(size) && size > 0) {
      onPageSizeChange(size);
      setPageSizeInput('');
      setShowCustomPageSize(false);
    }
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const isStandardPageSize = [10, 25, 50, 100].includes(pageSize);

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">Rows per page:</span>
        {!showCustomPageSize ? (
          <div className="flex items-center gap-2">
            <select
              value={isStandardPageSize ? pageSize : 'custom'}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="custom">Custom...</option>
            </select>
            {!isStandardPageSize && (
              <span className="text-sm text-gray-600">({pageSize})</span>
            )}
          </div>
        ) : (
          <form onSubmit={handleCustomPageSizeSubmit} className="flex items-center gap-2">
            <input
              type="number"
              value={pageSizeInput}
              onChange={(e) => setPageSizeInput(e.target.value)}
              placeholder="Enter size"
              min={1}
              max={totalItems}
              autoFocus
              className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomPageSize(false);
                setPageSizeInput('');
              }}
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      <div className="text-sm text-gray-700">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrevPage}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>

        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Go to:</span>
          <input
            type="number"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="#"
            min={1}
            max={totalPages}
            className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// Main DataTable Component
// ============================================================================

const DataTable: React.FC = () => {
  const [data] = useState<TableRow[]>(() => generateTestData());
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFilterState>({
    id: '',
    name: '',
    email: ''
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: null
  });
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (column: SortableColumn) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        if (prev.direction === 'asc') {
          return { column, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { column: null, direction: null };
        }
      }
      return { column, direction: 'asc' };
    });
  };

  const handleColumnFilterChange = (column: keyof ColumnFilterState, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [column]: value }));
  };

  // Apply filters and sorting
  const filteredData = useFilter(data, globalFilter, columnFilters);
  const sortedData = useSort(filteredData, sortConfig);

  // Pagination
  const {
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    paginatedRange
  } = usePagination(sortedData.length, pageSize);

  const paginatedData = sortedData.slice(paginatedRange.start, paginatedRange.end);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Data Table</h1>

      <GlobalFilter value={globalFilter} onChange={setGlobalFilter} />

      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-200">
            <tr>
              <TableHeader
                column="id"
                label="ID"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <TableHeader
                column="name"
                label="Name"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <TableHeader
                column="email"
                label="Email"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </tr>
            <tr className="bg-gray-50">
              <th className="px-6 py-2">
                <ColumnFilter
                  value={columnFilters.id}
                  onChange={(value) => handleColumnFilterChange('id', value)}
                  placeholder="Filter ID..."
                />
              </th>
              <th className="px-6 py-2">
                <ColumnFilter
                  value={columnFilters.name}
                  onChange={(value) => handleColumnFilterChange('name', value)}
                  placeholder="Filter name..."
                />
              </th>
              <th className="px-6 py-2">
                <ColumnFilter
                  value={columnFilters.email}
                  onChange={(value) => handleColumnFilterChange('email', value)}
                  placeholder="Filter email..."
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.email}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No results found. Try adjusting your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sortedData.length}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        onNextPage={nextPage}
        onPrevPage={prevPage}
      />
    </div>
  );
};

export default DataTable;
