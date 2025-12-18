import api from './api';

// Tipos de impuesto disponibles
export type TipoImpuestoEnum = 'IVA' | 'ICE' | 'IRBPNR';

// Tipos de tarifa disponibles
export type TipoTarifaEnum = 'Porcentaje' | 'Importe fijo por unidad';

// Estados disponibles
export type EstadoTipoImpuesto = 'Activo' | 'Desactivado';

// Interface principal
export interface TipoImpuesto {
  id?: number;
  tipo_impuesto: TipoImpuestoEnum;
  tipo_tarifa: TipoTarifaEnum;
  codigo: number;
  nombre: string;
  valor_tarifa: number;
  estado: EstadoTipoImpuesto;
  created_by_id?: number;
  updated_by_id?: number;
  created_at?: string;
  updated_at?: string;
  // Campos computados
  tiene_productos?: boolean;
  cantidad_productos?: number;
  tarifas_permitidas?: TipoTarifaEnum[];
  puede_cambiar_tarifa?: boolean;
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
export interface TipoImpuestoFormData {
  tipo_impuesto: TipoImpuestoEnum;
  tipo_tarifa: TipoTarifaEnum;
  codigo: number;
  nombre: string;
  valor_tarifa: number;
  estado: EstadoTipoImpuesto;
  password?: string; // Para actualización y eliminación
}

// Interface para filtros
export interface TipoImpuestoFilters {
  // Filtros por rango de fechas
  fecha_creacion_desde?: string;
  fecha_creacion_hasta?: string;
  fecha_actualizacion_desde?: string;
  fecha_actualizacion_hasta?: string;
  // Filtro por tipo de impuesto (múltiple)
  tipos_impuesto?: TipoImpuestoEnum[];
  // Filtros de búsqueda
  nombre?: string;
  codigo?: string;
  valor_tarifa_max?: number;
  tipo_tarifa?: TipoTarifaEnum;
  estado?: EstadoTipoImpuesto;
}

// Interface para opciones del formulario
export interface TipoImpuestoOpciones {
  tipos_impuesto: TipoImpuestoEnum[];
  tipos_tarifa: TipoTarifaEnum[];
  estados: EstadoTipoImpuesto[];
  tarifa_por_tipo: Record<TipoImpuestoEnum, TipoTarifaEnum[]>;
}

// Interface para paginación
export interface TipoImpuestoPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

// Interface para respuesta de lista
export interface TipoImpuestoListResponse {
  message: string;
  data: TipoImpuesto[];
  pagination: TipoImpuestoPagination;
}

// Mapeo de tarifas permitidas por tipo de impuesto
export const TARIFA_POR_TIPO: Record<TipoImpuestoEnum, TipoTarifaEnum[]> = {
  'IVA': ['Porcentaje'],
  'ICE': ['Porcentaje', 'Importe fijo por unidad'],
  'IRBPNR': ['Importe fijo por unidad'],
};

// API Service
export const tiposImpuestoApi = {
  // Listar tipos de impuesto con paginación y filtros
  list(params?: Record<string, any>) {
    // Convertir array de tipos_impuesto a string separado por comas
    if (params?.tipos_impuesto && Array.isArray(params.tipos_impuesto)) {
      params.tipos_impuesto = params.tipos_impuesto.join(',');
    }
    return api.get<TipoImpuestoListResponse>('/api/tipos-impuesto', { params });
  },

  // Obtener un tipo de impuesto específico
  get(id: number) {
    return api.get<{ message: string; data: TipoImpuesto }>(`/api/tipos-impuesto/${id}`);
  },

  // Crear un nuevo tipo de impuesto
  create(data: Omit<TipoImpuestoFormData, 'password'>) {
    return api.post<{ message: string; data: TipoImpuesto }>('/api/tipos-impuesto', data);
  },

  // Actualizar un tipo de impuesto existente (requiere password)
  update(id: number, data: TipoImpuestoFormData) {
    return api.put<{ message: string; data: TipoImpuesto }>(`/api/tipos-impuesto/${id}`, data);
  },

  // Eliminar un tipo de impuesto (requiere password)
  delete(id: number, password: string) {
    return api.delete<{ message: string }>(`/api/tipos-impuesto/${id}`, {
      data: { password },
    });
  },

  // Obtener opciones para selectores del formulario
  getOpciones() {
    return api.get<{ message: string; data: TipoImpuestoOpciones }>('/api/tipos-impuesto/opciones');
  },

  // Obtener tipos de impuesto activos (para selector en productos)
  getActivos() {
    return api.get<{ message: string; data: TipoImpuesto[] }>('/api/tipos-impuesto/activos');
  },

  // Verificar si un código ya existe
  checkCodigo(codigo: number, excludeId?: number) {
    const params: Record<string, any> = { codigo };
    if (excludeId) params.exclude_id = excludeId;
    return api.get<{ exists: boolean }>('/api/tipos-impuesto/check-codigo', { params });
  },

  // Verificar si un nombre ya existe
  checkNombre(nombre: string, excludeId?: number) {
    const params: Record<string, any> = { nombre };
    if (excludeId) params.exclude_id = excludeId;
    return api.get<{ exists: boolean }>('/api/tipos-impuesto/check-nombre', { params });
  },
};
