import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { establecimientosApi } from '../services/establecimientosApi';
import { puntosEmisionApi } from '../services/puntosEmisionApi';
import { emisoresApi } from '../services/emisoresApi';
import { useNotification } from '../contexts/NotificationContext';
import ImageViewerModal from './ImageViewerModal';
import PuntoEmisionFormModal from './PuntoEmisionFormModal';
import { PuntoEmision } from '../types/puntoEmision';

const EstablecimientoInfo: React.FC = () => {
  const { id, estId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [est, setEst] = React.useState<any | null>(null);
  const [company, setCompany] = React.useState<any | null>(null);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  
  // Delete modal states
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePasswordOpen, setDeletePasswordOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Image viewer states
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);

  // Punto emisión modal states
  const [puntoFormOpen, setPuntoFormOpen] = React.useState(false);
  const [selectedPunto, setSelectedPunto] = React.useState<PuntoEmision | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!id || !estId) return;
      setLoading(true);
      try {
        const [rEst, rComp] = await Promise.all([
          establecimientosApi.show(id, estId),
          emisoresApi.get(id)
        ]);
        const dataEst = rEst.data?.data ?? rEst.data;
        const dataComp = rComp.data?.data ?? rComp.data;
        setEst(dataEst);
        setCompany(dataComp);
      } catch (e:any) {
        show({ title: 'Error', message: 'No se pudo cargar el establecimiento', type: 'error' });
      } finally { setLoading(false); }
    };
    load();
  }, [id, estId, show]);

  if (!id || !estId) return <div>Establecimiento no especificado</div>;

  const openDeleteModal = () => {
    setActionsOpen(false);
    setDeleteOpen(true);
  };

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{est?.nombre ?? '—'} <small style={{ marginLeft: 12, fontWeight: 700 }}>{est?.codigo ?? ''}</small></h2>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="actions-btn"
              onClick={() => setActionsOpen((s) => !s)}
              aria-expanded={actionsOpen}
              style={{ padding: '6px 10px', borderRadius: 8, background: '#1e40af', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Acciones ▾
            </button>
            {actionsOpen && (
              <div role="menu" style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #ddd', boxShadow: '0 6px 18px rgba(0,0,0,.08)', borderRadius: 6, zIndex: 50 }}>
                <button role="menuitem" onClick={() => { setActionsOpen(false); navigate(`/emisores/${id}/establecimientos/${estId}/edit`); }} className="menu-item" style={{ display: 'block', padding: 8, width: 220, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>✏️ Editar establecimiento</button>
                <button role="menuitem" onClick={openDeleteModal} className="menu-item" style={{ display: 'block', padding: 8, width: 220, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️ Eliminar establecimiento</button>
              </div>
            )}
          </div>

          <button onClick={() => navigate(`/emisores/${id}?tab=establecimientos`)} style={{ padding: '8px 12px', borderRadius: 8 }}>Volver</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Emisor</h4>
          <p>
            <strong>RUC:</strong>{' '}
            {company?.id ? (
              <a href={`/emisores/${company.id}`} onClick={(e) => { e.preventDefault(); navigate(`/emisores/${company.id}`); }} style={{ color: '#1b4ab4', fontWeight: 700 }}>{company?.ruc}</a>
            ) : company?.ruc ?? '-'}
          </p>
          <p><strong>Razón Social:</strong> {company?.razon_social ?? '-'}</p>
          <p><strong>Estado:</strong> {company?.estado ? <span style={{ background: company.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: company.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{company.estado === 'ABIERTO' ? 'Activo' : company.estado}</span> : '-'}</p>
        </div>

        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Logo</h4>
          {est?.logo_url ? (
            <img src={est.logo_url} alt="logo" title="Haz clic para ampliar" onClick={() => { 
              console.log('Logo clicked, URL:', est.logo_url); 
              setViewerImage(est.logo_url); 
              setViewerOpen(true); 
            }} style={{ width: '100%', height: 180, objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.2s ease', transform: 'scale(1)' }} onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
          ) : <div style={{ width: '100%', height: 180, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No hay logo</div>}
        </div>

        <div style={{ gridColumn: '1 / -1', border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Datos del establecimiento</h4>
          <p><strong>Código:</strong> {est?.codigo ?? '-'}</p>
          <p><strong>Nombre:</strong> {est?.nombre ?? '-'}</p>
          <p><strong>Nombre comercial:</strong> {est?.nombre_comercial ?? '-'}</p>
          <p><strong>Dirección:</strong> {est?.direccion ?? '-'}</p>
          <p><strong>Estado:</strong> {est?.estado ? <span style={{ background: est.estado === 'ACTIVO' || est.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: est.estado === 'ACTIVO' || est.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{est.estado}</span> : '-'}</p>
        </div>
      </div>

      <div style={{ marginTop: 18, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Lista de puntos de emisión</h4>
          <button 
            onClick={() => { setSelectedPunto(null); setPuntoFormOpen(true); }}
            style={{
              padding: '11px 24px',
              background: 'linear-gradient(135deg, #0d6efd 0%, #0b5fd7 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(13, 110, 253, 0.3)',
              transition: 'all 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '42px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #0b5fd7 0%, #084298 100%)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(13, 110, 253, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #0d6efd 0%, #0b5fd7 100%)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.3)';
            }}
          >
            + Nuevo
          </button>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table className="puntos-table-modern" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
            <thead>
              <tr>
                <th className="th-sticky sticky-left-0">Código</th>
                <th className="th-sticky sticky-left-1">Nombre</th>
                <th className="th-sticky sticky-left-2">Estado</th>
                <th>Secuencial Facturas</th>
                <th>Secuencial Liquidaciones</th>
                <th>Secuencial Notas Crédito</th>
                <th>Secuencial Notas Débito</th>
                <th>Secuencial Guías</th>
                <th>Secuencial Retenciones</th>
                <th>Secuencial Proformas</th>
                <th className="th-sticky sticky-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(est?.puntos_emision) && est.puntos_emision.length > 0 ? (
                est.puntos_emision.map((p:any) => (
                  <tr key={p.id}>
                    <td className="td-sticky sticky-left-0" style={{ fontWeight: 600 }}>
                      <a href={`/emisores/${id}/establecimientos/${estId}/puntos/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/emisores/${id}/establecimientos/${estId}/puntos/${p.id}`); }} style={{ color: '#1b4ab4', textDecoration: 'underline', cursor: 'pointer' }}>{p.codigo}</a>
                    </td>
                    <td className="td-sticky sticky-left-1">{p.nombre}</td>
                    <td className="td-sticky sticky-left-2" style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontWeight: 600,
                        color: '#fff',
                        background: p.estado === 'ACTIVO' ? '#22c55e' : '#9ca3af'
                      }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1b4ab4' }}>{p.secuencial_factura ?? p.secuencial ?? '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1b4ab4' }}>{p.secuencial_liquidacion_compra ?? '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1b4ab4' }}>{p.secuencial_nota_credito ?? '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1b4ab4' }}>{p.secuencial_nota_debito ?? '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1b4ab4' }}>{p.secuencial_guia_remision ?? '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1b4ab4' }}>{p.secuencial_retencion ?? '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1b4ab4' }}>{p.secuencial_proforma ?? '-'}</td>
                    <td className="td-sticky sticky-right" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                        <button title="Editar punto" onClick={() => { setSelectedPunto(p); setPuntoFormOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: 6, borderRadius: 6, transition: 'all 0.2s ease' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.05)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}>✏️</button>
                        <button title="Eliminar punto" onClick={() => { if (window.confirm('¿Eliminar este punto?')) show({ title: 'Info', message: 'Eliminación de punto no implementada en frontend', type: 'info' }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: 6, borderRadius: 6, transition: 'all 0.2s ease' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.05)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ textAlign: 'center', padding: '16px 8px' }} colSpan={11}>No hay puntos de emisión registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <style>{`
          .puntos-table-modern {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }

          /* Columnas fijas: Código, Nombre, Estado */
          .th-sticky.sticky-left-0,
          .td-sticky.sticky-left-0 {
            position: sticky;
            left: 0;
            z-index: 2;
            min-width: 100px;
          }

          .th-sticky.sticky-left-1,
          .td-sticky.sticky-left-1 {
            position: sticky;
            left: 100px;
            z-index: 2;
            min-width: 150px;
          }

          .th-sticky.sticky-left-2,
          .td-sticky.sticky-left-2 {
            position: sticky;
            left: 250px;
            z-index: 2;
            min-width: 130px;
          }

          /* Columna fija: Acciones a la derecha */
          .th-sticky.sticky-right,
          .td-sticky.sticky-right {
            position: sticky;
            right: 0;
            z-index: 2;
            min-width: 100px;
          }

          .puntos-table-modern thead th {
            background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%);
            color: #fff;
            padding: 14px 10px;
            text-align: center;
            border: none;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.1);
            white-space: nowrap;
          }

          .puntos-table-modern thead .th-sticky.sticky-left-0,
          .puntos-table-modern thead .th-sticky.sticky-left-1,
          .puntos-table-modern thead .th-sticky.sticky-left-2 {
            background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%);
            border-right: 1px solid rgba(255, 255, 255, 0.2);
          }

          .puntos-table-modern thead .th-sticky.sticky-right {
            background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            border-right: none;
          }

          .puntos-table-modern tbody td {
            border: none;
            border-bottom: 1px solid #e5e7eb;
            border-right: 1px solid #f3f4f6;
            padding: 12px 10px;
            background: #fff;
            vertical-align: middle;
            text-align: left;
            font-size: 13px;
            white-space: normal;
            word-wrap: break-word;
            transition: background-color 0.2s ease;
            word-break: break-word;
          }

          .puntos-table-modern tbody .td-sticky {
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
          }

          .puntos-table-modern tbody .td-sticky.sticky-right {
            border-right: none;
            background: #f9fafb;
            border-left: 1px solid #f3f4f6;
          }

          .puntos-table-modern tbody tr:hover td {
            background-color: #f3f0ff;
          }

          .puntos-table-modern tbody tr:hover .td-sticky.sticky-left-0,
          .puntos-table-modern tbody tr:hover .td-sticky.sticky-left-1,
          .puntos-table-modern tbody tr:hover .td-sticky.sticky-left-2 {
            background-color: #f3f0ff;
          }

          .puntos-table-modern tbody tr:hover .td-sticky.sticky-right {
            background-color: #ede9fe;
          }
        `}</style>
      </div>

      {/* Step 1: Confirmation modal (shows codigo + nombre) */}
      {deleteOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(620px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de establecimiento</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 8px', fontWeight: 700 }}>¿Está seguro que desea eliminar el establecimiento:</p>
            <p style={{ textAlign: 'center', marginTop: 6, marginBottom: 12 }}>
              <span style={{ color: '#c62828', fontWeight: 800, fontSize: 16 }}>{est?.codigo ?? ''}</span>
              <span> - </span>
              <span style={{ color: '#c62828', fontWeight: 800 }}>{est?.nombre ?? ''}</span>
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

      {/* Step 2: Password entry modal */}
      {deletePasswordOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(520px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de establecimiento</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 12px', fontWeight: 600 }}>Ingresa tu clave de administrador para confirmar la eliminación del establecimiento</p>

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
              <button className="mf-btn-cancel" onClick={() => { setDeletePasswordOpen(false); setDeletePassword(''); setDeleteError(null); }} disabled={deleteLoading}>CANCELAR</button>
              <button className="mf-btn-confirm" onClick={async () => {
                if (!id || !estId) return;
                setDeleteLoading(true);
                setDeleteError(null);
                try {
                  await establecimientosApi.delete(id, estId, deletePassword);
                  setDeletePasswordOpen(false);
                  show({ title: 'Éxito', message: 'Establecimiento eliminado correctamente', type: 'success' });
                  navigate(`/emisores/${id}`);
                } catch (err: any) {
                  const msg = err?.response?.data?.message || 'No se pudo eliminar el establecimiento';
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

      <ImageViewerModal open={viewerOpen} imageUrl={viewerImage} onClose={() => setViewerOpen(false)} />

      <PuntoEmisionFormModal
        isOpen={puntoFormOpen}
        onClose={() => setPuntoFormOpen(false)}
        onSave={async (puntoEmision) => {
          try {
            if (selectedPunto?.id) {
              // Editar
              await puntosEmisionApi.update(company?.id, parseInt(estId || '0'), selectedPunto.id, puntoEmision);
              show({ title: 'Éxito', message: 'Punto de emisión actualizado correctamente', type: 'success' });
            } else {
              // Crear
              await puntosEmisionApi.create(company?.id, parseInt(estId || '0'), puntoEmision);
              show({ title: 'Éxito', message: 'Punto de emisión registrado correctamente', type: 'success' });
            }
            setPuntoFormOpen(false);
            setSelectedPunto(null);
            // Reload establishment data
            if (id && estId) {
              const rEst = await establecimientosApi.show(id, estId);
              const dataEst = rEst.data?.data ?? rEst.data;
              setEst(dataEst);
            }
          } catch (error: any) {
            show({ title: 'Error', message: error?.response?.data?.message || 'No se pudo guardar el punto de emisión', type: 'error' });
          }
        }}
        initialData={selectedPunto}
        companyId={company?.id}
        establecimientoId={parseInt(estId || '0')}
        existingPuntos={est?.puntos_emision || []}
      />
    </div>
  );
};

export default EstablecimientoInfo;
