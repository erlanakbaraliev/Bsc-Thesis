import { useEffect, useMemo, useState } from 'react';

// Third-party libraries
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';

// MUI components
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Popover,
  Dialog,
  DialogContent
} from '@mui/material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// MUI icons
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ArticleIcon from '@mui/icons-material/Article';
import DatasetIcon from '@mui/icons-material/Dataset';
import FilterListAltIcon from '@mui/icons-material/FilterListAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';

// Local modules
import AxiosInstance from './Axios';
import EditBondModal from './Forms/EditBondModal';
import CsvUploader from './CsvUploader.jsx';

// Local Utils
import { getOrdering, getColumnFilters } from '../utils/Utils.js'
import { handleExportRows } from '../utils/CsvExportUtils.js';
import { formatDateParam, formatDateTimeParam, formatDateTimeParamAPICall } from '../utils/DateUtils.js';
import { API_ENDPOINTS } from '../config/Api.js';


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
    created_at_lte: null,
    created_at_gte: null,
    updated_at_lte: null,
    updated_at_gte: null
  });
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // export nenu dropdown state
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const handleExportMenuClick = (event) => setExportAnchorEl(event.currentTarget);
  const handleExportMenuClose = () => setExportAnchorEl(null);

  {/* ---- Date Filters (issue_date, maturity_date) ---- */}
  const [dateFilterAnchorEl, setDateFilterAnchorEl] = useState(null);
  const openDateFilterPopover = Boolean(dateFilterAnchorEl);

  const handleDateFilterClick = (event) => setDateFilterAnchorEl(event.currentTarget);
  const handleDateFilterClose = () => setDateFilterAnchorEl(null);

  const isFilterActive = Object.values(dateFilters).some(val => val !== null);

  {/* ---- Csv Uploader ---- */}
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  //if you want to avoid useEffect, look at the React Query example instead
  useEffect(() => {
    const fetchData = async () => {
      if (!data.length) {
        setIsLoading(true);
      } else {
        setIsRefetching(true);
      }

      const ordering = getOrdering(sorting)
      const filters = getColumnFilters(columnFilters)

      try {
        const response = await AxiosInstance.get('bonds/', {
          params: {
            ordering: ordering || undefined,
            page: pagination.pageIndex + 1,
            page_size: pagination.pageSize,
            ...filters,
            issue_date__gte:    formatDateParam(dateFilters.issue_date_gte),
            issue_date__lte:    formatDateParam(dateFilters.issue_date_lte),
            maturity_date__gte: formatDateParam(dateFilters.maturity_date_gte),
            maturity_date__lte: formatDateParam(dateFilters.maturity_date_lte),
            created_at__gte:    formatDateTimeParamAPICall(dateFilters.created_at_gte),
            created_at__lte:    formatDateTimeParamAPICall(dateFilters.created_at_lte),
            updated_at__gte:     formatDateTimeParamAPICall(dateFilters.updated_at_gte),
            updated_at__lte:     formatDateTimeParamAPICall(dateFilters.updated_at_lte),
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
        accessorKey: 'issuer_industry',
        header: 'Issuer Industry',
        minSize: 130,
        size: 130,
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
        minSize: 80,
        size: 100,
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
      {
        accessorKey: 'created_at',
        header: 'Created at',
        minSize: 120,
        size: 130,
        enableColumnFilter: false,
        Cell: ({ cell }) =>
          formatDateTimeParam(cell.getValue())
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated at',
        minSize: 120,
        size: 130,
        enableColumnFilter: false,
        Cell: ({ cell }) =>
          formatDateTimeParam(cell.getValue())
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

  const getExportUrl = () => {
    const params = new URLSearchParams();
    
    if (sorting.length) {
      const ordering = getOrdering(sorting);
      params.append('ordering', ordering);
    }
     
    const filtering = getColumnFilters(columnFilters);
    Object.entries(filtering).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })

    if (dateFilters.issue_date_gte) params.append('issue_date__gte', formatDateParam(dateFilters.issue_date_gte))
    if (dateFilters.issue_date_lte) params.append('issue_date__lte', formatDateParam(dateFilters.issue_date_lte))
    if (dateFilters.maturity_date_gte) params.append('maturity_date__gte', formatDateParam(dateFilters.maturity_date_gte))
    if (dateFilters.maturity_date_lte) params.append('maturity_date__lte', formatDateParam(dateFilters.maturity_date_lte))

    return `${API_ENDPOINTS.STREAMING_EXPORT}?${params.toString()}`;
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
      columnVisibility: {issuer_country: false, created_at: false, updated_at: false},
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
            onClick={handleExportMenuClick}
          >
            Export Data
          </Button>

          <Menu
            anchorEl={exportAnchorEl}
            open={openExportMenu}
            onClose={handleExportMenuClose}
          >

            <MenuItem
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
              //only export selected rows
              onClick={() => {
                handleExportRows(table.getSelectedRowModel().rows);
                handleExportMenuClose();
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
                handleExportMenuClose();
              }}
            >
              <ListItemIcon>
                <ArticleIcon fontSize='small'/>
              </ListItemIcon>
              Export Current Page (5+)
            </MenuItem>

            <MenuItem
              onClick={() => {
                window.location.href = getExportUrl();
                handleExportMenuClose();
              }}
            >
              <ListItemIcon>
                <DatasetIcon fontSize='small'/>
              </ListItemIcon>
              Export All Matches (Streaming)
            </MenuItem>

          </Menu>

          {/* ---------------- Date Filters ---------------- */}
          <Button
            variant={isFilterActive? "contained" : "outlined"}
            size="small"
            startIcon={<FilterListAltIcon/>}
            onClick={handleDateFilterClick}
          >
            Date Filters {isFilterActive? "(Active)": ""}
          </Button>
          <Popover
            open={openDateFilterPopover}
            anchorEl={dateFilterAnchorEl}
            onClose={handleDateFilterClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Issue Date:</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="From" value={dateFilters.issue_date_gte} onChange={(val) => setDateFilters(prev => ({ ...prev, issue_date_gte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
                <DatePicker label="To"   value={dateFilters.issue_date_lte} onChange={(val) => setDateFilters(prev => ({ ...prev, issue_date_lte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
              </Box>

              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Maturity Date:</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="From" value={dateFilters.maturity_date_gte} onChange={(val) => setDateFilters(prev => ({ ...prev, maturity_date_gte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
                <DatePicker label="To"   value={dateFilters.maturity_date_lte} onChange={(val) => setDateFilters(prev => ({ ...prev, maturity_date_lte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
              </Box>

              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Creation Date:</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="From" value={dateFilters.created_at_gte} onChange={(val) => setDateFilters(prev => ({ ...prev, created_at_gte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
                <DatePicker label="To" value={dateFilters.created_at_lte} onChange={(val) => setDateFilters(prev => ({ ...prev, created_at_lte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
              </Box>

              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Update:</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="From" value={dateFilters.updated_at_gte} onChange={(val) => setDateFilters(prev => ({ ...prev, updated_at_gte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
                <DatePicker label="To" value={dateFilters.updated_at_lte} onChange={(val) => setDateFilters(prev => ({ ...prev, updated_at_lte: val }))} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => {
                    setDateFilters(
                      { 
                        issue_date_gte: null, issue_date_lte: null, 
                        maturity_date_gte: null, maturity_date_lte: null, 
                        created_at_gte: null, created_at_lte: null,
                        updated_at_gte: null, updated_at_lte: null
                      })
                    }
                  }>
                  Clear Dates
                </Button>
              </Box>
            </Box>
          </Popover>

          {/* ---- Csv Uploader ---- */}
          <Button
            variant='contained'
            color='primary'
            size='small'
            startIcon={<CloudUploadIcon/>}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import Bonds
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
      <EditBondModal row={row} table={table} onSaved={(bondId, newData) => setRefreshKey(prev => prev + 1) }/>
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
    // {/* ---- show/hide filter icon change ---- */}
    icons: {
      FilterListIcon: FilterListAltIcon
    }
  });

  return (
    <>
      <MaterialReactTable table={table} />

      <Dialog
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <IconButton
            aria-label="close"
            onClick={() => setIsImportModalOpen(false)}
            sx={{ position:'absolute', right:8, top:8, color:'grey.500' }}
          >
            <CloseIcon/>
          </IconButton>

          <Box sx={{ mt:2 }}>
            <CsvUploader
              onSuccess={() => {
                setRefreshKey(prev => prev + 1)
                setIsImportModalOpen(false)
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
};

export default TableView;

