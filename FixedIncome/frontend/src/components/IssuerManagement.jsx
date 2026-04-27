import { useEffect, useMemo, useState } from 'react';
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
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListAltIcon from '@mui/icons-material/FilterListAlt';

import AxiosInstance from './Axios';
import EditIssuerModal from './Forms/EditIssuerModal';
import CreateIssuerModal from './Forms/CreateIssuerModal';
import { getApiErrorMessage } from '../utils/apiError.js';
import { API_ENDPOINTS } from '../config/Api.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDateTimeParam } from '../utils/DateUtils.js';

const ratingChipColor = (rating) => {
  if (rating === 'AAA' || rating === 'AA') return 'success';
  if (rating === 'A' || rating === 'BBB') return 'default';
  return 'warning';
};

export default function IssuerManagement() {
  const { role } = useAuth();
  const canWrite = role === 'ADMIN' || role === 'EDITOR';
  const isAdmin = role === 'ADMIN';

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isError, setIsError] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editIssuer, setEditIssuer] = useState(null);
  const [deleteIssuer, setDeleteIssuer] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setIsLoading(true);
      try {
        const [issRes, metaRes] = await Promise.all([
          AxiosInstance.get(API_ENDPOINTS.ISSUERS),
          AxiosInstance.get('api/meta/'),
        ]);
        if (!mounted) return;
        const list = Array.isArray(issRes.data) ? issRes.data : [];
        setData(list);
        setMeta(metaRes.data);
        setIsError(false);
        setLoadError('');
      } catch (error) {
        if (!mounted) return;
        setIsError(true);
        setLoadError(getApiErrorMessage(error));
        console.error(error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const handleConfirmDelete = () => {
    if (!deleteIssuer) return;
    AxiosInstance.delete(API_ENDPOINTS.ISSUER_DETAIL(deleteIssuer.id))
      .then(() => {
        setData((prev) => prev.filter((r) => r.id !== deleteIssuer.id));
        setDeleteIssuer(null);
      })
      .catch((err) => {
        setDeleteError(getApiErrorMessage(err, 'Delete failed'));
        setDeleteIssuer(null);
      });
  };

  const columns = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID', size: 70 },
      { accessorKey: 'name', header: 'Name', minSize: 160 },
      { accessorKey: 'country', header: 'Country', size: 100 },
      { accessorKey: 'industry', header: 'Industry', size: 160 },
      {
        accessorKey: 'credit_rating',
        header: 'Rating',
        size: 110,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue()}
            color={ratingChipColor(cell.getValue())}
            size="small"
          />
        ),
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        size: 150,
        Cell: ({ cell }) => {
          const v = cell.getValue();
          return v ? formatDateTimeParam(v) : '—';
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    enableGlobalFilter: false,
    getRowId: (row) => String(row.id),
    positionToolbarAlertBanner: 'bottom',
    initialState: {
      density: 'compact',
      sorting: [{ id: 'name', desc: false }],
      columnPinning: { right: ['mrt-row-actions'] },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: 'error',
          children: loadError || 'Error loading data',
        }
      : undefined,
    state: {
      isLoading,
      showAlertBanner: isError,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    layoutMode: 'grid',
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {canWrite ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddBoxIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create issuer
          </Button>
        ) : null}
      </Box>
    ),
    enableRowActions: true,
    enableColumnPinning: true,
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        {canWrite ? (
          <Tooltip title="Edit issuer">
            <IconButton size="small" onClick={() => setEditIssuer(row.original)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        {isAdmin ? (
          <Tooltip title="Delete issuer">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteIssuer(row.original)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
    ),
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Actions',
        size: 110,
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
        <Typography sx={{ marginLeft: '8px' }}>Issuers</Typography>
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        <AlertTitle>Permissions</AlertTitle>
        <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
          <li>Everyone signed in can browse this list.</li>
          <li>
            <strong>Admin</strong> and <strong>Editor</strong> can edit issuers; only <strong>Admin</strong> can delete
            (deleting an issuer removes its bonds from the catalog).
          </li>
        </Box>
      </Alert>

      <MaterialReactTable table={table} />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        {createOpen && meta ? (
          <CreateIssuerModal
            meta={meta}
            onCancel={() => setCreateOpen(false)}
            onSuccess={() => {
              setCreateOpen(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(editIssuer)} onClose={() => setEditIssuer(null)} maxWidth="sm" fullWidth>
        {editIssuer && meta ? (
          <EditIssuerModal
            issuer={editIssuer}
            meta={meta}
            onCancel={() => setEditIssuer(null)}
            onSuccess={() => {
              setEditIssuer(null);
              setRefreshKey((k) => k + 1);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(deleteIssuer)} onClose={() => setDeleteIssuer(null)}>
        <DialogTitle>Delete issuer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete issuer &ldquo;{deleteIssuer?.name}&rdquo;? All bonds linked to this issuer will be removed as well.
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteIssuer(null)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
