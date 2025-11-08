import api from './api';
import { Establecimiento } from '../types/establecimiento';

export const establecimientosApi = {
  list(companyId: number | string) {
    return api.get(`/api/emisores/${companyId}/establecimientos`);
  },
  checkCode(companyId: number | string, code: string) {
    return api.get(`/api/emisores/${companyId}/establecimientos/check-code/${encodeURIComponent(code)}`);
  },
  create(companyId: number | string, payload: Partial<Establecimiento> & { logoFile?: File | null }) {
    const hasFile = !!payload.logoFile;
    if (hasFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'logoFile') return;
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (payload.logoFile) fd.append('logo', payload.logoFile);
      return api.post(`/api/emisores/${companyId}/establecimientos`, fd);
    }
    return api.post(`/api/emisores/${companyId}/establecimientos`, payload);
  },
  update(companyId: number | string, id: number | string, payload: Partial<Establecimiento> & { logoFile?: File | null }) {
    const hasFile = !!payload.logoFile;
    if (hasFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'logoFile') return;
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (payload.logoFile) fd.append('logo', payload.logoFile);
      return api.put(`/api/emisores/${companyId}/establecimientos/${id}`, fd);
    }
    return api.put(`/api/emisores/${companyId}/establecimientos/${id}`, payload);
  },
  delete(companyId: number | string, id: number | string) {
    return api.delete(`/api/emisores/${companyId}/establecimientos/${id}`);
  }
};
