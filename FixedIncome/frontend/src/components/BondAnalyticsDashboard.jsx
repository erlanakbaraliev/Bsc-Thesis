import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getBondAnalytics } from '../config/Api';
import { getApiErrorMessage } from '../utils/apiError';

const PIE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1'];

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

const BondAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await getBondAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          getApiErrorMessage(error, 'Failed to load bond analytics. Please try refreshing the page.')
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const summary = analytics?.summary;
  const hasAnyData = useMemo(() => (summary?.totalBonds || 0) > 0, [summary]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Alert severity="error">
        {errorMessage}
      </Alert>
    );
  }

  if (!hasAnyData) {
    return (
      <Alert severity="info">
        No bond data available yet. Add bonds first to see analytics.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Bond Analytics Dashboard</Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="Total Bonds" value={summary.totalBonds} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="Average Coupon Rate" value={`${summary.averageCouponRate}%`} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Average Face Value"
            value={new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(summary.averageFaceValue)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Distribution by Bond Type">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.byBondType}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label
                >
                  {analytics.byBondType.map((entry, index) => (
                    <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Distribution by Credit Rating">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byCreditRating}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Distribution by Industry">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byIndustry} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={140} />
                <Tooltip />
                <Bar dataKey="value" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Maturity Timeline">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.maturityTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#ed6c02" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default BondAnalyticsDashboard;
