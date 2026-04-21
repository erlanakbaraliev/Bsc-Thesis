import { vi } from 'vitest';

export const mockedAxios = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

export function resetAxiosMock() {
  mockedAxios.get.mockReset();
  mockedAxios.post.mockReset();
  mockedAxios.patch.mockReset();
  mockedAxios.delete.mockReset();
}
