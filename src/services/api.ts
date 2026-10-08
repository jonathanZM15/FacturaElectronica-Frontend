import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('authToken');
  if (config.headers) {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = 'application/json';
  }
  return config;
});

export const auth = {
  login: (email: string, password: string) => api.post('/api/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/api/register', { name, email, password }),
  cambiarPassword: (currentPassword: string, newPassword: string) => api.post('/api/cambiarClave', { current_password: currentPassword, password: newPassword }),
  logout: () => api.post('/api/logout'),
  me: () => api.get('/api/user'),
  verifyEmail: (token: string) => api.post('/api/verify-email', { token }),
  confirmEmailChange: (token: string) => api.post('/api/confirm-email-change', { token }),
  changeInitialPassword: (token: string, password: string, password_confirmation: string) => 
    api.post('/api/change-initial-password', { token, password, password_confirmation }),
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

// NUEVO: endpoint de Emisores
export const emisores = {
  list: (params?: Record<string, any>) => api.get('/api/emisores', { params }),
  create: (payload: Record<string, any>) => api.post('/api/emisores', payload),
};

export const facturacion = {
  emitir: (formData: FormData) =>
    api.post('/api/facturacion/emitir', formData, {
      // Axios debe calcular multipart/form-data con boundary; no fijar Content-Type manualmente.
      transformRequest: [(data, headers) => {
        if (data instanceof FormData && headers) {
          delete headers['Content-Type'];
        }
        return data;
      }],
    }),
  estado: (comprobanteId: number) => api.get(`/api/facturacion/comprobantes/${comprobanteId}`),
  reintentar: (comprobanteId: number) => api.post(`/api/facturacion/comprobantes/${comprobanteId}/reintentar`),
  downloadPdf: (comprobanteId: number) => api.get(`/api/facturacion/comprobantes/${comprobanteId}/pdf`, { responseType: 'blob' }),
  downloadXml: (comprobanteId: number) => api.get(`/api/facturacion/comprobantes/${comprobanteId}/xml`, { responseType: 'blob' }),
  emitirNotaCredito: (formData: FormData) =>
    api.post('/api/facturacion/emitir-nota-credito', formData, {
      transformRequest: [(data: any, headers: any) => { delete headers['Content-Type']; return data; }],
    }),
  emitirNotaDebito: (formData: FormData) =>
    api.post('/api/facturacion/emitir-nota-debito', formData, {
      transformRequest: [(data: any, headers: any) => { delete headers['Content-Type']; return data; }],
    }),
  emitirGuiaRemision: (formData: FormData) =>
    api.post('/api/facturacion/emitir-guia-remision', formData, {
      transformRequest: [(data: any, headers: any) => { delete headers['Content-Type']; return data; }],
    }),
  listarComprobantes: (params: { tipo?: string; estado?: string; emisor_id?: string | number }) =>
    api.get('/api/facturacion/comprobantes', { params }),
};

export const clientesService = {
  list: (emisorId: number | string, params?: Record<string, any>) =>
    api.get(`/api/emisores/${emisorId}/clientes`, { params }),
  buscar: (emisorId: number | string, identificacion: string) =>
    api.get(`/api/emisores/${emisorId}/clientes/buscar`, { params: { identificacion } }),
  get: (emisorId: number | string, id: number) =>
    api.get(`/api/emisores/${emisorId}/clientes/${id}`),
  create: (emisorId: number | string, data: any) =>
    api.post(`/api/emisores/${emisorId}/clientes`, data),
  update: (emisorId: number | string, id: number, data: any) =>
    api.put(`/api/emisores/${emisorId}/clientes/${id}`, data),
  delete: (emisorId: number | string, id: number) =>
    api.delete(`/api/emisores/${emisorId}/clientes/${id}`),
};

export default api;
