import api from './api';

const BASE_URL = '/api/emisores';

export interface PosTurno {
    id: number;
    punto_emision_id: number;
    usuario_id: number;
    fecha_apertura: string;
    fecha_cierre?: string;
    saldo_inicial: number;
    saldo_final?: number;
    estado: 'Abierto' | 'Cerrado';
    observaciones?: string;
    puntoEmision?: any;
}

export const posApi = {
    // Turnos
    getActiveTurno: (emisorId: string | number) =>
        api.get<{ data: PosTurno | null }>(`${BASE_URL}/${emisorId}/pos-turnos/active`).then(res => res.data.data),
        
    aperturarTurno: (emisorId: string | number, payload: { punto_emision_id: number, saldo_inicial: number, observaciones?: string }) =>
        api.post<{ message: string, data: PosTurno }>(`${BASE_URL}/${emisorId}/pos-turnos/aperturar`, payload).then(res => res.data),
        
    cerrarTurno: (emisorId: string | number, turnoId: number, payload: { saldo_final: number, observaciones?: string }) =>
        api.post<{ message: string, data: PosTurno }>(`${BASE_URL}/${emisorId}/pos-turnos/${turnoId}/cerrar`, payload).then(res => res.data),
};
