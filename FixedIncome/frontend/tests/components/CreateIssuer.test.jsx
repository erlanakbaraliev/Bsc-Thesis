import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CreateIssuer from '../../src/components/CreateIssuer';
import { renderWithProviders } from '../../src/test/renderWithProviders';

const mockNavigate = vi.fn();
const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../src/components/Axios', () => ({
  default: mockedAxios,
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('country-list', () => ({
  getData: () => [{ name: 'Hungary', code: 'HU' }],
}));

vi.mock('../../src/components/Forms/TextForm', () => ({
  default: ({ label, value = '', onChange, name }) => (
    <input aria-label={label} value={value} name={name} onChange={onChange} />
  ),
}));

vi.mock('../../src/components/Forms/SelectForm', () => ({
  default: ({ label, value = '', onChange, name, options = [], valueKey = 'id' }) => (
    <select aria-label={label} value={value} name={name} onChange={onChange}>
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option[valueKey]} value={option[valueKey]}>
          {option.name}
        </option>
      ))}
    </select>
  ),
}));

describe('CreateIssuer', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.patch.mockReset();
    mockedAxios.delete.mockReset();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads metadata and renders form controls', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        industries: [{ id: 1, name: 'Banking' }],
        credit_ratings: [{ id: 1, name: 'AAA' }],
      },
    });

    renderWithProviders(<CreateIssuer />);

    expect(await screen.findByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
    expect(screen.getByLabelText('Industry')).toBeInTheDocument();
    expect(screen.getByLabelText('Credit Rating')).toBeInTheDocument();
  });

  it('shows formatted API error on submit failure', async () => {
    const user = userEvent.setup();
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        industries: [{ id: 1, name: 'Banking' }],
        credit_ratings: [{ id: 1, name: 'AAA' }],
      },
    });
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { name: ['Already exists'] } },
    });

    renderWithProviders(<CreateIssuer />);

    await screen.findByLabelText('Name');
    await user.type(screen.getByLabelText('Name'), 'Issuer A');
    await user.selectOptions(screen.getByLabelText('Country'), 'HU');
    await user.selectOptions(screen.getByLabelText('Industry'), '1');
    await user.selectOptions(screen.getByLabelText('Credit Rating'), '1');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Name: Already exists')).toBeInTheDocument();
  });

  it('shows success message and navigates to home on submit success', async () => {
    const user = userEvent.setup();
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        industries: [{ id: 1, name: 'Banking' }],
        credit_ratings: [{ id: 1, name: 'AAA' }],
      },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 10 } });

    renderWithProviders(<CreateIssuer />);

    await screen.findByLabelText('Name');
    await user.type(screen.getByLabelText('Name'), 'Issuer A');
    await user.selectOptions(screen.getByLabelText('Country'), 'HU');
    await user.selectOptions(screen.getByLabelText('Industry'), '1');
    await user.selectOptions(screen.getByLabelText('Credit Rating'), '1');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('Successfully submitted data')
    ).toBeInTheDocument();

    const delayCall = timeoutSpy.mock.calls.find((call) => call[1] === 2000);
    expect(delayCall).toBeTruthy();
    const delayedCallback = delayCall[0];
    delayedCallback();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
