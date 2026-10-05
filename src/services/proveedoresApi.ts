import api from './api';

export interface Proveedor {
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

export const proveedoresApi = {
  list(emisorId: number | string, page = 1, search = '') {
    return api.get(`/api/emisores/${emisorId}/proveedores`, {
      params: { page, search }
    });
  },

  show(emisorId: number | string, id: number | string) {
    return api.get(`/api/emisores/${emisorId}/proveedores/${id}`);
  },

  create(emisorId: number | string, payload: Partial<Proveedor>) {
    return api.post(`/api/emisores/${emisorId}/proveedores`, payload);
  },

  update(emisorId: number | string, id: number | string, payload: Partial<Proveedor>) {
    return api.put(`/api/emisores/${emisorId}/proveedores/${id}`, payload);
  },

  delete(emisorId: number | string, id: number | string) {
    return api.delete(`/api/emisores/${emisorId}/proveedores/${id}`);
  }
};
