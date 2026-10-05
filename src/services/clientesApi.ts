import api from './api';

export interface Cliente {
  id: number;
  emisor_id: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

export const clientesApi = {
  list(emisorId: number | string, page = 1, search = '') {
    return api.get(`/api/emisores/${emisorId}/clientes`, {
      params: { page, search }
    });
  },

  show(emisorId: number | string, id: number | string) {
    return api.get(`/api/emisores/${emisorId}/clientes/${id}`);
  },

  create(emisorId: number | string, payload: Partial<Cliente>) {
    return api.post(`/api/emisores/${emisorId}/clientes`, payload);
  },

  update(emisorId: number | string, id: number | string, payload: Partial<Cliente>) {
    return api.put(`/api/emisores/${emisorId}/clientes/${id}`, payload);
  },

  delete(emisorId: number | string, id: number | string) {
    return api.delete(`/api/emisores/${emisorId}/clientes/${id}`);
  }
};
