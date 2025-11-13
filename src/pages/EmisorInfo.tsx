import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { emisoresApi } from '../services/emisoresApi';
import EmisorFormModal from './EmisorFormModal';
import EstablishmentFormModal from './EstablishmentFormModal';
import { establecimientosApi } from '../services/establecimientosApi';
import { useNotification } from '../contexts/NotificationContext';
import './Emisores.css';

const EmisorInfo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [company, setCompany] = React.useState<any | null>(null);
  const [tab, setTab] = React.useState<'emisor'|'establecimientos'|'usuarios'|'planes'>('emisor');
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openNewEst, setOpenNewEst] = React.useState(false);
  const [editEst, setEditEst] = React.useState<any | null>(null);
  const [establecimientos, setEstablecimientos] = React.useState<any[]>([]);
  const [rucEditable, setRucEditable] = React.useState(true);

  // Delete flow states (emisor)
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [pwd, setPwd] = React.useState('');
  const [delLoading, setDelLoading] = React.useState(false);
  const [delError, setDelError] = React.useState<string | null>(null);
  const [deleteWithHistory, setDeleteWithHistory] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  // Delete flow states (establecimiento)
  const [deleteEstOpen, setDeleteEstOpen] = React.useState(false);
  const [deleteEstPasswordOpen, setDeleteEstPasswordOpen] = React.useState(false);
  const [deleteEstPassword, setDeleteEstPassword] = React.useState('');
  const [deleteEstError, setDeleteEstError] = React.useState<string | null>(null);
  const [deleteEstLoading, setDeleteEstLoading] = React.useState(false);
  const [deletingEstId, setDeletingEstId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await emisoresApi.get(id);
      const em = res.data?.data ?? res.data;
      setCompany(em);
      setRucEditable(em.ruc_editable ?? true);
    } catch (e: any) {
      show({ title: 'Error', message: 'No se pudo cargar la información del emisor', type: 'error' });
    } finally { setLoading(false); }
  }, [id]);

  const loadEstablecimientos = React.useCallback(async (companyId?: number | string) => {
    if (!companyId) return;
    try {
      const r = await establecimientosApi.list(companyId);
      const data = r.data?.data ?? r.data ?? [];
      setEstablecimientos(Array.isArray(data) ? data : []);
    } catch (e) {
      setEstablecimientos([]);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { if (company?.id) loadEstablecimientos(company.id); }, [company, loadEstablecimientos]);

  // Sorting and pagination state for establecimientos
  type EstCol = 'codigo'|'nombre'|'nombre_comercial'|'direccion'|'estado';
  const [sortByEst, setSortByEst] = React.useState<EstCol>('codigo');
  const [sortDirEst, setSortDirEst] = React.useState<'asc'|'desc'>('asc');
  const [pageEst, setPageEst] = React.useState(1);
  const [perPageEst, setPerPageEst] = React.useState(10);

  const toggleSortEst = (col: EstCol) => {
    setPageEst(1);
    if (sortByEst === col) {
      setSortDirEst((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortByEst(col);
      setSortDirEst('asc');
    }
  };

  const sortedEsts = React.useMemo(() => {
    const data = [...establecimientos];
    const dir = sortDirEst === 'asc' ? 1 : -1;
    data.sort((a, b) => {
      const va = (a?.[sortByEst] ?? '') as string;
      const vb = (b?.[sortByEst] ?? '') as string;
      // Try numeric comparison if both are numbers
      const na = Number(va); const nb = Number(vb);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
      return String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' }) * dir;
    });
    return data;
  }, [establecimientos, sortByEst, sortDirEst]);

  const paginatedEsts = React.useMemo(() => {
    const start = (pageEst - 1) * perPageEst;
    return sortedEsts.slice(start, start + perPageEst);
  }, [sortedEsts, pageEst, perPageEst]);

  const totalEst = establecimientos.length;
  const startIdx = totalEst === 0 ? 0 : (pageEst - 1) * perPageEst + 1;
  const endIdx = Math.min(pageEst * perPageEst, totalEst);
  const lastPageEst = Math.max(1, Math.ceil(Math.max(1, totalEst) / perPageEst));
  React.useEffect(() => { if (pageEst > lastPageEst) setPageEst(lastPageEst); }, [lastPageEst, pageEst]);

  if (!id) return <div>Emisor no especificado</div>;

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h2 style={{ margin: 0 }}>{company?.ruc ?? '—'} <small style={{ marginLeft: 12, fontWeight: 700 }}>{company?.razon_social ?? ''}</small></h2>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="actions-btn"
              onClick={() => setActionsOpen((s) => !s)}
              aria-expanded={actionsOpen}
              aria-haspopup="menu"
              style={{ background: '#1e40af', color: '#fff', padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Acciones ▾
            </button>

            {/* Single right X to close info, bold and red, hover lifts */}
            <button
              aria-label="Cerrar información"
              onClick={() => navigate('/emisores')}
              className="close-x"
              title="Cerrar"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, color: '#c62828' }}
            >
              ✕
            </button>
            <style>{`
              .close-x{ transition: transform .12s ease, box-shadow .12s ease }
              .close-x:hover{ transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,0.12) }
            `}</style>

            {actionsOpen && (
              <div role="menu" style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #ddd', boxShadow: '0 6px 18px rgba(0,0,0,.08)', borderRadius: 6, zIndex: 50 }}>
                <button role="menuitem" onClick={() => { setOpenEdit(true); setActionsOpen(false); }} className="menu-item">✏️ Editar</button>
                <button role="menuitem" onClick={() => { setActionsOpen(false); setDeleteWithHistory(false); setConfirmOpen(true); }} className="menu-item">🗑️ Eliminar</button>
                {/* If inactive >= 1 year, show delete with history option */}
                {company && company.estado === 'INACTIVO' && company.updated_at && new Date(company.updated_at) <= new Date(Date.now() - 365*24*60*60*1000) && (
                  <button role="menuitem" onClick={() => { setActionsOpen(false); setDeleteWithHistory(true); setConfirmOpen(true); }} className="menu-item">🗄️ Eliminar (con historial)</button>
                )}
                <style>{`
                  .menu-item{ display:block; width:100%; padding:8px 14px; background:transparent; border:none; text-align:left; cursor:pointer; color:#222 }
                  .menu-item:hover{ background:#e6f0ff; color:#1e40af }
                `}</style>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
          <nav style={{ display: 'flex', gap: 12 }}>
          {(['emisor','establecimientos','usuarios','planes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 12px',
                borderRadius: 20,
                border: tab === t ? '2px solid #f97316' : '1px solid #ddd',
                background: tab === t ? '#f97316' : '#fff',
                fontWeight: tab === t ? 800 : 600,
                color: tab === t ? '#ffffff' : '#1f2937',
                cursor: 'pointer'
              }}
            >
              {t === 'emisor' ? 'Emisor' : t === 'establecimientos' ? 'Establecimientos' : t === 'usuarios' ? 'Usuarios' : 'Planes'}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 18 }}>
          {tab === 'emisor' && (
            <>
              {/* Cards Grid - Modern Design */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {/* Datos del RUC Card */}
                <div className="info-card">
                  <div className="card-header">
                    <div className="card-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      <span style={{ fontSize: 24 }}>📋</span>
                    </div>
                    <h3 className="card-title">Datos del RUC</h3>
                  </div>
                  <div className="card-body">
                    <div className="info-row"><span className="info-label">RUC:</span><span className="info-value">{company?.ruc ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Razón social:</span><span className="info-value">{company?.razon_social ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Nombre comercial:</span><span className="info-value">{company?.nombre_comercial ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Dirección matriz:</span><span className="info-value">{company?.direccion_matriz ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Régimen tributario:</span><span className="info-value badge badge-purple">{company?.regimen_tributario?.replace('_', ' ') ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Obligado contabilidad:</span><span className={`info-value badge ${company?.obligado_contabilidad === 'SI' ? 'badge-green' : 'badge-gray'}`}>{company?.obligado_contabilidad ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Contribuyente especial:</span><span className={`info-value badge ${company?.contribuyente_especial === 'SI' ? 'badge-blue' : 'badge-gray'}`}>{company?.contribuyente_especial ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Agente retención:</span><span className={`info-value badge ${company?.agente_retencion === 'SI' ? 'badge-orange' : 'badge-gray'}`}>{company?.agente_retencion ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Tipo de persona:</span><span className="info-value">{company?.tipo_persona ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Código artesano:</span><span className="info-value">{company?.codigo_artesano ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Correo remitente:</span><span className="info-value" style={{ fontSize: 13, color: '#3b82f6' }}>{company?.correo_remitente ?? '-'}</span></div>
                  </div>
                </div>

                {/* Configuración Card */}
                <div className="info-card">
                  <div className="card-header">
                    <div className="card-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                      <span style={{ fontSize: 24 }}>⚙️</span>
                    </div>
                    <h3 className="card-title">Configuración de la cuenta</h3>
                  </div>
                  <div className="card-body">
                    <div className="info-row"><span className="info-label">Ambiente:</span><span className={`info-value badge ${company?.ambiente === 'PRODUCCION' ? 'badge-green' : 'badge-yellow'}`}>{company?.ambiente ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Tipo de emisión:</span><span className="info-value badge badge-blue">{company?.tipo_emision ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Estado:</span><span className={`info-value badge ${company?.estado === 'ACTIVO' ? 'badge-green' : 'badge-red'}`}>{company?.estado ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Tipo de plan:</span><span className="info-value">{company?.tipo_plan ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Fecha inicio plan:</span><span className="info-value">{company?.fecha_inicio_plan ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Fecha fin plan:</span><span className="info-value">{company?.fecha_fin_plan ?? '-'}</span></div>
                    <div className="info-row">
                      <span className="info-label">Cantidad creados:</span>
                      <span className="info-value" style={{ fontWeight: 700, color: '#059669' }}>{company?.cantidad_creados ?? '-'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Cantidad restantes:</span>
                      <span className="info-value" style={{ fontWeight: 700, color: '#dc2626' }}>{company?.cantidad_restantes ?? '-'}</span>
                    </div>
                    <div className="info-row" style={{ alignItems: 'flex-start', marginTop: 12 }}>
                      <span className="info-label">Logo:</span>
                      <div className="info-value">
                        {company?.logo_url ? (
                          <img src={company.logo_url} alt="logo" style={{ maxWidth: 150, maxHeight: 150, borderRadius: 8, border: '2px solid #e5e7eb', padding: 8, background: '#fff' }} />
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actividad Card */}
                <div className="info-card" style={{ gridColumn: 'span 2' }}>
                  <div className="card-header">
                    <div className="card-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                      <span style={{ fontSize: 24 }}>📊</span>
                    </div>
                    <h3 className="card-title">Actividad de la cuenta</h3>
                  </div>
                  <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    <div className="info-row"><span className="info-label">Fecha de creación:</span><span className="info-value">{company?.created_at ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Fecha de actualización:</span><span className="info-value">{company?.updated_at ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Fecha de último comprobante:</span><span className="info-value">{company?.ultimo_comprobante ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Fecha último inicio de sesión:</span><span className="info-value">{company?.ultimo_login ?? '-'}</span></div>
                    <div className="info-row"><span className="info-label">Registrador:</span><span className="info-value">{company?.registrador ?? '-'}</span></div>
                  </div>
                </div>
              </div>

              {/* Styles for modern cards */}
              <style>{`
                .info-card {
                  background: #fff;
                  border-radius: 12px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                  overflow: hidden;
                  transition: all 0.3s ease;
                  border: 1px solid #e5e7eb;
                }
                .info-card:hover {
                  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                  transform: translateY(-2px);
                }
                .card-header {
                  padding: 20px;
                  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                  border-bottom: 1px solid #e5e7eb;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                }
                .card-icon {
                  width: 48px;
                  height: 48px;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .card-title {
                  margin: 0;
                  font-size: 18px;
                  font-weight: 700;
                  color: #1e293b;
                }
                .card-body {
                  padding: 20px;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 10px 0;
                  border-bottom: 1px solid #f1f5f9;
                }
                .info-row:last-child {
                  border-bottom: none;
                }
                .info-label {
                  font-weight: 600;
                  color: #64748b;
                  font-size: 14px;
                  flex-shrink: 0;
                  margin-right: 12px;
                }
                .info-value {
                  font-weight: 500;
                  color: #1e293b;
                  font-size: 14px;
                  text-align: right;
                  word-break: break-word;
                }
                .badge {
                  display: inline-block;
                  padding: 4px 12px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .badge-green {
                  background: #d1fae5;
                  color: #065f46;
                }
                .badge-red {
                  background: #fee2e2;
                  color: #991b1b;
                }
                .badge-blue {
                  background: #dbeafe;
                  color: #1e40af;
                }
                .badge-yellow {
                  background: #fef3c7;
                  color: #92400e;
                }
                .badge-orange {
                  background: #ffedd5;
                  color: #9a3412;
                }
                .badge-purple {
                  background: #e9d5ff;
                  color: #6b21a8;
                }
                .badge-gray {
                  background: #f3f4f6;
                  color: #4b5563;
                }
                @media (max-width: 768px) {
                  .info-card[style*="grid-column"] {
                    grid-column: span 1 !important;
                  }
                }
              `}</style>
            </>
          )}

          {tab === 'establecimientos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>Establecimientos</h4>
                <div>
                  <button onClick={() => { setEditEst(null); setOpenNewEst(true); }} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e40af', color: '#fff', border: 'none', cursor: 'pointer' }}>Nuevo</button>
                </div>
              </div>

              <div className="tabla-wrapper estab-table">
                <div className="tabla-scroll-container">
                  <table className="tabla-emisores">
                    <thead>
                      <tr>
                        <th className="th-sticky sticky-left-1 sortable" onClick={() => toggleSortEst('codigo')}>
                          Código {sortByEst === 'codigo' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}
                        </th>
                        <th className="th-sticky sticky-left-2 sortable" onClick={() => toggleSortEst('nombre')}>
                          Nombre {sortByEst === 'nombre' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}
                        </th>
                        <th className="sortable" onClick={() => toggleSortEst('nombre_comercial')} style={{ minWidth: 200 }}>
                          Nombre Comercial {sortByEst === 'nombre_comercial' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}
                        </th>
                        <th className="sortable" onClick={() => toggleSortEst('direccion')} style={{ minWidth: 300 }}>
                          Dirección {sortByEst === 'direccion' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}
                        </th>
                        <th style={{ minWidth: 120 }}>Logo</th>
                        <th className="sortable" onClick={() => toggleSortEst('estado')} style={{ minWidth: 120 }}>
                          Estado {sortByEst === 'estado' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}
                        </th>
                        <th className="th-sticky sticky-right">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedEsts.length === 0 ? (
                        <tr><td className="loading-row" colSpan={7}>No hay establecimientos registrados.</td></tr>
                      ) : paginatedEsts.map((est) => (
                        <tr key={est.id}>
                          <td className="td-sticky sticky-left-1"><Link className="link-ruc" to={`/emisores/${company?.id}/establecimientos/${est.id}`}>{est.codigo}</Link></td>
                          <td className="td-sticky sticky-left-2">{est.nombre}</td>
                          <td style={{ textAlign: 'center' }}>{est.nombre_comercial || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{est.direccion || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {(est.logo_url || est.logo_path || est.logo) ? (
                              <img className="logo-cell" src={est.logo_url || est.logo_path || est.logo} alt="logo" onClick={() => window.open(est.logo_url || est.logo_path || est.logo, '_blank')} />
                            ) : (<span className="logo-placeholder">—</span>)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ background: est.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: est.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{est.estado === 'ABIERTO' ? 'Activo' : 'Cerrado'}</div>
                          </td>
                          <td className="td-sticky sticky-right acciones">
                            <button title="Editar" onClick={() => { navigate(`/emisores/${company?.id}/establecimientos/${est.id}/edit`); }}>✏️</button>
                            <button title="Eliminar" onClick={() => { setDeletingEstId(est.id); setDeleteEstOpen(true); }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                <div className="pagination-controls">
                  <div className="pagination-info">
                    <label>
                      Mostrar
                      <select className="items-per-page-select" value={perPageEst} onChange={(e) => { setPerPageEst(Number(e.target.value)); setPageEst(1); }}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                      </select>
                      por página
                    </label>
                    <span className="page-range">{startIdx}–{endIdx} de {totalEst}</span>
                  </div>

                  <div className="pagination-buttons">
                    <button className="page-btn" onClick={() => setPageEst(1)} disabled={pageEst <= 1}>{'⏮'}</button>
                    <button className="page-btn" onClick={() => setPageEst((p) => Math.max(1, p - 1))} disabled={pageEst <= 1}>{'◀'}</button>
                    <button className="page-btn" onClick={() => setPageEst((p) => Math.min(lastPageEst, p + 1))} disabled={pageEst >= lastPageEst}>{'▶'}</button>
                    <button className="page-btn" onClick={() => setPageEst(lastPageEst)} disabled={pageEst >= lastPageEst}>{'⏭'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'usuarios' && (
            <div>Listado de usuarios (pendiente integrar)</div>
          )}

          {tab === 'planes' && (
            <div>Información de planes (pendiente integrar)</div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EmisorFormModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        editingId={company?.id}
        initialData={company}
        rucEditable={rucEditable}
        onUpdated={(u) => {
          setCompany(u);
          setOpenEdit(false);
          show({ title: 'Éxito', message: 'Emisor actualizado', type: 'success' });
        }}
      />

      <EstablishmentFormModal
        open={openNewEst}
        onClose={() => setOpenNewEst(false)}
        companyId={company?.id}
        onCreated={(est) => {
          show({ title: 'Éxito', message: 'Establecimiento registrado', type: 'success' });
          setOpenNewEst(false);
          loadEstablecimientos(company?.id);
        }}
      />

      {/* Step 1: Confirmation modal (reuses same modal markup as Emisores list) */}
      {confirmOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(620px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de emisor</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 8px', fontWeight: 700 }}>¿Está seguro que desea eliminar al emisor:</p>
            <p style={{ textAlign: 'center', marginTop: 6, marginBottom: 12 }}>
              <span style={{ color: '#c62828', fontWeight: 800, fontSize: 16 }}>{company?.ruc}</span>
              <span> - </span>
              <span style={{ color: '#c62828', fontWeight: 800 }}>{company?.razon_social}</span>
            </p>
            <p style={{ textAlign: 'center', marginTop: 0, marginBottom: 18, fontSize: 15 }}>y todos sus datos asociados?</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="mf-btn-cancel" onClick={() => setConfirmOpen(false)} style={{ padding: '10px 22px', borderRadius: 20 }}>CANCELAR</button>
              <button className="mf-btn-confirm" onClick={() => { setConfirmOpen(false); setPasswordOpen(true); }} style={{ padding: '10px 22px', borderRadius: 20, background: '#ff6b6b' }}>CONFIRMAR</button>
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

      {/* Step 2: Password entry modal (same as Emisores) */}
      {passwordOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(520px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de emisor</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 12px', fontWeight: 600 }}>Ingresa tu clave de administrador para confirmar la eliminación del emisor</p>

            <div style={{ margin: '8px 0 6px' }}>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Clave de administrador"
                style={{ width: '100%', padding: '12px 2px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 16 }}
                autoFocus
              />
              {delError && <div style={{ color: '#b00020', marginTop: 8 }}>{delError}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14 }}>
              <button className="mf-btn-cancel" onClick={() => { setPasswordOpen(false); setPwd(''); }} disabled={delLoading}>CANCELAR</button>
              <button className="mf-btn-confirm" onClick={async () => {
                if (!company) return;
                setDelLoading(true);
                setDelError(null);
                try {
                  if (deleteWithHistory) {
                    await emisoresApi.deletePermanent(company.id, pwd);
                  } else {
                    await emisoresApi.delete(company.id, pwd);
                  }
                  show({ title: 'Éxito', message: 'Emisor eliminado', type: 'success' });
                  navigate('/emisores');
                } catch (err: any) {
                  setDelError(err?.response?.data?.message || 'No se pudo eliminar el emisor');
                } finally {
                  setDelLoading(false);
                }
              }} disabled={delLoading || pwd.length === 0}>{delLoading ? 'Eliminando…' : 'CONFIRMAR'}</button>
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

      {/* Establecimiento delete modal - Step 1: Confirmation */}
      {deleteEstOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(620px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de establecimiento</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 8px', fontWeight: 700 }}>¿Está seguro que desea eliminar el establecimiento:</p>
            <p style={{ textAlign: 'center', marginTop: 6, marginBottom: 12 }}>
              <span style={{ color: '#c62828', fontWeight: 800, fontSize: 16 }}>
                {establecimientos.find(e => e.id === deletingEstId)?.codigo ?? ''}
              </span>
              <span> - </span>
              <span style={{ color: '#c62828', fontWeight: 800 }}>
                {establecimientos.find(e => e.id === deletingEstId)?.nombre ?? ''}
              </span>
            </p>
            <p style={{ textAlign: 'center', marginTop: 0, marginBottom: 18, fontSize: 15 }}>y todos sus datos asociados?</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="mf-btn-cancel" onClick={() => { setDeleteEstOpen(false); setDeletingEstId(null); }} style={{ padding: '10px 22px', borderRadius: 20 }}>CANCELAR</button>
              <button className="mf-btn-confirm" onClick={() => { setDeleteEstOpen(false); setDeleteEstPasswordOpen(true); }} style={{ padding: '10px 22px', borderRadius: 20, background: '#ff6b6b' }}>CONFIRMAR</button>
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

      {/* Establecimiento delete modal - Step 2: Password entry */}
      {deleteEstPasswordOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(520px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de establecimiento</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 12px', fontWeight: 600 }}>Ingresa tu clave de administrador para confirmar la eliminación del establecimiento</p>

            <div style={{ margin: '8px 0 6px' }}>
              <input
                type="password"
                value={deleteEstPassword}
                onChange={(e) => setDeleteEstPassword(e.target.value)}
                placeholder="Clave de administrador"
                style={{ width: '100%', padding: '12px 2px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 16 }}
                autoFocus
              />
              {deleteEstError && <div style={{ color: '#b00020', marginTop: 8 }}>{deleteEstError}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14 }}>
              <button className="mf-btn-cancel" onClick={() => { setDeleteEstPasswordOpen(false); setDeleteEstPassword(''); setDeleteEstError(null); setDeletingEstId(null); }} disabled={deleteEstLoading}>CANCELAR</button>
              <button className="mf-btn-confirm" onClick={async () => {
                if (!company?.id || !deletingEstId) return;
                setDeleteEstLoading(true);
                setDeleteEstError(null);
                try {
                  await establecimientosApi.delete(company.id, deletingEstId, deleteEstPassword);
                  setDeleteEstPasswordOpen(false);
                  setDeletingEstId(null);
                  show({ title: 'Éxito', message: 'Establecimiento eliminado correctamente', type: 'success' });
                  loadEstablecimientos(company.id);
                } catch (err: any) {
                  const msg = err?.response?.data?.message || 'No se pudo eliminar el establecimiento';
                  setDeleteEstError(msg);
                } finally {
                  setDeleteEstLoading(false);
                }
              }} disabled={deleteEstLoading || deleteEstPassword.length === 0}>{deleteEstLoading ? 'Eliminando…' : 'CONFIRMAR'}</button>
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
    </div>
  );
};

export default EmisorInfo;
