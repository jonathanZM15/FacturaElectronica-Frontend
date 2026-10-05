import api from './api';

export interface Transportista {
  id: number;
  emisor_id: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  placa_vehiculo?: string;
}

export const transportistasApi = {
  list(emisorId: number | string, page = 1, search = '') {
    return api.get(`/api/emisores/${emisorId}/transportistas`, {
      params: { page, search }
    });
  },

  show(emisorId: number | string, id: number | string) {
    return api.get(`/api/emisores/${emisorId}/transportistas/${id}`);
  },

  create(emisorId: number | string, payload: Partial<Transportista>) {
    return api.post(`/api/emisores/${emisorId}/transportistas`, payload);
  },

  update(emisorId: number | string, id: number | string, payload: Partial<Transportista>) {
    return api.put(`/api/emisores/${emisorId}/transportistas/${id}`, payload);
  },

  delete(emisorId: number | string, id: number | string) {
    return api.delete(`/api/emisores/${emisorId}/transportistas/${id}`);
  }
};
