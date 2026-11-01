import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('flowspace_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('flowspace_token');
        if (token) {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('flowspace_user', JSON.stringify(res.data.user));
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth check error:', err.response?.data?.message || err.message);
        setUser(null);
        localStorage.removeItem('flowspace_token');
        localStorage.removeItem('flowspace_user');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: loggedUser } = res.data;
    localStorage.setItem('flowspace_token', token);
    localStorage.setItem('flowspace_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token, user: newUser } = res.data;
    localStorage.setItem('flowspace_token', token);
    localStorage.setItem('flowspace_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      localStorage.removeItem('flowspace_token');
      localStorage.removeItem('flowspace_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
