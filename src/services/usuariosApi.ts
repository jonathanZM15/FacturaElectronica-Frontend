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
};
