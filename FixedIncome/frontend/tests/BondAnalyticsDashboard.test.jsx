import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BondAnalyticsDashboard from '../src/components/BondAnalyticsDashboard';
import { renderWithProviders } from '../src/test/renderWithProviders';

vi.mock('../src/config/Api', () => ({
  getBondAnalytics: vi.fn(),
}));

vi.mock('recharts', () => {
  const Mock = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    PieChart: Mock,
    Pie: Mock,
    Cell: Mock,
    Tooltip: Mock,
    BarChart: Mock,
    Bar: Mock,
    CartesianGrid: Mock,
    XAxis: Mock,
    YAxis: Mock,
    LineChart: Mock,
    Line: Mock,
  };
});

describe('BondAnalyticsDashboard', () => {
  it('renders dashboard metrics and headings on successful fetch', async () => {
    const { getBondAnalytics } = await import('../src/config/Api');
    getBondAnalytics.mockResolvedValue({
      summary: {
        totalBonds: 12,
        averageCouponRate: 4.25,
        averageFaceValue: 1200,
      },
      byBondType: [{ label: 'CORP', value: 7 }],
      byCreditRating: [{ label: 'BBB', value: 5 }],
      byIndustry: [{ label: 'Financials', value: 4 }],
      maturityTimeline: [{ label: '1-3 years', value: 2 }],
    });

    renderWithProviders(<BondAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Bond Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Bonds')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Distribution by Bond Type')).toBeInTheDocument();
    });
  });

  it('renders error state when request fails', async () => {
    const { getBondAnalytics } = await import('../src/config/Api');
    getBondAnalytics.mockRejectedValue(new Error('failed'));

    renderWithProviders(<BondAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });
});
