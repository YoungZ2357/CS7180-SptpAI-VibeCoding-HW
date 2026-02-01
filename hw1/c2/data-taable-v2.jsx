import React, { useState, useMemo } from 'react';

// TypeScript Interfaces
interface TableData {
  id: number;
  name: string;
  email: string;
}

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = keyof TableData | null;

interface TableState {
  data: TableData[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  generalFilter: string;
  columnFilters: {
    id: string;
    name: string;
    email: string;
  };
  currentPage: number;
  pageSize: number;
}

// Generate test data
const generateTestData = (): TableData[] => {
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  
  const data: TableData[] = [];
  for (let i = 1; i <= 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
    
    data.push({
      id: i,
      name: name,
      email: email
    });
  }
  return data;
};

// Custom Hook for Table Data Management
const useTableData = (initialData: TableData[]) => {
  const [state, setState] = useState<TableState>({
    data: initialData,
    sortColumn: null,
    sortDirection: null,
    generalFilter: '',
    columnFilters: { id: '', name: '', email: '' },
    currentPage: 1,
    pageSize: 10
  });

  const handleSort = (column: keyof TableData) => {
    setState(prev => {
      let newDirection: SortDirection = 'asc';
      if (prev.sortColumn === column) {
        if (prev.sortDirection === 'asc') newDirection = 'desc';
        else if (prev.sortDirection === 'desc') newDirection = null;
      }
      return {
        ...prev,
        sortColumn: newDirection ? column : null,
        sortDirection: newDirection,
        currentPage: 1
      };
    });
  };

  const handleGeneralFilter = (value: string) => {
    setState(prev => ({ ...prev, generalFilter: value, currentPage: 1 }));
  };

  const handleColumnFilter = (column: keyof TableData, value: string) => {
    setState(prev => ({
      ...prev,
      columnFilters: { ...prev.columnFilters, [column]: value },
      currentPage: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...state.data];

    // Apply general filter
    if (state.generalFilter) {
      const searchTerm = state.generalFilter.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchTerm)
        )
      );
    }

    // Apply column filters
    Object.keys(state.columnFilters).forEach(key => {
      const column = key as keyof TableData;
      const filterValue = state.columnFilters[column].toLowerCase();
      if (filterValue) {
        filtered = filtered.filter(row =>
          String(row[column]).toLowerCase().includes(filterValue)
        );
      }
    });

    // Apply sorting
    if (state.sortColumn && state.sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[state.sortColumn!];
        const bVal = b[state.sortColumn!];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return state.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (state.sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [state.data, state.generalFilter, state.columnFilters, state.sortColumn, state.sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (state.currentPage - 1) * state.pageSize;
    return processedData.slice(start, start + state.pageSize);
  }, [processedData, state.currentPage, state.pageSize]);

  const totalPages = Math.ceil(processedData.length / state.pageSize);

  return {
    state,
    processedData,
    paginatedData,
    totalPages,
    handleSort,
    handleGeneralFilter,
    handleColumnFilter,
    handlePageChange,
    handlePageSizeChange
  };
};

// General Filter Component
const GeneralFilter: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        type="text"
        placeholder="Search all columns..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
};

// Table Header Component
const TableHeader: React.FC<{
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: keyof TableData) => void;
}> = ({ sortColumn, sortDirection, onSort }) => {
  const columns: { key: keyof TableData; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' }
  ];

  const getSortIcon = (column: keyof TableData) => {
    if (sortColumn !== column) return '';
    if (sortDirection === 'asc') return ' ↑';
    if (sortDirection === 'desc') return ' ↓';
    return '';
  };

  return (
    <thead>
      <tr>
        {columns.map(col => (
          <th 
            key={col.key} 
            onClick={() => onSort(col.key)}
            style={{
              padding: '12px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#333',
              borderBottom: '2px solid #dee2e6',
              cursor: 'pointer',
              userSelect: 'none',
              backgroundColor: '#f8f9fa'
            }}
          >
            {col.label}{getSortIcon(col.key)}
          </th>
        ))}
      </tr>
    </thead>
  );
};

// Column Filter Component
const ColumnFilter: React.FC<{
  columns: (keyof TableData)[];
  filters: { id: string; name: string; email: string };
  onChange: (column: keyof TableData, value: string) => void;
}> = ({ columns, filters, onChange }) => {
  return (
    <tr>
      {columns.map(col => (
        <th key={col} style={{ padding: '8px', backgroundColor: '#fff' }}>
          <input
            type="text"
            placeholder={`Filter ${col}...`}
            value={filters[col]}
            onChange={(e) => onChange(col, e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '13px',
              border: '1px solid #ced4da',
              borderRadius: '3px',
              boxSizing: 'border-box'
            }}
          />
        </th>
      ))}
    </tr>
  );
};

