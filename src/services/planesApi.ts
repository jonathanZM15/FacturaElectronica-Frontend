import api from './api';
import { fetchWithCache, cacheManager } from './cacheManager';

const CACHE_NS = 'planes';
const CACHE_TTL = 20_000; // 20s

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
  // Listar planes con filtros, búsqueda y paginación (con caché)
  list(params: Record<string, any>) {
    const key = `${CACHE_NS}:list:${JSON.stringify(params)}`;
    return fetchWithCache(key, async () => {
      const res = await api.get('/api/planes', { params });
      return res.data;
    }, { ttl: CACHE_TTL }).then(data => ({ data }));
  },

  // Obtener plan específico
  get(id: number | string) {
    return api.get(`/api/planes/${id}`);
  },

  // Crear nuevo plan
  create(payload: Partial<Plan>) {
    return api.post('/api/planes', payload).then(r => { cacheManager.clearNamespace(CACHE_NS); return r; });
  },

  // Actualizar plan
  update(id: number | string, payload: Partial<Plan>) {
    return api.put(`/api/planes/${id}`, payload).then(r => { cacheManager.clearNamespace(CACHE_NS); return r; });
  },

  // Eliminar plan (soft delete)
  delete(id: number | string, payload?: { password: string }) {
    return api.delete(`/api/planes/${id}`, { data: payload }).then(r => { cacheManager.clearNamespace(CACHE_NS); return r; });
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
