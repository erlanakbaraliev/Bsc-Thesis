import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EditBondModal from '../../../src/components/Forms/EditBondModal';
import { renderWithProviders } from '../../../src/test/renderWithProviders';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../../src/components/Axios', () => ({
  default: mockedAxios,
}));

vi.mock('../../../src/components/Forms/TextForm', () => ({
  default: ({ label, value = '', onChange, name }) => (
    <input aria-label={label} value={value} name={name} onChange={onChange} />
  ),
}));

vi.mock('../../../src/components/Forms/SelectForm', () => ({
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

vi.mock('../../../src/components/Forms/DatePickerForm', () => ({
  default: ({ label, value = '', onChange, name }) => (
    <input
      aria-label={label}
      value={value}
      name={name}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const row = {
  original: {
    id: 42,
    isin: 'US0378331005',
    issuer: 5,
    issuer_country: 'US',
    credit_rating: 'AA',
    bond_type: 1,
    face_value: 1000,
    coupon_rate: 5,
    issue_date: '2020-01-01',
    maturity_date: '2030-01-01',
  },
};

describe('EditBondModal', () => {
  const onSaved = vi.fn();
  const table = { setEditingRow: vi.fn() };

  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.patch.mockReset();
    onSaved.mockReset();
    table.setEditingRow.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
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
        data: [{ id: 5, name: 'Issuer A', industry: 'Tech', country: 'US', credit_rating: 'AA' }],
      });
  }

  it('loads modal data and renders edit controls', async () => {
    mockInitialLoad();

    renderWithProviders(<EditBondModal row={row} table={table} onSaved={onSaved} />);

    expect(await screen.findByLabelText('ISIN')).toBeInTheDocument();
    expect(screen.getByLabelText('Issuer')).toBeInTheDocument();
    expect(screen.getByLabelText('Bond Type')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tech')).toBeInTheDocument();
    expect(screen.getByDisplayValue('US')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AA')).toBeInTheDocument();
  });

  it('submits patch and closes modal on success', async () => {
    const user = userEvent.setup();
    mockInitialLoad();
    mockedAxios.patch.mockResolvedValueOnce({
      data: { id: 42, isin: 'US0378331005', coupon_rate: 6 },
    });

    renderWithProviders(<EditBondModal row={row} table={table} onSaved={onSaved} />);
    await screen.findByLabelText('Coupon Rate');

    await user.clear(screen.getByLabelText('Coupon Rate'));
    await user.type(screen.getByLabelText('Coupon Rate'), '6');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        'bonds/42/',
        expect.objectContaining({
          coupon_rate: 6,
          issue_date: '2020-01-01',
          maturity_date: '2030-01-01',
        })
      );
    });
    expect(onSaved).toHaveBeenCalledWith(42, expect.objectContaining({ coupon_rate: 6 }));
    expect(table.setEditingRow).toHaveBeenCalledWith(null);
  });

  it('shows formatted error alert when save fails', async () => {
    const user = userEvent.setup();
    mockInitialLoad();
    mockedAxios.patch.mockRejectedValueOnce({
      response: { data: { coupon_rate: ['Too high'] } },
    });

    renderWithProviders(<EditBondModal row={row} table={table} onSaved={onSaved} />);
    await screen.findByLabelText('Coupon Rate');

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Coupon rate: Too high')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
