import AxiosInstance from '../components/Axios';

export const API_ENDPOINTS = {
  STREAMING_EXPORT: 'bonds/export_csv',
  BOND_ANALYTICS: 'bonds/analytics/',
  USERS: 'users/',
  USER_DETAIL: (id) => `users/${id}/`,
  USER_RESET_PASSWORD: (id) => `users/${id}/reset_password/`,
};

export const getBondAnalytics = async () => {
  const response = await AxiosInstance.get(API_ENDPOINTS.BOND_ANALYTICS);
  return response.data;
};
