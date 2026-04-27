import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CreateUserModal from '../src/components/Forms/CreateUserModal';
import { renderWithProviders } from '../src/test/renderWithProviders';

const mockedAxios = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../src/components/Axios', () => ({
  default: mockedAxios,
}));

vi.mock('../src/components/Forms/TextForm', () => ({
  default: ({ label, value = '', onChange, name }) => (
    <input aria-label={label} value={value} name={name} onChange={onChange} />
  ),
}));

vi.mock('../src/components/Forms/SelectForm', () => ({
  default: ({ label, value = '', onChange, name, options = [], valueKey = 'id' }) => (
    <select aria-label={label} value={value} name={name} onChange={onChange}>
      {options.map((option) => (
        <option key={option[valueKey]} value={option[valueKey]}>
          {option.name}
        </option>
      ))}
    </select>
  ),
}));

describe('CreateUserModal', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    mockedAxios.post.mockReset();
    onSuccess.mockReset();
    onCancel.mockReset();
  });

  it('shows validation when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateUserModal onSuccess={onSuccess} onCancel={onCancel} />,
    );

    await user.type(screen.getByLabelText(/username/i), 'newuser');
    await user.type(screen.getByLabelText(/^password$/i), 'password-one');
    await user.type(screen.getByLabelText(/confirm password/i), 'password-two');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText(/passwords must match/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('submits when form is valid', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ data: { id: 1, username: 'newuser' } });

    renderWithProviders(
      <CreateUserModal onSuccess={onSuccess} onCancel={onCancel} />,
    );

    await user.type(screen.getByLabelText(/username/i), 'newuser');
    await user.type(screen.getByLabelText(/email/i), 'new@test.com');
    await user.selectOptions(screen.getByLabelText(/role/i), 'EDITOR');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPass2024!Xx');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPass2024!Xx');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'users/',
        expect.objectContaining({
          username: 'newuser',
          email: 'new@test.com',
          role: 'EDITOR',
          password: 'ValidPass2024!Xx',
        }),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });
});
