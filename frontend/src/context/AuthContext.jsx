import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authAPI } from '../api/endpoints';
import { labAuthAPI } from '../api/labEndpoints';
import { platformAuthAPI } from '../api/adminEndpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [space, setSpace] = useState(null); // 'facturation' | 'laboratoire' | 'administration'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const facturationToken = localStorage.getItem('access_token');
    const labToken = localStorage.getItem('lab_access_token');
    const adminToken = localStorage.getItem('admin_access_token');

    if (facturationToken) {
      authAPI
        .check()
        .then(({ data }) => {
          setUser(data.user);
          setSpace('facturation');
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setLoading(false));
    } else if (labToken) {
      labAuthAPI
        .check()
        .then(({ data }) => {
          setUser(data.user);
          setSpace('laboratoire');
        })
        .catch(() => {
          localStorage.removeItem('lab_access_token');
          localStorage.removeItem('lab_refresh_token');
        })
        .finally(() => setLoading(false));
    } else if (adminToken) {
      platformAuthAPI
        .check()
        .then(({ data }) => {
          setUser(data.user);
          setSpace('administration');
        })
        .catch(() => {
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const { data } = await authAPI.login(username, password);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      setUser(data.user);
      setSpace('facturation');
      return { user: data.user, space: 'facturation' };
    } catch (err) {
      if (err.response?.status !== 401) throw err;
    }

    try {
      const { data } = await labAuthAPI.login(username, password);
      localStorage.setItem('lab_access_token', data.access);
      localStorage.setItem('lab_refresh_token', data.refresh);
      setUser(data.user);
      setSpace('laboratoire');
      return { user: data.user, space: 'laboratoire' };
    } catch (err) {
      if (err.response?.status !== 401) throw err;
    }

    const { data } = await platformAuthAPI.login(username, password);
    localStorage.setItem('admin_access_token', data.access);
    localStorage.setItem('admin_refresh_token', data.refresh);
    setUser(data.user);
    setSpace('administration');
    return { user: data.user, space: 'administration' };
  }, []);

  const logout = useCallback(async () => {
    if (space === 'laboratoire') {
      const refresh = localStorage.getItem('lab_refresh_token');
      try {
        await labAuthAPI.logout(refresh);
      } catch {
        // ignore network errors on logout
      }
      localStorage.removeItem('lab_access_token');
      localStorage.removeItem('lab_refresh_token');
    } else if (space === 'administration') {
      const refresh = localStorage.getItem('admin_refresh_token');
      try {
        await platformAuthAPI.logout(refresh);
      } catch {
        // ignore network errors on logout
      }
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
    } else {
      const refresh = localStorage.getItem('refresh_token');
      try {
        await authAPI.logout(refresh);
      } catch {
        // ignore network errors on logout
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('facturation_clinique_cache_v2');
    }
    setUser(null);
    setSpace(null);
  }, [space]);

  const isAuthenticated = !!user;
  const isSuperAdmin = space === 'facturation' && !!user?.is_superuser;
  const labRole = space === 'laboratoire' ? user?.role : null;

  return (
    <AuthContext.Provider
      value={{ user, space, loading, login, logout, isAuthenticated, isSuperAdmin, labRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
