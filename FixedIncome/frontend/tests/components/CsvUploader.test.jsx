import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CsvUploader from '../../src/components/CsvUploader';
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

describe('CsvUploader', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.patch.mockReset();
    mockedAxios.delete.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function uploadCsvFile(user) {
    const file = new File(['isin,issuer\nUS0378331005,1'], 'bonds.csv', {
      type: 'text/csv',
    });
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
  }

  it('opens confirmation dialog after successful preview', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValueOnce({
      data: { new: 2, existing: 1, total: 3 },
    });

    renderWithProviders(<CsvUploader />);
    await uploadCsvFile(user);

    expect(await screen.findByText('Confirm Data Import')).toBeInTheDocument();
    expect(screen.getByText('Total rows detected: 3')).toBeInTheDocument();
  });

  it('shows success and calls onSuccess after confirm import', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    mockedAxios.post
      .mockResolvedValueOnce({ data: { new: 1, existing: 0, total: 1 } })
      .mockResolvedValueOnce({ data: { imported: 1 } });

    renderWithProviders(<CsvUploader onSuccess={onSuccess} />);
    await uploadCsvFile(user);
    await user.click(await screen.findByRole('button', { name: /confirm & import/i }));

    expect(
      await screen.findByText('Successfully processed bonds.csv.')
    ).toBeInTheDocument();
    const delayCall = timeoutSpy.mock.calls.find((call) => call[1] === 2000);
    expect(delayCall).toBeTruthy();
    const delayedCallback = delayCall[0];
    delayedCallback();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows error alert when preview fails', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { error: 'Preview failed at server' } },
    });

    renderWithProviders(<CsvUploader />);
    await uploadCsvFile(user);

    expect(await screen.findByText('Preview failed at server')).toBeInTheDocument();
  });
});
