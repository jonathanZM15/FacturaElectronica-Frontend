import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../contexts/userContext';
import api, { facturacion } from '../../services/api';
import { posApi, PosTurno } from '../../services/posApi';
import CobroModal from './components/CobroModal';
import StockSelection from './StockSelection';
import { cartTotals } from './cartTotals';
import '../../styles/v1.css';

export default function PosPage() {
  const { user } = useUser();
  const emisorId = String(user?.emisor_id || '');
  const pendingKey = `pos-pending:${emisorId}:${user?.id}`;
  const [turno, setTurno] = useState<PosTurno | null>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [pointId, setPointId] = useState('');
  const [opening, setOpening] = useState('0');
  const [warehouseId, setWarehouseId] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCobro, setShowCobro] = useState(false);
  const [pending, setPending] = useState<any>(() => { try { return JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch { return null; } });
  const sending = useRef(false);
  const point = (turno as any)?.punto_emision || turno?.puntoEmision;
  const availableWarehouses = warehouses.filter(w => Number(w.establecimiento_id) === Number(point?.establecimiento_id) && w.permite_venta && ['VENTA', 'ALMACEN'].includes(w.tipo));
  const totals = cartTotals(cart);
  const load = useCallback(async () => {
    if (!emisorId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [active, p, prod, b, signature] = await Promise.all([
        posApi.getActiveTurno(emisorId), api.get(`/api/emisores/${emisorId}/puntos-emision`),
        api.get(`/api/emisores/${emisorId}/productos`), api.get(`/api/emisores/${emisorId}/bodegas`), api.get(`/api/emisores/${emisorId}/firma`),
      ]);
      setTurno(active); setPoints(p.data.data || []); setProducts((prod.data.data || []).filter((v: any) => v.permite_venta && !v.uso_interno)); setWarehouses(b.data.data || []); setConfigured(signature.data.configured);
      const activePoint = (active as any)?.punto_emision || active?.puntoEmision;
      const options = (b.data.data || []).filter((w: any) => Number(w.establecimiento_id) === Number(activePoint?.establecimiento_id) && w.permite_venta && ['VENTA', 'ALMACEN'].includes(w.tipo));
      setWarehouseId(options.length === 1 ? String(options[0].id) : '');
    } catch (e: any) { setError(e.response?.data?.message || 'No se pudo cargar el POS.'); }
    finally { setLoading(false); }
  }, [emisorId]);
  useEffect(() => { load(); }, [load]);
  const changeItem = (id: number, changes: any) => setCart(items => items.map(item => item.id === id ? { ...item, ...changes } : item));
  const send = async (payload: any) => {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(''); setMessage('');
    setPending(payload); sessionStorage.setItem(pendingKey, JSON.stringify(payload));
    try {
      const form = new FormData(); form.append('payload', JSON.stringify(payload));
      const res = await facturacion.emitir(form);
      sessionStorage.removeItem(pendingKey); setPending(null); setCart([]); setShowCobro(false);
      setMessage(`Venta confirmada. Comprobante ${res.data.secuencial_formateado}. Estado SRI: ${res.data.estado_sri}. La autorización se consulta en Facturas.`);
      await load();
    } catch (e: any) {
      const status = e.response?.status;
      const details = Object.values(e.response?.data?.errors || {}).flat().join(' ');
      setError(details || e.response?.data?.message || 'No se pudo confirmar la respuesta. Reintenta el mismo envío para evitar duplicados.');
      if (status && status >= 400 && status < 500) { sessionStorage.removeItem(pendingKey); setPending(null); }
      else setShowCobro(false);
    } finally { sending.current = false; setBusy(false); }
  };
  if (!emisorId) return <div className="v1-page"><p>No tienes una empresa asignada.</p></div>;
  return <div className="v1-page">
    <h1>Punto de venta</h1><p>Opera tu propio turno y confirma ventas de tu empresa.</p>
    {error && <div className="v1-notice v1-error" role="alert">{error}</div>}
    {message && <div className="v1-notice" role="status">{message}</div>}
    {pending && !busy && <div className="v1-card"><h2>Envío pendiente de confirmación</h2><p>La respuesta anterior no se confirmó. Se conservará la misma operación al reintentar.</p><button onClick={() => send(pending)}>Reintentar el mismo envío</button> <Link to="/facturas">Consultar facturas</Link></div>}
    {loading ? <p>Cargando…</p> : !turno ? <section className="v1-card" style={{ maxWidth: 480 }}><h2>Apertura de caja</h2>
      <form onSubmit={async e => {
        e.preventDefault(); if (busy) return; setBusy(true); setError('');
        try { await posApi.aperturarTurno(emisorId, { punto_emision_id: Number(pointId), saldo_inicial: Number(opening) }); await load(); }
        catch (e: any) { setError(e.response?.data?.error || e.response?.data?.message || 'No se pudo abrir la caja.'); }
        finally { setBusy(false); }
      }}><label>Punto de emisión<select required value={pointId} onChange={e => setPointId(e.target.value)}><option value="">Seleccionar punto asignado</option>{points.filter(p => p.estado === 'ACTIVO').map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}</select></label><label>Saldo inicial<input type="number" min="0" step="0.01" required value={opening} onChange={e => setOpening(e.target.value)} /></label><button disabled={busy || !points.length}>Abrir mi caja</button></form>
    </section> : <>
      <div className="v1-actions"><strong>Turno {turno.id} — Punto {point?.codigo}</strong><Link to="/facturas">Historial de facturas</Link><button className="v1-secondary" disabled={busy || !!pending || !!cart.length} onClick={async () => {
        const amount = window.prompt('Saldo final contado en efectivo');
        if (amount === null) return;
        if (!amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0) { setError('Ingresa un saldo final válido.'); return; }
        setBusy(true);
        try { await posApi.cerrarTurno(emisorId, turno.id, { saldo_final: Number(amount) }); await load(); setMessage('Tu caja quedó cerrada.'); }
        catch (e: any) { setError(e.response?.data?.error || e.response?.data?.message || 'No se pudo cerrar la caja.'); }
        finally { setBusy(false); }
      }}>Cerrar mi caja</button></div>
      {!configured && <div className="v1-notice">El Emisor debe configurar la firma electrónica de la empresa antes de confirmar ventas.</div>}
      <fieldset disabled={busy || !!pending} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="v1-grid"><section className="v1-card"><h2>Productos</h2><label>Buscar producto<input value={search} onChange={e => setSearch(e.target.value)} /></label><div className="v1-products">
        {products.filter(p => `${p.codigo} ${p.nombre}`.toLowerCase().includes(search.toLowerCase())).map(p => {
          const price = Number(p[`precio_${p.precio_por_defecto || 1}`] ?? p.precio_1);
          return <button type="button" key={p.id} disabled={!p.impuesto || !Number.isFinite(price)} onClick={() => {
            if (cart.some(c => c.id === p.id)) {
              if (['LOTE', 'SERIE'].includes(p.tipo_control_inventario)) { setMessage('Elige los lotes o series en la venta actual.'); return; }
              changeItem(p.id, { qty: cart.find(c => c.id === p.id).qty + 1 }); return;
            }
            const tracked = ['LOTE', 'SERIE'].includes(p.tipo_control_inventario);
            setCart(items => [...items, { ...p, precio_unitario: price, qty: tracked ? 0 : 1, lotes: [], series: [] }]);
          }}>{p.nombre}<small>{p.codigo} — ${Number.isFinite(price) ? price.toFixed(2) : '—'} sin IVA</small>{!p.impuesto && <small>Impuesto sin configurar</small>}</button>;
        })}
      </div></section><section className="v1-card"><h2>Venta actual</h2>
        <label>Bodega de salida<select value={warehouseId} onChange={e => { setWarehouseId(e.target.value); setCart(items => items.map(item => ['LOTE', 'SERIE'].includes(item.tipo_control_inventario) ? { ...item, qty: 0, lotes: [], series: [] } : item)); }}><option value="">Seleccionar bodega</option>{availableWarehouses.map(w => <option key={w.id} value={w.id}>{w.codigo} — {w.nombre}</option>)}</select></label>
        {!cart.length && <p>Selecciona productos para la venta.</p>}
        {cart.map(item => <div className="v1-cart-item" key={item.id}><strong>{item.nombre}</strong><p>${item.precio_unitario.toFixed(2)} sin IVA</p>
          {['LOTE', 'SERIE'].includes(item.tipo_control_inventario) ? <StockSelection emisorId={emisorId} bodegaId={warehouseId} item={item} onChange={changes => changeItem(item.id, changes)} /> : <label>Cantidad de {item.nombre}<input type="number" min="0.000001" step="0.000001" value={item.qty} onChange={e => changeItem(item.id, { qty: Number(e.target.value) })} /></label>}
          <p>Cantidad: {item.qty} — Base ${(item.precio_unitario * item.qty).toFixed(2)}</p><button className="v1-secondary" onClick={() => setCart(items => items.filter(i => i.id !== item.id))}>Quitar {item.nombre}</button>
        </div>)}
        <p>Subtotal ${totals.subtotal.toFixed(2)} · IVA ${totals.iva.toFixed(2)}</p><p className="v1-total">Total ${totals.total.toFixed(2)}</p>
        <button disabled={!configured || !cart.length || cart.some(i => !Number.isFinite(i.qty) || i.qty <= 0) || (cart.some(i => i.tipo === 'FISICO' && i.tipo_control_inventario !== 'SIN_CONTROL') && !warehouseId)} onClick={() => setShowCobro(true)}>Cobrar</button>
      </section></div></fieldset>
    </>}
    <CobroModal isOpen={showCobro} busy={busy} onClose={() => setShowCobro(false)} total={totals.total} emisorId={emisorId} onConfirm={async data => {
      if (!turno || !point) { setError('No hay un turno y punto válidos.'); return; }
      await send({ operacion_id: window.crypto.randomUUID(), emisor_id: Number(emisorId), establecimiento_id: Number(point.establecimiento_id), punto_emision_id: turno.punto_emision_id, pos_turno_id: turno.id, bodega_id: warehouseId ? Number(warehouseId) : null, cliente: data.cliente,
        detalles: cart.map(item => ({ producto_id: item.id, cantidad: item.qty, precio_unitario: item.precio_unitario, descuento: 0, impuesto: { tipo_impuesto_id: item.impuesto.id }, lotes: item.lotes, series: item.series })),
        pagos: [{ forma_pago: data.formaPago, total: totals.total, ...(data.efectivo !== undefined ? { efectivo_recibido: data.efectivo } : {}) }], informacion_adicional: [{ nombre: 'Cajero', valor: `Turno POS ${turno.id}` }],
      });
    }} />
  </div>;
}
