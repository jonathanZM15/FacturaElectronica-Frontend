import React from 'react';
import './Emisores.css';
import { emisoresApi } from '../services/emisoresApi';
import EmisorFormModal from './EmisorFormModal';
import { Emisor } from '../types/emisor';
import { useNotification } from '../contexts/NotificationContext';

const dynamicColumns: Array<{
  key: keyof Emisor | 'logo';
  label: string;
  width?: number;
  render?: (row: Emisor) => React.ReactNode;
}> = [
  { key: 'estado', label: 'Estado' },
  { key: 'tipo_plan', label: 'Tipo de plan' },
  { key: 'fecha_inicio_plan', label: 'Fecha inicio de plan' },
  { key: 'fecha_fin_plan', label: 'Fecha final del plan' },
  { key: 'cantidad_creados', label: 'Cantidad de comprobantes creados', width: 240 },
  { key: 'cantidad_restantes', label: 'Cantidad de comprobantes restantes', width: 240 },

  { key: 'nombre_comercial', label: 'Nombre comercial' },
  { key: 'direccion_matriz', label: 'Dirección Matriz', width: 260 },
  { key: 'correo_remitente', label: 'Correo Remitente', width: 220 },
  {
    key: 'logo',
    label: 'Logo',
    width: 130,
    render: (row) =>
      row.logo_url ? (
        <img 
          className="logo-cell" 
          src={row.logo_url} 
          alt="logo"
          onError={(e) => {
            console.error('Error cargando imagen:', row.logo_url);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => console.log('Imagen cargada correctamente:', row.logo_url)}
        />
      ) : (
        <span className="logo-placeholder">🖼️</span>
      ),
  },
  { key: 'regimen_tributario', label: 'Régimen Tributario', width: 200 },

  { key: 'obligado_contabilidad', label: 'Obligado a llevar contabilidad', width: 260 },
  { key: 'contribuyente_especial', label: 'Contribuyente Especial', width: 220 },
  { key: 'agente_retencion', label: 'Agente de retención', width: 200 },
  { key: 'codigo_artesano', label: 'Código Artesano', width: 180 },
  { key: 'tipo_persona', label: 'Tipo de persona', width: 160 },
  { key: 'ambiente', label: 'Ambiente', width: 150 },
  { key: 'tipo_emision', label: 'Tipo de Emisión', width: 160 },

  { key: 'fecha_creacion', label: 'Fecha de creación', width: 180 },
  { key: 'fecha_actualizacion', label: 'Fecha de actualización', width: 200 },
  { key: 'registrador', label: 'Nombre del registrador', width: 240 },
  { key: 'ultimo_login', label: 'Fecha de último inicio de sesión', width: 240 },
  { key: 'ultimo_comprobante', label: 'Fecha de ultimo comprobante creado', width: 260 },
];

const Emisores: React.FC = () => {
  const [data, setData] = React.useState<Emisor[]>([]);
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [estado, setEstado] = React.useState('ACTIVO');
  const [q, setQ] = React.useState('');
  const [desde, setDesde] = React.useState<string>('');
  const [hasta, setHasta] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [openNew, setOpenNew] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | string | null>(null);
  const [editingInitial, setEditingInitial] = React.useState<Emisor | null>(null);
  const [editingRucEditable, setEditingRucEditable] = React.useState<boolean>(true);
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRef = React.useRef<HTMLDivElement | null>(null);
  const desdeInputRef = React.useRef<HTMLInputElement | null>(null);

  const formatDate = React.useCallback((iso: string) => {
    if (!iso) return '';
    // Expecting yyyy-mm-dd
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }, []);

  // Scroll sync refs para columnas dinámicas
  const headScrollRef = React.useRef<HTMLTableCellElement | null>(null);
  const bodyScrollRefs = React.useRef<Array<HTMLTableCellElement | null>>([]);
  const footScrollRef = React.useRef<HTMLDivElement | null>(null);
  const isSyncingRef = React.useRef(false);

  const syncAll = React.useCallback((x: number) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    bodyScrollRefs.current.forEach((el) => { if (el) el.scrollLeft = x; });
    if (headScrollRef.current) headScrollRef.current.scrollLeft = x;
    if (footScrollRef.current) footScrollRef.current.scrollLeft = x;
    // allow event loop to settle before unlocking
    setTimeout(() => { isSyncingRef.current = false; }, 0);
  }, []);

  const onFootScroll = React.useCallback(() => {
    if (isSyncingRef.current) return;
    const x = footScrollRef.current?.scrollLeft || 0;
    syncAll(x);
  }, [syncAll]);

  // Close date popover on outside click and focus first input on open
  React.useEffect(() => {
    if (!dateOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    setTimeout(() => desdeInputRef.current?.focus(), 0);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [dateOpen]);

  const dynTotalWidth = React.useMemo(
    () => dynamicColumns.reduce((sum, c) => sum + (c.width ?? 200), 0),
    []
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await emisoresApi.list({
        estado: estado || undefined,
        q: q || undefined,
        fecha_inicio: desde || undefined,
        fecha_fin: hasta || undefined,
      });
      const emisores = res.data?.data ?? res.data ?? [];
      console.log('Emisores recibidos:', emisores);
      emisores.forEach((e: any) => {
        if (e.logo_url) {
          console.log(`Emisor ${e.ruc} - Logo URL:`, e.logo_url);
        }
      });
      setData(emisores);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cargar emisores');
    } finally {
      setLoading(false);
    }
  }, [estado, q, desde, hasta]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <>
    <div className="emisores-page">
      <div className="emisores-header">
        <h2>Emisores</h2>
        <div className="filtros">
          {/* Date range pill */}
          <div className="date-range" ref={dateRef}>
            <button
              type="button"
              className="date-range-display"
              onClick={() => setDateOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={dateOpen}
              title="Seleccionar rango de fechas"
            >
              <span className={`start ${desde ? 'has' : ''}`}>{desde ? formatDate(desde) : 'Fecha Inicial'}</span>
              <span className="arrow">→</span>
              <span className={`end ${hasta ? 'has' : ''}`}>{hasta ? formatDate(hasta) : 'Fecha Final'}</span>
              <span className="icon" aria-hidden>📅</span>
            </button>
            {dateOpen && (
              <div className="date-range-popover" role="dialog">
                <div className="row">
                  <label>Desde
                    <input ref={desdeInputRef} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                  </label>
                  <label>Hasta
                    <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                  </label>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => { setDesde(''); setHasta(''); setDateOpen(false); }}>Limpiar</button>
                  <button type="button" className="primary" onClick={() => setDateOpen(false)}>Aplicar</button>
                </div>
              </div>
            )}
          </div>

          {/* Estado select with search icon and caption */}
          <div className="estado-search">
            <div className="input-wrap">
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
              <span className="icon">🔍</span>
            </div>
            <small className="caption">Buscando por Estado</small>
          </div>

          <button className="btn-nuevo" onClick={() => setOpenNew(true)}>Nuevo +</button>
        </div>
      </div>

      {error && <div className="alert-error">⚠ {error}</div>}

      <div className="tabla-wrapper">
          <table className="tabla-emisores">
            <thead>
              <tr>
                {/* Fijos izquierda */}
                <th className="th-sticky sticky-left-1">RUC ▾</th>
                <th className="th-sticky sticky-left-2">Razón Social ▾</th>

                {/* Contenedor scrollable para columnas dinámicas */}
                <th
                  ref={headScrollRef}
                  className="scrollable-columns scrollable-head"
                  style={{ padding: 0, border: 'none' }}
                >
                  <div style={{ display: 'flex' }}>
                    {dynamicColumns.map((c) => (
                      <div
                        key={String(c.key)}
                        className="th-dyn"
                        style={{
                          minWidth: c.width ?? 200,
                          padding: '10px',
                          background: '#2931a8',
                          color: '#fff',
                          border: '2px solid #ff8c00',
                          fontWeight: 600,
                          fontSize: '13px',
                          whiteSpace: 'nowrap'
                        }}
                        title={c.label}
                      >
                        {c.label} ▾
                      </div>
                    ))}
                  </div>
                </th>

                {/* Fijo derecha */}
                <th className="th-sticky sticky-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="loading-row" colSpan={4}>
                    Cargando…
                  </td>
                </tr>
              ) : data.length ? (
                data.map((row, idx) => (
                  <tr key={row.id}>
                    {/* Fijos izquierda */}
                    <td className="td-sticky sticky-left-1">
                      <a className="link-ruc" href="#">{row.ruc}</a>
                    </td>
                    <td className="td-sticky sticky-left-2">
                      {row.razon_social}
                    </td>

                    {/* Contenedor scrollable para celdas dinámicas */}
                    <td
                      className="scrollable-columns scrollable-body"
                      style={{ padding: 0, border: 'none' }}
                      ref={(el) => { bodyScrollRefs.current[idx] = el; }}
                    >
                      <div style={{ display: 'flex' }}>
                        {dynamicColumns.map((c) => {
                          const content =
                            c.render
                              ? c.render(row)
                              : (row[c.key as keyof Emisor] as any) ?? '-';

                          const isNumber = typeof (row[c.key as keyof Emisor] as any) === 'number';
                          const isRestantes = c.key === 'cantidad_restantes';

                          return (
                            <div
                              key={String(c.key)}
                              className="td-dyn"
                              style={{
                                minWidth: c.width ?? 200,
                                padding: '8px 10px',
                                border: '2px solid #ff8c00',
                                background: '#fff',
                                textAlign: isNumber ? 'right' : 'left',
                                fontWeight: isNumber ? 700 : 'normal',
                                color: isRestantes ? '#e24444' : (isNumber ? '#1b4ab4' : 'inherit')
                              }}
                            >
                              {content ?? '-'}
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Fijo derecha */}
                    <td className="td-sticky sticky-right acciones">
                      <button title="Editar" onClick={async () => {
                        try {
                          const res = await emisoresApi.get(row.id!);
                          const em = res.data?.data ?? res.data;
                          setEditingId(row.id || null);
                          setEditingInitial(em);
                          setEditingRucEditable(em.ruc_editable ?? true);
                          setOpenEdit(true);
                        } catch (e: any) {
                          alert('No se pudo cargar el emisor para edición');
                        }
                      }}>✏️</button>
                      <button title="Eliminar">🗑️</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 12, display: 'block', width: '100%' }}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Barra de desplazamiento inferior alineada solo con columnas dinámicas */}
          <div
            className="dyn-scrollbar"
            ref={footScrollRef}
            onScroll={onFootScroll}
            aria-label="Deslizar columnas"
          >
            <div style={{ width: dynTotalWidth, height: 1 }} />
          </div>
      </div>
    </div>
    <EmisorFormModal
      open={openNew}
      onClose={() => setOpenNew(false)}
      onCreated={(created) => {
        // añadir en tiempo real; si prefieres recargar desde servidor, usa load()
        setData((prev) => [created, ...prev]);
        // mantener scroll sincronizado para la fila recién agregada
        requestAnimationFrame(() => {
          const x = footScrollRef.current?.scrollLeft || headScrollRef.current?.scrollLeft || 0;
          syncAll(x);
        });
        // mostrar notificación temporal
  show({ title: 'Éxito', message: 'Emisor creado correctamente', type: 'success' });
      }}
    />
    <EmisorFormModal
      open={openEdit}
      onClose={() => setOpenEdit(false)}
      editingId={editingId}
      initialData={editingInitial ?? undefined}
      rucEditable={editingRucEditable}
      onUpdated={(updated) => {
        // replace in place
        setData((prev) => prev.map(p => (p.id === updated.id ? updated : p)));
        setOpenEdit(false);
  show({ title: 'Éxito', message: 'Emisor actualizado correctamente', type: 'success' });
      }}
    />

    {/* notifications handled by NotificationProvider */}
    </>
  );
};

export default Emisores;