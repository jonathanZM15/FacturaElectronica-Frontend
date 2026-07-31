import React, { useEffect, useRef, useState } from 'react';
import { facturacion } from '../../services/api';
import { emisoresApi } from '../../services/emisoresApi';
import { establecimientosApi } from '../../services/establecimientosApi';
import { puntosEmisionApi } from '../../services/puntosEmisionApi';
import type { Emisor } from '../../types/emisor';

/* ─── tipos locales ──────────────────────────────────────────── */
interface Establecimiento { id: number; codigo: string; direccion?: string; nombre?: string; }
interface PuntoEmision   { id: number; codigo: string; descripcion?: string; }

interface LogEntry {
  id: number; etapa: string; estado: string; mensaje: string;
  detalles?: { identificador: string; mensaje: string; informacion_adicional: string; tipo: string }[];
  created_at: string;
}
interface ComprobanteData {
  comprobante_id: number; clave_acceso: string; estado_sri: string;
  estado_recepcion: string; estado_autorizacion: string | null;
  numero_autorizacion: string | null; fecha_autorizacion: string | null;
  ultimo_error_sri: string | null; intentos_envio: number;
  intentos_autorizacion: number; firmado_en: string | null;
  enviado_en: string | null; recibido_en: string | null;
  autorizado_en: string | null; logs?: LogEntry[];
}
interface Resultado { tipo: 'exito' | 'error'; mensaje: string; data?: any; }

/* ─── helpers ────────────────────────────────────────────────── */
const fmt = (iso: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
};

const estadoConfig: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  AUTORIZADO:    { bg: '#dcfce7', text: '#166534', border: '#86efac', icon: '✅' },
  NO_AUTORIZADO: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', icon: '❌' },
  RECIBIDA:      { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', icon: '📬' },
  ENVIADO:       { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd', icon: '📤' },
  FIRMADO:       { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe', icon: '🔏' },
  PROCESANDO:    { bg: '#fef9c3', text: '#713f12', border: '#fde047', icon: '⏳' },
  DEVUELTA:      { bg: '#ffedd5', text: '#9a3412', border: '#fdba74', icon: '↩️' },
  ERROR_FIRMA:   { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', icon: '⚠️' },
  BORRADOR:      { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', icon: '📝' },
};

const EstadoBadge: React.FC<{ estado: string | null }> = ({ estado }) => {
  if (!estado) return <span style={{ color: '#94a3b8' }}>—</span>;
  const c = estadoConfig[estado] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', icon: '•' };
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {c.icon} {estado.replace(/_/g, ' ')}
    </span>
  );
};

const etapaIcon = (e: string) =>
  ({ orquestacion: '🎯', firma: '🔏', recepcion: '📬', autorizacion: '✅' })[e.toLowerCase()] ?? '📋';

/* ─── componentes base ───────────────────────────────────────── */
const GlassCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.85)',
    borderRadius: 20, boxShadow: '0 8px 32px rgba(99,102,241,0.10), 0 1.5px 6px rgba(0,0,0,0.06)',
    padding: 28, ...style,
  }}>
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
    {children}
  </div>
);

const StyledInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ style, ...props }) => (
  <input {...props} style={{
    width: '100%', padding: '11px 16px', borderRadius: 12, fontSize: 14, color: '#1e293b',
    background: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(203,213,225,0.8)',
    outline: 'none', boxSizing: 'border-box', ...style,
  }} />
);

const StyledSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { loading?: boolean }> = ({ style, loading, children, ...props }) => (
  <select {...props} style={{
    width: '100%', padding: '11px 16px', borderRadius: 12, fontSize: 14, color: props.disabled ? '#94a3b8' : '#1e293b',
    background: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(203,213,225,0.8)',
    outline: 'none', boxSizing: 'border-box', cursor: props.disabled ? 'not-allowed' : 'pointer', ...style,
  }}>
    {loading ? <option>Cargando...</option> : children}
  </select>
);

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...rest }) => (
  <button {...rest} style={{
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none',
    borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    opacity: rest.disabled ? 0.5 : 1, transition: 'opacity 0.2s', ...style,
  }}>
    {children}
  </button>
);

const SecondaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...rest }) => (
  <button {...rest} style={{
    background: 'rgba(255,255,255,0.7)', color: '#4f46e5', border: '1.5px solid rgba(99,102,241,0.4)',
    borderRadius: 12, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    opacity: rest.disabled ? 0.5 : 1, ...style,
  }}>
    {children}
  </button>
);

const FieldGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10, marginBottom: 16 }}>
    {children}
  </div>
);

const FieldCell: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{
    background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(203,213,225,0.6)',
    borderRadius: 12, padding: '10px 14px',
  }}>
    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{value}</div>
  </div>
);

/* ─── ResultCard ─────────────────────────────────────────────── */
const ResultCard: React.FC<{ resultado: Resultado; label: string }> = ({ resultado, label }) => {
  const d: ComprobanteData | null = resultado.data;
  const isComp = d && typeof d === 'object' && 'comprobante_id' in d;
  return (
    <GlassCard style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: resultado.tipo === 'error' ? '#dc2626' : '#1e293b' }}>
          {resultado.mensaje}
        </h3>
        {isComp && <EstadoBadge estado={d.estado_sri} />}
      </div>
      {isComp ? (
        <>
          {d.ultimo_error_sri && (
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⚠️ Motivo del rechazo</div>
              {d.ultimo_error_sri.split('|').map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>{e.trim()}</div>
              ))}
            </div>
          )}
          <FieldGrid>
            <FieldCell label="ID Comprobante"       value={`#${d.comprobante_id}`} />
            <FieldCell label="Recepción"            value={<EstadoBadge estado={d.estado_recepcion} />} />
            <FieldCell label="Autorización"         value={<EstadoBadge estado={d.estado_autorizacion} />} />
            <FieldCell label="N° Autorización"      value={d.numero_autorizacion ?? '—'} />
            <FieldCell label="Intentos envío"       value={String(d.intentos_envio)} />
            <FieldCell label="Intentos autorizac."  value={String(d.intentos_autorizacion)} />
            <FieldCell label="Firmado"              value={fmt(d.firmado_en)} />
            <FieldCell label="Enviado"              value={fmt(d.enviado_en)} />
            <FieldCell label="Recibido SRI"         value={fmt(d.recibido_en)} />
            <FieldCell label="Autorizado"           value={fmt(d.autorizado_en)} />
          </FieldGrid>
          <div style={{ background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(203,213,225,0.6)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Clave de Acceso</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all' }}>{d.clave_acceso}</div>
          </div>
          {d.logs && d.logs.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Historial de procesamiento</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...d.logs].reverse().map((log) => (
                  <div key={log.id} style={{ background: 'rgba(241,245,249,0.6)', border: '1px solid rgba(203,213,225,0.5)', borderRadius: 12, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                        {etapaIcon(log.etapa)} {log.etapa.charAt(0).toUpperCase() + log.etapa.slice(1)}
                      </span>
                      <EstadoBadge estado={log.estado} />
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{log.mensaje}</div>
                    {log.detalles?.map((det, i) => (
                      <div key={i} style={{ marginTop: 6, background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>[{det.identificador}] {det.mensaje}</span>
                        {det.informacion_adicional && <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 2 }}>{det.informacion_adicional}</div>}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>{fmt(log.created_at)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <pre style={{ background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(203,213,225,0.6)', borderRadius: 12, padding: 14, fontSize: 11, color: '#475569', overflow: 'auto', maxHeight: 240, margin: 0 }}>
          {JSON.stringify(resultado.data, null, 2)}
        </pre>
      )}
    </GlassCard>
  );
};

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
const PruebaEmisionComprobante: React.FC = () => {
  // Firma y emisión
  const [firmaArchivo, setFirmaArchivo] = useState<File | null>(null);
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [resultado, setResultado]       = useState<Resultado | null>(null);
  const [comprobanteId, setComprobanteId] = useState<number | null>(null);
  const pollerRef = useRef<number | null>(null);

  // Consulta rápida
  const [consultaId, setConsultaId]           = useState('');
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [consultaResultado, setConsultaResultado] = useState<Resultado | null>(null);

  // Selección de emisor / establecimiento / punto
  const [emisores, setEmisores]           = useState<Emisor[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [puntos, setPuntos]               = useState<PuntoEmision[]>([]);

  const [emisorSelId, setEmisorSelId]           = useState<string>('');
  const [establecimientoSelId, setEstablecimientoSelId] = useState<string>('');
  const [puntoSelId, setPuntoSelId]             = useState<string>('');

  const [loadingEmisores, setLoadingEmisores]             = useState(true);
  const [loadingEstablecimientos, setLoadingEstablecimientos] = useState(false);
  const [loadingPuntos, setLoadingPuntos]                 = useState(false);

  /* Carga inicial de emisores */
  useEffect(() => {
    setLoadingEmisores(true);
    emisoresApi.list({ per_page: 100, estado: 'ACTIVO' })
      .then((res: any) => {
        const lista: Emisor[] = res.data?.data ?? res.data ?? [];
        setEmisores(lista);
        if (lista.length === 1) {
          setEmisorSelId(String(lista[0].id));
        }
      })
      .catch(() => setEmisores([]))
      .finally(() => setLoadingEmisores(false));
  }, []);

  /* Cuando cambia el emisor → carga establecimientos */
  useEffect(() => {
    setEstablecimientos([]); setEstablecimientoSelId('');
    setPuntos([]); setPuntoSelId('');
    if (!emisorSelId) return;
    setLoadingEstablecimientos(true);
    establecimientosApi.list(emisorSelId)
      .then((res: any) => {
        const lista: Establecimiento[] = res.data?.data ?? res.data ?? [];
        setEstablecimientos(lista);
        if (lista.length === 1) setEstablecimientoSelId(String(lista[0].id));
      })
      .catch(() => setEstablecimientos([]))
      .finally(() => setLoadingEstablecimientos(false));
  }, [emisorSelId]);

  /* Cuando cambia el establecimiento → carga puntos */
  useEffect(() => {
    setPuntos([]); setPuntoSelId('');
    if (!emisorSelId || !establecimientoSelId) return;
    setLoadingPuntos(true);
    puntosEmisionApi.list(emisorSelId, establecimientoSelId)
      .then((res: any) => {
        const lista: PuntoEmision[] = res.data?.data ?? res.data ?? [];
        setPuntos(lista);
        if (lista.length === 1) setPuntoSelId(String(lista[0].id));
      })
      .catch(() => setPuntos([]))
      .finally(() => setLoadingPuntos(false));
  }, [emisorSelId, establecimientoSelId]);

  /* Emisor seleccionado (objeto completo) */
  const emisorSel = emisores.find(e => String(e.id) === emisorSelId) ?? null;

  /* Payload para la factura de prueba */
  const buildPayload = () => ({
    emisor_id:          Number(emisorSelId),
    establecimiento_id: Number(establecimientoSelId),
    punto_emision_id:   Number(puntoSelId),
    cliente: {
      tipo_identificacion: 'CONSUMIDOR_FINAL',
      identificacion:      '9999999999999',
      razon_social:        'CONSUMIDOR FINAL',
      direccion:           'Ecuador',
      email:               'cliente@email.com',
    },
    detalles: [{
      descripcion:     'Licencia de Software Anual',
      cantidad:        1.0,
      precio_unitario: 100.0,
      descuento:       0.0,
      impuesto:        { tarifa: 15.0, tipo: 'IVA' },
    }],
  });

  /* Submit: emitir */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firmaArchivo || !password)        { alert('Sube el archivo .p12 y escribe la contraseña.'); return; }
    if (!emisorSelId)                      { alert('Selecciona un emisor.'); return; }
    if (!establecimientoSelId)             { alert('Selecciona un establecimiento.'); return; }
    if (!puntoSelId)                       { alert('Selecciona un punto de emisión.'); return; }

    setLoading(true); setResultado(null);
    const fd = new FormData();
    fd.append('firma',    firmaArchivo, firmaArchivo.name);
    fd.append('password', password.trim());
    fd.append('payload',  JSON.stringify(buildPayload()));
    try {
      const res = await facturacion.emitir(fd);
      setResultado({ tipo: 'exito', mensaje: `Estado SRI: ${res.data?.estado_sri ?? 'EN COLA'}`, data: res.data });
      setComprobanteId(res.data?.comprobante_id ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Error de conexión.';
      setResultado({ tipo: 'error', mensaje: msg, data: err?.response?.data || null });
    } finally { setLoading(false); }
  };

  /* Consultar estado */
  const handleConsultar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = Number(consultaId);
    if (!id || id <= 0) { setConsultaResultado({ tipo: 'error', mensaje: 'Ingresa un ID válido.' }); return; }
    setConsultaLoading(true); setConsultaResultado(null);
    try {
      const res = await facturacion.estado(id);
      setConsultaResultado({ tipo: 'exito', mensaje: `Estado SRI: ${res.data?.estado_sri ?? 'DESCONOCIDO'}`, data: res.data });
    } catch (err: any) {
      setConsultaResultado({ tipo: 'error', mensaje: err?.response?.data?.message || 'No se pudo consultar.', data: err?.response?.data });
    } finally { setConsultaLoading(false); }
  };

  /* Polling automático de estado */
  useEffect(() => {
    if (!comprobanteId) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await facturacion.estado(comprobanteId);
        if (stopped) return;
        setResultado({ tipo: 'exito', mensaje: `Estado SRI: ${res.data?.estado_sri ?? 'DESCONOCIDO'}`, data: res.data });
        if (['AUTORIZADO','NO_AUTORIZADO','DEVUELTA','ERROR_FIRMA','ERROR_SISTEMA'].includes(res.data?.estado_sri)) {
          if (pollerRef.current) { window.clearInterval(pollerRef.current); pollerRef.current = null; }
        }
      } catch { if (!stopped) setResultado(c => c ?? { tipo: 'error', mensaje: 'No se pudo consultar.' }); }
    };
    poll();
    pollerRef.current = window.setInterval(poll, 4000);
    return () => { stopped = true; if (pollerRef.current) { window.clearInterval(pollerRef.current); pollerRef.current = null; } };
  }, [comprobanteId]);

  const canSubmit = !!firmaArchivo && !!password && !!emisorSelId && !!establecimientoSelId && !!puntoSelId && !loading;

  /* ─── Render ───────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh', padding: '32px 24px', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(145deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)',
    }}>
      {/* Blobs decorativos */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -80, left: -80, width: 380, height: 380, borderRadius: '50%', background: 'rgba(167,139,250,0.22)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: '30%', right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(96,165,250,0.18)', filter: 'blur(55px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(251,191,36,0.12)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: '10%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(134,239,172,0.18)', filter: 'blur(50px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🧾</div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 800,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Prueba de Emisión SRI
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            Selecciona el emisor, sube tu firma digital y envía una factura al SRI en ambiente de pruebas.
          </p>
        </div>

        {/* ── CARD 1: Selección de Emisor ─────────────────────── */}
        <GlassCard style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏢</span> Datos del Emisor
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            {/* Selector de emisor */}
            <div>
              <Label>Emisor (RUC y razón social)</Label>
              <StyledSelect
                value={emisorSelId}
                onChange={e => setEmisorSelId(e.target.value)}
                disabled={loadingEmisores}
                loading={loadingEmisores}
              >
                <option value="">{loadingEmisores ? 'Cargando emisores...' : '— Selecciona un emisor —'}</option>
                {emisores.map(em => (
                  <option key={em.id} value={String(em.id)}>
                    {em.ruc} · {em.razon_social}{em.nombre_comercial && em.nombre_comercial !== em.razon_social ? ` (${em.nombre_comercial})` : ''}
                  </option>
                ))}
              </StyledSelect>
            </div>

            {/* Info del emisor seleccionado */}
            {emisorSel && (
              <div style={{
                background: 'rgba(238,242,255,0.6)', border: '1px solid rgba(199,210,254,0.8)',
                borderRadius: 12, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>RUC</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{emisorSel.ruc}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Razón Social</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{emisorSel.razon_social}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Ambiente</div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 99,
                    background: emisorSel.ambiente === 'PRUEBAS' ? '#dbeafe' : '#dcfce7',
                    color: emisorSel.ambiente === 'PRUEBAS' ? '#1e40af' : '#166534',
                    border: `1px solid ${emisorSel.ambiente === 'PRUEBAS' ? '#93c5fd' : '#86efac'}`,
                  }}>
                    {emisorSel.ambiente === 'PRUEBAS' ? '🧪 PRUEBAS' : '🟢 PRODUCCIÓN'}
                  </span>
                </div>
              </div>
            )}

            {/* Establecimiento */}
            <div>
              <Label>Establecimiento</Label>
              <StyledSelect
                value={establecimientoSelId}
                onChange={e => setEstablecimientoSelId(e.target.value)}
                disabled={!emisorSelId || loadingEstablecimientos}
                loading={loadingEstablecimientos}
              >
                <option value="">
                  {!emisorSelId ? '— Primero elige un emisor —'
                    : loadingEstablecimientos ? 'Cargando establecimientos...'
                    : establecimientos.length === 0 ? 'Sin establecimientos disponibles'
                    : '— Selecciona un establecimiento —'}
                </option>
                {establecimientos.map(est => (
                  <option key={est.id} value={String(est.id)}>
                    {est.codigo}{est.nombre ? ` · ${est.nombre}` : ''}{est.direccion ? ` — ${est.direccion}` : ''}
                  </option>
                ))}
              </StyledSelect>
            </div>

            {/* Punto de emisión */}
            <div>
              <Label>Punto de Emisión</Label>
              <StyledSelect
                value={puntoSelId}
                onChange={e => setPuntoSelId(e.target.value)}
                disabled={!establecimientoSelId || loadingPuntos}
                loading={loadingPuntos}
              >
                <option value="">
                  {!establecimientoSelId ? '— Primero elige un establecimiento —'
                    : loadingPuntos ? 'Cargando puntos...'
                    : puntos.length === 0 ? 'Sin puntos de emisión disponibles'
                    : '— Selecciona un punto de emisión —'}
                </option>
                {puntos.map(p => (
                  <option key={p.id} value={String(p.id)}>
                    {p.codigo}{p.descripcion ? ` · ${p.descripcion}` : ''}
                  </option>
                ))}
              </StyledSelect>
            </div>
          </div>
        </GlassCard>

        {/* ── CARD 2: Firma Digital ───────────────────────────── */}
        <GlassCard style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔏</span> Firma Digital (.p12 / .pfx)
          </h2>
          <form onSubmit={handleSubmit}>
            {/* Drop zone */}
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px 20px', borderRadius: 14, cursor: 'pointer', marginBottom: 16,
              background: firmaArchivo ? 'rgba(220,252,231,0.5)' : 'rgba(241,245,249,0.5)',
              border: `2px dashed ${firmaArchivo ? '#86efac' : 'rgba(148,163,184,0.5)'}`,
              transition: 'all 0.2s',
            }}>
              <input type="file" accept=".p12,.pfx"
                onChange={e => e.target.files?.[0] && setFirmaArchivo(e.target.files[0])}
                style={{ display: 'none' }} />
              {firmaArchivo ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>{firmaArchivo.name}</div>
                  <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>
                    {(firmaArchivo.size / 1024).toFixed(1)} KB · Clic para cambiar
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
                  <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Clic para seleccionar tu archivo .p12 o .pfx</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>Certificado de firma electrónica emitido por el SRI</div>
                </>
              )}
            </label>

            <div style={{ marginBottom: 18 }}>
              <Label>Contraseña del certificado</Label>
              <StyledInput type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña de tu archivo .p12..." />
            </div>

            {/* Resumen antes de enviar */}
            {canSubmit && (
              <div style={{
                background: 'rgba(238,242,255,0.5)', border: '1px solid rgba(199,210,254,0.7)',
                borderRadius: 12, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: '#4338ca',
              }}>
                <strong>📋 Se emitirá con:</strong>{' '}
                <strong>{emisorSel?.razon_social}</strong> (RUC: {emisorSel?.ruc}) ·
                Establec. #{establecimientoSelId} · Punto #{puntoSelId} · Archivo: {firmaArchivo?.name}
              </div>
            )}

            <PrimaryBtn type="submit" disabled={!canSubmit} style={{ width: '100%', fontSize: 15, padding: '13px' }}>
              {loading ? '⏳  Procesando...' : '🚀  Emitir Factura de Prueba al SRI'}
            </PrimaryBtn>
          </form>
        </GlassCard>

        {/* Resultado emisión */}
        {resultado && <ResultCard resultado={resultado} label="Resultado de emisión" />}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.3)' }} />
          <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, whiteSpace: 'nowrap' }}>
            Consulta rápida
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.3)' }} />
        </div>

        {/* ── CARD 3: Consultar estado ────────────────────────── */}
        <GlassCard>
          <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔍</span> Consultar Estado de Comprobante
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8' }}>
            Ingresa el ID de cualquier comprobante para ver su estado actual en el SRI.
          </p>
          <form onSubmit={handleConsultar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StyledInput type="number" min="1" value={consultaId}
              onChange={e => setConsultaId(e.target.value)}
              placeholder="Ej: 47" style={{ flex: 1, minWidth: 140 }} />
            <SecondaryBtn type="submit" disabled={consultaLoading}>
              {consultaLoading ? '⏳ Consultando...' : '🔍 Consultar'}
            </SecondaryBtn>
          </form>
        </GlassCard>

        {/* Resultado consulta */}
        {consultaResultado && <ResultCard resultado={consultaResultado} label="Resultado de consulta" />}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
};

export default PruebaEmisionComprobante;