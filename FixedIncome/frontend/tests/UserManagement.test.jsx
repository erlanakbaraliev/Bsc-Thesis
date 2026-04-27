import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import UserManagement from '../src/components/UserManagement';
import { renderWithProviders } from '../src/test/renderWithProviders';
import { AuthContext } from '../src/context/AuthContext';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../src/components/Axios', () => ({
  default: mockedAxios,
}));

function renderWithRole(role) {
  return renderWithProviders(
    <AuthContext.Provider
      value={{
        user: 'tester',
        role,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <UserManagement />
    </AuthContext.Provider>,
    { route: '/users/' },
  );
}

describe('UserManagement', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it('does not fetch users when role is not ADMIN', () => {
    renderWithRole('VIEWER');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('loads users and shows Create user for ADMIN', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        count: 1,
        results: [
          { id: 7, username: 'alice', email: 'alice@test.com', role: 'EDITOR' },
        ],
      },
    });
    renderWithRole('ADMIN');

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });
    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });
});
