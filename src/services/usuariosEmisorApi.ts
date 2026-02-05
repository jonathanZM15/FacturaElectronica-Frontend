import axios, { AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para agregar token y headers de API
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['Accept'] = 'application/json';
  return config;
});

export const usuariosEmisorApi = {
  list: async (emiId: string | number, page = 1, perPage = 20) => {
    return api.get(`/emisores/${emiId}/usuarios`, {
      params: { page, per_page: perPage }
    });
  },

  get: async (emiId: string | number, userId: string | number) => {
    return api.get(`/emisores/${emiId}/usuarios/${userId}`);
  },

  create: async (emiId: string | number, data: any) => {
    return api.post(`/emisores/${emiId}/usuarios`, data);
  },

  update: async (emiId: string | number, userId: string | number, data: any) => {
    return api.put(`/emisores/${emiId}/usuarios/${userId}`, data);
  },

  delete: async (emiId: string | number, userId: string | number, password: string) => {
    return api.delete(`/emisores/${emiId}/usuarios/${userId}`, {
      data: { password }
    });
  },

  // Verificar disponibilidad de email
  checkEmail: async (email: string, excludeId?: number | string) => {
    return api.get(`/usuarios/check/email`, {
      params: { email, exclude_id: excludeId }
    });
  },

  // Verificar disponibilidad de cédula
  checkCedula: async (cedula: string, excludeId?: number | string) => {
    return api.get(`/usuarios/check/cedula`, {
      params: { cedula, exclude_id: excludeId }
    });
  },

  // Verificar disponibilidad de username
  checkUsername: async (username: string, excludeId?: number | string) => {
    return api.get(`/usuarios/check/username`, {
      params: { username, exclude_id: excludeId }
    });
  },

  // Reenviar correo de verificación
  resendVerificationEmail: async (emiId: string | number, userId: string | number, nuevoEstado?: string) => {
    return api.post(`/emisores/${emiId}/usuarios/${userId}/resend-verification`, { estado: nuevoEstado });
  }
};