// Table Body Component
const TableBody: React.FC<{
  data: TableData[];
}> = ({ data }) => {
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td 
            colSpan={3}
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6c757d',
              fontStyle: 'italic'
            }}
          >
            No matched records
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {data.map(row => (
        <tr key={row.id}>
          <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', color: '#495057' }}>{row.id}</td>
          <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', color: '#495057' }}>{row.name}</td>
          <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', color: '#495057' }}>{row.email}</td>
        </tr>
      ))}
    </tbody>
  );
};

// Pagination Component
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}> = ({ currentPage, totalPages, pageSize, totalRecords, onPageChange, onPageSizeChange }) => {
  const [customPageSize, setCustomPageSize] = useState('');
  const [customPageNumber, setCustomPageNumber] = useState('');

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];
    
    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const handleCustomPageSize = () => {
    const size = parseInt(customPageSize);
    if (!isNaN(size) && size > 0) {
      onPageSizeChange(size);
      setCustomPageSize('');
    }
  };

  const handleCustomPageNumber = () => {
    const page = parseInt(customPageNumber);
    if (!isNaN(page) && page > 0 && page <= totalPages) {
      onPageChange(page);
      setCustomPageNumber('');
    }
  };

  const buttonStyle = {
    padding: '6px 12px',
    border: '1px solid #dee2e6',
    backgroundColor: 'white',
    color: '#495057',
    cursor: 'pointer',
    borderRadius: '3px',
    fontSize: '14px'
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#4CAF50',
    color: 'white',
    borderColor: '#4CAF50'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px'
    }}>
      <div style={{ textAlign: 'center', color: '#495057', fontSize: '14px' }}>
        Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
        {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '5px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={currentPage === 1 ? disabledButtonStyle : buttonStyle}
        >
          First
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={currentPage === 1 ? disabledButtonStyle : buttonStyle}
        >
          Previous
        </button>

        {getPageNumbers().map((page, idx) => (
          typeof page === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(page)}
              style={currentPage === page ? activeButtonStyle : buttonStyle}
            >
              {page}
            </button>
          ) : (
            <span key={idx} style={{ padding: '6px 8px', color: '#6c757d' }}>{page}</span>
          )
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={currentPage === totalPages ? disabledButtonStyle : buttonStyle}
        >
          Next
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={currentPage === totalPages ? disabledButtonStyle : buttonStyle}
        >
          Last
        </button>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <label>Page size: </label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '5px 8px',
              border: '1px solid #ced4da',
              borderRadius: '3px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span> or </span>
          <input
            type="number"
            placeholder="Custom"
            value={customPageSize}
            onChange={(e) => setCustomPageSize(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomPageSize()}
            style={{
              width: '80px',
              padding: '5px 8px',
              border: '1px solid #ced4da',
              borderRadius: '3px',
              fontSize: '14px'
            }}
          />
          <button 
            onClick={handleCustomPageSize}
            style={{
              padding: '5px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Apply
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <label>Go to page: </label>
          <input
            type="number"
            placeholder="Page #"
            value={customPageNumber}
            onChange={(e) => setCustomPageNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomPageNumber()}
            min={1}
            max={totalPages}
            style={{
              width: '80px',
              padding: '5px 8px',
              border: '1px solid #ced4da',
              borderRadius: '3px',
              fontSize: '14px'
            }}
          />
          <button 
            onClick={handleCustomPageNumber}
            style={{
              padding: '5px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
};

// Main DataTable Component
const DataTable: React.FC = () => {
  const testData = useMemo(() => generateTestData(), []);
  
  const {
    state,
    processedData,
    paginatedData,
    totalPages,
    handleSort,
    handleGeneralFilter,
    handleColumnFilter,
    handlePageChange,
    handlePageSizeChange
  } = useTableData(testData);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '20px auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px', fontSize: '24px' }}>
        Sortable & Filterable Data Table
      </h1>
      
      <GeneralFilter
        value={state.generalFilter}
        onChange={handleGeneralFilter}
      />

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <TableHeader
          sortColumn={state.sortColumn}
          sortDirection={state.sortDirection}
          onSort={handleSort}
        />
        <thead>
          <ColumnFilter
            columns={['id', 'name', 'email']}
            filters={state.columnFilters}
            onChange={handleColumnFilter}
          />
        </thead>
        <TableBody data={paginatedData} />
      </table>

      <Pagination
        currentPage={state.currentPage}
        totalPages={totalPages}
        pageSize={state.pageSize}
        totalRecords={processedData.length}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default DataTable;
