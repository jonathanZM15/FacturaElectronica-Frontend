import axios, { AxiosInstance } from 'axios';
import { fetchWithCache, cacheManager } from './cacheManager';

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para agregar token y headers de API
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['Accept'] = 'application/json';
  return config;
});

export const usuariosEmisorApi = {
  list: async (emiId: string | number, params: Record<string, any> = {}) => {
    const key = `emisorUsers:${emiId}:list:${JSON.stringify(params)}`;
    const data = await fetchWithCache(key, async () => {
      const res = await api.get(`/emisores/${emiId}/usuarios`, { params });
      return res.data;
    }, { ttl: 15_000 });
    return { data };
  },

  get: async (emiId: string | number, userId: string | number) => {
    return api.get(`/emisores/${emiId}/usuarios/${userId}`);
  },

  create: async (emiId: string | number, data: any) => {
    return api.post(`/emisores/${emiId}/usuarios`, data).then(r => { cacheManager.clearNamespace(`emisorUsers:${emiId}`); return r; });
  },

  update: async (emiId: string | number, userId: string | number, data: any) => {
    return api.put(`/emisores/${emiId}/usuarios/${userId}`, data).then(r => { cacheManager.clearNamespace(`emisorUsers:${emiId}`); return r; });
  },

  delete: async (emiId: string | number, userId: string | number, password: string) => {
    return api.delete(`/emisores/${emiId}/usuarios/${userId}`, {
      data: { password }
    }).then(r => { cacheManager.clearNamespace(`emisorUsers:${emiId}`); return r; });
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
