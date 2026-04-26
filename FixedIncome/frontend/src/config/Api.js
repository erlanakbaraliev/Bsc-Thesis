import AxiosInstance from '../components/Axios';

export const API_ENDPOINTS = {
  STREAMING_EXPORT: 'bonds/export_csv',
  BOND_ANALYTICS: 'bonds/analytics/',
};

export const getBondAnalytics = async () => {
  const response = await AxiosInstance.get(API_ENDPOINTS.BOND_ANALYTICS);
  return response.data;
};
