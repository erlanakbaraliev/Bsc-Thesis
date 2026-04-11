import { useState } from 'react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Box, Typography, TextField, Button, Chip,
  CircularProgress, Paper, Divider, List, ListItem, ListItemText,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AxiosInstance from './Axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const headlines = payload[0]?.payload?.headlines ?? [];
  return (
    <Paper sx={{ p: 1.5, maxWidth: 340, fontSize: 12 }}>
      <Typography variant="caption" fontWeight={600}>{label}</Typography>
      {payload.map(p => (
        <Box key={p.name} sx={{ color: p.color, mt: 0.5 }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </Box>
      ))}
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.secondary">Top headlines:</Typography>
      <List dense disablePadding>
        {headlines.map((h, i) => (
          <ListItem key={i} disablePadding sx={{ alignItems: 'flex-start' }}>
            <ListItemText
              primary={`• ${h}`}
              primaryTypographyProps={{ fontSize: 11, color: 'text.secondary' }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

const SentimentMapper = ({ defaultIssuer = '' }) => {
  const [issuer,   setIssuer]   = useState(defaultIssuer);
  const [query,    setQuery]    = useState(defaultIssuer);
  const [data,     setData]     = useState(null);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const fetchSentiment = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await AxiosInstance.get('bonds/sentiment/', {
        params: { issuer: query.trim() },
      });
      setIssuer(query.trim());
      setData(res.data.data);
      setSummary(res.data.summary);
      console.log(res);
    } catch {
      setError('Failed to fetch sentiment data.');
    } finally {
      setLoading(false);
    }
  };

  const isBullish = summary?.verdict === 'Bullish';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Financial News Sentiment Mapper
      </Typography>

      {/* Search bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          label="Issuer name"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchSentiment()}
          sx={{ width: 260 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={fetchSentiment}
          disabled={loading}
        >
          {loading ? <CircularProgress size={18} /> : 'Analyse'}
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>
      )}

      {/* Summary chips */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {summary.total_headlines} headlines for <strong>{issuer}</strong>
          </Typography>
          <Chip
            icon={isBullish ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={summary.verdict}
            color={isBullish ? 'success' : 'error'}
            size="small"
          />
          <Chip label={`Avg positive ${(summary.avg_positive * 100).toFixed(1)}%`} size="small" variant="outlined" color="success" />
          <Chip label={`Avg negative ${(summary.avg_negative * 100).toFixed(1)}%`} size="small" variant="outlined" color="error"   />
        </Box>
      )}

      {/* Chart */}
      {data?.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={d => d.slice(5)}   // show MM-DD only
            />
            <YAxis 
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} 
              domain={[0, 1]} // This forces the chart to stay between 0.0 and 1.0
              tick={{ fontSize: 11 }} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="positive"
              fill="#d1fae5"
              stroke="#10b981"
              strokeWidth={2}
              name="Positive"
            />
            <Area
              type="monotone"
              dataKey="negative"
              fill="#fee2e2"
              stroke="#ef4444"
              strokeWidth={2}
              name="Negative"
            />
            <Bar dataKey="count" fill="#c7d2fe" name="# headlines" yAxisId={0} opacity={0.4} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {data?.length === 0 && !loading && issuer && (
        <Typography variant="body2" color="text.secondary">
          No news found for "{issuer}" in the past 30 days.
        </Typography>
      )}
    </Box>
  );
};

export default SentimentMapper;
