import api from './api';

export interface Suscripcion {
  id?: number;
  emisor_id: number;
  plan_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  monto: number;
  cantidad_comprobantes: number;
  comprobantes_usados: number;
  comprobantes_restantes?: number;
  estado_suscripcion: 
    | 'Vigente'
    | 'Suspendido'
    | 'Pendiente'
    | 'Programado'
    | 'Proximo a caducar'
    | 'Pocos comprobantes'
    | 'Proximo a caducar y con pocos comprobantes'
    | 'Caducado'
    | 'Sin comprobantes';
  estado_transaccion: 'Pendiente' | 'Confirmada';
  forma_pago: 'Efectivo' | 'Transferencia' | 'Otro';
  comprobante_pago?: string;
  factura?: string;
  estado_comision?: 'Sin comision' | 'Pendiente' | 'Pagada';
  monto_comision?: number;
  comprobante_comision?: string;
  created_by_id?: number;
  updated_by_id?: number;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  plan?: {
    id: number;
    nombre: string;
    periodo: string;
    cantidad_comprobantes: number;
    precio: number;
    comprobantes_minimos: number;
    dias_minimos: number;
  };
  emisor?: {
    id: number;
    razon_social: string;
    nombre_comercial: string;
    ruc: string;
  };
  createdBy?: {
    id: number;
    username: string;
    nombres: string;
    apellidos: string;
    role: string;
    email?: string;
  };
  updatedBy?: {
    id: number;
    username: string;
    nombres: string;
    apellidos: string;
  };
}

export interface PlanActivo {
  id: number;
  nombre: string;
  periodo: string;
  cantidad_comprobantes: number;
  precio: number;
  comprobantes_minimos: number;
  dias_minimos: number;
  label: string;
}

export interface SuscripcionFilters {
  // Filtros de rango de fechas
  fecha_registro_desde?: string;
  fecha_registro_hasta?: string;
  fecha_actualizacion_desde?: string;
  fecha_actualizacion_hasta?: string;
  fecha_inicio_desde?: string;
  fecha_inicio_hasta?: string;
  fecha_fin_desde?: string;
  fecha_fin_hasta?: string;
  // Filtros de búsqueda
  plan?: string;
  cantidad_comprobantes_min?: number;
  comprobantes_usados_min?: number;
  comprobantes_restantes_max?: number;
  estado_suscripcion?: string;
  estado_transaccion?: string;
  monto_max?: number;
  forma_pago?: string;
  usuario_registrador?: string;
  estado_comision?: string;
}

export interface SuscripcionFormData {
  emisor_id: number;
  plan_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  monto: number;
  cantidad_comprobantes: number;
  estado_suscripcion?: string;
  forma_pago: string;
  estado_transaccion?: string;
  comprobante_pago?: File;
  factura?: File;
  // Campos adicionales para edición (Admin)
  estado_comision?: string;
  monto_comision?: number;
  comprobante_comision?: File;
}

export interface CamposEditablesResponse {
  campos_editables: string[];
  campos_solo_lectura: string[];
  estado_suscripcion: string;
  transaccion_confirmada: boolean;
  tiene_comprobantes_emitidos: boolean;
  is_admin: boolean;
  is_distribuidor: boolean;
}

export interface TransicionesDisponiblesResponse {
  estado_actual: string;
  transiciones_disponibles: string[];
  is_admin: boolean;
}

export interface HistorialEstadoItem {
  id: number;
  suscripcion_id: number;
  estado_anterior: string;
  estado_nuevo: string;
  tipo_transicion: 'Manual' | 'Automatico';
  motivo: string | null;
  user_id: number | null;
  user_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    id: number;
    username: string;
    nombres: string;
    apellidos: string;
  } | null;
}

