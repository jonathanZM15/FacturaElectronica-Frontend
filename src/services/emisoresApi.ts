import { Emisor } from '../types/emisor';
import api from './api';

export const emisoresApi = {
  list(params: { estado?: string; q?: string; fecha_inicio?: string; fecha_fin?: string }) {
    return api.get('/api/emisores', { params });
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
};