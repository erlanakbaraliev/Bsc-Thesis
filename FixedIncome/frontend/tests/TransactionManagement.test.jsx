import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import TransactionManagement from '../src/components/TransactionManagement';
import { renderWithProviders } from '../src/test/renderWithProviders';
import { AuthContext } from '../src/context/AuthContext';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../src/components/Axios', () => ({
  default: mockedAxios,
}));

function renderWithRole(role) {
  return renderWithProviders(
    <AuthContext.Provider
      value={{
        user: 'alice',
        role,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <TransactionManagement />
    </AuthContext.Provider>,
    { route: '/transactions/' },
  );
}

describe('TransactionManagement', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.get.mockImplementation((url) => {
      if (String(url).includes('transactions')) {
        return Promise.resolve({ data: [] });
      }
      if (String(url).includes('bonds')) {
        return Promise.resolve({ data: { results: [] } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  it('loads transactions and bonds for VIEWER', async () => {
    renderWithRole('VIEWER');

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('transactions'),
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'bonds/',
      expect.objectContaining({ params: { page_size: 1000 } }),
    );
    expect(screen.queryByRole('button', { name: /record trade/i })).not.toBeInTheDocument();
  });

  it('shows Record trade for EDITOR', async () => {
    renderWithRole('EDITOR');

    expect(await screen.findByRole('button', { name: /record trade/i })).toBeInTheDocument();
  });
});
