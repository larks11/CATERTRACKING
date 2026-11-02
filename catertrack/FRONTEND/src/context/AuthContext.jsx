import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .get('/auth/me')
      .then((res) => {
        if (active) setUser(res.data.user);
      })
      .catch(() => {
        localStorage.removeItem('token');
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { username: identifier, password });

    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }

    let loggedIn = res.data.user;
    if (!loggedIn) {
      const me = await api.get('/auth/me');
      loggedIn = me.data.user;
    }

    setUser(loggedIn);
    return loggedIn;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // session already ended
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    canRecordPayments: user?.role === 'admin' || Boolean(user?.canRecordPayments)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);