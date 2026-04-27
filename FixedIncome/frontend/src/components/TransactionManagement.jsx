import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListAltIcon from '@mui/icons-material/FilterListAlt';

import AxiosInstance from './Axios';
import CreateTransactionModal from './Forms/CreateTransactionModal';
import EditTransactionModal from './Forms/EditTransactionModal';
import { getApiErrorMessage } from '../utils/apiError.js';
import { API_ENDPOINTS } from '../config/Api.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDateTimeParam } from '../utils/DateUtils.js';

function bondsResultsToMap(results) {
  const map = new Map();
  for (const b of results) {
    map.set(b.id, b);
  }
  return map;
}

/** Net quantity per bond from BUY/SELL ledger; join face value for notional. */
function computeHoldings(transactions, bondsById) {
  const net = new Map();
  for (const t of transactions) {
    const bondId = t.bond;
    const q = Number(t.quantity);
    const delta = t.action === 'BUY' ? q : -q;
    net.set(bondId, (net.get(bondId) || 0) + delta);
  }
  const rows = [];
  for (const [bondId, quantity] of net) {
    if (quantity === 0) continue;
    const b = bondsById.get(bondId);
    const face = b?.face_value != null ? Number(b.face_value) : null;
    rows.push({
      bondId,
      isin: b?.isin ?? `Bond #${bondId}`,
      issuerName: b?.issuer_name ?? '—',
      quantity,
      notional:
        face != null && !Number.isNaN(face) ? quantity * face : null,
    });
  }
  rows.sort((a, b) => a.isin.localeCompare(b.isin));
  const totalNotional = rows.reduce((s, r) => s + (r.notional ?? 0), 0);
  return { rows, totalNotional };
}

const actionChip = (action) => (
  <Chip
    label={action}
    size="small"
    color={action === 'BUY' ? 'success' : 'default'}
    variant={action === 'SELL' ? 'outlined' : 'filled'}
  />
);

export default function TransactionManagement() {
  const { user, role } = useAuth();
  const canTrade = role === 'ADMIN' || role === 'EDITOR';
  const isAdmin = role === 'ADMIN';

  const [transactions, setTransactions] = useState([]);
  const [bondsById, setBondsById] = useState(() => new Map());
  const [isError, setIsError] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txRes, bondsRes] = await Promise.all([
        AxiosInstance.get(API_ENDPOINTS.TRANSACTIONS),
        AxiosInstance.get('bonds/', { params: { page_size: 1000 } }),
      ]);
      const txList = Array.isArray(txRes.data) ? txRes.data : [];
      const bondList = bondsRes.data?.results ?? bondsRes.data ?? [];
      setTransactions(txList);
      setBondsById(bondsResultsToMap(Array.isArray(bondList) ? bondList : []));
      setIsError(false);
      setLoadError('');
    } catch (error) {
      setIsError(true);
      setLoadError(getApiErrorMessage(error));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const holdings = useMemo(
    () => computeHoldings(transactions, bondsById),
    [transactions, bondsById],
  );

  const canModifyRow = (row) => isAdmin || row.original.username === user;

  const handleConfirmDelete = () => {
    if (!deleteTx) return;
    AxiosInstance.delete(API_ENDPOINTS.TRANSACTION_DETAIL(deleteTx.id))
      .then(() => {
        setTransactions((prev) => prev.filter((r) => r.id !== deleteTx.id));
        setDeleteTx(null);
      })
      .catch((err) => {
        setDeleteError(getApiErrorMessage(err, 'Delete failed'));
        setDeleteTx(null);
      });
  };

  const columns = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID', size: 70 },
      { accessorKey: 'username', header: 'User', size: 120 },
      { accessorKey: 'bond_isin', header: 'ISIN', size: 140 },
      {
        accessorKey: 'action',
        header: 'Action',
        size: 90,
        Cell: ({ cell }) => actionChip(cell.getValue()),
      },
      { accessorKey: 'quantity', header: 'Qty', size: 80 },
      { accessorKey: 'price', header: 'Price', size: 100 },
      {
        accessorKey: 'created_at',
        header: 'Recorded',
        size: 170,
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
    data: transactions,
    enableGlobalFilter: false,
    getRowId: (row) => String(row.id),
    positionToolbarAlertBanner: 'bottom',
    initialState: {
      density: 'compact',
      sorting: [{ id: 'id', desc: true }],
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
    renderTopToolbarCustomActions: () =>
      canTrade ? (
        <Button
          variant="contained"
          size="small"
          startIcon={<SwapHorizIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Record trade
        </Button>
      ) : null,
    enableRowActions: true,
    enableColumnPinning: true,
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        {canModifyRow(row) ? (
          <>
            <Tooltip title="Edit trade">
              <IconButton size="small" onClick={() => setEditRow(row.original)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete trade">
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteTx(row.original)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </Box>
    ),
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Actions',
        size: 100,
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
        <Typography sx={{ marginLeft: '8px' }}>Trades</Typography>
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        <AlertTitle>Who sees what</AlertTitle>
        <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
          <li>
            <strong>Admin</strong> sees every user&apos;s trades and can edit or delete any row.
          </li>
          <li>
            <strong>Editor</strong> sees only their own trades; can record new trades and edit or delete those rows.
          </li>
          <li>
            <strong>Viewer</strong> sees only their own history (usually empty) and cannot record trades.
          </li>
        </Box>
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Open positions (bonds)
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {holdings.rows.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Aggregate face notional
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {holdings.totalNotional !== 0
                  ? holdings.totalNotional.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })
                  : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Net quantity × bond face value (per ISIN); short nets reduce the total.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Trade lines loaded
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {transactions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {holdings.rows.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Holdings summary
          </Typography>
          <Table size="small" sx={{ maxWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>ISIN</TableCell>
                <TableCell>Issuer</TableCell>
                <TableCell align="right">Net units</TableCell>
                <TableCell align="right">Face notional</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holdings.rows.map((r) => (
                <TableRow key={r.bondId}>
                  <TableCell>{r.isin}</TableCell>
                  <TableCell>{r.issuerName}</TableCell>
                  <TableCell align="right">{r.quantity}</TableCell>
                  <TableCell align="right">
                    {r.notional != null && !Number.isNaN(r.notional)
                      ? r.notional.toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      <MaterialReactTable table={table} />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <CreateTransactionModal
          onCancel={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      </Dialog>

      <Dialog open={Boolean(editRow)} onClose={() => setEditRow(null)} maxWidth="sm" fullWidth>
        {editRow ? (
          <EditTransactionModal
            row={editRow}
            onCancel={() => setEditRow(null)}
            onSuccess={() => {
              setEditRow(null);
              setRefreshKey((k) => k + 1);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(deleteTx)} onClose={() => setDeleteTx(null)}>
        <DialogTitle>Delete trade</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove trade #{deleteTx?.id} ({deleteTx?.action} {deleteTx?.quantity} × {deleteTx?.bond_isin})?
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTx(null)}>Cancel</Button>
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
