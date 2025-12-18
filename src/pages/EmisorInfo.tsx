import React from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { emisoresApi } from '../services/emisoresApi';
import EmisorFormModal from './EmisorFormModal';
import EstablishmentFormModal from './EstablishmentFormModal';
import EmisorUsuarioFormModal from './EmisorUsuarioFormModal';
import EmisorUsuariosList from './EmisorUsuariosList';
import UsuarioDetailModal from './UsuarioDetailModal';
import SuscripcionesList from './SuscripcionesList';
import { establecimientosApi } from '../services/establecimientosApi';
import { puntosEmisionApi } from '../services/puntosEmisionApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import ImageViewerModal from './ImageViewerModal';
import './Emisores.css';
import './UsuarioDeleteModalModern.css';
import './EstablecimientosTab.css';
import { getImageUrl } from '../helpers/imageUrl';
import { User } from '../types/user';
import LoadingSpinner from '../components/LoadingSpinner';
import { usuariosApi } from '../services/usuariosApi';
import { usuariosEmisorApi } from '../services/usuariosEmisorApi';

const EmisorInfo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useNotification();
  const { user } = useUser();
  const role = user?.role?.toLowerCase?.() ?? '';
  const [loading, setLoading] = React.useState(false);
  const [company, setCompany] = React.useState<any | null>(null);
  const [tab, setTab] = React.useState<'emisor'|'establecimientos'|'usuarios'|'suscripciones'>('emisor');
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openNewEst, setOpenNewEst] = React.useState(false);
  const [editEst, setEditEst] = React.useState<any | null>(null);
  const [establecimientos, setEstablecimientos] = React.useState<any[]>([]);
  const [rucEditable, setRucEditable] = React.useState(true);
  
  // Estados para usuarios del emisor
  const [openNewUser, setOpenNewUser] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);
  const [puntosEmision, setPuntosEmision] = React.useState<any[]>([]);
  const [refreshUsers, setRefreshUsers] = React.useState(0);
  const isLimitedRole = role === 'gerente' || role === 'cajero';
  const [distributorCreator, setDistributorCreator] = React.useState<User | null>(null);
  
  // Estado para modal de detalle de usuario
  const [selectedUserDetail, setSelectedUserDetail] = React.useState<User | null>(null);
  const [openUserDetail, setOpenUserDetail] = React.useState(false);
  const [loadingUserDetail, setLoadingUserDetail] = React.useState(false);

  // Handler para abrir el detalle de un usuario
  const handleOpenUserDetail = React.useCallback(async (usuario: User) => {
    setLoadingUserDetail(true);
    setOpenUserDetail(true);
    
    try {
      // Fetch detailed user data using emisor-specific API
      const userRes = await usuariosEmisorApi.get(id!, usuario.id!);
      let userData = userRes.data?.data ?? userRes.data;
      
      // Add emisor info from current company context
      if (company) {
        userData = {
          ...userData,
          emisor_id: company.id,
          emisor_ruc: company.ruc,
          emisor_razon_social: company.razon_social,
          emisor_estado: company.estado
        };
      }
      
      setSelectedUserDetail(userData);
    } catch (error: any) {
      console.error('Error loading user details:', error);
      show({ title: 'Error', message: 'No se pudo cargar la información del usuario', type: 'error' });
      setOpenUserDetail(false);
    } finally {
      setLoadingUserDetail(false);
    }
  }, [id, company, show]);

  // Detectar si viene de un establecimiento para mostrar la pestaña de establecimientos
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl === 'establecimientos') {
      setTab('establecimientos');
    }
  }, [location.search]);

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
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);
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
      let data = r.data?.data ?? r.data ?? [];
      
      console.log('📋 Establecimientos cargados desde API:', data);
      console.log('👤 Usuario actual:', user);
      
      // Si el usuario es gerente o cajero, filtrar establecimientos asignados
      if (user && isLimitedRole) {
        let user_establecimientos_ids = (user as any).establecimientos_ids || [];
        
        console.log('🔍 establecimientos_ids RAW:', user_establecimientos_ids);
        console.log('🔍 Tipo de establecimientos_ids:', typeof user_establecimientos_ids);
        
        // Si es JSON string, parsearlo
        if (typeof user_establecimientos_ids === 'string') {
          try {
            user_establecimientos_ids = JSON.parse(user_establecimientos_ids);
            console.log('✅ Parseado exitoso:', user_establecimientos_ids);
          } catch (e) {
            console.error('❌ Error parsing establecimientos_ids:', e);
            user_establecimientos_ids = [];
          }
        }
        
        console.log('📍 Usuario establecimientos asignados (final):', user_establecimientos_ids);
        console.log('📍 Es array?', Array.isArray(user_establecimientos_ids));
        console.log('📍 Longitud:', user_establecimientos_ids.length);
        
        if (Array.isArray(user_establecimientos_ids) && user_establecimientos_ids.length > 0) {
          const dataAntes = data.length;
          data = data.filter((est: any) => {
            const match = user_establecimientos_ids.includes(est.id) || 
                         user_establecimientos_ids.includes(String(est.id)) ||
                         user_establecimientos_ids.includes(Number(est.id));
            console.log(`🔎 Establecimiento ${est.id} (${est.nombre}): ${match ? '✅ INCLUIDO' : '❌ EXCLUIDO'}`);
            return match;
          });
          console.log(`🎯 Filtrado: ${dataAntes} → ${data.length} establecimientos`);
        } else {
          console.warn('⚠️ No hay establecimientos asignados o el array está vacío');
        }
      }
      
      setEstablecimientos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Error cargando establecimientos:', e);
      setEstablecimientos([]);
    }
  }, [user, isLimitedRole, role]);

  const loadPuntosEmision = React.useCallback(async (companyId?: number | string) => {
    if (!companyId) return;
    try {
      // Cargar todos los puntos de emisión de los establecimientos accesibles
      // forAssignment=true hace que el backend devuelva todos los puntos de los establecimientos
      // asignados al usuario, no solo los puntos específicos asignados
      const r = await puntosEmisionApi.listByEmisor(companyId, true);
      let data = r.data?.data ?? r.data ?? [];
      
      setPuntosEmision(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading puntos de emisión:', e);
      setPuntosEmision([]);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { 
    if (company?.id) {
      loadEstablecimientos(company.id);
      loadPuntosEmision(company.id);
    }
  }, [company, loadEstablecimientos, loadPuntosEmision]);

  React.useEffect(() => {
    let cancelled = false;

    const fetchDistributor = async () => {
      if (role !== 'administrador' || !company?.created_by) {
        if (!cancelled) setDistributorCreator(null);
        return;
      }

      try {
        const res = await usuariosApi.get(company.created_by);
        const creatorData = res.data?.data ?? res.data;
        if (!cancelled) {
          if (creatorData?.role === 'distribuidor') {
            setDistributorCreator(creatorData);
          } else {
            setDistributorCreator(null);
          }
        }
      } catch (error) {
        if (!cancelled) setDistributorCreator(null);
      }
    };

    fetchDistributor();

    return () => {
      cancelled = true;
    };
  }, [company?.created_by, role]);

  // Sorting and pagination state for establecimientos
  type EstCol = 'codigo'|'nombre'|'nombre_comercial'|'direccion'|'estado';
  type EstFilterField = 'codigo'|'nombre'|'nombre_comercial'|'direccion'|'estado';
  const [sortByEst, setSortByEst] = React.useState<EstCol>('codigo');
  const [sortDirEst, setSortDirEst] = React.useState<'asc'|'desc'>('asc');
  const [pageEst, setPageEst] = React.useState(1);
  const [perPageEst, setPerPageEst] = React.useState(10);
  const [activeEstFilter, setActiveEstFilter] = React.useState<EstFilterField | null>(null);
  const [estFilterValue, setEstFilterValue] = React.useState<string>('');

  const estFilterLabels: Record<EstFilterField, string> = {
    codigo: 'Código',
    nombre: 'Nombre',
    nombre_comercial: 'Nombre Comercial',
    direccion: 'Dirección',
    estado: 'Estado'
  };

  const toggleSortEst = (col: EstCol) => {
    setPageEst(1);
    if (sortByEst === col) {
      setSortDirEst((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortByEst(col);
      setSortDirEst('asc');
    }
  };

  const filteredEsts = React.useMemo(() => {
    if (!activeEstFilter || !estFilterValue) return establecimientos;
    
    const filterVal = estFilterValue.toLowerCase();
    return establecimientos.filter(est => {
      if (activeEstFilter === 'estado') {
        return (est.estado || '').toLowerCase() === filterVal;
      }
      const fieldValue = (est[activeEstFilter] || '').toString().toLowerCase();
      return fieldValue.includes(filterVal);
    });
  }, [establecimientos, activeEstFilter, estFilterValue]);

  const sortedEsts = React.useMemo(() => {
    const data = [...filteredEsts];
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
  }, [filteredEsts, sortByEst, sortDirEst]);

  const paginatedEsts = React.useMemo(() => {
    const start = (pageEst - 1) * perPageEst;
    return sortedEsts.slice(start, start + perPageEst);
  }, [sortedEsts, pageEst, perPageEst]);

  const totalEst = filteredEsts.length;
  const startIdx = totalEst === 0 ? 0 : (pageEst - 1) * perPageEst + 1;
  const endIdx = Math.min(pageEst * perPageEst, totalEst);
  const lastPageEst = Math.max(1, Math.ceil(Math.max(1, totalEst) / perPageEst));
  React.useEffect(() => { if (pageEst > lastPageEst) setPageEst(lastPageEst); }, [lastPageEst, pageEst]);

  const canEditEst = React.useCallback((est: any) => {
    if (!user || isLimitedRole) return false;
    if (role === 'administrador') return true;
    if (role === 'distribuidor') {
      return est.created_by === user.id;
    }
    // Emisor puede editar:
    // 1. Establecimientos que creó
    // 2. Establecimientos de su emisor asignado (si el emisor es el suyo)
    if (role === 'emisor' && company) {
      // Si el company.id es su emisor_id, puede editar
      return est.created_by === user.id || company.id === (user as any).emisor_id;
    }
    return false;
  }, [user, company, isLimitedRole, role]);

  if (!id) return <div>Emisor no especificado</div>;

  if (loading) {
    return (
      <div className="emisores-page">
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h2 style={{ margin: 0 }}>{company?.ruc ?? '—'} <small style={{ marginLeft: 12, fontWeight: 700 }}>{company?.razon_social ?? ''}</small></h2>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
            {tab === 'emisor' && (
              isLimitedRole ? (
                <button
                  className="actions-btn"
                  disabled
                  title="Tu rol no permite realizar acciones sobre el emisor"
                  style={{
                    background: '#cbd5f5',
                    color: '#6b7280',
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'not-allowed',
                    fontWeight: 700,
                    opacity: 0.7
                  }}
                >
                  Acciones ▾
                </button>
              ) : (
                <>
                  <button
                    className="actions-btn"
                    onClick={() => setActionsOpen((s) => !s)}
                    aria-expanded={actionsOpen}
                    aria-haspopup="menu"
                    style={{ background: '#1e40af', color: '#fff', padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Acciones ▾
                  </button>

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
                </>
              )
            )}

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
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
          <nav style={{ display: 'flex', gap: 12 }}>
          {(['emisor','establecimientos','usuarios','suscripciones'] as const).map((t) => (
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
              {t === 'emisor' ? 'Emisor' : t === 'establecimientos' ? 'Establecimientos' : t === 'usuarios' ? 'Usuarios' : 'Suscripciones'}
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
                    <h3 className="card-title">Identificación</h3>
                  </div>
                  <div className="card-body">
                    <div className="info-row"><span className="info-label">Nro. RUC:</span><span className="info-value">{company?.ruc ?? '-'}</span></div>
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
                    {/* Plan details moved to 'Planes' tab to avoid duplication */}
                    <div className="info-row" style={{ alignItems: 'flex-start', marginTop: 12 }}>
                      <span className="info-label">Logo:</span>
                      <div className="info-value">
                        {company?.logo_url ? (
                          <img 
                            src={getImageUrl(company.logo_url)} 
                            alt="logo" 
                            style={{ maxWidth: 150, maxHeight: 150, borderRadius: 8, border: '2px solid #e5e7eb', padding: 8, background: '#fff', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onClick={() => { 
                              console.log('Logo clicked, URL:', company.logo_url); 
                              setViewerImage(company.logo_url); 
                              setViewerOpen(true); 
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            title="Haz clic para ampliar"
                          />
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
                    <div className="info-row"><span className="info-label">Registrador:</span><span className="info-value">{company?.created_by_username ?? company?.registrador ?? '-'}</span></div>
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
            <div className="est-tab-container">
              {/* Stats Cards */}
              <div className="est-stats-grid">
                <div className="est-stat-card total">
                  <div className="est-stat-icon total">🏢</div>
                  <div className="est-stat-content">
                    <div className="est-stat-value">{establecimientos.length}</div>
                    <div className="est-stat-label">Total Establecimientos</div>
                  </div>
                </div>
                <div className="est-stat-card activos">
                  <div className="est-stat-icon activos">✓</div>
                  <div className="est-stat-content">
                    <div className="est-stat-value">{establecimientos.filter(e => e.estado === 'ABIERTO').length}</div>
                    <div className="est-stat-label">Activos</div>
                  </div>
                </div>
                <div className="est-stat-card cerrados">
                  <div className="est-stat-icon cerrados">⏸</div>
                  <div className="est-stat-content">
                    <div className="est-stat-value">{establecimientos.filter(e => e.estado !== 'ABIERTO').length}</div>
                    <div className="est-stat-label">Cerrados</div>
                  </div>
                </div>
                <div className="est-stat-card usuarios">
                  <div className="est-stat-icon usuarios">👥</div>
                  <div className="est-stat-content">
                    <div className="est-stat-value">{establecimientos.reduce((acc, e) => acc + (e.usuarios?.length || 0), 0)}</div>
                    <div className="est-stat-label">Usuarios Asociados</div>
                  </div>
                </div>
              </div>

              {/* Filtros colapsables */}
              <div className="est-filters-section">
                <div 
                  className="est-filters-header" 
                  onClick={() => setActiveEstFilter(activeEstFilter ? null : 'codigo')}
                >
                  <div className="est-filters-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                    </svg>
                    Filtros
                    {estFilterValue && <span className="est-filters-badge">1 activo</span>}
                  </div>
                  <button className={`est-filters-toggle ${activeEstFilter ? 'open' : ''}`}>
                    {activeEstFilter ? 'Ocultar' : 'Mostrar'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  </button>
                </div>
                <div className={`est-filters-body ${activeEstFilter ? 'open' : ''}`}>
                  <div className="est-filters-grid">
                    <div className="est-filter-group">
                      <label className="est-filter-label">Código</label>
                      <input
                        type="text"
                        className="est-filter-input"
                        placeholder="Buscar por código..."
                        value={activeEstFilter === 'codigo' ? estFilterValue : ''}
                        onChange={(e) => { setActiveEstFilter('codigo'); setEstFilterValue(e.target.value); }}
                      />
                    </div>
                    <div className="est-filter-group">
                      <label className="est-filter-label">Nombre</label>
                      <input
                        type="text"
                        className="est-filter-input"
                        placeholder="Buscar por nombre..."
                        value={activeEstFilter === 'nombre' ? estFilterValue : ''}
                        onChange={(e) => { setActiveEstFilter('nombre'); setEstFilterValue(e.target.value); }}
                      />
                    </div>
                    <div className="est-filter-group">
                      <label className="est-filter-label">Nombre Comercial</label>
                      <input
                        type="text"
                        className="est-filter-input"
                        placeholder="Buscar por nombre comercial..."
                        value={activeEstFilter === 'nombre_comercial' ? estFilterValue : ''}
                        onChange={(e) => { setActiveEstFilter('nombre_comercial'); setEstFilterValue(e.target.value); }}
                      />
                    </div>
                    <div className="est-filter-group">
                      <label className="est-filter-label">Dirección</label>
                      <input
                        type="text"
                        className="est-filter-input"
                        placeholder="Buscar por dirección..."
                        value={activeEstFilter === 'direccion' ? estFilterValue : ''}
                        onChange={(e) => { setActiveEstFilter('direccion'); setEstFilterValue(e.target.value); }}
                      />
                    </div>
                    <div className="est-filter-group">
                      <label className="est-filter-label">Estado</label>
                      <select
                        className="est-filter-select"
                        value={activeEstFilter === 'estado' ? estFilterValue : ''}
                        onChange={(e) => { setActiveEstFilter('estado'); setEstFilterValue(e.target.value); }}
                      >
                        <option value="">Todos los estados</option>
                        <option value="abierto">Abierto</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    </div>
                  </div>
                  {estFilterValue && (
                    <div className="est-filters-actions">
                      <button 
                        className="est-btn-clear-filters"
                        onClick={() => { setEstFilterValue(''); setActiveEstFilter(null); }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Header con botón nuevo */}
              <div className="est-header-row">
                <div className="est-header-title">
                  Establecimientos
                  <span className="est-count">{filteredEsts.length}</span>
                </div>
                <button 
                  className="est-btn-nuevo"
                  onClick={() => { setEditEst(null); setOpenNewEst(true); }} 
                  disabled={isLimitedRole}
                  title={isLimitedRole ? 'Los gerentes y cajeros no pueden crear establecimientos' : 'Crear nuevo establecimiento'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Nuevo Establecimiento
                </button>
              </div>

              {/* Tabla moderna */}
              <div className="est-table-container">
                <div className="est-table-wrapper">
                  <table className="est-table">
                    <thead>
                      <tr>
                        <th 
                          className="sortable" 
                          onClick={() => toggleSortEst('codigo')}
                        >
                          Código 
                          <span className="sort-icon">{sortByEst === 'codigo' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}</span>
                        </th>
                        <th 
                          className="sortable" 
                          onClick={() => toggleSortEst('nombre')}
                        >
                          Nombre 
                          <span className="sort-icon">{sortByEst === 'nombre' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}</span>
                        </th>
                        <th 
                          className="sortable" 
                          onClick={() => toggleSortEst('nombre_comercial')}
                        >
                          N. Comercial 
                          <span className="sort-icon">{sortByEst === 'nombre_comercial' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}</span>
                        </th>
                        <th>Dirección</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th>Logo</th>
                        <th 
                          className="sortable" 
                          onClick={() => toggleSortEst('estado')}
                        >
                          Estado 
                          <span className="sort-icon">{sortByEst === 'estado' ? (sortDirEst === 'asc' ? '▲' : '▼') : '▾'}</span>
                        </th>
                        <th>Usuarios</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedEsts.length === 0 ? (
                        <tr>
                          <td colSpan={10}>
                            <div className="est-empty-state">
                              <div className="est-empty-icon">🏢</div>
                              <div className="est-empty-title">No hay establecimientos</div>
                              <div className="est-empty-text">
                                {estFilterValue ? 'No se encontraron resultados con los filtros aplicados' : 'Aún no se han registrado establecimientos'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedEsts.map((est) => (
                        <tr key={est.id}>
                          <td>
                            <Link className="est-codigo-link" to={`/emisores/${company?.id}/establecimientos/${est.id}`}>
                              {est.codigo}
                            </Link>
                          </td>
                          <td><span className="est-nombre">{est.nombre}</span></td>
                          <td>{est.nombre_comercial || '-'}</td>
                          <td>
                            <span className="est-direccion" title={est.direccion}>
                              {est.direccion || '-'}
                            </span>
                          </td>
                          <td>
                            <span className="est-email">
                              {est.correo ? (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                  </svg>
                                  {est.correo}
                                </>
                              ) : '-'}
                            </span>
                          </td>
                          <td>{est.telefono || '-'}</td>
                          <td>
                            <div className="est-logo-cell">
                              {(est.logo_url || est.logo_path || est.logo) ? (
                                <img 
                                  className="est-logo-img"
                                  src={getImageUrl(est.logo_url || est.logo_path || est.logo)} 
                                  alt="logo" 
                                  onClick={() => { setViewerImage(est.logo_url || est.logo_path || est.logo); setViewerOpen(true); }}
                                  title="Haz clic para ampliar"
                                />
                              ) : (
                                <span className="est-logo-placeholder">—</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`est-estado-badge ${est.estado === 'ABIERTO' ? 'activo' : 'cerrado'}`}>
                              {est.estado === 'ABIERTO' ? 'Activo' : 'Cerrado'}
                            </span>
                          </td>
                          <td>
                            {est.usuarios && est.usuarios.length > 0 ? (
                              <div className="est-usuarios-list">
                                {est.usuarios.slice(0, 3).map((usr: any, idx: number) => (
                                  <div key={idx} className="est-usuario-item">
                                    <span className={`est-usuario-role ${usr.role?.toLowerCase() || ''}`}>
                                      {usr.role?.substring(0, 3).toUpperCase() || '?'}
                                    </span>
                                    <a 
                                      href="#" 
                                      className="est-usuario-link"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleOpenUserDetail(usr);
                                      }}
                                    >
                                      {usr.username || 'N/A'}
                                    </a>
                                  </div>
                                ))}
                                {est.usuarios.length > 3 && (
                                  <span style={{ fontSize: 12, color: '#6b7280' }}>+{est.usuarios.length - 3} más</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>Sin usuarios</span>
                            )}
                          </td>
                          <td>
                            <div className="est-actions">
                              <button 
                                className="est-action-btn edit"
                                title={canEditEst(est) ? "Editar" : "No tienes permisos para editar"}
                                disabled={!canEditEst(est)}
                                onClick={() => { setEditEst(est); }}
                              >
                                ✏️
                              </button>
                              <button 
                                className="est-action-btn delete"
                                title={canEditEst(est) ? "Eliminar" : "No tienes permisos para eliminar"}
                                disabled={!canEditEst(est)}
                                onClick={() => { setDeletingEstId(est.id); setDeleteEstOpen(true); }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación moderna */}
                <div className="est-pagination">
                  <div className="est-pagination-info">
                    <label>
                      Mostrar
                      <select 
                        className="est-per-page-select" 
                        value={perPageEst} 
                        onChange={(e) => { setPerPageEst(Number(e.target.value)); setPageEst(1); }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                      </select>
                      por página
                    </label>
                    <span className="est-page-range">{startIdx}–{endIdx} de {totalEst}</span>
                  </div>

                  <div className="est-pagination-buttons">
                    <button className="est-page-btn" onClick={() => setPageEst(1)} disabled={pageEst <= 1}>⏮</button>
                    <button className="est-page-btn" onClick={() => setPageEst((p) => Math.max(1, p - 1))} disabled={pageEst <= 1}>◀</button>
                    <button className="est-page-btn" onClick={() => setPageEst((p) => Math.min(lastPageEst, p + 1))} disabled={pageEst >= lastPageEst}>▶</button>
                    <button className="est-page-btn" onClick={() => setPageEst(lastPageEst)} disabled={pageEst >= lastPageEst}>⏭</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'usuarios' && (
            <EmisorUsuariosList
              emiId={company?.id}
              onEdit={(u) => {
                setEditUser(u);
                setOpenNewUser(true);
              }}
              onOpenModal={() => {
                setEditUser(null);
                setOpenNewUser(true);
              }}
              onViewDetail={handleOpenUserDetail}
              refreshTrigger={refreshUsers}
              distributorCreator={distributorCreator}
            />
          )}

          {tab === 'suscripciones' && company?.id && (
            <SuscripcionesList emisorId={company.id} />
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

      {editEst && (
        <EstablishmentFormModal
          open={!!editEst}
          onClose={() => setEditEst(null)}
          companyId={company?.id}
          editingEst={editEst}
          codigoEditable={editEst?.codigo_editable ?? true}
          onUpdated={(updated) => {
            show({ title: 'Éxito', message: 'Establecimiento actualizado', type: 'success' });
            setEditEst(null);
            loadEstablecimientos(company?.id);
          }}
        />
      )}

      {/* Usuario Detail Modal */}
      <UsuarioDetailModal
        open={openUserDetail}
        onClose={() => {
          setOpenUserDetail(false);
          setSelectedUserDetail(null);
        }}
        user={selectedUserDetail}
        loading={loadingUserDetail}
      />

      {/* Usuario Emisor Modal */}
      <EmisorUsuarioFormModal
        open={openNewUser}
        onClose={() => {
          setOpenNewUser(false);
          setEditUser(null);
        }}
        emiId={company?.id}
        editingId={editUser?.id}
        initialData={editUser}
        establecimientos={establecimientos}
        puntosEmision={puntosEmision}
        onCreated={() => {
          setOpenNewUser(false);
          setRefreshUsers(r => r + 1);
          show({ title: 'Éxito', message: 'Usuario creado correctamente', type: 'success' });
        }}
        onUpdated={() => {
          setOpenNewUser(false);
          setEditUser(null);
          setRefreshUsers(r => r + 1);
          show({ title: 'Éxito', message: 'Usuario actualizado correctamente', type: 'success' });
        }}
      />

      {/* Step 1: Confirmation modal */}
      {confirmOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>
                <span className="icon">⚠️</span>
                Eliminar emisor
              </h2>
              <button 
                className="delete-modal-close" 
                onClick={() => setConfirmOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              <p className="delete-confirmation-text">
                ¿Está seguro que desea eliminar al emisor:
              </p>
              <p style={{ textAlign: 'center', marginTop: 12, marginBottom: 20, fontSize: 18 }}>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{company?.ruc}</span>
                <span style={{ fontWeight: 600 }}> - </span>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{company?.razon_social}</span>
              </p>
              <p className="delete-info-text" style={{ textAlign: 'center' }}>
                y todos sus datos asociados?
              </p>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={() => { setConfirmOpen(false); setPasswordOpen(true); }}
              >
                🗑️ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Password entry modal */}
      {passwordOpen && (
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
                  setPasswordOpen(false); 
                  setPwd(''); 
                }}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              <p className="delete-password-text">
                Ingresa tu clave de administrador para confirmar la eliminación del emisor
              </p>

              <div className="delete-form-group">
                <label htmlFor="delete-password" className="delete-form-label">
                  Clave de administrador *
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="••••••••"
                  className={delError ? 'delete-form-input error' : 'delete-form-input'}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && pwd && !delLoading) {
                      (async () => {
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
                      })();
                    }
                  }}
                />
                {delError && (
                  <span className="delete-error-text">
                    <span className="icon">⚠</span>
                    {delError}
                  </span>
                )}
              </div>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => { 
                  setPasswordOpen(false); 
                  setPwd(''); 
                }} 
                disabled={delLoading}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={async () => {
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
                }} 
                disabled={delLoading || pwd.length === 0}
              >
                {delLoading ? 'Eliminando…' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Establecimiento delete modal - Step 1: Confirmation */}
      {deleteEstOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>
                <span className="icon">⚠️</span>
                Eliminar establecimiento
              </h2>
              <button 
                className="delete-modal-close" 
                onClick={() => { setDeleteEstOpen(false); setDeletingEstId(null); }}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              <p className="delete-confirmation-text">
                ¿Está seguro que desea eliminar el establecimiento:
              </p>
              <p style={{ textAlign: 'center', marginTop: 12, marginBottom: 20, fontSize: 18 }}>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>
                  {establecimientos.find(e => e.id === deletingEstId)?.codigo ?? ''}
                </span>
                <span style={{ fontWeight: 600 }}> - </span>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>
                  {establecimientos.find(e => e.id === deletingEstId)?.nombre ?? ''}
                </span>
              </p>
              <p className="delete-info-text" style={{ textAlign: 'center' }}>
                y todos sus datos asociados?
              </p>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => { setDeleteEstOpen(false); setDeletingEstId(null); }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={() => { setDeleteEstOpen(false); setDeleteEstPasswordOpen(true); }}
              >
                🗑️ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Establecimiento delete modal - Step 2: Password entry */}
      {deleteEstPasswordOpen && (
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
                  setDeleteEstPasswordOpen(false); 
                  setDeleteEstPassword(''); 
                  setDeleteEstError(null); 
                  setDeletingEstId(null); 
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
                <label htmlFor="delete-est-password" className="delete-form-label">
                  Clave de administrador *
                </label>
                <input
                  id="delete-est-password"
                  type="password"
                  value={deleteEstPassword}
                  onChange={(e) => setDeleteEstPassword(e.target.value)}
                  placeholder="••••••••"
                  className={deleteEstError ? 'delete-form-input error' : 'delete-form-input'}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && deleteEstPassword && !deleteEstLoading) {
                      (async () => {
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
                      })();
                    }
                  }}
                />
                {deleteEstError && (
                  <span className="delete-error-text">
                    <span className="icon">⚠</span>
                    {deleteEstError}
                  </span>
                )}
              </div>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => { 
                  setDeleteEstPasswordOpen(false); 
                  setDeleteEstPassword(''); 
                  setDeleteEstError(null); 
                  setDeletingEstId(null); 
                }} 
                disabled={deleteEstLoading}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={async () => {
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
                }} 
                disabled={deleteEstLoading || deleteEstPassword.length === 0}
              >
                {deleteEstLoading ? 'Eliminando…' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageViewerModal open={viewerOpen} imageUrl={viewerImage} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

export default EmisorInfo;
