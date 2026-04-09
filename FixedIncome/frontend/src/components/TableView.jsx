import { useEffect, useMemo, useState } from 'react';

// Third-party libraries
import dayjs from 'dayjs';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import { mkConfig, generateCsv, download } from 'export-to-csv';

// MUI components
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// MUI icons
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Local modules
import AxiosInstance from './Axios';
import EditBondModal from './Forms/EditBondModal';


const csvConfig = mkConfig({
  fieldSeparator: ',',
  decimalSeparator: '.',
  useKeysAsHeaders: true,
});

const TableView = () => {
  //data and fetching state
  const [data, setData] = useState([]);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [rowSelection, setRowSelection] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

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

  // 1. State for the Export Dropdown
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const handleExportClick = (event) => setExportAnchorEl(event.currentTarget);
  const handleExportClose = () => setExportAnchorEl(null);

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
    refreshKey, //re-feth when a bond is edited
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
        size: 130,
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

  const handleExportRows = (rows) => {
    const rowData = rows.map((row) => row.original);
    const csv = generateCsv(csvConfig)(rowData);
    download(csvConfig)(csv);
  };

  const table = useMaterialReactTable({
    columns,
    data,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    enableGlobalFilter: false,
    getRowId: (row) => row.id,
    positionToolbarAlertBanner: 'bottom',
    initialState: { 
      showColumnFilters: false,
      density: 'compact',
      columnPinning: { right: ['mrt-row-actions'] },
      columnVisibility: {issuer_country: false},
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

          {/* ---------------- EXPORT DROPDOWN ---------------- */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportClick}
          >
            Export Data
          </Button>

          <Menu
            anchorEl={exportAnchorEl}
            open={openExportMenu}
            onClose={handleExportClose}
          >

            <MenuItem
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
              //only export selected rows
              onClick={() => {
                handleExportRows(table.getSelectedRowModel().rows);
                handleExportClose();
              }}
            >
              <ListItemIcon>
                <CheckBoxIcon fontSize='small'/>
              </ListItemIcon>
              Export Selected Rows
            </MenuItem>

            <MenuItem
              disabled={table.getRowModel().rows.length === 0}
              //export all rows as seen on the screen (respects pagination, sorting, filtering, etc.)
              onClick={() => {
                handleExportRows(table.getRowModel().rows);
                handleExportClose();
              }}
            >
              <ListItemIcon>
                <ArticleIcon fontSize='small'/>
              </ListItemIcon>
              Export Current Page (5+)
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleExportClose();
              }}
            >
              <ListItemIcon>
                <DatasetIcon fontSize='small'/>
              </ListItemIcon>
              Export All Matches (Streaming)
            </MenuItem>

          </Menu>

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
    // Edit modal
    enableEditing: true,
    enableRowActions: true,
    enableColumnPinning: true,
    renderRowActions: ({ row, table }) => (
      <Tooltip title='Edit Bond'>
        <IconButton
          onClick={() => {
            table.setEditingRow(row);
          }}
        >
          <EditIcon />
        </IconButton>
      </Tooltip>
    ),
    renderEditRowDialogContent: ({ row, table }) => (
      <EditBondModal row={row} table={table} onSaved={(bondId, newData) => setRefreshKey(refreshKey+1) }/>
    ),
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Edit', // Keep header short
        size: 60,       // Tight width for just one icon
        muiTableHeadCellProps: {
          align: 'center',
        },
        muiTableBodyCellProps: {
          align: 'center',
        },
      },
    },
  });

  return <MaterialReactTable table={table} />;
};

export default TableView;

