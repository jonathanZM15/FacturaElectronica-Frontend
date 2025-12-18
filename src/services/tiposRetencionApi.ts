import api from './api';

// Tipos de retención disponibles
export type TipoRetencionEnum = 'IVA' | 'RENTA' | 'ISD';

// Interface principal
export interface TipoRetencion {
  id?: number;
  tipo_retencion: TipoRetencionEnum;
  codigo: string;
  nombre: string;
  porcentaje: number;
  created_by_id?: number;
  updated_by_id?: number;
  created_at?: string;
  updated_at?: string;
  // Relaciones
  createdBy?: {
    id: number;
    username: string;
    nombres: string;
    apellidos: string;
  };
  updatedBy?: {
    id: number;
    username: string;
    nombres: string;
    apellidos: string;
  };
}

// Interface para el formulario
export interface TipoRetencionFormData {
  tipo_retencion: TipoRetencionEnum;
  codigo: string;
  nombre: string;
  porcentaje: number;
  password?: string; // Para actualización y eliminación
}

// Interface para filtros
export interface TipoRetencionFilters {
  // Filtros por rango de fechas
  fecha_creacion_desde?: string;
  fecha_creacion_hasta?: string;
  fecha_actualizacion_desde?: string;
  fecha_actualizacion_hasta?: string;
  // Filtro por tipo de retención (múltiple)
  tipos_retencion?: TipoRetencionEnum[];
  // Filtros de búsqueda
  nombre?: string;
  codigo?: string;
  porcentaje_max?: number;
}

// Interface para opciones del formulario
export interface TipoRetencionOpciones {
  tipos_retencion: TipoRetencionEnum[];
}

// Interface para paginación
export interface TipoRetencionPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

// Interface para respuesta de lista
export interface TipoRetencionListResponse {
  message: string;
  data: TipoRetencion[];
  pagination: TipoRetencionPagination;
}

// Constantes
export const TIPOS_RETENCION: TipoRetencionEnum[] = ['IVA', 'RENTA', 'ISD'];

// API de Tipos de Retención
export const tiposRetencionApi = {
  /**
   * Listar tipos de retención con paginación y filtros
   */
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
    filters?: TipoRetencionFilters;
  }): Promise<TipoRetencionListResponse> => {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.per_page) queryParams.per_page = params.per_page.toString();
    if (params?.sort_by) queryParams.sort_by = params.sort_by;
    if (params?.sort_dir) queryParams.sort_dir = params.sort_dir;
    
    // Agregar filtros
    if (params?.filters) {
      const f = params.filters;
      if (f.fecha_creacion_desde) queryParams.fecha_creacion_desde = f.fecha_creacion_desde;
      if (f.fecha_creacion_hasta) queryParams.fecha_creacion_hasta = f.fecha_creacion_hasta;
      if (f.fecha_actualizacion_desde) queryParams.fecha_actualizacion_desde = f.fecha_actualizacion_desde;
      if (f.fecha_actualizacion_hasta) queryParams.fecha_actualizacion_hasta = f.fecha_actualizacion_hasta;
      if (f.tipos_retencion && f.tipos_retencion.length > 0) {
        queryParams.tipos_retencion = f.tipos_retencion.join(',');
      }
      if (f.nombre) queryParams.nombre = f.nombre;
      if (f.codigo) queryParams.codigo = f.codigo;
      if (f.porcentaje_max !== undefined) queryParams.porcentaje_max = f.porcentaje_max.toString();
    }
    
    const queryString = new URLSearchParams(queryParams).toString();
    const response = await api.get(`/api/tipos-retencion${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },
  
  /**
   * Obtener un tipo de retención por ID
   */
  getById: async (id: number): Promise<{ message: string; data: TipoRetencion }> => {
    const response = await api.get(`/api/tipos-retencion/${id}`);
    return response.data;
  },
  
  /**
   * Crear un nuevo tipo de retención
   */
  create: async (data: TipoRetencionFormData): Promise<{ message: string; data: TipoRetencion }> => {
    const response = await api.post('/api/tipos-retencion', data);
    return response.data;
  },
  
  /**
   * Actualizar un tipo de retención
   */
  update: async (id: number, data: Partial<TipoRetencionFormData> & { password: string }): Promise<{ message: string; data: TipoRetencion }> => {
    const response = await api.put(`/api/tipos-retencion/${id}`, data);
    return response.data;
  },
  
  /**
   * Eliminar un tipo de retención
   */
  delete: async (id: number, password: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/tipos-retencion/${id}`, { data: { password } });
    return response.data;
  },
  
  /**
   * Obtener opciones para el formulario
   */
  getOpciones: async (): Promise<{ message: string; data: TipoRetencionOpciones }> => {
    const response = await api.get('/api/tipos-retencion/opciones');
    return response.data;
  },
  
  /**
   * Verificar si existe un código para un tipo de retención
   */
  checkCodigo: async (tipoRetencion: TipoRetencionEnum, codigo: string, excludeId?: number): Promise<{ exists: boolean; message: string }> => {
    const params: Record<string, string> = {
      tipo_retencion: tipoRetencion,
      codigo: codigo,
    };
    if (excludeId) params.exclude_id = excludeId.toString();
    
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/api/tipos-retencion/check-codigo?${queryString}`);
    return response.data;
  },
};

export default tiposRetencionApi;
