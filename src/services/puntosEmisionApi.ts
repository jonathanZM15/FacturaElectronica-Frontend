import api from './api';
import type { PuntoEmision } from '../types/puntoEmision';

export const puntosEmisionApi = {
  listByEmisor(companyId: number | string) {
    return api.get(`/api/emisores/${companyId}/puntos-emision`);
  },

  list(companyId: number | string, establecimientoId: number | string) {
    return api.get(`/api/emisores/${companyId}/establecimientos/${establecimientoId}/puntos`);
  },

  show(companyId: number | string, establecimientoId: number | string, id: number | string) {
    return api.get(`/api/emisores/${companyId}/establecimientos/${establecimientoId}/puntos/${id}`);
  },

  create(companyId: number | string, establecimientoId: number | string, payload: Partial<PuntoEmision>) {
    return api.post(`/api/emisores/${companyId}/establecimientos/${establecimientoId}/puntos`, payload);
  },

  update(companyId: number | string, establecimientoId: number | string, id: number | string, payload: Partial<PuntoEmision>) {
    return api.put(`/api/emisores/${companyId}/establecimientos/${establecimientoId}/puntos/${id}`, payload);
  },

  delete(companyId: number | string, establecimientoId: number | string, id: number | string, password: string) {
    return api.delete(`/api/emisores/${companyId}/establecimientos/${establecimientoId}/puntos/${id}`, { data: { password } });
  }
};
