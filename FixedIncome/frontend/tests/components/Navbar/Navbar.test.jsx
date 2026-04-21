import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Navbar from '../../../src/components/Navbar/Navbar';
import { renderWithProviders } from '../../../src/test/renderWithProviders';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signed-out sign-in button', () => {
    renderWithProviders(
      <Navbar
        content={<div>content</div>}
        themeMode="light"
        onToggleTheme={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('triggers theme toggle callback from icon button', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    renderWithProviders(
      <Navbar
        content={<div>content</div>}
        themeMode="light"
        onToggleTheme={onToggleTheme}
      />
    );

    await user.click(screen.getByLabelText('Toggle light and dark theme'));

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});
