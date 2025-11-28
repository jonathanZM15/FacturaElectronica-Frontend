import api from './api';
import type { Establecimiento } from '../types/establecimiento';

export const establecimientosApi = {
  list(companyId: number | string) {
    return api.get(`/api/emisores/${companyId}/establecimientos`);
  },
  checkCode(companyId: number | string, code: string) {
    return api.get(`/api/emisores/${companyId}/establecimientos/check-code/${encodeURIComponent(code)}`);
  },
  show(companyId: number | string, id: number | string) {
    return api.get(`/api/emisores/${companyId}/establecimientos/${id}`);
  },
  create(companyId: number | string, payload: Partial<Establecimiento> & { logoFile?: File | null; remove_logo?: boolean }) {
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
  update(companyId: number | string, id: number | string, payload: Partial<Establecimiento> & { logoFile?: File | null; remove_logo?: boolean }) {
    const hasFile = !!payload.logoFile;
    if (hasFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'logoFile') return;
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (payload.logoFile) {
        fd.append('logo', payload.logoFile);
        fd.append('_method', 'PUT'); // spoof PUT via POST so PHP captures file
      }
      console.log('[establecimientosApi.update] Enviando POST multipart con logo', {
        companyId,
        id,
        logoName: payload.logoFile?.name,
        removeLogo: (payload as any).remove_logo
      });
      return api.post(`/api/emisores/${companyId}/establecimientos/${id}`, fd);
    }
    console.log('[establecimientosApi.update] Enviando request sin archivo', {
      companyId,
      id,
      removeLogo: (payload as any).remove_logo
    });
    return api.put(`/api/emisores/${companyId}/establecimientos/${id}`, payload);
  },
  delete(companyId: number | string, id: number | string, password: string) {
    return api.delete(`/api/emisores/${companyId}/establecimientos/${id}`, { data: { password } });
  }
};
