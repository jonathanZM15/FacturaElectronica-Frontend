import React, { useEffect, useRef, useState } from 'react';
import { facturacion } from '../../services/api';
import { emisoresApi } from '../../services/emisoresApi';
import { establecimientosApi } from '../../services/establecimientosApi';
import { puntosEmisionApi } from '../../services/puntosEmisionApi';
import type { Emisor } from '../../types/emisor';

/* ─── Tipos ────────────────────────────────────────────────────── */
interface Establecimiento { id: number; codigo: string; direccion?: string; nombre?: string; }
interface PuntoEmision    { id: number; codigo: string; descripcion?: string; }

interface FacturaAutorizada {
  id: number;
  numero_documento: string;
  fecha_emision: string;
  cliente_razon_social: string;
  cliente_identificacion: string;
  total: number;
  subtotal_sin_impuestos: number;
  total_iva: number;
  estado_sri: string;
  ambiente: string;
  emisor_id: number;
}

interface DetalleNC {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
}

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (iso: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};

const fmtMoney = (v: number) => `$${v.toFixed(2)}`;

/* ─── Estilos reutilizables ───────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: '20px 24px',
  marginBottom: 20,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 13px',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 13,
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 5,
};

const btnPrimaryStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  padding: '11px 20px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '8px 16px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const estadoColors: Record<string, { bg: string; color: string }> = {
  AUTORIZADO:    { bg: '#dcfce7', color: '#166534' },
  NO_AUTORIZADO: { bg: '#fee2e2', color: '#991b1b' },
  RECIBIDA:      { bg: '#dbeafe', color: '#1e40af' },
};

/* ════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════════ */
const NotaCreditoPage: React.FC = () => {
  /* ── Estado general ── */
  const [step, setStep] = useState<'seleccion' | 'formulario' | 'resultado'>('seleccion');

  /* ── Emisor / Establecimiento / Punto ── */
  const [emisores, setEmisores]           = useState<Emisor[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [puntos, setPuntos]               = useState<PuntoEmision[]>([]);
  const [emisorSelId, setEmisorSelId]     = useState('');
  const [estSelId, setEstSelId]           = useState('');
  const [puntoSelId, setPuntoSelId]       = useState('');

  /* ── Firma ── */
  const [firmaArchivo, setFirmaArchivo]   = useState<File | null>(null);
  const [password, setPassword]           = useState('');
  const firmaInputRef = useRef<HTMLInputElement>(null);

  /* ── Facturas ── */
  const [facturas, setFacturas]           = useState<FacturaAutorizada[]>([]);
  const [facturasFiltro, setFacturasFiltro] = useState('');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaAutorizada | null>(null);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  /* ── Formulario NC ── */
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState<DetalleNC[]>([
    { descripcion: '', cantidad: 1, precio_unitario: 0, descuento: 0 },
  ]);

  /* ── Resultado ── */
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const pollerRef = useRef<number | null>(null);

  /* ── Cargar emisores ── */
  useEffect(() => {
    emisoresApi.list().then(r => setEmisores(r.data?.data ?? r.data ?? []));
  }, []);

  /* ── Cargar establecimientos ── */
  useEffect(() => {
    setEstablecimientos([]); setEstSelId(''); setPuntos([]); setPuntoSelId('');
    if (!emisorSelId) return;
    establecimientosApi.list(Number(emisorSelId)).then(r =>
      setEstablecimientos(r.data?.data ?? r.data ?? [])
    );
  }, [emisorSelId]);

  /* ── Cargar puntos ── */
  useEffect(() => {
    setPuntos([]); setPuntoSelId('');
    if (!estSelId) return;
    puntosEmisionApi.list(Number(emisorSelId), Number(estSelId)).then(r =>
      setPuntos(r.data?.data ?? r.data ?? [])
    );
  }, [estSelId]);

  /* ── Cargar facturas autorizadas cuando el emisor está seleccionado ── */
  useEffect(() => {
    if (!emisorSelId) { setFacturas([]); return; }
    setLoadingFacturas(true);
    facturacion.listarComprobantes({ tipo: 'FACTURA', estado: 'AUTORIZADO', emisor_id: emisorSelId })
      .then(r => setFacturas(r.data?.data ?? []))
      .catch(() => setFacturas([]))
      .finally(() => setLoadingFacturas(false));
  }, [emisorSelId]);

  /* ── Detalle: totales calculados ── */
  const subtotal   = detalles.reduce((s, d) => s + (d.cantidad * d.precio_unitario - d.descuento), 0);
  const iva        = subtotal * 0.15;
  const totalNC    = subtotal + iva;

  /* ── Agregar / quitar filas ── */
  const addDetalle = () =>
    setDetalles(prev => [...prev, { descripcion: '', cantidad: 1, precio_unitario: 0, descuento: 0 }]);
  const removeDetalle = (i: number) =>
    setDetalles(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const updateDetalle = (i: number, key: keyof DetalleNC, val: string | number) =>
    setDetalles(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: val } : d));

  /* ── Seleccionar factura → precarga detalles de prueba ── */
  const seleccionarFactura = (f: FacturaAutorizada) => {
    setFacturaSeleccionada(f);
    // Precargamos un ítem con el total de la factura como referencia
    setDetalles([{
      descripcion: `Nota de crédito sobre ${f.numero_documento}`,
      cantidad: 1,
      precio_unitario: f.subtotal_sin_impuestos,
      descuento: 0,
    }]);
    setMotivo('');
    setStep('formulario');
  };

  /* ── Emitir Nota de Crédito ── */
  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaSeleccionada) return;
    if (!motivo.trim()) { setError('Escribe el motivo de la nota de crédito.'); return; }
    if (!firmaArchivo || !password) { setError('Sube tu archivo .p12 y escribe la contraseña.'); return; }
    if (!emisorSelId || !estSelId || !puntoSelId) { setError('Selecciona emisor, establecimiento y punto de emisión.'); return; }

    setLoading(true); setError(null); setResultado(null);

    const payload = {
      emisor_id:              Number(emisorSelId),
      establecimiento_id:     Number(estSelId),
      punto_emision_id:       Number(puntoSelId),
      comprobante_modificado_id: facturaSeleccionada.id,
      motivo_modificacion:    motivo,
      cliente: {
        tipo_identificacion: 'CONSUMIDOR_FINAL',
        identificacion:      facturaSeleccionada.cliente_identificacion,
        razon_social:        facturaSeleccionada.cliente_razon_social,
        direccion:           'Ecuador',
      },
      detalles: detalles.map(d => ({
        descripcion:     d.descripcion,
        cantidad:        d.cantidad,
        precio_unitario: d.precio_unitario,
        descuento:       d.descuento,
        impuesto:        { tarifa: 15.0, tipo: 'IVA' },
      })),
    };

    const formData = new FormData();
    formData.append('firma', firmaArchivo);
    formData.append('password', password);
    formData.append('payload', JSON.stringify(payload));

    try {
      const res = await facturacion.emitirNotaCredito(formData);
      const comprobanteId = res.data?.comprobante_id;
      setResultado({ comprobante_id: comprobanteId, estado: 'PROCESANDO' });
      setStep('resultado');

      // Pooling para saber cuándo se autoriza
      pollerRef.current = window.setInterval(async () => {
        try {
          const estado = await facturacion.estado(comprobanteId);
          setResultado(estado.data);
          if (['AUTORIZADO', 'NO_AUTORIZADO'].includes(estado.data.estado_sri)) {
            window.clearInterval(pollerRef.current!);
            pollerRef.current = null;
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al emitir la nota de crédito.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => { if (pollerRef.current) window.clearInterval(pollerRef.current); }, []);

  /* ── Facturas filtradas ── */
  const facturasFiltradas = facturas.filter(f =>
    !facturasFiltro ||
    f.numero_documento.toLowerCase().includes(facturasFiltro.toLowerCase()) ||
    f.cliente_razon_social.toLowerCase().includes(facturasFiltro.toLowerCase())
  );

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #f0f4ff, #faf5ff 50%, #f0fdf4)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🧾</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1e1b4b' }}>Nota de Crédito</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            Selecciona una factura autorizada, ajusta los valores y emite la nota de crédito al SRI.
          </p>
        </div>

        {/* ── PASOS ────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {['Seleccionar Factura', 'Detalles NC', 'Resultado'].map((label, i) => {
            const stepKeys: Array<typeof step> = ['seleccion', 'formulario', 'resultado'];
            const active = stepKeys.indexOf(step) >= i;
            return (
              <React.Fragment key={label}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: active ? '#6366f1' : '#94a3b8',
                  fontWeight: active ? 700 : 400, fontSize: 13,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? '#6366f1' : '#e2e8f0', color: active ? 'white' : '#94a3b8', fontSize: 12, fontWeight: 700,
                  }}>{i + 1}</div>
                  {label}
                </div>
                {i < 2 && <div style={{ width: 32, height: 2, background: stepKeys.indexOf(step) > i ? '#6366f1' : '#e2e8f0', borderRadius: 1 }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* ═══════════════════════════════
            PASO 1: SELECCIÓN DE FACTURA
        ═══════════════════════════════ */}
        {step === 'seleccion' && (
          <>
            {/* Selección de emisor */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e1b4b', display: 'flex', gap: 8, alignItems: 'center' }}>
                🏢 Datos del Emisor
              </h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <label style={labelStyle}>Emisor</label>
                  <select value={emisorSelId} onChange={e => setEmisorSelId(e.target.value)} style={inputStyle}>
                    <option value="">— Selecciona un emisor —</option>
                    {emisores.map(em => (
                      <option key={em.id} value={String(em.id)}>
                        {em.ruc} · {em.razon_social}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={labelStyle}>Establecimiento</label>
                  <select value={estSelId} onChange={e => setEstSelId(e.target.value)} style={inputStyle} disabled={!emisorSelId}>
                    <option value="">—</option>
                    {establecimientos.map(est => (
                      <option key={est.id} value={String(est.id)}>{est.codigo}{est.nombre ? ` · ${est.nombre}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={labelStyle}>Punto de Emisión</label>
                  <select value={puntoSelId} onChange={e => setPuntoSelId(e.target.value)} style={inputStyle} disabled={!estSelId}>
                    <option value="">—</option>
                    {puntos.map(p => (
                      <option key={p.id} value={String(p.id)}>{p.codigo}{p.descripcion ? ` · ${p.descripcion}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Firma digital */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1e1b4b', display: 'flex', gap: 8, alignItems: 'center' }}>
                🔐 Firma Digital (.p12 / .pfx)
              </h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      border: `2px dashed ${firmaArchivo ? '#86efac' : '#cbd5e1'}`,
                      borderRadius: 10, cursor: 'pointer',
                      background: firmaArchivo ? 'rgba(220,252,231,0.4)' : '#f8fafc',
                    }}
                  >
                    <input
                      ref={firmaInputRef}
                      type="file" accept=".p12,.pfx"
                      style={{ display: 'none' }}
                      onChange={e => e.target.files?.[0] && setFirmaArchivo(e.target.files[0])}
                    />
                    <span style={{ fontSize: 22 }}>{firmaArchivo ? '✅' : '☁️'}</span>
                    <span style={{ fontSize: 13, color: firmaArchivo ? '#166534' : '#64748b' }}>
                      {firmaArchivo ? firmaArchivo.name : 'Clic para subir tu .p12'}
                    </span>
                  </label>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={labelStyle}>Contraseña</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Contraseña del certificado" style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Lista de facturas */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1e1b4b', display: 'flex', gap: 8, alignItems: 'center' }}>
                📋 Facturas Autorizadas
                {loadingFacturas && <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>Cargando...</span>}
              </h2>

              {emisorSelId && (
                <input
                  value={facturasFiltro}
                  onChange={e => setFacturasFiltro(e.target.value)}
                  placeholder="🔍  Buscar por número o cliente..."
                  style={{ ...inputStyle, marginBottom: 14 }}
                />
              )}

              {!emisorSelId && (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8', fontSize: 13 }}>
                  ☝️ Selecciona un emisor para ver sus facturas autorizadas.
                </div>
              )}

              {emisorSelId && !loadingFacturas && facturasFiltradas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8', fontSize: 13 }}>
                  No se encontraron facturas autorizadas para este emisor.
                </div>
              )}

              {facturasFiltradas.map(f => (
                <div
                  key={f.id}
                  onClick={() => seleccionarFactura(f)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                    border: '1px solid #e2e8f0', cursor: 'pointer',
                    background: '#f8fafc',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', fontFamily: 'monospace' }}>
                      {f.numero_documento}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {f.cliente_razon_social} · {fmt(f.fecha_emision)}
                      {f.ambiente === 'PRUEBAS' && (
                        <span style={{ marginLeft: 8, fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>
                          PRUEBAS
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontWeight: 800, fontSize: 15, color: '#059669',
                    }}>{fmtMoney(f.total)}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                      background: estadoColors[f.estado_sri]?.bg ?? '#f1f5f9',
                      color: estadoColors[f.estado_sri]?.color ?? '#475569',
                    }}>{f.estado_sri}</span>
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════════════════════
            PASO 2: FORMULARIO DE NC
        ═══════════════════════════════ */}
        {step === 'formulario' && facturaSeleccionada && (
          <form onSubmit={handleEmitir}>

            {/* Factura seleccionada */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 2 }}>FACTURA SELECCIONADA</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: '#1e293b' }}>
                    {facturaSeleccionada.numero_documento}
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
                    {facturaSeleccionada.cliente_razon_social} · {fmt(facturaSeleccionada.fecha_emision)} · Total original: <strong>{fmtMoney(facturaSeleccionada.total)}</strong>
                  </div>
                </div>
                <button type="button" onClick={() => setStep('seleccion')} style={btnSecondaryStyle}>
                  ‹ Cambiar
                </button>
              </div>
            </div>

            {/* Motivo */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>
                📝 Motivo de la Nota de Crédito
              </h2>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Devolución de mercadería, Error en precio, Descuento comercial..."
                rows={2}
                required
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* Detalles editables */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>
                  🧮 Detalles a Acreditar
                </h2>
                <button type="button" onClick={addDetalle} style={{ ...btnSecondaryStyle, fontSize: 12 }}>
                  + Agregar fila
                </button>
              </div>

              {/* Cabeceras */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 80px 100px 80px 32px', gap: 6, marginBottom: 6 }}>
                {['Descripción', 'Cant.', 'P. Unit.', 'Descuento', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>

              {detalles.map((d, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 80px 100px 80px 32px', gap: 6, marginBottom: 8 }}>
                  <input
                    value={d.descripcion} onChange={e => updateDetalle(i, 'descripcion', e.target.value)}
                    placeholder="Descripción del ítem" required style={inputStyle}
                  />
                  <input
                    type="number" min="0.001" step="0.001" value={d.cantidad}
                    onChange={e => updateDetalle(i, 'cantidad', parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                  <input
                    type="number" min="0" step="0.01" value={d.precio_unitario}
                    onChange={e => updateDetalle(i, 'precio_unitario', parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                  <input
                    type="number" min="0" step="0.01" value={d.descuento}
                    onChange={e => updateDetalle(i, 'descuento', parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                  <button
                    type="button" onClick={() => removeDetalle(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 18, padding: 0 }}
                  >×</button>
                </div>
              ))}

              {/* Totales */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 220 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13, color: '#64748b' }}>
                    <span>Subtotal sin IVA:</span><strong>{fmtMoney(subtotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13, color: '#64748b' }}>
                    <span>IVA 15%:</span><strong>{fmtMoney(iva)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 15, fontWeight: 800, color: '#6366f1', borderTop: '1px solid #e2e8f0', marginTop: 4 }}>
                    <span>TOTAL NC:</span><span>{fmtMoney(totalNC)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setStep('seleccion')} style={{ ...btnSecondaryStyle, flex: 1 }}>
                ‹ Volver
              </button>
              <button type="submit" disabled={loading} style={{ ...btnPrimaryStyle, flex: 2, opacity: loading ? 0.7 : 1 }}>
                {loading ? '⏳ Procesando...' : '🚀 Emitir Nota de Crédito al SRI'}
              </button>
            </div>
          </form>
        )}

        {/* ═══════════════════════════════
            PASO 3: RESULTADO
        ═══════════════════════════════ */}
        {step === 'resultado' && resultado && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 6 }}>
                {resultado.estado_sri === 'AUTORIZADO' ? '✅' : resultado.estado_sri === 'NO_AUTORIZADO' ? '❌' : '⏳'}
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>
                {resultado.estado_sri === 'AUTORIZADO'
                  ? '¡Nota de Crédito Autorizada!'
                  : resultado.estado_sri === 'NO_AUTORIZADO'
                  ? 'No autorizada por el SRI'
                  : 'Procesando en el SRI...'}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                ['ID Comprobante', resultado.comprobante_id],
                ['Estado SRI', resultado.estado_sri],
                ['N° Autorización', resultado.numero_autorizacion ?? '—'],
                ['Fecha Autorización', resultado.fecha_autorizacion ?? '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', fontFamily: label === 'Clave Acceso' ? 'monospace' : undefined }}>{val}</div>
                </div>
              ))}
            </div>

            {resultado.estado_sri === 'AUTORIZADO' && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={async () => {
                    const res = await facturacion.downloadPdf(resultado.comprobante_id);
                    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                    const a = document.createElement('a'); a.href = url; a.download = `NC_${resultado.comprobante_id}.pdf`; a.click();
                  }}
                  style={{ ...btnPrimaryStyle, flex: 1 }}
                >📄 Descargar PDF (RIDE)</button>
                <button
                  onClick={async () => {
                    const res = await facturacion.downloadXml(resultado.comprobante_id);
                    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/xml' }));
                    const a = document.createElement('a'); a.href = url; a.download = `NC_${resultado.comprobante_id}.xml`; a.click();
                  }}
                  style={{ ...btnSecondaryStyle, flex: 1 }}
                >📁 Descargar XML</button>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setStep('seleccion'); setResultado(null); setFacturaSeleccionada(null); }}
              style={{ ...btnSecondaryStyle, width: '100%', marginTop: 14 }}
            >
              + Emitir otra Nota de Crédito
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default NotaCreditoPage;
