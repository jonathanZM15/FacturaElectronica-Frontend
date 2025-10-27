import React, { useState } from 'react';
import api from '../services/api';

type Props = {
  companyId?: number;
  onUploaded?: (url: string) => void;
};

export default function LogoUploader({ companyId = 1, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    setLoading(true);
    try {
      const res = await api.post(`/api/companies/${companyId}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (onUploaded) onUploaded(res.data.url);
      alert('Logo subido correctamente');
    } catch (err) {
      console.error(err);
      alert('Error subiendo el logo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="file" accept="image/*" onChange={onChange} />
      {preview && <img src={preview} alt="preview" style={{ maxWidth: 200 }} />}
      <div>
        <button onClick={upload} disabled={!file || loading} className="primary-btn">
          {loading ? 'Subiendo...' : 'Subir logo'}
        </button>
      </div>
    </div>
  );
}
