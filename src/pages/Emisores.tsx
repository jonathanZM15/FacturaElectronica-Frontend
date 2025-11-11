import React from 'react';
import { Link } from 'react-router-dom';
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
  { 
    key: 'estado', 
    label: 'Estado',
    width: 120,
    render: (row) => {
      const isActivo = row.estado === 'ACTIVO';
      return (
        <span style={{
          display: 'inline-block',
          padding: '6px 12px',
          borderRadius: '20px',
          fontWeight: 600,
          color: '#fff',
          background: isActivo ? '#22c55e' : '#9ca3af'
        }}>
          {row.estado}
        </span>
      );
    }
  },
  { key: 'tipo_plan', label: 'Tipo de plan' },
  { key: 'fecha_inicio_plan', label: 'Fecha inicio de plan' },
  { key: 'fecha_fin_plan', label: 'Fecha final del plan' },
  { key: 'cantidad_creados', label: 'Cantidad de comprobantes creados', width: 240 },
  { key: 'cantidad_restantes', label: 'Cantidad de comprobantes restantes', width: 240 },

  { key: 'nombre_comercial', label: 'Nombre comercial', width: 150 },
  { key: 'direccion_matriz', label: 'Dirección Matriz', width: 150 },
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

  { key: 'obligado_contabilidad', label: 'Obligado a llevar contabilidad', width: 200 },
  { key: 'contribuyente_especial', label: 'Contribuyente Especial', width: 200 },
  { key: 'agente_retencion', label: 'Agente de retención', width: 170 },
  { key: 'codigo_artesano', label: 'Código Artesano', width: 180 },
  { key: 'tipo_persona', label: 'Tipo de persona', width: 160 },
  { key: 'ambiente', label: 'Ambiente', width: 150 },
  { key: 'tipo_emision', label: 'Tipo de Emisión', width: 160 },

  { 
    key: 'created_at', 
    label: 'Fecha de creación', 
    width: 130,
    render: (row) => {
      if (!row.created_at) return '-';
      const date = new Date(row.created_at);
      return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  },
  { 
    key: 'updated_at', 
    label: 'Fecha de actualización', 
    width: 150,
    render: (row) => {
      if (!row.updated_at) return '-';
      const date = new Date(row.updated_at);
      return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  },
  { 
    key: 'created_by_name', 
    label: 'Nombre del registrador', 
    width: 230,
    render: (row) => row.created_by_name || '-'
  },
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
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | string | null>(null);
  const [deletingName, setDeletingName] = React.useState<string | null>(null);
  const [deletePassword, setDeletePassword] = React.useState<string>('');
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deletePasswordOpen, setDeletePasswordOpen] = React.useState(false);
  const [deletingWithHistory, setDeletingWithHistory] = React.useState(false);
  const [historyPreparedOpen, setHistoryPreparedOpen] = React.useState(false);
  const [backupUrl, setBackupUrl] = React.useState<string | null>(null);
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRef = React.useRef<HTMLDivElement | null>(null);
  const desdeInputRef = React.useRef<HTMLInputElement | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(5);
  const [totalItems, setTotalItems] = React.useState(0);

  // Sorting states
  const [sortBy, setSortBy] = React.useState<keyof Emisor | 'logo' | null>(null);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const formatDate = React.useCallback((iso: string) => {
    if (!iso) return '';
    // Expecting yyyy-mm-dd
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }, []);

  // Scroll sync refs para una sola área scrollable
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

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
      setTotalItems(emisores.length);
      setCurrentPage(1); // Reset to first page when filters change
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cargar emisores');
    } finally {
      setLoading(false);
    }
  }, [estado, q, desde, hasta]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Sorting function
  const handleSort = (column: keyof Emisor | 'logo') => {
    if (column === 'logo') return; // No sorting for logo column
    
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortBy) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortBy as keyof Emisor];
      const bVal = b[sortBy as keyof Emisor];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (bVal == null) return sortOrder === 'asc' ? -1 : 1;

      // Compare values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal, 'es') 
          : bVal.localeCompare(aVal, 'es');
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Fallback to string comparison
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'es')
        : String(bVal).localeCompare(String(aVal), 'es');
    });

    return sorted;
  }, [data, sortBy, sortOrder]);

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Reset to first page when items per page changes
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

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
        <div className="tabla-scroll-container" ref={scrollContainerRef}>
          <table className="tabla-emisores">
            <thead>
              <tr>
                {/* Fijos izquierda */}
                <th 
                  className="th-sticky sticky-left-1 sortable" 
                  onClick={() => handleSort('ruc')}
                  style={{ cursor: 'pointer' }}
                >
                  RUC {sortBy === 'ruc' ? (sortOrder === 'asc' ? '▲' : '▼') : '▾'}
                </th>
                <th 
                  className="th-sticky sticky-left-2 sortable" 
                  onClick={() => handleSort('razon_social')}
                  style={{ cursor: 'pointer' }}
                >
                  Razón Social {sortBy === 'razon_social' ? (sortOrder === 'asc' ? '▲' : '▼') : '▾'}
                </th>

                {/* Columnas dinámicas */}
                {dynamicColumns.map((c) => (
                  <th
                    key={String(c.key)}
                    className={`th-dyn ${c.key !== 'logo' ? 'sortable' : ''}`}
                    style={{
                      minWidth: c.width ?? 200,
                      width: c.width ?? 200,
                      cursor: c.key !== 'logo' ? 'pointer' : 'default'
                    }}
                    title={c.label}
                    onClick={() => c.key !== 'logo' && handleSort(c.key)}
                  >
                    {c.label} {c.key !== 'logo' && (sortBy === c.key ? (sortOrder === 'asc' ? '▲' : '▼') : '▾')}
                  </th>
                ))}

                {/* Fijo derecha */}
                <th className="th-sticky sticky-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="loading-row" colSpan={dynamicColumns.length + 3}>
                    Cargando…
                  </td>
                </tr>
              ) : paginatedData.length ? (
                paginatedData.map((row) => (
                  <tr key={row.id}>
                    {/* Fijos izquierda */}
                    <td className="td-sticky sticky-left-1">
                      <Link className="link-ruc" to={`/emisores/${row.id}`}>{row.ruc}</Link>
                    </td>
                    <td className="td-sticky sticky-left-2">
                      {row.razon_social}
                    </td>

                    {/* Celdas dinámicas */}
                    {dynamicColumns.map((c) => {
                      const content =
                        c.render
                          ? c.render(row)
                          : (row[c.key as keyof Emisor] as any) ?? '-';

                      const isNumber = typeof (row[c.key as keyof Emisor] as any) === 'number';
                      const isRestantes = c.key === 'cantidad_restantes';

                      return (
                        <td
                          key={String(c.key)}
                          className="td-dyn"
                          style={{
                            minWidth: c.width ?? 200,
                            width: c.width ?? 200,
                            fontWeight: isNumber ? 700 : 'normal',
                            color: isRestantes ? '#e24444' : (isNumber ? '#1b4ab4' : 'inherit')
                          }}
                        >
                          {content ?? '-'}
                        </td>
                      );
                    })}

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
                      <button title="Eliminar" onClick={() => {
                        setDeletingId(row.id || null);
                        setDeletingName(row.razon_social || null);
                        setDeletePassword('');
                        setDeleteError(null);
                        setDeleteOpen(true); // open confirmation first
                      }}>🗑️</button>
                      {/** Show 'prepare deletion' for emisores inactive >=1 year */}
                      {((row.estado === 'INACTIVO') && ((row.updated_at && new Date(row.updated_at) <= new Date(Date.now() - 365*24*60*60*1000)) || (row.fecha_actualizacion && new Date(row.fecha_actualizacion) <= new Date(Date.now() - 365*24*60*60*1000)))) && (
                        <button title="Eliminar (con historial)" onClick={async () => {
                          try {
                            const res = await emisoresApi.prepareDeletion(row.id!);
                            const backup = res.data?.backup_url ?? res.data?.backupUrl ?? null;
                            setDeletingId(row.id || null);
                            setDeletingName(row.razon_social || null);
                            setBackupUrl(backup);
                            setHistoryPreparedOpen(true);
                            show({ title: 'Respaldo creado', message: 'Se generó un respaldo y se envió notificación al cliente (si aplica).', type: 'info' });
                          } catch (err: any) {
                            show({ title: 'Error', message: err?.response?.data?.message || 'No se pudo generar el respaldo', type: 'error' });
                          }
                        }}>🗄️</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={dynamicColumns.length + 3} style={{ textAlign: 'center', padding: 12 }}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="pagination-controls">
          <div className="pagination-info">
            Filas por página: 
            <select 
              value={itemsPerPage} 
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="items-per-page-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
            <span className="page-range">
              {totalItems === 0 ? '0-0' : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}`} de {totalItems}
            </span>
          </div>
          
          <div className="pagination-buttons">
            <button 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
              title="Primera página"
              className="page-btn"
            >
              ⟪
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              title="Página anterior"
              className="page-btn"
            >
              ‹
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage >= totalPages}
              title="Página siguiente"
              className="page-btn"
            >
              ›
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage >= totalPages}
              title="Última página"
              className="page-btn"
            >
              ⟫
            </button>
          </div>
        </div>
      </div>
    </div>
    <EmisorFormModal
      open={openNew}
      onClose={() => setOpenNew(false)}
      onCreated={(created) => {
        // añadir en tiempo real; si prefieres recargar desde servidor, usa load()
        setData((prev) => {
          const newData = [created, ...prev];
          setTotalItems(newData.length);
          return newData;
        });
        // mostrar notificación temporal
        show({ title: 'Éxito', message: 'Emisor creado correctamente', type: 'success' });
      }}
    />

    {/* Step 1: Confirmation modal (shows RUC + name) */}
    {deleteOpen && (
      <div className="mf-modal-overlay" role="dialog" aria-modal="true">
        <div className="mf-modal" style={{ width: 'min(620px,92vw)', padding: 22 }}>
          <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de emisor</h3>
          <div style={{ height: 12 }} />
          <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 8px', fontWeight: 700 }}>¿Está seguro que desea eliminar al emisor:</p>
          <p style={{ textAlign: 'center', marginTop: 6, marginBottom: 12 }}>
            <span style={{ color: '#c62828', fontWeight: 800, fontSize: 16 }}>{/* RUC */}
              {data.find(d => d.id === deletingId)?.ruc ?? ''}
            </span>
            <span> - </span>
            <span style={{ color: '#c62828', fontWeight: 800 }}>{deletingName}</span>
          </p>
          <p style={{ textAlign: 'center', marginTop: 0, marginBottom: 18, fontSize: 15 }}>y todos sus datos asociados?</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="mf-btn-cancel" onClick={() => setDeleteOpen(false)} style={{ padding: '10px 22px', borderRadius: 20 }}>CANCELAR</button>
            <button className="mf-btn-confirm" onClick={() => { setDeleteOpen(false); setDeletePasswordOpen(true); }} style={{ padding: '10px 22px', borderRadius: 20, background: '#ff6b6b' }}>CONFIRMAR</button>
          </div>

          <style>{`
            .mf-modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:3000; }
            .mf-modal{ width:min(540px, 92vw); background:#fff; border-radius:12px; padding:28px 24px; box-shadow:0 20px 60px rgba(0,0,0,.25); text-align:center; }
            .mf-btn-cancel{ padding:10px 18px; border-radius:8px; background:#fff; color:#333; border:2px solid #000; font-weight:700; cursor:pointer; }
            .mf-btn-confirm{ padding:10px 18px; border-radius:8px; background:#ff6b6b; color:#fff; border:none; font-weight:700; cursor:pointer; }
            .mf-btn-cancel:disabled, .mf-btn-confirm:disabled{ opacity:0.6; cursor:not-allowed; }
          `}</style>
        </div>
      </div>
    )}

    {/* History prepared modal: shows backup link and allows admin to proceed to deletion */}
    {historyPreparedOpen && (
      <div className="mf-modal-overlay" role="dialog" aria-modal="true">
        <div className="mf-modal" style={{ width: 'min(620px,92vw)', padding: 22 }}>
          <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Respaldo generado</h3>
          <div style={{ height: 12 }} />
          <p style={{ textAlign: 'center', fontSize: 15, margin: '0 0 12px' }}>Se generó un respaldo con la información del emisor y se envió una notificación al cliente (si aplica).</p>
          {backupUrl && (
            <p style={{ textAlign: 'center', marginBottom: 12 }}>
              <a href={backupUrl} target="_blank" rel="noreferrer">Descargar respaldo</a>
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="mf-btn-cancel" onClick={() => setHistoryPreparedOpen(false)} style={{ padding: '10px 22px', borderRadius: 20 }}>CANCELAR</button>
            <button className="mf-btn-confirm" onClick={() => { setHistoryPreparedOpen(false); setDeletingWithHistory(true); setDeletePassword(''); setDeleteError(null); setDeletePasswordOpen(true); }} style={{ padding: '10px 22px', borderRadius: 20, background: '#ff6b6b' }}>ELIMINAR PERMANENTEMENTE</button>
          </div>
        </div>
      </div>
    )}

    {/* Step 2: Password entry modal */}
    {deletePasswordOpen && (
      <div className="mf-modal-overlay" role="dialog" aria-modal="true">
        <div className="mf-modal" style={{ width: 'min(520px,92vw)', padding: 22 }}>
          <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de emisor</h3>
          <div style={{ height: 12 }} />
          <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 12px', fontWeight: 600 }}>Ingresa tu clave de administrador para confirmar la eliminación del emisor</p>

          <div style={{ margin: '8px 0 6px' }}>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Clave de administrador"
              style={{ width: '100%', padding: '12px 2px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 16 }}
              autoFocus
            />
            {deleteError && <div style={{ color: '#b00020', marginTop: 8 }}>{deleteError}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14 }}>
            <button className="mf-btn-cancel" onClick={() => { setDeletePasswordOpen(false); setDeletePassword(''); }} disabled={deleteLoading}>CANCELAR</button>
            <button className="mf-btn-confirm" onClick={async () => {
              if (!deletingId) return;
              setDeleteLoading(true);
              setDeleteError(null);
              try {
                if (deletingWithHistory) {
                  await emisoresApi.deletePermanent(deletingId, deletePassword);
                } else {
                  await emisoresApi.delete(deletingId, deletePassword);
                }
                // remove from list
                setData((prev) => {
                  const newData = prev.filter(p => p.id !== deletingId);
                  setTotalItems(newData.length);
                  return newData;
                });
                setDeletePasswordOpen(false);
                setDeletingWithHistory(false);
                show({ title: 'Éxito', message: 'Emisor eliminado correctamente', type: 'success' });
              } catch (err: any) {
                const msg = err?.response?.data?.message || 'No se pudo eliminar el emisor';
                setDeleteError(msg);
              } finally {
                setDeleteLoading(false);
              }
            }} disabled={deleteLoading || deletePassword.length === 0}>{deleteLoading ? 'Eliminando…' : 'CONFIRMAR'}</button>
          </div>

          <style>{`
            .mf-modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:3000; }
            .mf-modal{ width:min(540px, 92vw); background:#fff; border-radius:12px; padding:28px 24px; box-shadow:0 20px 60px rgba(0,0,0,.25); text-align:center; }
            .mf-btn-cancel{ padding:10px 18px; border-radius:8px; background:#fff; color:#333; border:2px solid #000; font-weight:700; cursor:pointer; }
            .mf-btn-confirm{ padding:10px 18px; border-radius:8px; background:#ff6b6b; color:#fff; border:none; font-weight:700; cursor:pointer; }
            .mf-btn-cancel:disabled, .mf-btn-confirm:disabled{ opacity:0.6; cursor:not-allowed; }
          `}</style>
        </div>
      </div>
    )}
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