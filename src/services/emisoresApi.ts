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
    console.log('emisoresApi.update called', { id, hasFile, logoFileName: payload.logoFile?.name });
    if (hasFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'logoFile') return;
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (payload.logoFile) {
        fd.append('logo', payload.logoFile);
        // Laravel/PHP solo procesa archivos en POST. Usamos _method para spoof PUT.
        fd.append('_method', 'PUT');
        console.log('FormData constructed with logo', {
          logoName: payload.logoFile.name,
          logoSize: payload.logoFile.size,
          logoType: payload.logoFile.type
        });
        // DEBUG: Verify the file is actually in FormData
        Array.from(fd.entries()).forEach(([key, value]) => {
          if (key === 'logo') {
            console.log(`FormData key="${key}" contains File:`, {
              isFile: value instanceof File,
              name: (value as File).name,
              size: (value as File).size,
              type: (value as File).type
            });
          }
        });
        console.log('About to send POST (spoof PUT) request with FormData containing logo');
      }
      // IMPORTANT: Enviamos POST para que PHP reconozca el archivo en $_FILES
      return api.post(`/api/emisores/${id}`, fd);
    }
    console.log('No logo file, sending without multipart');
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