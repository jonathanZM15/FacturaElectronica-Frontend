import { Emisor } from '../types/emisor';
import api from './api';

export const emisoresApi = {
  // Accept flexible params to support dynamic filtering/sorting/pagination
  list(params: Record<string, any>) {
    return api.get('/api/emisores', { params });
  },

  checkRuc(ruc: string) {
    return api.get(`/api/emisores/check-ruc/${ruc}`);
  },

  create(payload: Partial<Emisor> & { logoFile?: File | null }) {
    const hasFile = !!payload.logoFile;
    if (hasFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'logoFile') return;
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (payload.logoFile) fd.append('logo', payload.logoFile);
      // Let axios set the multipart boundary automatically
      return api.post('/api/emisores', fd);
    }
    return api.post('/api/emisores', payload);
  },
  get(id: number | string) {
    return api.get(`/api/emisores/${id}`);
  },

  update(id: number | string, payload: Partial<Emisor> & { logoFile?: File | null }) {
    const hasFile = !!payload.logoFile;
    if (hasFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'logoFile') return;
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (payload.logoFile) fd.append('logo', payload.logoFile);
      return api.put(`/api/emisores/${id}`, fd);
    }
    return api.put(`/api/emisores/${id}`, payload);
  },
  delete(id: number | string, password: string) {
    // axios allows a request body on DELETE via the `data` option
    return api.delete(`/api/emisores/${id}`, { data: { password } });
  },
  prepareDeletion(id: number | string) {
    return api.post(`/api/emisores/${id}/prepare-deletion`);
  },

  deletePermanent(id: number | string, password: string) {
    return api.delete(`/api/emisores/${id}/permanent`, { data: { password } });
  },
};