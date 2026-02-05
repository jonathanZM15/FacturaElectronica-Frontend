import { User } from '../types/user';
import api from './api';

export const usuariosApi = {
  // Listar usuarios con filtros, búsqueda y paginación
  list(params: Record<string, any>) {
    return api.get('/api/usuarios', { params });
  },

  // Obtener usuario específico
  get(id: number | string) {
    return api.get(`/api/usuarios/${id}`);
  },

  // Crear nuevo usuario
  create(payload: Partial<User> & { password_confirmation?: string }) {
    return api.post('/api/usuarios', payload);
  },

  // Actualizar usuario
  update(id: number | string, payload: Partial<User>) {
    return api.put(`/api/usuarios/${id}`, payload);
  },

  // Eliminar usuario (requiere contraseña)
  delete(id: number | string, password: string) {
    return api.delete(`/api/usuarios/${id}`, { data: { password } });
  },

  // Verificar si el username ya existe
  checkUsername(username: string, excludeId?: number | string) {
    return api.get('/api/usuarios/check/username', { params: { username, exclude_id: excludeId } });
  },

  // Verificar si la cédula ya existe
  checkCedula(cedula: string, excludeId?: number | string) {
    return api.get('/api/usuarios/check/cedula', { params: { cedula, exclude_id: excludeId } });
  },

  // Verificar si el email ya existe
  checkEmail(email: string, excludeId?: number | string) {
    return api.get('/api/usuarios/check/email', { params: { email, exclude_id: excludeId } });
  },

  // Reenviar correo de verificación (con cambio de estado opcional)
  resendVerificationEmail(id: number | string, nuevoEstado?: string) {
    return api.post(`/api/usuarios/${id}/resend-verification`, { estado: nuevoEstado });
  },
};
