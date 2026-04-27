import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ResetPasswordModal from '../src/components/Forms/ResetPasswordModal';
import { renderWithProviders } from '../src/test/renderWithProviders';

const mockedAxios = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../src/components/Axios', () => ({
  default: mockedAxios,
}));

describe('ResetPasswordModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const userRow = { id: 42, username: 'bob' };

  beforeEach(() => {
    mockedAxios.post.mockReset();
    onClose.mockReset();
    onSuccess.mockReset();
  });

  it('calls reset endpoint and callbacks on success', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ status: 204 });

    renderWithProviders(
      <ResetPasswordModal
        open
        user={userRow}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await user.type(
      screen.getByLabelText('New password', { exact: true }),
      'NewValidPass2024!Yy',
    );
    await user.type(
      screen.getByLabelText('Confirm new password', { exact: true }),
      'NewValidPass2024!Yy',
    );
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'users/42/reset_password/',
        { password: 'NewValidPass2024!Yy' },
      );
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows server field errors for password', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValue({
      response: {
        data: { password: ['This password is too short.'] },
      },
    });

    renderWithProviders(
      <ResetPasswordModal
        open
        user={userRow}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await user.type(
      screen.getByLabelText('New password', { exact: true }),
      'abcdefgh1!',
    );
    await user.type(
      screen.getByLabelText('Confirm new password', { exact: true }),
      'abcdefgh1!',
    );
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/password: this password is too short/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
