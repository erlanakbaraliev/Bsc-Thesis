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
};

export const getBondAnalytics = async () => {
  const response = await AxiosInstance.get(API_ENDPOINTS.BOND_ANALYTICS);
  return response.data;
};
