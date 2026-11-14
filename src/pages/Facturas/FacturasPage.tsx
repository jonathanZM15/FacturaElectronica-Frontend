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
      {rows.map(row => <tr key={row.id}><td>{row.numero_documento}</td><td>{row.fecha_emision}</td><td>{row.cliente_razon_social}</td><td>${Number(row.total).toFixed(2)}</td><td>{row.estado_sri}</td><td><div className="v1-actions">
        <button onClick={async () => { try { setDetail((await facturacion.estado(row.id)).data); } catch { setError('No se pudo consultar el estado.'); } }}>Ver estado</button>
        {row.estado_sri === 'AUTORIZADO' && <><button onClick={() => download(row, 'pdf')}>PDF</button><button onClick={() => download(row, 'xml')}>XML</button></>}
        {can(user, 'comprobantes.retry') && ['BORRADOR', 'ERROR_ENVIO', 'ERROR_FIRMA', 'ERROR_AUTORIZACION', 'ERROR_SISTEMA'].includes(row.estado_sri) && <button disabled={busy} onClick={async () => { setBusy(true); try { const res = await facturacion.reintentar(row.id); setMessage(res.data.message); await load(); } catch (e: any) { setError(e.response?.data?.message || 'No se pudo programar el reintento.'); } finally { setBusy(false); } }}>Reintentar procesamiento</button>}
      </div></td></tr>)}
      {!rows.length && <tr><td colSpan={6}>{busy ? 'Consultando…' : 'Sin resultados para los filtros seleccionados.'}</td></tr>}
    </tbody></table></div>
    <div className="v1-actions"><button disabled={busy || page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} de {pages}</span><button disabled={busy || page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
    {detail && <section className="v1-card"><div className="v1-actions"><h2>Estado del comprobante {detail.comprobante_id}</h2><button onClick={() => setDetail(null)}>Cerrar detalle</button></div><p>Estado SRI: <strong>{detail.estado_sri}</strong></p><p style={{ overflowWrap: 'anywhere' }}>Clave de acceso: {detail.clave_acceso || 'Pendiente de generación'}</p><p>Autorización: {detail.numero_autorizacion || 'No confirmada'}</p>{detail.ultimo_error_sri && <p className="v1-notice v1-error">{detail.ultimo_error_sri}</p>}<ul>{(detail.logs || []).map((log: any) => <li key={log.id}>{log.created_at} · {log.estado}: {log.mensaje}</li>)}</ul></section>}
  </div>;
}