export const suscripcionesApi = {
  // Listar suscripciones de un emisor
  list(emisorId: number, params?: Record<string, any>) {
    return api.get(`/api/emisores/${emisorId}/suscripciones`, { params });
  },

  // Obtener suscripción específica
  get(emisorId: number, suscripcionId: number) {
    return api.get(`/api/emisores/${emisorId}/suscripciones/${suscripcionId}`);
  },

  // Crear nueva suscripción
  create(emisorId: number, data: SuscripcionFormData) {
    const formData = new FormData();
    
    // Añadir campos al FormData
    formData.append('emisor_id', String(data.emisor_id));
    formData.append('plan_id', String(data.plan_id));
    formData.append('fecha_inicio', data.fecha_inicio);
    formData.append('fecha_fin', data.fecha_fin);
    formData.append('monto', String(data.monto));
    formData.append('cantidad_comprobantes', String(data.cantidad_comprobantes));
    formData.append('forma_pago', data.forma_pago);
    
    if (data.estado_suscripcion) {
      formData.append('estado_suscripcion', data.estado_suscripcion);
    }
    if (data.estado_transaccion) {
      formData.append('estado_transaccion', data.estado_transaccion);
    }
    if (data.comprobante_pago) {
      formData.append('comprobante_pago', data.comprobante_pago);
    }
    if (data.factura) {
      formData.append('factura', data.factura);
    }

    return api.post(`/api/emisores/${emisorId}/suscripciones`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Actualizar suscripción existente
  update(emisorId: number, suscripcionId: number, data: Partial<SuscripcionFormData>) {
    const formData = new FormData();
    
    // Añadir campos que vienen
    if (data.plan_id !== undefined) formData.append('plan_id', String(data.plan_id));
    if (data.fecha_inicio !== undefined) formData.append('fecha_inicio', data.fecha_inicio);
    if (data.fecha_fin !== undefined) formData.append('fecha_fin', data.fecha_fin);
    if (data.monto !== undefined) formData.append('monto', String(data.monto));
    if (data.cantidad_comprobantes !== undefined) formData.append('cantidad_comprobantes', String(data.cantidad_comprobantes));
    if (data.forma_pago !== undefined) formData.append('forma_pago', data.forma_pago);
    if (data.estado_suscripcion !== undefined) formData.append('estado_suscripcion', data.estado_suscripcion);
    if (data.estado_transaccion !== undefined) formData.append('estado_transaccion', data.estado_transaccion);
    if (data.estado_comision !== undefined) formData.append('estado_comision', data.estado_comision);
    if (data.monto_comision !== undefined) formData.append('monto_comision', String(data.monto_comision));
    
    // Archivos
    if (data.comprobante_pago) formData.append('comprobante_pago', data.comprobante_pago);
    if (data.factura) formData.append('factura', data.factura);
    if (data.comprobante_comision) formData.append('comprobante_comision', data.comprobante_comision);

    // Usar POST con _method=PUT para enviar archivos (Laravel no procesa bien PUT con multipart)
    formData.append('_method', 'PUT');

    return api.post(`/api/emisores/${emisorId}/suscripciones/${suscripcionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Obtener campos editables para una suscripción
  getCamposEditables(emisorId: number, suscripcionId: number) {
    return api.get<{ message: string; data: CamposEditablesResponse }>(
      `/api/emisores/${emisorId}/suscripciones/${suscripcionId}/campos-editables`
    );
  },

  // Obtener planes activos
  getPlanesActivos() {
    return api.get('/api/suscripciones/planes-activos');
  },

  // Calcular fecha de fin
  calcularFechaFin(planId: number, fechaInicio: string) {
    return api.post('/api/suscripciones/calcular-fecha-fin', {
      plan_id: planId,
      fecha_inicio: fechaInicio,
    });
  },

  // Obtener estados disponibles
  getEstados() {
    return api.get('/api/suscripciones/estados');
  },

  // === Gestión de Estados (HU9) ===

  // Cambiar estado de una suscripción manualmente
  cambiarEstado(emisorId: number, suscripcionId: number, nuevoEstado: string, motivo?: string) {
    return api.post(`/api/emisores/${emisorId}/suscripciones/${suscripcionId}/cambiar-estado`, {
      nuevo_estado: nuevoEstado,
      motivo,
    });
  },

  // Obtener transiciones de estado disponibles
  getTransicionesDisponibles(emisorId: number, suscripcionId: number) {
    return api.get<{ message: string; data: TransicionesDisponiblesResponse }>(
      `/api/emisores/${emisorId}/suscripciones/${suscripcionId}/transiciones-disponibles`
    );
  },

  // Obtener historial de cambios de estado (solo admin)
  getHistorialEstados(emisorId: number, suscripcionId: number) {
    return api.get<{ message: string; data: { suscripcion_id: number; estado_actual: string; historial: HistorialEstadoItem[] } }>(
      `/api/emisores/${emisorId}/suscripciones/${suscripcionId}/historial-estados`
    );
  },

  // Evaluar y actualizar estados automáticos de todas las suscripciones de un emisor
  evaluarEstados(emisorId: number) {
    return api.post(`/api/emisores/${emisorId}/suscripciones/evaluar-estados`);
  },
};
