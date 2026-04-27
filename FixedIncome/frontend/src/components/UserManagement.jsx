import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Link,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListAltIcon from '@mui/icons-material/FilterListAlt';

import AxiosInstance from './Axios';
import CreateUserModal from './Forms/CreateUserModal';
import EditUserModal from './Forms/EditUserModal';
import ResetPasswordModal from './Forms/ResetPasswordModal';
import { getApiErrorMessage } from '../utils/apiError.js';
import { API_ENDPOINTS } from '../config/Api.js';
import { useAuth } from '../hooks/useAuth.js';

function getUserColumnFilters(columnFilters) {
  return columnFilters.reduce((acc, col) => {
    if (col.id === 'username' || col.id === 'email') {
      acc[`${col.id}__icontains`] = col.value;
    } else if (col.id === 'role') {
      acc.profile__role = col.value;
    }
    return acc;
  }, {});
}

function getUserOrdering(sorting) {
  const fieldMap = { role: 'profile__role' };
  return sorting.length
    ? sorting.map((s) => `${s.desc ? '-' : ''}${fieldMap[s.id] || s.id}`).join(',')
    : undefined;
}

const roleChipColor = (role) => {
  if (role === 'ADMIN') return 'primary';
  if (role === 'EDITOR') return 'secondary';
  return 'default';
};

function UserManagementTable() {
  const [data, setData] = useState([]);
  const [isError, setIsError] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!data.length) {
        setIsLoading(true);
      } else {
        setIsRefetching(true);
      }

      const ordering = getUserOrdering(sorting);
      const filters = getUserColumnFilters(columnFilters);

      try {
        const response = await AxiosInstance.get(API_ENDPOINTS.USERS, {
          params: {
            ordering: ordering || undefined,
            page: pagination.pageIndex + 1,
            page_size: pagination.pageSize,
            ...filters,
          },
        });
        setData(response.data.results);
        setRowCount(response.data.count);
      } catch (error) {
        setIsError(true);
        setLoadError(getApiErrorMessage(error));
        console.error(error);
        return;
      }
      setIsError(false);
      setLoadError('');
      setIsLoading(false);
      setIsRefetching(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columnFilters,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    refreshKey,
  ]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        minSize: 60,
        size: 70,
      },
      {
        accessorKey: 'username',
        header: 'Username',
        minSize: 120,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        minSize: 160,
      },
      {
        accessorKey: 'role',
        header: 'Role',
        minSize: 100,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue()}
            color={roleChipColor(cell.getValue())}
            size="small"
          />
        ),
      },
    ],
    [],
  );

  const handleDeleteRow = (userRow) => {
    setDeleteConfirmUser(userRow);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmUser) return;
    AxiosInstance.delete(API_ENDPOINTS.USER_DETAIL(deleteConfirmUser.id))
      .then(() => {
        setData((prev) => prev.filter((r) => r.id !== deleteConfirmUser.id));
        setRowCount((c) => Math.max(0, c - 1));
        setDeleteConfirmUser(null);
      })
      .catch((err) => {
        setDeleteError(getApiErrorMessage(err, 'Delete failed'));
        setDeleteConfirmUser(null);
      });
  };

  const table = useMaterialReactTable({
    columns,
    data,
    enableGlobalFilter: false,
    getRowId: (row) => String(row.id),
    positionToolbarAlertBanner: 'bottom',
    initialState: {
      showColumnFilters: false,
      density: 'compact',
      columnPinning: { right: ['mrt-row-actions'] },
    },
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    muiToolbarAlertBannerProps: isError
      ? {
          color: 'error',
          children: loadError || 'Error loading data',
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
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    layoutMode: 'grid',
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', py: 1 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Create user
        </Button>
      </Box>
    ),
    enableEditing: true,
    enableRowActions: true,
    enableColumnPinning: true,
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        <Tooltip title="Edit user">
          <IconButton
            size="small"
            onClick={() => {
              table.setEditingRow(row);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset password">
          <IconButton
            size="small"
            onClick={() => setResetUser(row.original)}
          >
            <LockResetIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete user">
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteRow(row.original)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderEditRowDialogContent: ({ row, table }) => (
      <EditUserModal
        row={row}
        table={table}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    ),
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Actions',
        size: 140,
        muiTableHeadCellProps: { align: 'center' },
        muiTableBodyCellProps: { align: 'center' },
      },
    },
    icons: {
      FilterListIcon: FilterListAltIcon,
    },
  });

  return (
    <>
      <Box className="TopBar" sx={{ mb: 1 }}>
        <Typography sx={{ marginLeft: '8px' }}>User management</Typography>
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        <AlertTitle>Role Permissions</AlertTitle>
        <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
          <li><strong>Admin</strong> — Full access: manage users, create / edit / delete bonds, import & export data</li>
          <li><strong>Editor</strong> — Can edit bonds and import / export data; cannot manage users or bulk-delete bonds</li>
          <li><strong>Viewer</strong> — Read-only access: can view bond data only</li>
        </Box>
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          Need a new role profile? Contact the development team at{' '}
          <Link href="mailto:erlan.codes@gmail.com">erlan.codes@gmail.com</Link>
        </Typography>
      </Alert>

      <MaterialReactTable table={table} />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <CreateUserModal
          onCancel={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      </Dialog>

      <ResetPasswordModal
        open={Boolean(resetUser)}
        user={resetUser}
        onClose={() => setResetUser(null)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user &ldquo;{deleteConfirmUser?.username}&rdquo;?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmUser(null)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete error snackbar */}
      <Snackbar
        open={Boolean(deleteError)}
        autoHideDuration={6000}
        onClose={() => setDeleteError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setDeleteError('')} severity="error" variant="filled">
          {deleteError}
        </Alert>
      </Snackbar>
    </>
  );
}

export default function UserManagement() {
  const { role } = useAuth();
  if (role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <UserManagementTable />;
}
