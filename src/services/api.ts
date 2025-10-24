import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (email: string, password: string) => api.post('/api/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/api/register', { name, email, password }),
  logout: () => api.post('/api/logout'),
  me: () => api.get('/api/user'),
};

export const company = {
  getLogo: (companyId: number) => api.get(`/api/companies/${companyId}/logo`),
  // Let the browser/axios set the multipart boundary header automatically
  uploadLogo: (companyId: number, formData: FormData) => api.post(`/api/companies/${companyId}/logo`, formData),
};

export default api;
