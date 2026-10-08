import api from './api';

const BASE_URL = '/emisores';

export interface Caja {
    id: number;
    establecimiento_id: number;
    nombre: string;
    activa: boolean;
    created_at?: string;
    updated_at?: string;
    establecimiento?: any;
}

export interface PosTurno {
    id: number;
    caja_id: number;
    usuario_id: number;
    fecha_apertura: string;
    fecha_cierre?: string;
    saldo_inicial: number;
    saldo_final?: number;
    estado: 'Abierto' | 'Cerrado';
    observaciones?: string;
    caja?: Caja;
}

export const posApi = {
    // Cajas
    getCajas: (emisorId: string | number, establecimientoId?: number) => 
        api.get<{ data: Caja[] }>(`${BASE_URL}/${emisorId}/cajas${establecimientoId ? `?establecimiento_id=${establecimientoId}` : ''}`).then(res => res.data.data),
    
    createCaja: (emisorId: string | number, payload: Partial<Caja>) =>
        api.post<{ message: string, data: Caja }>(`${BASE_URL}/${emisorId}/cajas`, payload).then(res => res.data),
        
    updateCaja: (emisorId: string | number, id: number, payload: Partial<Caja>) =>
        api.put<{ message: string, data: Caja }>(`${BASE_URL}/${emisorId}/cajas/${id}`, payload).then(res => res.data),
        
    deleteCaja: (emisorId: string | number, id: number) =>
        api.delete<{ message: string }>(`${BASE_URL}/${emisorId}/cajas/${id}`).then(res => res.data),

    // Turnos
    getActiveTurno: (emisorId: string | number) =>
        api.get<{ data: PosTurno | null }>(`${BASE_URL}/${emisorId}/pos-turnos/active`).then(res => res.data.data),
        
    aperturarTurno: (emisorId: string | number, payload: { caja_id: number, saldo_inicial: number, observaciones?: string }) =>
        api.post<{ message: string, data: PosTurno }>(`${BASE_URL}/${emisorId}/pos-turnos/aperturar`, payload).then(res => res.data),
        
    cerrarTurno: (emisorId: string | number, turnoId: number, payload: { saldo_final: number, observaciones?: string }) =>
        api.post<{ message: string, data: PosTurno }>(`${BASE_URL}/${emisorId}/pos-turnos/${turnoId}/cerrar`, payload).then(res => res.data),
};
