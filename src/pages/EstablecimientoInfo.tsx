import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { establecimientosApi } from '../services/establecimientosApi';
import { puntosEmisionApi } from '../services/puntosEmisionApi';
import { emisoresApi } from '../services/emisoresApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import ImageViewerModal from './ImageViewerModal';
import PuntoEmisionFormModal from './PuntoEmisionFormModal';
import PuntoEmisionDeleteModal from './PuntoEmisionDeleteModal';
import { PuntoEmision } from '../types/puntoEmision';
import { getImageUrl } from '../helpers/imageUrl';
import LoadingSpinner from '../components/LoadingSpinner';
import './UsuarioDeleteModalModern.css';

const EstablecimientoInfo: React.FC = () => {
  const { id, estId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const { user } = useUser();
  const role = user?.role?.toLowerCase?.() ?? '';

  // Normaliza puntos_emision_ids manejando doble JSON y devuelve array
  const userPuntosIds = React.useMemo(() => {
    let ids: any = (user as any)?.puntos_emision_ids ?? [];
    try {
      if (typeof ids === 'string') {
        ids = JSON.parse(ids);
        if (typeof ids === 'string') {
          ids = JSON.parse(ids);
        }
      }
    } catch (e) {
      console.error('❌ Error parseando puntos_emision_ids', e);
      ids = [];
    }
    return Array.isArray(ids) ? ids : [];
  }, [user]);
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

  // Punto emisión delete states
  const [puntoDeleteOpen, setPuntoDeleteOpen] = React.useState(false);
  const [puntoDeletePassword, setPuntoDeletePassword] = React.useState('');
  const [puntoDeleteError, setPuntoDeleteError] = React.useState<string | null>(null);
  const [puntoDeleteLoading, setPuntoDeleteLoading] = React.useState(false);
  const [puntoToDelete, setPuntoToDelete] = React.useState<PuntoEmision | null>(null);

  // Image viewer states
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);

  // Punto emisión modal states
  const [puntoFormOpen, setPuntoFormOpen] = React.useState(false);
  const [selectedPunto, setSelectedPunto] = React.useState<PuntoEmision | null>(null);
  // Emisor con puntos asignados específicos también se considera limitado para el filtro
  const isLimitedRole = role === 'gerente' || role === 'cajero' || (role === 'emisor' && userPuntosIds.length > 0);

  // Filtrado de puntos de emisión
  type PuntoCol = 'codigo'|'nombre'|'estado';
  type PuntoFilterField = 'codigo'|'nombre'|'estado';
  const [activePuntoFilter, setActivePuntoFilter] = React.useState<PuntoFilterField | null>(null);
  const [puntoFilterValue, setPuntoFilterValue] = React.useState<string>('');
  const puntoFilterLabels: Record<PuntoFilterField, string> = {
    codigo: 'Código',
    nombre: 'Nombre',
    estado: 'Estado'
  };

  // Date range filter for puntos
  const [puntoDesde, setPuntoDesde] = React.useState<string>('');
  const [puntoHasta, setPuntoHasta] = React.useState<string>('');
  const [puntosDateOpen, setPuntosDateOpen] = React.useState(false);
  const puntosDateRef = React.useRef<HTMLDivElement | null>(null);
  const puntoDesdeInputRef = React.useRef<HTMLInputElement | null>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  React.useEffect(() => {
    const load = async () => {
      if (!id || !estId) return;
      setLoading(true);
      try {
        const [rEst, rComp] = await Promise.all([
          establecimientosApi.show(id, estId),
          emisoresApi.get(id)
        ]);
        let dataEst = rEst.data?.data ?? rEst.data;
        const dataComp = rComp.data?.data ?? rComp.data;
        
        // Filtrar puntos de emisión para roles limitados (gerente/cajero o emisor con puntos asignados)
        if (user && isLimitedRole && dataEst?.puntos_emision) {
          const user_puntos_ids = userPuntosIds;
          
          console.log('🔍 [EstablecimientoInfo] Filtrando puntos para:', role || user?.role);
          console.log('  📦 puntos_emision_ids (normalizados):', user_puntos_ids);
          console.log('  📍 Puntos antes del filtro:', dataEst.puntos_emision.length);
          
          if (Array.isArray(user_puntos_ids) && user_puntos_ids.length > 0) {
            dataEst.puntos_emision = dataEst.puntos_emision.filter((p: any) => {
              const isAssigned = user_puntos_ids.includes(p.id) ||
                                user_puntos_ids.includes(Number(p.id)) ||
                                user_puntos_ids.includes(String(p.id));
              return isAssigned;
            });
            console.log('  📍 Puntos después del filtro:', dataEst.puntos_emision.length);
          } else {
            console.log('  ⚠️ No hay puntos_emision_ids - mostrando todos');
          }
        }
        
        setEst(dataEst);
        setCompany(dataComp);
      } catch (e:any) {
        show({ title: 'Error', message: 'No se pudo cargar el establecimiento', type: 'error' });
      } finally { setLoading(false); }
    };
    load();
  }, [id, estId, show, user]);

  if (!id || !estId) return <div>Establecimiento no especificado</div>;

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <LoadingSpinner fullHeight message="Cargando establecimiento…" />
      </div>
    );
  }

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
              onClick={() => {
                if (isLimitedRole) return;
                setActionsOpen((s) => !s);
              }}
              aria-expanded={actionsOpen}
              disabled={isLimitedRole}
              title={isLimitedRole ? 'Tu rol no permite modificar establecimientos' : 'Acciones del establecimiento'}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: isLimitedRole ? '#cbd5f5' : '#1e40af',
                color: isLimitedRole ? '#6b7280' : '#fff',
                border: 'none',
                cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                opacity: isLimitedRole ? 0.7 : 1
              }}
            >
              Acciones ▾
            </button>
            {!isLimitedRole && actionsOpen && (
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
            <img src={getImageUrl(est.logo_url)} alt="logo" title="Haz clic para ampliar" onClick={() => { 
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', gap: 12, flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Lista de puntos de emisión</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 300, justifyContent: 'flex-end' }}>
            {/* Filter UI - Text filter */}
            <div style={{ 
              background: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: 6, 
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              flex: 1,
              maxWidth: 400
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {activePuntoFilter === 'estado' ? (
                  <select 
                    value={puntoFilterValue} 
                    onChange={(e) => setPuntoFilterValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: 'none',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      background: 'transparent'
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={activePuntoFilter ? `Filtrar por ${puntoFilterLabels[activePuntoFilter]}` : 'Haz clic en un encabezado para filtrar'}
                    value={puntoFilterValue}
                    onChange={(e) => setPuntoFilterValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: 'none',
                      fontSize: 14,
                      background: 'transparent',
                      outline: 'none'
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 16, color: '#666', flexShrink: 0 }}>🔍</span>
              {activePuntoFilter && puntoFilterValue && (
                <button
                  onClick={() => setPuntoFilterValue('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#666',
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Date range filter */}
            <div className="date-range" ref={puntosDateRef} style={{ position: 'relative' }}>
              <button 
                className="date-range-display"
                onClick={() => setPuntosDateOpen((v) => !v)}
                style={{
                  padding: '8px 12px',
                  background: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#666',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  height: 44
                }}
              >
                <span>{puntoDesde ? formatDate(puntoDesde) : 'Fecha Inicial'}</span>
                <span>→</span>
                <span>{puntoHasta ? formatDate(puntoHasta) : 'Fecha Final'}</span>
              </button>
              {puntosDateOpen && (
                <div 
                  className="date-range-popover"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: 8,
                    padding: 12,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    minWidth: 280
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Desde
                      <input 
                        ref={puntoDesdeInputRef}
                        type="date" 
                        value={puntoDesde} 
                        onChange={(e) => setPuntoDesde(e.target.value)}
                        style={{ padding: '6px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
                      />
                    </label>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Hasta
                      <input 
                        type="date" 
                        value={puntoHasta} 
                        onChange={(e) => setPuntoHasta(e.target.value)}
                        style={{ padding: '6px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setPuntoDesde(''); setPuntoHasta(''); setPuntosDateOpen(false); }}
                      style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#666' }}
                    >
                      Limpiar
                    </button>
                    <button 
                      onClick={() => setPuntosDateOpen(false)}
                      style={{ padding: '6px 12px', background: '#0d6efd', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#fff' }}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear date filter button */}
            {(puntoDesde || puntoHasta) && (
              <button 
                onClick={() => { setPuntoDesde(''); setPuntoHasta(''); }}
                style={{ padding: '4px 8px', background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#dc2626', display: 'flex', alignItems: 'center', height: 44 }}
              >
                ✕
              </button>
            )}

            <button 
              onClick={() => { if (isLimitedRole) return; setSelectedPunto(null); setPuntoFormOpen(true); }}
              disabled={isLimitedRole}
              style={{
                padding: '11px 24px',
                background: isLimitedRole 
                  ? '#ccc' 
                  : 'linear-gradient(135deg, #0d6efd 0%, #0b5fd7 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                boxShadow: isLimitedRole 
                  ? 'none' 
                  : '0 4px 12px rgba(13, 110, 253, 0.3)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '44px',
                whiteSpace: 'nowrap',
                opacity: isLimitedRole ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLimitedRole) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #0b5fd7 0%, #084298 100%)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(13, 110, 253, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLimitedRole) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #0d6efd 0%, #0b5fd7 100%)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.3)';
                }
              }}
              title={isLimitedRole ? 'Tu rol no permite crear puntos de emisión' : 'Crear nuevo punto de emisión'}
            >
              + Nuevo
            </button>
          </div>
        </div>
        {activePuntoFilter && (
          <div style={{ padding: '8px 20px', background: '#f8f9fa', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#666' }}>
            Buscando por {puntoFilterLabels[activePuntoFilter]}
            {puntoFilterValue && (
              <button
                onClick={() => { setPuntoFilterValue(''); }}
                style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#1e40af', cursor: 'pointer', fontSize: 12 }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table className="puntos-table-modern" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
            <thead>
              <tr>
                <th 
                  className="th-sticky sticky-left-0" 
                  onClick={() => {
                    setActivePuntoFilter('codigo');
                    setPuntoFilterValue('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Código {activePuntoFilter === 'codigo' && <span style={{ color: '#ff8c00' }}>●</span>}
                </th>
                <th 
                  className="th-sticky sticky-left-1" 
                  onClick={() => {
                    setActivePuntoFilter('nombre');
                    setPuntoFilterValue('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Nombre {activePuntoFilter === 'nombre' && <span style={{ color: '#ff8c00' }}>●</span>}
                </th>
                <th 
                  className="th-sticky sticky-left-2" 
                  onClick={() => {
                    setActivePuntoFilter('estado');
                    setPuntoFilterValue('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Estado {activePuntoFilter === 'estado' && <span style={{ color: '#ff8c00' }}>●</span>}
                </th>
                <th>Secuencial Facturas</th>
                <th>Secuencial Liquidaciones</th>
                <th>Secuencial Notas Crédito</th>
                <th>Secuencial Notas Débito</th>
                <th>Secuencial Guías</th>
                <th>Secuencial Retenciones</th>
                <th>Secuencial Proformas</th>
                <th>Fecha de creación</th>
                <th>Fecha de actualización</th>
                <th className="th-sticky sticky-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(est?.puntos_emision) && est.puntos_emision.length > 0 ? (
                est.puntos_emision.filter((p: any) => {
                  // NOTE: Filter by puntos_emision_ids is already applied in useEffect
                  // This filter only handles text search and date range
                  
                  // Filter by text search
                  if (activePuntoFilter && puntoFilterValue) {
                    if (activePuntoFilter === 'estado') {
                      if ((p.estado || '').toLowerCase() !== puntoFilterValue.toLowerCase()) return false;
                    } else {
                      const fieldValue = (p[activePuntoFilter] || '').toString().toLowerCase();
                      if (!fieldValue.includes(puntoFilterValue.toLowerCase())) return false;
                    }
                  }
                  
                  // Filter by date range
                  if (puntoDesde || puntoHasta) {
                    const createdDate = p.created_at ? new Date(p.created_at) : null;
                    if (createdDate) {
                      const createdTime = createdDate.getTime();
                      if (puntoDesde) {
                        const desdeDate = new Date(puntoDesde);
                        desdeDate.setHours(0, 0, 0, 0);
                        if (createdTime < desdeDate.getTime()) return false;
                      }
                      if (puntoHasta) {
                        const hastaDate = new Date(puntoHasta);
                        hastaDate.setHours(23, 59, 59, 999);
                        if (createdTime > hastaDate.getTime()) return false;
                      }
                    } else {
                      return false;
                    }
                  }
                  
                  return true;
                }).map((p:any) => (
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
                    <td style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="td-sticky sticky-right" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          title={isLimitedRole ? 'Tu rol no permite editar puntos de emisión' : 'Editar punto'}
                          disabled={isLimitedRole}
                          onClick={() => {
                            if (isLimitedRole) return;
                            setSelectedPunto(p);
                            setPuntoFormOpen(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                            fontSize: 18,
                            padding: 6,
                            borderRadius: 6,
                            transition: 'all 0.2s ease',
                            opacity: isLimitedRole ? 0.4 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (isLimitedRole) return;
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.05)';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            if (isLimitedRole) return;
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          title={isLimitedRole ? 'Tu rol no permite eliminar puntos de emisión' : 'Eliminar punto'}
                          disabled={isLimitedRole}
                          onClick={() => {
                            if (isLimitedRole) return;
                            setPuntoToDelete(p);
                            setPuntoDeleteOpen(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                            fontSize: 18,
                            padding: 6,
                            borderRadius: 6,
                            transition: 'all 0.2s ease',
                            opacity: isLimitedRole ? 0.4 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (isLimitedRole) return;
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.05)';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            if (isLimitedRole) return;
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ textAlign: 'center', padding: '16px 8px' }} colSpan={13}>No hay puntos de emisión registrados</td>
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
            pointer-events: auto;
          }

          .th-sticky.sticky-left-1,
          .td-sticky.sticky-left-1 {
            position: sticky;
            left: 100px;
            z-index: 2;
            min-width: 150px;
            pointer-events: auto;
          }

          .th-sticky.sticky-left-2,
          .td-sticky.sticky-left-2 {
            position: sticky;
            left: 250px;
            z-index: 2;
            min-width: 130px;
            pointer-events: auto;
          }

          /* Columna fija: Acciones a la derecha */
          .th-sticky.sticky-right,
          .td-sticky.sticky-right {
            position: sticky;
            right: 0;
            z-index: 2;
            min-width: 100px;
            pointer-events: auto;
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
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>
                <span className="icon">⚠️</span>
                Eliminar establecimiento
              </h2>
              <button 
                className="delete-modal-close" 
                onClick={() => setDeleteOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              <p className="delete-confirmation-text">
                ¿Está seguro que desea eliminar el establecimiento:
              </p>
              <p style={{ textAlign: 'center', marginTop: 12, marginBottom: 20, fontSize: 18 }}>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{est?.codigo ?? ''}</span>
                <span style={{ fontWeight: 600 }}> - </span>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{est?.nombre ?? ''}</span>
              </p>
              <p className="delete-info-text" style={{ textAlign: 'center' }}>
                y todos sus datos asociados?
              </p>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => setDeleteOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={() => { setDeleteOpen(false); setDeletePasswordOpen(true); }}
              >
                🗑️ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Password entry modal */}
      {deletePasswordOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>
                <span className="icon">🔒</span>
                Verificar contraseña
              </h2>
              <button 
                className="delete-modal-close" 
                onClick={() => { 
                  setDeletePasswordOpen(false); 
                  setDeletePassword(''); 
                  setDeleteError(null); 
                }}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              <p className="delete-password-text">
                Ingresa tu clave de administrador para confirmar la eliminación del establecimiento
              </p>

              <div className="delete-form-group">
                <label htmlFor="delete-password" className="delete-form-label">
                  Clave de administrador *
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className={deleteError ? 'delete-form-input error' : 'delete-form-input'}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && deletePassword && !deleteLoading) {
                      (async () => {
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
                      })();
                    }
                  }}
                />
                {deleteError && (
                  <span className="delete-error-text">
                    <span className="icon">⚠</span>
                    {deleteError}
                  </span>
                )}
              </div>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => { 
                  setDeletePasswordOpen(false); 
                  setDeletePassword(''); 
                  setDeleteError(null); 
                }} 
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={async () => {
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
                }} 
                disabled={deleteLoading || deletePassword.length === 0}
              >
                {deleteLoading ? 'Eliminando…' : '🗑️ Eliminar'}
              </button>
            </div>
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

      <PuntoEmisionDeleteModal
        isOpen={puntoDeleteOpen}
        onClose={() => {
          setPuntoDeleteOpen(false);
          setPuntoToDelete(null);
          setPuntoDeletePassword('');
          setPuntoDeleteError(null);
        }}
        onSuccess={async () => {
          // Reload establishment data
          if (id && estId) {
            const rEst = await establecimientosApi.show(id, estId);
            const dataEst = rEst.data?.data ?? rEst.data;
            setEst(dataEst);
          }
        }}
        punto={puntoToDelete}
        companyId={company?.id}
        establecimientoId={parseInt(estId || '0')}
        onError={(message) => {
          show({ title: 'Error', message: message, type: 'error' });
        }}
        onSuccess_notification={(message) => {
          show({ title: 'Éxito', message: message, type: 'success' });
        }}
      />
    </div>
  );
};

export default EstablecimientoInfo;
