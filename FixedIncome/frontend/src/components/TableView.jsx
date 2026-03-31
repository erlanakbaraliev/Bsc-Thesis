import { useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import AxiosInstance from './Axios';  
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Edit as EditIcon } from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Box, Button, Typography } from '@mui/material';
import dayjs from 'dayjs';

const TableView = () => {
  //data and fetching state
  const [data, setData] = useState([]);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [rowSelection, setRowSelection] = useState({});

  //table state
  const [columnFilters, setColumnFilters] = useState(
    [],
  );
  const [dateFilters, setDateFilters] = useState({
    issue_date_gte: null,
    issue_date_lte: null,
    maturity_date_gte: null,
    maturity_date_lte: null,
  });
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  //if you want to avoid useEffect, look at the React Query example instead
  useEffect(() => {
    const fetchData = async () => {
      if (!data.length) {
        setIsLoading(true);
      } else {
        setIsRefetching(true);
      }

      const fieldMap = {
        issuer_country: 'issuer__country',
        issuer_name: 'issuer__name',
        credit_rating: 'issuer__credit_rating',
      }

      const ordering = sorting.length
        ? sorting.map(s => (s.desc ? '-' : '') + (fieldMap[s.id] || s.id)).join(',')
        : undefined;

      const textFields = ['isin', 'issuer__country', 'issuer__name', 'bond_type'];

      const filters = columnFilters.reduce((acc, col) => {
        const columnName = fieldMap[col.id] || col.id;
        if (textFields.includes(columnName)) {
          acc[`${columnName}__icontains`] = col.value;
        } else {
          acc[`${columnName}`] = col.value;
        }
        return acc;
      }, {});

      try {
        const response = await AxiosInstance.get('bonds/', {
          params: {
            ordering: ordering || undefined,
            page: pagination.pageIndex + 1,
            page_size: pagination.pageSize,
            ...filters,
            issue_date__gte:   dateFilters.issue_date_gte    ? dayjs(dateFilters.issue_date_gte).format('YYYY-MM-DD')    : undefined,
            issue_date__lte:   dateFilters.issue_date_lte    ? dayjs(dateFilters.issue_date_lte).format('YYYY-MM-DD')    : undefined,
            maturity_date__gte: dateFilters.maturity_date_gte ? dayjs(dateFilters.maturity_date_gte).format('YYYY-MM-DD') : undefined,
            maturity_date__lte: dateFilters.maturity_date_lte ? dayjs(dateFilters.maturity_date_lte).format('YYYY-MM-DD') : undefined,
          }
        });
        setData(response.data.results);
        setRowCount(response.data.count);
      } catch (error) {
        setIsError(true);
        console.error(error);
        return;
      }
      setIsError(false);
      setIsLoading(false);
      setIsRefetching(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columnFilters, //re-fetch when column filters change
    dateFilters,
    pagination.pageIndex, //re-fetch when page index changes
    pagination.pageSize, //re-fetch when page size changes
    sorting, //re-fetch when sorting changes
  ]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'isin',
        header: 'ISIN',
        minSize: 130,
        size: 150,
      },
      {
        accessorKey: 'issuer_country',
        header: 'Issuer Country',
        minSize: 130,
        size: 130
      },
      {
        accessorKey: 'issuer_name',
        header: 'Issuer Name',
        minSize: 180,
      },
      {
        accessorKey: 'credit_rating',
        header: 'Credit Rating',
        minSize: 100,
        size: 120,
      },
      {
        accessorKey: 'bond_type',
        header: 'Bond Type',
        minSize: 100,
        size: 120,
      },
      {
        accessorKey: 'face_value',
        header: 'Face Value',
        minSize: 110,
        size: 140,
      },
      {
        accessorKey: 'coupon_rate',
        header: 'Coupon Rate',
        minSize: 100,
        size: 120,
      },
      {
        accessorKey: 'issue_date',
        header: 'Issue Date',
        minSize: 120,
        size: 130,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'maturity_date',
        header: 'Maturity Date',
        minSize: 120,
        size: 130,
        enableColumnFilter: false,
      },
    ],
    [],
  );

  const handleSaveRow = async ({ table, row, values }) => {
    try {
      // values contains the updated row data
      // Usually, you'd use the row ID (like ISIN or an internal ID)
      await AxiosInstance.put(`bonds/${values.isin}/`, values);
      
      // Update local state to reflect changes without a full refetch
      const newData = [...data];
      newData[row.index] = values;
      setData(newData);
      
      table.setEditingRow(null); // Exit editing mode
    } catch (error) {
      console.error("Failed to save:", error);
      // You could trigger a toast notification here
    }
  };

  const handleBulkDelete = () => {
    const selectedIds = Object.keys(rowSelection);
    if (window.confirm(`Delete ${selectedIds.length} bonds?`)) {
      AxiosInstance.delete('bonds/bulk_delete/', {data: { ids: selectedIds } })
        .then(()=>{
          setData(prev => prev.filter(row => !selectedIds.includes(String(row.id))));
          setRowSelection({});
        })
    }
  }

  const table = useMaterialReactTable({
    columns,
    data,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    enableGlobalFilter: false,
    getRowId: (row) => row.id,
    initialState: { 
      showColumnFilters: false,
      density: 'compact',
      columnPinning: { right: ['mrt-row-actions'] } 
    },
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    muiToolbarAlertBannerProps: isError
      ? {
          color: 'error',
          children: 'Error loading data',
        }
      : undefined,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    rowCount,
    state: {
      columnFilters,
      isLoading,
      pagination,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      sorting,
      rowSelection,
    },
    // Column resizing
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    layoutMode: 'grid',
    // Ensure visibility via CSS properties
    muiTableHeadCellProps: {
      sx: {
        '& .Mui-TableHeadCell-Content-Labels': {
          overflow: 'visible', // Ensures header text doesn't hide
          whiteSpace: 'normal', // Allows header to wrap if tiny
        },
      },
    },
    muiTableBodyCellProps: {
      sx: {
        whiteSpace: 'nowrap', // Keeps bond data on one line
        overflow: 'visible',  // Prevents clipping
      },
    },
    // Edit modal
    // 1. Configure the Action Column width and behavior
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Edit', // Keep header short
        size: 60,       // Tight width for just one icon
      },
    },

    // 3. Define the actual Edit Icon
    renderRowActions: ({ row, table }) => (
      <Tooltip title="Edit Bond">
        <IconButton onClick={() => table.setEditingRow(row)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ),

    // 4. Connect the save logic
    onEditingRowSave: handleSaveRow,
    enableEditing: true,
    editDisplayMode: 'modal',
    enableColumnPinning: true,
    renderTopToolbarCustomActions: () => (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 0' }}>
          {Object.keys(rowSelection).length > 0 && (
            <Button 
              variant='contained'
              color='error'
              size='small'
              startIcon={<DeleteIcon/>}
              onClick={handleBulkDelete}
            >
              Delete Selected ({Object.keys(rowSelection).length})
            </Button>
          )}
         <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Issue Date:</Typography>
          <DatePicker label="From" value={dateFilters.issue_date_gte} onChange={(val) => setDateFilters(prev => ({ ...prev, issue_date_gte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <DatePicker label="To"   value={dateFilters.issue_date_lte} onChange={(val) => setDateFilters(prev => ({ ...prev, issue_date_lte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Maturity Date:</Typography>
          <DatePicker label="From" value={dateFilters.maturity_date_gte} onChange={(val) => setDateFilters(prev => ({ ...prev, maturity_date_gte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <DatePicker label="To"   value={dateFilters.maturity_date_lte} onChange={(val) => setDateFilters(prev => ({ ...prev, maturity_date_lte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <Button variant="outlined" size="small" onClick={() => setDateFilters({ issue_date_gte: null, issue_date_lte: null, maturity_date_gte: null, maturity_date_lte: null })}>
            Clear Dates
          </Button>
        </Box>
      </LocalizationProvider>
    ),
  });

  return <MaterialReactTable table={table} />;
};

export default TableView;

