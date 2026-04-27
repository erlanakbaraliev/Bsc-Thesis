import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import IssuerManagement from '../src/components/IssuerManagement';
import { renderWithProviders } from '../src/test/renderWithProviders';
import { AuthContext } from '../src/context/AuthContext';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../src/components/Axios', () => ({
  default: mockedAxios,
}));

const sampleIssuer = {
  id: 1,
  name: 'Acme Corp',
  country: 'US',
  industry: 'Technology',
  credit_rating: 'AA',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
};

const sampleMeta = {
  credit_ratings: [{ id: 'AA', name: 'High Grade (AA)' }],
  industries: [{ id: 'Technology', name: 'Technology' }],
  bond_types: [],
};

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
      <IssuerManagement />
    </AuthContext.Provider>,
    { route: '/issuers/' },
  );
}

describe('IssuerManagement', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.get.mockImplementation((url) => {
      if (String(url).includes('issuers')) {
        return Promise.resolve({ data: [sampleIssuer] });
      }
      if (String(url).includes('meta')) {
        return Promise.resolve({ data: sampleMeta });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  it('loads issuers for VIEWER without create or edit actions', async () => {
    renderWithRole('VIEWER');

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create issuer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit issuer/i })).not.toBeInTheDocument();
  });

  it('shows Create issuer for EDITOR', async () => {
    renderWithRole('EDITOR');

    expect(await screen.findByRole('button', { name: /create issuer/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /edit issuer/i })).toBeInTheDocument();
  });

  it('shows delete for ADMIN', async () => {
    renderWithRole('ADMIN');

    expect(await screen.findByRole('button', { name: /delete issuer/i })).toBeInTheDocument();
  });
});
