import React, { useCallback, useEffect, useState } from 'react';
import { facturacion } from '../../services/api';
import { useUser } from '../../contexts/userContext';
import { can } from '../../utils/permissions';
import '../../styles/v1.css';

export default function FacturasPage() {
  const { user } = useUser();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [correctingRow, setCorrectingRow] = useState<any>(null);
  const [clientForm, setClientForm] = useState({
    tipo_identificacion: '05',
    identificacion: '',
    razon_social: '',
    direccion: '',
    email: '',
    telefono: '',
    motivo_correccion: '',
  });

  const openCorrection = (row: any) => {
    setCorrectingRow(row);
    setClientForm({
      tipo_identificacion: ({ CEDULA: '05', RUC: '04', PASAPORTE: '06', CONSUMIDOR_FINAL: '07', IDENTIFICACION_EXTERIOR: '08' } as Record<string, string>)[row.cliente_tipo_identificacion] || row.cliente_tipo_identificacion || '05',
      identificacion: row.cliente_identificacion || '',
      razon_social: row.cliente_razon_social || '',
      direccion: row.cliente_direccion || '',
      email: row.cliente_email || '',
      telefono: row.cliente_telefono || '',
      motivo_correccion: '',
    });
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRow) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const res = await facturacion.corregirFiscal(correctingRow.id, {
        cliente: {
          tipo_identificacion: clientForm.tipo_identificacion,
          identificacion: clientForm.identificacion,
          razon_social: clientForm.razon_social,
          direccion: clientForm.direccion,
          email: clientForm.email,
          telefono: clientForm.telefono || null,
        },
        motivo_correccion: clientForm.motivo_correccion,
      });
      setMessage(res.data.message || 'Comprobante corregido fiscalmente y reprogramado.');
      setCorrectingRow(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo aplicar la corrección fiscal.');
    } finally {
      setBusy(false);
    }
  };
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const res = await facturacion.listarComprobantes({ tipo: 'FACTURA', search: query, estado: state, fecha_inicio: from, fecha_fin: to, page, ...(user?.emisor_id ? { emisor_id: user.emisor_id } : {}) });
      setRows(res.data.data || []); setPages(res.data.pagination?.last_page || 1);
    } catch (e: any) { setError(e.response?.data?.message || 'No se pudo consultar el historial.'); }
    finally { setBusy(false); }
  }, [query, state, from, to, page, user?.emisor_id]);
  useEffect(() => { load(); }, [load]);
  const download = async (row: any, type: 'pdf' | 'xml') => {
    try {
      const res = type === 'pdf' ? await facturacion.downloadPdf(row.id) : await facturacion.downloadXml(row.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: type === 'pdf' ? 'application/pdf' : 'application/xml' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${row.numero_documento}.${type}`;
      anchor.click(); URL.revokeObjectURL(url);
    } catch { setError(`No se pudo descargar el ${type.toUpperCase()} del comprobante.`); }
  };
  return <div className="v1-page"><h1>Facturas</h1><p>Consulta los comprobantes dentro de tu alcance y su estado real de procesamiento.</p>
    {error && <div className="v1-notice v1-error" role="alert">{error}</div>}{message && <div className="v1-notice" role="status">{message}</div>}
    <form className="v1-actions" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search); }}><label>Buscar número, cliente o identificación<input value={search} onChange={e => setSearch(e.target.value)} /></label><button disabled={busy}>Buscar</button>
      <label>Estado<select value={state} onChange={e => { setPage(1); setState(e.target.value); }}><option value="">Todos</option>{['BORRADOR', 'PROCESANDO', 'FIRMADO', 'ENVIADO', 'RECIBIDA', 'AUTORIZADO', 'DEVUELTA', 'NO_AUTORIZADO', 'ERROR_FIRMA', 'ERROR_ENVIO', 'ERROR_AUTORIZACION', 'ERROR_SISTEMA'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Desde<input type="date" value={from} onChange={e => { setPage(1); setFrom(e.target.value); }} /></label><label>Hasta<input type="date" value={to} onChange={e => { setPage(1); setTo(e.target.value); }} /></label><button type="button" disabled={busy} onClick={load}>Actualizar</button>
    </form>
    <div className="v1-table-scroll"><table><thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado SRI</th><th>Acciones</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}><td>{row.numero_documento}</td><td>{row.fecha_emision}</td><td>{row.cliente_razon_social}</td><td>${Number(row.total).toFixed(2)}</td><td>{row.estado_sri}{row.email_estado && row.email_estado !== 'PENDIENTE' && <small style={{ display: 'block', color: row.email_estado === 'ENVIADO' ? '#059669' : '#dc2626' }}>Correo: {row.email_estado}</small>}</td><td><div className="v1-actions">
        <button onClick={async () => { try { setDetail((await facturacion.estado(row.id)).data); } catch { setError('No se pudo consultar el estado.'); } }}>Ver estado</button>
        {row.estado_sri === 'AUTORIZADO' && <><button onClick={() => download(row, 'pdf')}>PDF</button><button onClick={() => download(row, 'xml')}>XML</button>{can(user, 'comprobantes.email') && <button disabled={busy} onClick={async () => { setBusy(true); setError(''); setMessage(''); try { const res = await facturacion.reenviarEmail(row.id); setMessage(res.data.message); await load(); } catch (e: any) { setError(e.response?.data?.message || 'No se pudo programar el envío de correo.'); } finally { setBusy(false); } }} style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}>Reenviar correo</button>}</>}
        {can(user, 'comprobantes.retry') && ['BORRADOR', 'PROCESANDO', 'FIRMADO', 'ENVIADO', 'RECIBIDA', 'ERROR_ENVIO', 'ERROR_FIRMA', 'ERROR_AUTORIZACION', 'ERROR_SISTEMA'].includes(row.estado_sri) && <button disabled={busy} onClick={async () => { setBusy(true); setError(''); setMessage(''); try { const res = await facturacion.reintentar(row.id); setMessage(res.data.message); await load(); } catch (e: any) { setError(e.response?.data?.message || 'No se pudo programar el reintento.'); } finally { setBusy(false); } }}>{['RECIBIDA', 'ENVIADO'].includes(row.estado_sri) ? 'Consultar SRI' : 'Reintentar procesamiento'}</button>}
        {can(user, 'comprobantes.correct') && ['DEVUELTA', 'NO_AUTORIZADO'].includes(row.estado_sri) && <button disabled={busy} onClick={() => openCorrection(row)} style={{ backgroundColor: '#c2410c', borderColor: '#c2410c' }}>Corregir datos fiscales</button>}
      </div></td></tr>)}
      {!rows.length && <tr><td colSpan={6}>{busy ? 'Consultando…' : 'Sin resultados para los filtros seleccionados.'}</td></tr>}
    </tbody></table></div>
    <div className="v1-actions"><button disabled={busy || page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} de {pages}</span><button disabled={busy || page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
    {detail && <section className="v1-card"><div className="v1-actions"><h2>Estado del comprobante {detail.comprobante_id}</h2><button onClick={() => setDetail(null)}>Cerrar detalle</button></div><p>Estado SRI: <strong>{detail.estado_sri}</strong></p><p style={{ overflowWrap: 'anywhere' }}>Clave de acceso: {detail.clave_acceso || 'Pendiente de generación'}</p><p>Autorización: {detail.numero_autorizacion || 'No confirmada'}</p><p>Entrega por correo: <strong>{detail.email_estado || 'PENDIENTE'}</strong>{detail.email_enviado_en ? ` (Enviado: ${detail.email_enviado_en})` : ''}{detail.email_intentos ? ` · ${detail.email_intentos} intento(s)` : ''}</p>{detail.email_error && <p className="v1-notice v1-error">Error entrega correo: {detail.email_error}</p>}{detail.ultimo_error_sri && <p className="v1-notice v1-error">{detail.ultimo_error_sri}</p>}<ul>{(detail.logs || []).map((log: any) => <li key={log.id}>{log.created_at} · {log.estado}: {log.mensaje}</li>)}</ul></section>}
    {correctingRow && (
      <div className="v1-dialog-backdrop">
        <div className="v1-dialog">
          <h2>Corregir datos fiscales · Factura {correctingRow.numero_documento}</h2>
          <p className="v1-notice">
            Esta corrección modifica los datos fiscales de esta factura devuelta o no autorizada, conservando el cobro y el movimiento de inventario originales.
          </p>
          {correctingRow.ultimo_error_sri && (
            <p className="v1-notice v1-error">
              <strong>Motivo SRI previo:</strong> {correctingRow.ultimo_error_sri}
            </p>
          )}
          <form onSubmit={handleApplyCorrection}>
            <label>
              Tipo de identificación
              <select
                value={clientForm.tipo_identificacion}
                onChange={e => setClientForm({ ...clientForm, tipo_identificacion: e.target.value })}
              >
                <option value="05">Cédula</option>
                <option value="04">RUC</option>
                <option value="06">Pasaporte</option>
                <option value="07">Consumidor Final</option>
                <option value="08">Identificación del Exterior</option>
              </select>
            </label>
            <label>
              Número de identificación
              <input
                value={clientForm.identificacion}
                onChange={e => setClientForm({ ...clientForm, identificacion: e.target.value })}
                required
              />
            </label>
            <label>
              Razón Social / Nombres completos
              <input
                value={clientForm.razon_social}
                onChange={e => setClientForm({ ...clientForm, razon_social: e.target.value })}
                required
              />
            </label>
            <label>
              Dirección
              <input
                value={clientForm.direccion}
                maxLength={300}
                onChange={e => setClientForm({ ...clientForm, direccion: e.target.value })}
                required
              />
            </label>
            <label>
              Correo electrónico
              <input
                type="email"
                value={clientForm.email}
                onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                required
              />
            </label>
            <label>
              Teléfono (opcional)
              <input
                value={clientForm.telefono}
                onChange={e => setClientForm({ ...clientForm, telefono: e.target.value })}
              />
            </label>
            <label>
              Motivo de la corrección (Auditoría)
              <input
                value={clientForm.motivo_correccion}
                onChange={e => setClientForm({ ...clientForm, motivo_correccion: e.target.value })}
                placeholder="Ej: Corrección de razón social por error tipográfico"
                required
                minLength={5}
              />
            </label>
            <div className="v1-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
              <button type="button" className="v1-secondary" onClick={() => setCorrectingRow(null)} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" disabled={busy}>
                {busy ? 'Aplicando...' : 'Aplicar corrección y reprocesar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>;
}
