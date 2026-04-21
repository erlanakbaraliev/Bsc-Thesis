import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import AxiosInstance from '../components/Axios';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => localStorage.getItem('username') || null)
  const [role, setRole] = useState(() => localStorage.getItem('role') || null)

  const hydrateCurrentUser = async () => {
    const response = await AxiosInstance.get('users/me/');
    const { username, role: userRole } = response.data;
    localStorage.setItem('username', username);
    localStorage.setItem('role', userRole);
    setUser(username);
    setRole(userRole);
  }

  const login = async (username, password) => {
    const response = await AxiosInstance.post('api/token/', { username, password });
    localStorage.setItem('access',   response.data.access);
    localStorage.setItem('refresh',  response.data.refresh);
    await hydrateCurrentUser();
  }

  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
    setRole(null);
  }

  useEffect(() => {
    if (!localStorage.getItem('access')) return;
    hydrateCurrentUser().catch(() => {
      logout();
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

