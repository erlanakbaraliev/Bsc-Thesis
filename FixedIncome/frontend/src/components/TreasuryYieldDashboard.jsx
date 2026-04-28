import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getTreasuryDashboard, postTreasurySync } from '../config/Api';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../utils/apiError';

const INTERVAL = 'monthly';

const ChartCard = ({ title, children }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ height: 320 }}>{children}</Box>
    </CardContent>
  </Card>
);

const StatCard = ({ label, value }) => (
  <Card>
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 1 }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export default function TreasuryYieldDashboard() {
  const { role } = useAuth();
  const canSync = role === 'ADMIN' || role === 'EDITOR';

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = await getTreasuryDashboard(INTERVAL);
      setData(payload);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        getApiErrorMessage(error, 'Failed to load treasury yields. Please try again.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const yieldCurveChartData = useMemo(() => {
    const pts = data?.yield_curve?.points ?? [];
    return pts.map((p) => ({
      tenorYears: p.tenorYears,
      yield: Number.parseFloat(p.yield),
    }));
  }, [data]);

  const spreadChartData = useMemo(() => {
    const rows = data?.spread ?? [];
    return rows.map((row) => ({
      date: row.date,
      spreadBp: Number.parseFloat(row.spread_bp),
    }));
  }, [data]);

  const hasAnySeries = useMemo(() => {
    const s = data?.series;
    if (!s) return false;
    return Object.values(s).some((arr) => Array.isArray(arr) && arr.length > 0);
  }, [data]);

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncMessage('');
    try {
      const summary = await postTreasurySync(INTERVAL);
      await load();
      setSyncMessage(`Synced ${summary.total_upserted ?? 0} observations.`);
    } catch (error) {
      setSyncMessage(getApiErrorMessage(error, 'Sync failed.'));
    } finally {
      setSyncLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (errorMessage) {
    return <Alert severity="error">{errorMessage}</Alert>;
  }

  const curveTitle = data?.yield_curve?.as_of
    ? `Spot yield curve (${data.yield_curve.as_of})`
    : 'Spot yield curve (latest common date)';

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="h4">US Treasury Yields</Typography>
        {canSync && (
          <Button
            variant="contained"
            onClick={handleSync}
            disabled={syncLoading}
            aria-busy={syncLoading}
          >
            {syncLoading ? 'Refreshing…' : 'Refresh from Alpha Vantage'}
          </Button>
        )}
      </Box>

      {syncMessage && (
        <Alert severity={syncMessage.includes('Synced') ? 'success' : 'error'}>{syncMessage}</Alert>
      )}

      {data?.meta?.last_fetched_at && (
        <Typography variant="body2" color="text.secondary">
          Last stored update: {new Date(data.meta.last_fetched_at).toLocaleString()}
        </Typography>
      )}

      {!hasAnySeries && (
        <Alert severity="info">
          No treasury data in the database yet.
          {canSync
            ? ' Click “Refresh from Alpha Vantage” to fetch 2Y, 10Y, and 30Y monthly yields.'
            : ' Ask an editor or admin to sync, or run the backend sync command.'}
        </Alert>
      )}

      {data?.yield_curve?.message && (
        <Alert severity="warning">{data.yield_curve.message}</Alert>
      )}

      {yieldCurveChartData.length > 0 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatCard
              label="2Y (latest snapshot)"
              value={`${yieldCurveChartData.find((r) => r.tenorYears === 2)?.yield?.toFixed(2) ?? '—'}%`}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatCard
              label="10Y (latest snapshot)"
              value={`${yieldCurveChartData.find((r) => r.tenorYears === 10)?.yield?.toFixed(2) ?? '—'}%`}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatCard
              label="30Y (latest snapshot)"
              value={`${yieldCurveChartData.find((r) => r.tenorYears === 30)?.yield?.toFixed(2) ?? '—'}%`}
            />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title={curveTitle}>
            {yieldCurveChartData.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No yield curve snapshot available.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yieldCurveChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="tenorYears"
                    type="number"
                    domain={[0, 32]}
                    ticks={[2, 10, 30]}
                    label={{ value: 'Maturity (years)', position: 'insideBottom', offset: -4 }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    label={{ value: 'Yield (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Yield']} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="yield"
                    name="Yield %"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="10Y − 2Y spread (basis points)">
            {spreadChartData.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Need overlapping 2Y and 10Y observations to compute the spread.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spreadChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-35} textAnchor="end" height={70} />
                  <YAxis label={{ value: 'bp', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} bp`, 'Spread']} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="spreadBp"
                    name="Spread (bp)"
                    stroke="#2e7d32"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>
      </Grid>
    </Stack>
  );
}
