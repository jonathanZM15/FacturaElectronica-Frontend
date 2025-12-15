import api from './api';

export interface Plan {
  id?: number;
  nombre: string;
  cantidad_comprobantes: number;
  precio: number;
  periodo: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual' | 'Bianual' | 'Trianual';
  observacion?: string;
  color_fondo: string;
  color_texto: string;
  estado: 'Activo' | 'Desactivado';
  comprobantes_minimos: number;
  dias_minimos: number;
  created_by_id?: number;
  updated_by_id?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  createdBy?: {
    id: number;
    nombres: string;
    apellidos: string;
  };
  updatedBy?: {
    id: number;
    nombres: string;
    apellidos: string;
  };
}

export const planesApi = {
  // Listar planes con filtros, búsqueda y paginación
  list(params: Record<string, any>) {
    return api.get('/api/planes', { params });
  },

  // Obtener plan específico
  get(id: number | string) {
    return api.get(`/api/planes/${id}`);
  },

  // Crear nuevo plan
  create(payload: Partial<Plan>) {
    return api.post('/api/planes', payload);
  },

  // Actualizar plan
  update(id: number | string, payload: Partial<Plan>) {
    return api.put(`/api/planes/${id}`, payload);
  },

  // Eliminar plan (soft delete)
  delete(id: number | string, payload?: { password: string }) {
    return api.delete(`/api/planes/${id}`, { data: payload });
  },

  // Obtener lista de períodos disponibles
  getPeriodos() {
    return api.get('/api/planes/periodos');
  },

  // Obtener lista de estados disponibles
  getEstados() {
    return api.get('/api/planes/estados');
  },
};
