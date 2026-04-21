import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CreateBond from '../../src/components/CreateBond';
import { renderWithProviders } from '../../src/test/renderWithProviders';
const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../src/components/Axios', () => ({
  default: mockedAxios,
}));

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

vi.mock('../../src/components/Forms/DatePickerForm', () => ({
  default: ({ label, value = '', onChange, name }) => (
    <input
      aria-label={label}
      value={value}
      name={name}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe('CreateBond', () => {
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

  function mockInitialLoad() {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { bond_types: [{ id: 1, name: 'Corporate Bond' }] },
      })
      .mockResolvedValueOnce({
        data: [{ id: 5, name: 'Issuer A' }],
      });
  }

  async function fillValidBondForm(user) {
    await user.type(screen.getByLabelText('ISIN'), 'US0378331005');
    await user.selectOptions(screen.getByLabelText('Issuer'), '5');
    await user.selectOptions(screen.getByLabelText('Bond Type'), '1');
    await user.type(screen.getByLabelText('Face Value'), '1000');
    await user.type(screen.getByLabelText('Coupon Rate'), '5');
    await user.type(screen.getByLabelText('Issue Date'), '2025-01-01');
    await user.type(screen.getByLabelText('Maturity Date'), '2030-01-01');
  }

  it('loads metadata and issuers, then renders form controls', async () => {
    mockInitialLoad();
    renderWithProviders(<CreateBond />);

    expect(await screen.findByLabelText('ISIN')).toBeInTheDocument();
    expect(screen.getByLabelText('Issuer')).toBeInTheDocument();
    expect(screen.getByLabelText('Bond Type')).toBeInTheDocument();
  });

  it('shows formatted error text on submit failure', async () => {
    const user = userEvent.setup();
    mockInitialLoad();
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        data: {
          coupon_rate: ['Must be less than or equal to 20'],
        },
      },
    });

    renderWithProviders(<CreateBond />);
    await screen.findByLabelText('ISIN');
    await fillValidBondForm(user);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('Coupon rate: Must be less than or equal to 20')
    ).toBeInTheDocument();
  });

  it('submits with formatted date payload on success', async () => {
    const user = userEvent.setup();
    mockInitialLoad();
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 99 } });

    renderWithProviders(<CreateBond />);
    await screen.findByLabelText('ISIN');
    await fillValidBondForm(user);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'bonds/',
      expect.objectContaining({
        isin: 'US0378331005',
        issuer: 5,
        bond_type: '1',
        face_value: 1000,
        coupon_rate: 5,
        issue_date: '2025-01-01',
        maturity_date: '2030-01-01',
      })
    );
    expect(
      await screen.findByText('Successfully submitted data')
    ).toBeInTheDocument();
  });
});
