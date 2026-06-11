import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = axios.create({ baseURL, withCredentials: false });

let _token = null;

export function setToken(t) {
  _token = t;
  if (t) localStorage.setItem('marooff_admin_token', t);
  else localStorage.removeItem('marooff_admin_token');
}

export function loadToken() {
  _token = localStorage.getItem('marooff_admin_token') || null;
  return _token;
}

api.interceptors.request.use((cfg) => {
  if (_token) cfg.headers.Authorization = `Bearer ${_token}`;
  return cfg;
});

// Unwrap our { success, data, error } envelope and surface errors as exceptions.
api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) return { ...res, payload: body.data, meta: body.meta };
      const err = new Error(body.error?.message || 'API error');
      err.code = body.error?.code;
      err.fields = body.error?.fields;
      err.status = res.status;
      throw err;
    }
    return res;
  },
  (error) => {
    const body = error?.response?.data;
    if (body && typeof body === 'object' && body.error) {
      const e = new Error(body.error.message || 'API error');
      e.code = body.error.code;
      e.fields = body.error.fields;
      e.status = error.response.status;
      throw e;
    }
    throw error;
  }
);

// Convenience helpers — return the unwrapped `data` payload.
export const get  = async (url, params) => (await api.get(url, { params })).payload;
export const post = async (url, body)   => (await api.post(url, body)).payload;
export const put  = async (url, body)   => (await api.put(url, body)).payload;
export const del  = async (url)         => (await api.delete(url)).payload;
export const getRaw = async (url, params) => await api.get(url, { params });
