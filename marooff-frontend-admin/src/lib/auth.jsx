import { createContext, useContext, useEffect, useState } from 'react';
import { api, loadToken, setToken } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setT] = useState(loadToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      if (!token) { setLoading(false); return; }
      try {
        const r = await api.get('/admin/me');
        if (!cancelled) setUser(r.payload);
      } catch (e) {
        if (!cancelled) {
          setToken(null);
          setT(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    probe();
    return () => { cancelled = true; };
  }, [token]);

  async function login(email, password) {
    const r = await api.post('/admin/login', { email, password });
    const data = r.payload;
    setToken(data.token);
    setT(data.token);
    setUser(data.user);
    return data;
  }

  function logout() {
    setToken(null);
    setT(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
