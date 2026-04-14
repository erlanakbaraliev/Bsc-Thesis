import { useState } from 'react';
import { AuthContext } from './AuthContext';
import AxiosInstance from '../components/Axios';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => localStorage.getItem('username') || null)

  const login = async (username, password) => {
    const response = await AxiosInstance.post('api/token/', { username, password });
    localStorage.setItem('username', username);
    localStorage.setItem('access',   response.data.access);
    localStorage.setItem('refresh',  response.data.refresh);
    setUser(username);
  }

  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

