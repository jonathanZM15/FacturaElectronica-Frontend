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
  cambiarPassword: (currentPassword: string, newPassword: string) => api.post('/api/cambiarClave', { current_password: currentPassword, password: newPassword }),
  logout: () => api.post('/api/logout'),
  me: () => api.get('/api/user'),
};

// Endpoint para restablecimiento de contraseña vía token (enlace recibido por correo)
export const passwordReset = {
  // Se asume que el backend espera { token, password, password_confirmation }
  reset: (token: string, password: string, password_confirmation?: string) => api.post('/api/password-reset', { token, password, password_confirmation: password_confirmation || password }),
};

export const company = {
  getLogo: (companyId: number) => api.get(`/api/companies/${companyId}/logo`),
  // Let the browser/axios set the multipart boundary header automatically
  uploadLogo: (companyId: number, formData: FormData) => api.post(`/api/companies/${companyId}/logo`, formData),
};

export default api;
