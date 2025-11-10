import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { emisoresApi } from '../services/emisoresApi';
import EmisorFormModal from './EmisorFormModal';
import { establecimientosApi } from '../services/establecimientosApi';
import { useNotification } from '../contexts/NotificationContext';

const EmisorInfo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [company, setCompany] = React.useState<any | null>(null);
  const [tab, setTab] = React.useState<'emisor'|'establecimientos'|'usuarios'|'planes'>('emisor');
  const [openEdit, setOpenEdit] = React.useState(false);
  const [establecimientos, setEstablecimientos] = React.useState<any[]>([]);
  const [rucEditable, setRucEditable] = React.useState(true);

  // Delete flow states
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [pwd, setPwd] = React.useState('');
  const [delLoading, setDelLoading] = React.useState(false);
  const [delError, setDelError] = React.useState<string | null>(null);
  const [deleteWithHistory, setDeleteWithHistory] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);

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

  // Re-sync header with the dynamic body scroll so header cells (Logo/Estado) stay above their columns
  const bodyScrollRef = React.useRef<HTMLTableCellElement | null>(null);
  const headInnerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const bodyEl = bodyScrollRef.current as unknown as HTMLElement | null;
    const headInner = headInnerRef.current;
    if (!bodyEl || !headInner) return;
    const onScroll = () => {
      try {
        const x = bodyEl.scrollLeft || 0;
        headInner.style.transform = `translateX(${-x}px)`;
      } catch (e) {}
    };
    bodyEl.addEventListener('scroll', onScroll, { passive: true });
    // initial sync
    onScroll();
    return () => { bodyEl.removeEventListener('scroll', onScroll); };
  }, [establecimientos]);

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
                <h4 style={{ marginTop: 0 }}>Datos del RUC</h4>
                <p><strong>RUC:</strong> {company?.ruc ?? '-'}</p>
                <p><strong>Razón social:</strong> {company?.razon_social ?? '-'}</p>
                <p><strong>Nombre comercial:</strong> {company?.nombre_comercial ?? '-'}</p>
                <p><strong>Dirección matriz:</strong> {company?.direccion_matriz ?? '-'}</p>
                <p><strong>Régimen tributario:</strong> {company?.regimen_tributario ?? '-'}</p>
                <p><strong>Obligado contabilidad:</strong> {company?.obligado_contabilidad ?? '-'}</p>
                <p><strong>Contribuyente especial:</strong> {company?.contribuyente_especial ?? '-'}</p>
                <p><strong>Agente retención:</strong> {company?.agente_retencion ?? '-'}</p>
                <p><strong>Tipo de persona:</strong> {company?.tipo_persona ?? '-'}</p>
                <p><strong>Código artesano:</strong> {company?.codigo_artesano ?? '-'}</p>
                <p><strong>Correo remitente:</strong> {company?.correo_remitente ?? '-'}</p>
              </div>
              <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
                <h4 style={{ marginTop: 0 }}>Configuración de la cuenta</h4>
                <p><strong>Ambiente:</strong> {company?.ambiente ?? '-'}</p>
                <p><strong>Tipo de emisión:</strong> {company?.tipo_emision ?? '-'}</p>
                <p><strong>Estado:</strong> {company?.estado ?? '-'}</p>
                <p><strong>Tipo de plan:</strong> {company?.tipo_plan ?? '-'}</p>
                <p><strong>Fecha inicio plan:</strong> {company?.fecha_inicio_plan ?? '-'}</p>
                <p><strong>Fecha fin plan:</strong> {company?.fecha_fin_plan ?? '-'}</p>
                <p><strong>Cantidad creados:</strong> {company?.cantidad_creados ?? '-'}</p>
                <p><strong>Cantidad restantes:</strong> {company?.cantidad_restantes ?? '-'}</p>
                <p><strong>Logo:</strong> {company?.logo_url ? <img src={company.logo_url} alt="logo" style={{ maxWidth: 120, display: 'block', marginTop: 8 }} /> : '-'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1', border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
                <h4 style={{ marginTop: 0 }}>Actividad de la cuenta</h4>
                <p><strong>Fecha de creación:</strong> {company?.created_at ?? '-'}</p>
                <p><strong>Fecha de actualización:</strong> {company?.updated_at ?? '-'}</p>
                <p><strong>Fecha de último comprobante:</strong> {company?.ultimo_comprobante ?? '-'}</p>
                <p><strong>Fecha último inicio de sesión:</strong> {company?.ultimo_login ?? '-'}</p>
                <p><strong>Registrador:</strong> {company?.registrador ?? '-'}</p>
              </div>
            </div>
          )}

          {tab === 'establecimientos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>Establecimientos</h4>
              </div>

              <div className="tabla-wrapper estab-table">
                <table className="tabla-emisores">
                  <thead>
                    <tr>
                      <th className="th-sticky sticky-left-1" style={{ background: '#2931a8', color: '#fff', border: '2px solid #ff8c00', fontWeight: 600 }}>Codigo ▾</th>
                      <th className="th-sticky sticky-left-2" style={{ background: '#2931a8', color: '#fff', border: '2px solid #ff8c00', fontWeight: 600 }}>Nombre ▾</th>
                      <th className="scrollable-columns scrollable-head" style={{ padding: 0, border: 'none' }}>
                        <div style={{ display: 'flex', transform: 'translateX(0)' }} ref={headInnerRef}>
                          <div className="th-dyn" style={{ minWidth: 200, padding: '10px', background: '#2931a8', color: '#fff', border: '2px solid #ff8c00', fontWeight: 600 }}>Nombre Comercial ▾</div>
                          <div className="th-dyn" style={{ minWidth: 300, padding: '10px', background: '#2931a8', color: '#fff', border: '2px solid #ff8c00', fontWeight: 600 }}>Dirección ▾</div>
                          <div className="th-dyn" style={{ minWidth: 120, padding: '10px', background: '#2931a8', color: '#fff', border: '2px solid #ff8c00', fontWeight: 600 }}>Logo ▾</div>
                          <div className="th-dyn" style={{ minWidth: 120, padding: '10px', background: '#2931a8', color: '#fff', border: '2px solid #ff8c00', fontWeight: 600 }}>Estado ▾</div>
                        </div>
                      </th>
                      <th className="th-sticky sticky-right" style={{ background: '#939497ff', color: '#fff', border: '2px solid #ff8c00', fontWeight: 600 }}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {establecimientos.length === 0 ? (
                      <tr><td className="loading-row" colSpan={4}>No hay establecimientos registrados.</td></tr>
                    ) : establecimientos.map((est) => (
                      <tr key={est.id}>
                        <td className="td-sticky sticky-left-1"><Link className="link-ruc" to={`/emisores/${company?.id}/establecimientos/${est.id}`}>{est.codigo}</Link></td>
                        <td className="td-sticky sticky-left-2">{est.nombre}</td>

                        <td className="scrollable-columns scrollable-body" style={{ padding: 0, border: 'none' }} ref={(el) => { bodyScrollRef.current = el; }}>
                          <div style={{ display: 'flex' }}>
                            <div className="td-dyn" style={{ minWidth: 200, padding: '8px 10px', textAlign: 'center' }}>{est.nombre_comercial || '-'}</div>
                            <div className="td-dyn" style={{ minWidth: 300, padding: '8px 10px', textAlign: 'center' }}>{est.direccion || '-'}</div>
                            <div className="td-dyn" style={{ minWidth: 120, padding: '8px 10px', textAlign: 'center' }}>
                              {(
                                est.logo_url || est.logo_path || est.logo
                              ) ? (
                                <img className="logo-cell" src={est.logo_url || est.logo_path || est.logo} alt="logo" onClick={() => window.open(est.logo_url || est.logo_path || est.logo, '_blank')} />
                              ) : (
                                <span className="logo-placeholder">—</span>
                              )}
                            </div>
                            <div className="td-dyn" style={{ minWidth: 120, padding: '8px 10px', textAlign: 'center' }}>
                              <div style={{ background: est.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: est.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{est.estado === 'ABIERTO' ? 'Activo' : 'Cerrado'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="td-sticky sticky-right acciones">
                          <button title="Editar" onClick={() => { navigate(`/emisores/${company?.id}/establecimientos/${est.id}/edit`); }}>✏️</button>
                          <button title="Eliminar" onClick={async () => {
                            if (!window.confirm('Eliminar establecimiento?')) return;
                            try {
                              await establecimientosApi.delete(company?.id, est.id);
                              show({ title: 'Éxito', message: 'Establecimiento eliminado', type: 'success' });
                              loadEstablecimientos(company?.id);
                            } catch (err:any) {
                              show({ title: 'Error', message: err?.response?.data?.message || 'No se pudo eliminar', type: 'error' });
                            }
                          }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Removed custom bottom scrollbar to restore native scrollbar inside the dynamic columns */}
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
    </div>
  );
};

export default EmisorInfo;
