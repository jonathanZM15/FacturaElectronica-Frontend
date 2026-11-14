import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useUser } from '../../contexts/userContext';
import '../../styles/v1.css';

export default function FirmaPage() {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const emisorId = user?.emisor_id;
  useEffect(() => { if (emisorId) api.get(`/api/emisores/${emisorId}/firma`).then(res => setStatus(res.data)).catch(() => setError('No se pudo consultar la configuración.')); }, [emisorId]);
  if (!emisorId) return <div className="v1-page"><p>No tienes una empresa asignada.</p></div>;
  return <div className="v1-page"><h1>Firma electrónica de la empresa</h1><p>El Emisor configura el certificado utilizado para procesar las facturas. La contraseña no se muestra a los cajeros.</p><section className="v1-card" style={{ maxWidth: 580 }}>
    {status && <p>{status.configured ? `Firma configurada: ${status.original_name}` : 'Todavía no hay una firma configurada.'}</p>}
    {error && <p role="alert" className="v1-notice v1-error">{error}</p>}{message && <p role="status" className="v1-notice">{message}</p>}
    <form onSubmit={async e => { e.preventDefault(); if (!file || busy) return; setBusy(true); setError(''); setMessage('');
      try { const form = new FormData(); form.append('firma', file); form.append('password', password); const res = await api.post(`/api/emisores/${emisorId}/firma`, form); setStatus({ configured: true, original_name: file.name }); setPassword(''); setMessage(res.data.message); }
      catch (e: any) { setError(e.response?.data?.message || 'No se pudo configurar la firma.'); }
      finally { setBusy(false); }
    }}><label>Certificado P12 o PFX<input required type="file" accept=".p12,.pfx" disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)} /></label><label>Contraseña del certificado<input required type="password" autoComplete="new-password" disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy || !file || !password}>{busy ? 'Comprobando…' : 'Guardar firma de mi empresa'}</button></form>
  </section></div>;
}
