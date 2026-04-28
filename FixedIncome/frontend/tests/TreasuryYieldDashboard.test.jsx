import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TreasuryYieldDashboard from '../src/components/TreasuryYieldDashboard';
import { renderWithProviders } from '../src/test/renderWithProviders';

const { mockRole } = vi.hoisted(() => ({
  mockRole: vi.fn(() => null),
}));

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockRole() ? 'testuser' : null, role: mockRole() }),
}));

vi.mock('../src/config/Api', () => ({
  getTreasuryDashboard: vi.fn(),
  postTreasurySync: vi.fn(),
}));

vi.mock('recharts', () => {
  const Mock = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    LineChart: Mock,
    Line: Mock,
    CartesianGrid: Mock,
    XAxis: Mock,
    YAxis: Mock,
    Tooltip: Mock,
    Legend: Mock,
  };
});

describe('TreasuryYieldDashboard', () => {
  beforeEach(() => {
    mockRole.mockImplementation(() => null);
  });

  it('renders heading and stats after load', async () => {
    const { getTreasuryDashboard } = await import('../src/config/Api');
    getTreasuryDashboard.mockResolvedValue({
      interval: 'monthly',
      series: {
        '2year': [{ date: '2026-02-01', yield: '2.10' }],
        '10year': [{ date: '2026-02-01', yield: '4.10' }],
        '30year': [{ date: '2026-02-01', yield: '4.60' }],
      },
      yield_curve: {
        as_of: '2026-02-01',
        points: [
          { tenorYears: 2, maturity: '2year', yield: '2.10' },
          { tenorYears: 10, maturity: '10year', yield: '4.10' },
          { tenorYears: 30, maturity: '30year', yield: '4.60' },
        ],
      },
      spread: [{ date: '2026-02-01', spread_pct: '2.0000', spread_bp: '200.0000' }],
      meta: { last_fetched_at: '2026-04-01T12:00:00Z' },
    });

    renderWithProviders(<TreasuryYieldDashboard />);

    await waitFor(() => {
      expect(screen.getByText('US Treasury Yields')).toBeInTheDocument();
      expect(screen.getByText('2.10%')).toBeInTheDocument();
      expect(screen.getByText('10Y − 2Y spread (basis points)')).toBeInTheDocument();
    });
  });

  it('shows error when fetch fails', async () => {
    const { getTreasuryDashboard } = await import('../src/config/Api');
    getTreasuryDashboard.mockRejectedValue({
      response: { data: { detail: 'Server error' } },
    });

    renderWithProviders(<TreasuryYieldDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('sync button refetches data for editor', async () => {
    mockRole.mockImplementation(() => 'EDITOR');
    const user = userEvent.setup();

    const { getTreasuryDashboard, postTreasurySync } = await import('../src/config/Api');

    const emptyPayload = {
      interval: 'monthly',
      series: { '2year': [], '10year': [], '30year': [] },
      yield_curve: { as_of: null, points: [], message: null },
      spread: [],
      meta: { last_fetched_at: null },
    };

    const filledPayload = {
      ...emptyPayload,
      yield_curve: {
        as_of: '2026-02-01',
        points: [
          { tenorYears: 2, maturity: '2year', yield: '2.00' },
          { tenorYears: 10, maturity: '10year', yield: '4.00' },
          { tenorYears: 30, maturity: '30year', yield: '4.50' },
        ],
      },
    };

    getTreasuryDashboard
      .mockResolvedValueOnce(emptyPayload)
      .mockResolvedValueOnce(filledPayload);
    postTreasurySync.mockResolvedValue({ total_upserted: 120 });

    renderWithProviders(<TreasuryYieldDashboard />);

    await waitFor(() => {
      expect(screen.getByText('US Treasury Yields')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Refresh from Alpha Vantage/i }));

    await waitFor(() => {
      expect(postTreasurySync).toHaveBeenCalled();
      expect(getTreasuryDashboard).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Synced 120 observations/)).toBeInTheDocument();
    });
  });
});
