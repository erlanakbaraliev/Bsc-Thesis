import AxiosInstance from '../components/Axios';

export const API_ENDPOINTS = {
  STREAMING_EXPORT: 'bonds/export_csv',
  BOND_ANALYTICS: 'bonds/analytics/',
  USERS: 'users/',
  USER_DETAIL: (id) => `users/${id}/`,
  USER_RESET_PASSWORD: (id) => `users/${id}/reset_password/`,
  TRANSACTIONS: 'transactions/',
  TRANSACTION_DETAIL: (id) => `transactions/${id}/`,
  ISSUERS: 'issuers/',
  ISSUER_DETAIL: (id) => `issuers/${id}/`,
  TREASURY_DASHBOARD: 'treasury-yields/dashboard/',
  TREASURY_SYNC: 'treasury-yields/sync/',
};

export const getBondAnalytics = async () => {
  const response = await AxiosInstance.get(API_ENDPOINTS.BOND_ANALYTICS);
  return response.data;
};

export const getTreasuryDashboard = async (interval = 'monthly') => {
  const response = await AxiosInstance.get(API_ENDPOINTS.TREASURY_DASHBOARD, {
    params: { interval },
  });
  return response.data;
};

/** Alpha Vantage sync uses ~2× delay + 3 HTTP calls; default Axios timeout (5s) is too low. */
const TREASURY_SYNC_TIMEOUT_MS = 120_000;

export const postTreasurySync = async (interval = 'monthly') => {
  const response = await AxiosInstance.post(
    API_ENDPOINTS.TREASURY_SYNC,
    { interval },
    { timeout: TREASURY_SYNC_TIMEOUT_MS },
  );
  return response.data;
};
