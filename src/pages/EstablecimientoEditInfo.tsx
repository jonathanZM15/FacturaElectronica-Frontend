import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { establecimientosApi } from '../services/establecimientosApi';
import { emisoresApi } from '../services/emisoresApi';
import { usuariosApi } from '../services/usuariosApi';
import EstablishmentFormModal from './EstablishmentFormModal';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import PuntoEmisionFormModal from './PuntoEmisionFormModal';
import PuntoEmisionDeleteModal from './PuntoEmisionDeleteModal';
import ImageViewerModal from './ImageViewerModal';
import UsuarioDetailModal from './UsuarioDetailModal';
import { PuntoEmision } from '../types/puntoEmision';
import { getImageUrl } from '../helpers/imageUrl';
import LoadingSpinner from '../components/LoadingSpinner';
import './UsuarioDeleteModalModern.css';
import './EstablecimientoDetail.css';
import './EstablecimientosTab.css';

const EstablecimientoEditInfo: React.FC = () => {
  const { id, estId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const { user } = useUser();
  const role = user?.role?.toLowerCase?.() ?? '';
  const isLimitedRole = role === 'gerente' || role === 'cajero';
  const [loading, setLoading] = React.useState(false);
  const [est, setEst] = React.useState<any | null>(null);
  const [company, setCompany] = React.useState<any | null>(null);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [codigoEditable, setCodigoEditable] = React.useState(true);
  
  // Image viewer states
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);
  
  // Delete modal states
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePasswordOpen, setDeletePasswordOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Punto emisión modal states
  const [puntoFormOpen, setPuntoFormOpen] = React.useState(false);
  const [selectedPunto, setSelectedPunto] = React.useState<PuntoEmision | null>(null);

  // Punto emisión delete states
  const [puntoDeleteOpen, setPuntoDeleteOpen] = React.useState(false);
  const [puntoDeletePassword, setPuntoDeletePassword] = React.useState('');
  const [puntoDeleteError, setPuntoDeleteError] = React.useState<string | null>(null);
  const [puntoDeleteLoading, setPuntoDeleteLoading] = React.useState(false);

  // Usuario detail modal states
  const [userDetailOpen, setUserDetailOpen] = React.useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = React.useState<any | null>(null);
  const [userDetailLoading, setUserDetailLoading] = React.useState(false);
  const [puntoToDelete, setPuntoToDelete] = React.useState<PuntoEmision | null>(null);

  // Filtros combinables para puntos de emisión
  type SeqOp = 'gte' | 'lte' | 'eq';
  type SeqFilter = { op: SeqOp; value: string };
  type PuntoFilters = {
    codigo: string;
    nombre: string;
    estado_operatividad: '' | 'ACTIVO' | 'DESACTIVADO';
    estado_disponibilidad: '' | 'LIBRE' | 'OCUPADO';
    usuario: string;
    secuencial_factura: SeqFilter;
    secuencial_liquidacion_compra: SeqFilter;
    secuencial_nota_credito: SeqFilter;
    secuencial_nota_debito: SeqFilter;
    secuencial_guia_remision: SeqFilter;
    secuencial_retencion: SeqFilter;
    secuencial_proforma: SeqFilter;
    fecha_creacion_desde: string;
    fecha_creacion_hasta: string;
    fecha_actualizacion_desde: string;
    fecha_actualizacion_hasta: string;
  };

  const DEFAULT_SEQ_FILTER: SeqFilter = { op: 'eq', value: '' };
  const DEFAULT_PUNTO_FILTERS: PuntoFilters = {
    codigo: '',
    nombre: '',
    estado_operatividad: '',
    estado_disponibilidad: '',
    usuario: '',
    secuencial_factura: { ...DEFAULT_SEQ_FILTER },
    secuencial_liquidacion_compra: { ...DEFAULT_SEQ_FILTER },
    secuencial_nota_credito: { ...DEFAULT_SEQ_FILTER },
    secuencial_nota_debito: { ...DEFAULT_SEQ_FILTER },
    secuencial_guia_remision: { ...DEFAULT_SEQ_FILTER },
    secuencial_retencion: { ...DEFAULT_SEQ_FILTER },
    secuencial_proforma: { ...DEFAULT_SEQ_FILTER },
    fecha_creacion_desde: '',
    fecha_creacion_hasta: '',
    fecha_actualizacion_desde: '',
    fecha_actualizacion_hasta: ''
  };

  const [puntoFiltersOpen, setPuntoFiltersOpen] = React.useState(false);
  const [puntoFilters, setPuntoFilters] = React.useState<PuntoFilters>(DEFAULT_PUNTO_FILTERS);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const normalizeText = (v: any) => String(v ?? '').toLowerCase().trim();
  const parseIntSafe = (v: any) => {
    const n = Number.parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) ? n : null;
  };
  const dateStart = (ymd: string) => new Date(`${ymd}T00:00:00`);
  const dateEnd = (ymd: string) => new Date(`${ymd}T23:59:59.999`);

  const matchesSeqFilter = (rawValue: any, filter: SeqFilter) => {
    if (!filter.value) return true;
    const val = parseIntSafe(rawValue);
    const cmp = parseIntSafe(filter.value);
    if (val === null || cmp === null) return false;
    if (filter.op === 'eq') return val === cmp;
    if (filter.op === 'gte') return val >= cmp;
    return val <= cmp;
  };

  const activePuntoFiltersCount = React.useMemo(() => {
    const seqCount = [
      puntoFilters.secuencial_factura,
      puntoFilters.secuencial_liquidacion_compra,
      puntoFilters.secuencial_nota_credito,
      puntoFilters.secuencial_nota_debito,
      puntoFilters.secuencial_guia_remision,
      puntoFilters.secuencial_retencion,
      puntoFilters.secuencial_proforma
    ].filter((f) => !!f.value).length;

    const basicCount = [
      puntoFilters.codigo,
      puntoFilters.nombre,
      puntoFilters.estado_operatividad,
      puntoFilters.estado_disponibilidad,
      puntoFilters.usuario,
      puntoFilters.fecha_creacion_desde,
      puntoFilters.fecha_creacion_hasta,
      puntoFilters.fecha_actualizacion_desde,
      puntoFilters.fecha_actualizacion_hasta
    ].filter((v) => !!String(v ?? '').trim()).length;

    return basicCount + seqCount;
  }, [puntoFilters]);

  const filteredPuntos = React.useMemo(() => {
    const puntos = Array.isArray(est?.puntos_emision) ? est.puntos_emision : [];
    const codigoNeedle = puntoFilters.codigo;
    const nombreNeedle = normalizeText(puntoFilters.nombre);
    const usuarioNeedle = normalizeText(puntoFilters.usuario);

    return puntos.filter((p: any) => {
      if (codigoNeedle) {
        const codigoVal = String(p?.codigo ?? '');
        if (!codigoVal.includes(codigoNeedle)) return false;
      }

      if (nombreNeedle) {
        const nombreVal = normalizeText(p?.nombre);
        if (!nombreVal.includes(nombreNeedle)) return false;
      }

      if (puntoFilters.estado_operatividad) {
        if (String(p?.estado ?? '').toUpperCase() !== puntoFilters.estado_operatividad) return false;
      }

      if (puntoFilters.estado_disponibilidad) {
        if (String(p?.estado_disponibilidad ?? '').toUpperCase() !== puntoFilters.estado_disponibilidad) return false;
      }

      if (usuarioNeedle) {
        const userBlob = [
          p?.user?.role?.value ?? p?.user?.role,
          p?.user?.username,
          p?.user?.nombres,
          p?.user?.apellidos
        ].map(normalizeText).join(' ');
        if (!userBlob.includes(usuarioNeedle)) return false;
      }

      // Secuenciales
      if (!matchesSeqFilter(p?.secuencial_factura ?? p?.secuencial, puntoFilters.secuencial_factura)) return false;
      if (!matchesSeqFilter(p?.secuencial_liquidacion_compra, puntoFilters.secuencial_liquidacion_compra)) return false;
      if (!matchesSeqFilter(p?.secuencial_nota_credito, puntoFilters.secuencial_nota_credito)) return false;
      if (!matchesSeqFilter(p?.secuencial_nota_debito, puntoFilters.secuencial_nota_debito)) return false;
      if (!matchesSeqFilter(p?.secuencial_guia_remision, puntoFilters.secuencial_guia_remision)) return false;
      if (!matchesSeqFilter(p?.secuencial_retencion, puntoFilters.secuencial_retencion)) return false;
      if (!matchesSeqFilter(p?.secuencial_proforma, puntoFilters.secuencial_proforma)) return false;

      // Fechas (rango inclusivo)
      if (puntoFilters.fecha_creacion_desde || puntoFilters.fecha_creacion_hasta) {
        const created = p?.created_at ? new Date(p.created_at) : null;
        if (!created) return false;
        if (puntoFilters.fecha_creacion_desde && created < dateStart(puntoFilters.fecha_creacion_desde)) return false;
        if (puntoFilters.fecha_creacion_hasta && created > dateEnd(puntoFilters.fecha_creacion_hasta)) return false;
      }

      if (puntoFilters.fecha_actualizacion_desde || puntoFilters.fecha_actualizacion_hasta) {
        const updated = p?.updated_at ? new Date(p.updated_at) : null;
        if (!updated) return false;
        if (puntoFilters.fecha_actualizacion_desde && updated < dateStart(puntoFilters.fecha_actualizacion_desde)) return false;
        if (puntoFilters.fecha_actualizacion_hasta && updated > dateEnd(puntoFilters.fecha_actualizacion_hasta)) return false;
      }

      return true;
    });
  }, [est?.puntos_emision, puntoFilters]);

  // Ordenamiento y paginación sobre resultados filtrados
  type PuntoCol =
    | 'codigo'
    | 'nombre'
    | 'estado_operatividad'
    | 'estado_disponibilidad'
    | 'usuario'
    | 'secuencial_factura'
    | 'secuencial_liquidacion_compra'
    | 'secuencial_nota_credito'
    | 'secuencial_nota_debito'
    | 'secuencial_guia_remision'
    | 'secuencial_retencion'
    | 'secuencial_proforma'
    | 'created_at'
    | 'updated_at';

  const [sortByPunto, setSortByPunto] = React.useState<PuntoCol>('codigo');
  const [sortDirPunto, setSortDirPunto] = React.useState<'asc' | 'desc'>('asc');
  const [pagePunto, setPagePunto] = React.useState(1);
  const [perPagePunto, setPerPagePunto] = React.useState(10);

  const toggleSortPunto = (col: PuntoCol) => {
    setPagePunto(1);
    if (sortByPunto === col) {
      setSortDirPunto((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortByPunto(col);
      setSortDirPunto('asc');
    }
  };

  React.useEffect(() => {
    // Al aplicar filtros: orden por defecto fecha creación DESC
    if (activePuntoFiltersCount > 0) {
      setSortByPunto('created_at');
      setSortDirPunto('desc');
    } else {
      // Vista inicial: código ASC
      setSortByPunto('codigo');
      setSortDirPunto('asc');
    }
    setPagePunto(1);
  }, [activePuntoFiltersCount, puntoFilters]);

  const getPuntoSortValue = (p: any, col: PuntoCol) => {
    const userLabel = (() => {
      if (!p?.user) return '';
      const roleValue = (p.user?.role?.value ?? p.user?.role ?? '').toString().toUpperCase();
      const username = (p.user?.username ?? '').toString().toUpperCase();
      const nombres = (p.user?.nombres ?? '').toString().toUpperCase();
      const apellidos = (p.user?.apellidos ?? '').toString().toUpperCase();
      return `${roleValue} – ${username} – ${nombres} – ${apellidos}`.trim();
    })();

    switch (col) {
      case 'codigo':
        return p?.codigo ?? '';
      case 'nombre':
        return p?.nombre ?? '';
      case 'estado_operatividad':
        return p?.estado ?? '';
      case 'estado_disponibilidad':
        return p?.estado_disponibilidad ?? '';
      case 'usuario':
        return userLabel;
      case 'secuencial_factura':
        return p?.secuencial_factura ?? p?.secuencial ?? '';
      case 'secuencial_liquidacion_compra':
        return p?.secuencial_liquidacion_compra ?? '';
      case 'secuencial_nota_credito':
        return p?.secuencial_nota_credito ?? '';
      case 'secuencial_nota_debito':
        return p?.secuencial_nota_debito ?? '';
      case 'secuencial_guia_remision':
        return p?.secuencial_guia_remision ?? '';
      case 'secuencial_retencion':
        return p?.secuencial_retencion ?? '';
      case 'secuencial_proforma':
        return p?.secuencial_proforma ?? '';
      case 'created_at':
        return p?.created_at ? new Date(p.created_at).getTime() : null;
      case 'updated_at':
        return p?.updated_at ? new Date(p.updated_at).getTime() : null;
      default:
        return '';
    }
  };

  const sortedPuntos = React.useMemo(() => {
    const data = [...filteredPuntos];
    const dir = sortDirPunto === 'asc' ? 1 : -1;

    data.sort((a: any, b: any) => {
      const va = getPuntoSortValue(a, sortByPunto);
      const vb = getPuntoSortValue(b, sortByPunto);

      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;

      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;

      const na = Number(va);
      const nb = Number(vb);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;

      return String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' }) * dir;
    });

    return data;
  }, [filteredPuntos, sortByPunto, sortDirPunto]);

  const paginatedPuntos = React.useMemo(() => {
    const start = (pagePunto - 1) * perPagePunto;
    return sortedPuntos.slice(start, start + perPagePunto);
  }, [sortedPuntos, pagePunto, perPagePunto]);

  const totalPuntos = sortedPuntos.length;
  const startIdxPunto = totalPuntos === 0 ? 0 : (pagePunto - 1) * perPagePunto + 1;
  const endIdxPunto = Math.min(pagePunto * perPagePunto, totalPuntos);
  const lastPagePunto = Math.max(1, Math.ceil(Math.max(1, totalPuntos) / perPagePunto));
  React.useEffect(() => {
    if (pagePunto > lastPagePunto) setPagePunto(lastPagePunto);
  }, [lastPagePunto, pagePunto]);

  const resetPuntoTable = () => {
    setPuntoFilters(DEFAULT_PUNTO_FILTERS);
    setSortByPunto('codigo');
    setSortDirPunto('asc');
    setPagePunto(1);
    setPerPagePunto(10);
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
        
        // Filtrar puntos de emisión para Emisor, Gerente y Cajero
        const shouldFilterPuntos = user && (role === 'emisor' || role === 'gerente' || role === 'cajero');
        
        if (shouldFilterPuntos && dataEst?.puntos_emision) {
          let user_puntos_ids = (user as any).puntos_emision_ids || [];
          
          if (typeof user_puntos_ids === 'string') {
            try {
              user_puntos_ids = JSON.parse(user_puntos_ids);
            } catch (e) {
              user_puntos_ids = [];
            }
          }
          
          if (Array.isArray(user_puntos_ids) && user_puntos_ids.length > 0) {
            dataEst.puntos_emision = dataEst.puntos_emision.filter((p: any) => {
              return user_puntos_ids.includes(p.id) ||
                     user_puntos_ids.includes(Number(p.id)) ||
                     user_puntos_ids.includes(String(p.id));
            });
          }
        }
        
        setEst(dataEst);
        setCompany(dataComp);
        setCodigoEditable(dataEst.codigo_editable ?? true);
      } catch (e:any) {
        show({ title: 'Error', message: 'No se pudo cargar el establecimiento', type: 'error' });
      } finally { setLoading(false); }
    };
    load();
  }, [id, estId, show, user, role]);

  if (!id || !estId) return <div>Establecimiento no especificado</div>;

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  const isCompanyActive = (estado?: string) => {
    const normalized = (estado ?? '').toString().trim().toUpperCase();
    return normalized === 'ABIERTO' || normalized === 'ACTIVO';
  };

  const openDeleteModal = () => {
    if (isLimitedRole) return;
    setActionsOpen(false);
    setDeleteOpen(true);
  };

  // Función para abrir el modal de detalle de usuario
  const handleOpenUserDetail = async (userId: number) => {
    setUserDetailLoading(true);
    setUserDetailOpen(true);
    try {
      const response = await usuariosApi.get(userId);
      const userData = response.data?.data ?? response.data;
      setSelectedUserDetail(userData);
    } catch (e: any) {
      show({ title: 'Error', message: 'No se pudo cargar la información del usuario', type: 'error' });
      setUserDetailOpen(false);
    } finally {
      setUserDetailLoading(false);
    }
  };

  return (
    <div className="estd-container">
      <div className="estd-content">
      {/* Header moderno */}
      <div className="estd-header">
        <div className="estd-header-left">
          <div className="estd-header-icon">🏢</div>
          <div className="estd-header-info">
            <h2>{est?.nombre ?? '—'}</h2>
            <div className="estd-header-badge">
              <span className="estd-codigo-badge">
                📋 Código: {est?.codigo ?? ''}
              </span>
              {est?.estado && (
                <span className={`estd-status-badge ${est.estado === 'ABIERTO' ? 'abierto' : 'cerrado'}`}>
                  {est.estado === 'ABIERTO' ? '✅ Activo' : '🔒 Cerrado'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="estd-header-right">
          <div style={{ position: 'relative' }}>
            <button
              className="estd-actions-btn"
              onClick={() => {
                if (isLimitedRole) return;
                setActionsOpen((s) => !s);
              }}
              aria-expanded={actionsOpen}
              disabled={isLimitedRole}
              title={isLimitedRole ? 'Tu rol no permite modificar establecimientos' : 'Acciones del establecimiento'}
            >
              ⚙️ Acciones ▾
            </button>
            {!isLimitedRole && actionsOpen && (
              <div className="estd-actions-menu">
                <button 
                  className="estd-menu-item"
                  onClick={() => { setOpenEdit(true); setActionsOpen(false); }}
                >
                  <span style={{ fontSize: '18px' }}>✏️</span>
                  <span>Editar establecimiento</span>
                </button>
                <div className="estd-menu-divider"></div>
                <button 
                  className="estd-menu-item danger"
                  onClick={openDeleteModal}
                >
                  <span style={{ fontSize: '18px' }}>🗑️</span>
                  <span>Eliminar establecimiento</span>
                </button>
              </div>
            )}
          </div>

          <button 
            className="estd-back-btn"
            onClick={() => navigate(`/emisores/${id}?tab=establecimientos`)}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="estd-grid">
        {/* Datos del establecimiento */}
        {/* Card: Datos del establecimiento */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon purple">📊</div>
            <h4>Datos del establecimiento</h4>
          </div>

          <div className="estd-card-body">
            <div className="estd-info-row">
              <span className="estd-info-label">📋 Código:</span>
              <span className="estd-info-value highlight">{est?.codigo ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">🏢 Nombre:</span>
              <span className="estd-info-value highlight">{est?.nombre ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">🏪 Nombre comercial:</span>
              <span className="estd-info-value">{est?.nombre_comercial ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">📍 Dirección:</span>
              <span className="estd-info-value">{est?.direccion ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">✉️ Correo:</span>
              <span className="estd-info-value">{est?.correo ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">📞 Teléfono:</span>
              <span className="estd-info-value">{est?.telefono ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">🚦 Estado:</span>
              {est?.estado ? (
                <span className={`estd-estado-badge ${est.estado === 'ABIERTO' ? 'activo' : 'inactivo'}`}>
                  {est.estado === 'ABIERTO' ? '✅ Abierto' : '🔒 Cerrado'}
                </span>
              ) : '-'}
            </div>
          </div>
        </div>

        {/* Card: Logo */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon blue">🖼️</div>
            <h4>Logo</h4>
          </div>

          {est?.logo_url ? (
            <div className="estd-logo-container">
              <img 
                src={getImageUrl(est.logo_url)} 
                alt="logo" 
                className="estd-logo-img"
                style={{ cursor: 'pointer' }}
                title="Haz clic para ampliar"
                onClick={() => {
                  const imageUrl = getImageUrl(est.logo_url);
                  if (imageUrl) {
                    setViewerImage(imageUrl);
                    setViewerOpen(true);
                  }
                }}
              />
            </div>
          ) : (
            <div className="estd-logo-empty">
              <div className="estd-logo-empty-icon">🖼️</div>
              <div className="estd-logo-empty-text">No hay logo</div>
            </div>
          )}
        </div>

        {/* Card: Información adicional */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon orange">📝</div>
            <h4>Información adicional</h4>
          </div>

          <div className="estd-chips-vertical">
            <div className="estd-chip yellow">
              <div className="estd-chip-label">📅 Actividades económicas</div>
              <div className="estd-chip-value">{est?.actividades_economicas ?? '-'}</div>
            </div>

            <div className="estd-chip blue">
              <div className="estd-chip-label">🚀 Fecha inicio de actividades</div>
              <div className="estd-chip-value">{est?.fecha_inicio_actividades ?? '-'}</div>
            </div>

            <div className="estd-chip green">
              <div className="estd-chip-label">🔄 Fecha reinicio de actividades</div>
              <div className="estd-chip-value">{est?.fecha_reinicio_actividades ?? '-'}</div>
            </div>

            <div className="estd-chip red">
              <div className="estd-chip-label">🔒 Fecha cierre de establecimiento</div>
              <div className="estd-chip-value">{est?.fecha_cierre_establecimiento ?? '-'}</div>
            </div>
          </div>
        </div>

        {/* Card: Emisor asociado */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon green">🏛️</div>
            <h4>Emisor asociado</h4>
          </div>

          <div className="estd-emisor-vertical">
            <div className="estd-emisor-item">
              <div className="estd-emisor-label">🔢 RUC</div>
              {company?.id ? (
                <a 
                  href={`/emisores/${company.id}`} 
                  onClick={(e) => { e.preventDefault(); navigate(`/emisores/${company.id}`); }} 
                  className="estd-emisor-link"
                >
                  {company?.ruc}
                </a>
              ) : (
                <div className="estd-emisor-value">{company?.ruc ?? '-'}</div>
              )}
            </div>

            <div className="estd-emisor-item">
              <div className="estd-emisor-label">🏢 Razón Social</div>
              <div className="estd-emisor-value">{company?.razon_social ?? '-'}</div>
            </div>

            <div className="estd-emisor-item">
              <div className="estd-emisor-label">📊 Estado</div>
              <div className="estd-emisor-value">
                <span style={{ 
                  background: isCompanyActive(company?.estado) ? '#e0f2fe' : '#fee2e2', 
                  padding: '4px 12px', 
                  borderRadius: 6, 
                  color: isCompanyActive(company?.estado) ? '#0ea5e9' : '#dc2626', 
                  fontWeight: 700,
                  fontSize: '13px'
                }}>
                  {company?.estado || 'ABIERTO'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Actividad de la cuenta */}
        <div className="estd-card full-width activity">
          <div className="estd-card-header">
            <div className="estd-card-icon gray">⏱️</div>
            <h4>Actividad de la cuenta</h4>
          </div>

          <div className="estd-activity-grid">
            <div className="estd-activity-item">
              <span className="estd-activity-label">📅 Fecha de creación:</span>
              <span className="estd-activity-value">{est?.created_at ?? '-'}</span>
            </div>

            <div className="estd-activity-item">
              <span className="estd-activity-label">🔄 Fecha de actualización:</span>
              <span className="estd-activity-value">{est?.updated_at ?? '-'}</span>
            </div>

            <div className="estd-activity-item">
              <span className="estd-activity-label">👤 Creado por:</span>
              <span className="estd-activity-value">
                {est?.created_by_info ? (
                  <>
                    <span style={{ fontWeight: 600 }}>{est.created_by_info.role}</span>
                    {' - '}
                    <a 
                      href="#" 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        if (est.created_by_info?.id) {
                          handleOpenUserDetail(est.created_by_info.id);
                        }
                      }}
                      style={{ color: '#1b4ab4', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {est.created_by_info.username}
                    </a>
                    {' - '}
                    <span>{est.created_by_info.nombres} {est.created_by_info.apellidos}</span>
                  </>
                ) : (est?.created_by_name ? est.created_by_name : <span style={{ color: '#999', fontStyle: 'italic' }}>Sin información</span>)}
              </span>
            </div>

            <div className="estd-activity-item">
              <span className="estd-activity-label">✏️ Actualizado por:</span>
              <span className="estd-activity-value">
                {est?.updated_by_info ? (
                  <>
                    <span style={{ fontWeight: 600 }}>{est.updated_by_info.role}</span>
                    {' - '}
                    <a 
                      href="#" 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        if (est.updated_by_info?.id) {
                          handleOpenUserDetail(est.updated_by_info.id);
                        }
                      }}
                      style={{ color: '#1b4ab4', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {est.updated_by_info.username}
                    </a>
                    {' - '}
                    <span>{est.updated_by_info.nombres} {est.updated_by_info.apellidos}</span>
                  </>
                ) : (est?.updated_by_name ? est.updated_by_name : <span style={{ color: '#999', fontStyle: 'italic' }}>Sin información</span>)}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Gerentes del establecimiento */}
        <div className="estd-card full-width">
          <div className="estd-card-header">
            <div className="estd-card-icon blue">👥</div>
            <h4>Gerentes del establecimiento</h4>
          </div>

          <div className="estd-card-body">
            {(() => {
              // Filtrar solo usuarios con rol gerente
              const gerentes = (est?.usuarios || []).filter((u: any) => {
                const role = typeof u.role === 'string' ? u.role.toLowerCase() : (u.role?.value || u.role || '').toString().toLowerCase();
                return role === 'gerente';
              });

              if (gerentes.length === 0) {
                return (
                  <div style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
                    No hay gerentes asignados a este establecimiento
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {gerentes.map((gerente: any, index: number) => {
                    const roleDisplay = typeof gerente.role === 'string' 
                      ? gerente.role.toUpperCase() 
                      : (gerente.role?.value || gerente.role || '').toString().toUpperCase();
                    
                    return (
                      <div 
                        key={gerente.id || index} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '12px 16px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <span style={{ 
                          fontWeight: 600, 
                          color: '#10b981',
                          backgroundColor: '#d1fae5',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          marginRight: '12px'
                        }}>
                          {roleDisplay}
                        </span>
                        <span style={{ color: '#64748b', margin: '0 8px' }}>–</span>
                        <a 
                          href="#" 
                          onClick={(e) => { 
                            e.preventDefault(); 
                            if (gerente.id) {
                              handleOpenUserDetail(gerente.id);
                            }
                          }}
                          style={{ 
                            color: '#1b4ab4', 
                            fontWeight: 600, 
                            textDecoration: 'underline', 
                            cursor: 'pointer' 
                          }}
                        >
                          {gerente.username || '-'}
                        </a>
                        <span style={{ color: '#64748b', margin: '0 8px' }}>–</span>
                        <span style={{ color: '#334155' }}>
                          {gerente.nombres || ''} {gerente.apellidos || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

        {/* Card: Lista de puntos de emisión - FUERA del grid para ancho completo */}
        <div className="estd-puntos-section">
          <div className="estd-puntos-header">
            <h4>📍 Lista de puntos de emisión</h4>
            <div className="estd-puntos-filters">
            <button 
              onClick={() => {
                if (isLimitedRole) return;
                setSelectedPunto(null); 
                setPuntoFormOpen(true); 
              }}
              disabled={isLimitedRole}
              title={isLimitedRole ? 'Tu rol no permite crear puntos de emisión' : 'Crear nuevo punto de emisión'}
              className={`estd-new-punto-btn ${isLimitedRole ? 'disabled' : ''}`}
            >
              + Nuevo
            </button>
          </div>
        </div>

        <div className="est-filters-section" style={{ marginTop: 12 }}>
          <div
            className="est-filters-header"
            onClick={() => setPuntoFiltersOpen((open) => !open)}
          >
            <div className="est-filters-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
              </svg>
              Filtros
              {activePuntoFiltersCount > 0 && (
                <span className="est-filters-badge">
                  {activePuntoFiltersCount} activo{activePuntoFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button className={`est-filters-toggle ${puntoFiltersOpen ? 'open' : ''}`}>
              {puntoFiltersOpen ? 'Ocultar' : 'Mostrar'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
          </div>
          <div className={`est-filters-body ${puntoFiltersOpen ? 'open' : ''}`}>
            <div className="est-filters-grid">
              <div className="est-filter-group">
                <label className="est-filter-label">Código</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="est-filter-input"
                  placeholder="Buscar por código..."
                  value={puntoFilters.codigo}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                    setPuntoFilters((prev) => ({ ...prev, codigo: onlyDigits }));
                  }}
                />
              </div>

              <div className="est-filter-group">
                <label className="est-filter-label">Nombre</label>
                <input
                  type="text"
                  className="est-filter-input"
                  placeholder="Buscar por nombre..."
                  value={puntoFilters.nombre}
                  onChange={(e) => setPuntoFilters((prev) => ({ ...prev, nombre: e.target.value }))}
                />
              </div>

              <div className="est-filter-group">
                <label className="est-filter-label">Estado de operatividad</label>
                <select
                  className="est-filter-select"
                  value={puntoFilters.estado_operatividad}
                  onChange={(e) => setPuntoFilters((prev) => ({ ...prev, estado_operatividad: e.target.value as PuntoFilters['estado_operatividad'] }))}
                >
                  <option value="">Todos</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="DESACTIVADO">Desactivado</option>
                </select>
              </div>

              <div className="est-filter-group">
                <label className="est-filter-label">Estado de disponibilidad</label>
                <select
                  className="est-filter-select"
                  value={puntoFilters.estado_disponibilidad}
                  onChange={(e) => setPuntoFilters((prev) => ({ ...prev, estado_disponibilidad: e.target.value as PuntoFilters['estado_disponibilidad'] }))}
                >
                  <option value="">Todos</option>
                  <option value="LIBRE">Libre</option>
                  <option value="OCUPADO">Ocupado</option>
                </select>
              </div>

              <div className="est-filter-group">
                <label className="est-filter-label">Usuario asociado</label>
                <input
                  type="text"
                  className="est-filter-input"
                  placeholder="Buscar usuario..."
                  value={puntoFilters.usuario}
                  onChange={(e) => setPuntoFilters((prev) => ({ ...prev, usuario: e.target.value }))}
                />
              </div>

              {(
                [
                  { key: 'secuencial_factura', label: 'Secuencial de facturas' },
                  { key: 'secuencial_liquidacion_compra', label: 'Secuencial de liquidaciones de compra' },
                  { key: 'secuencial_nota_credito', label: 'Secuencial de notas de crédito' },
                  { key: 'secuencial_nota_debito', label: 'Secuencial de notas de débito' },
                  { key: 'secuencial_guia_remision', label: 'Secuencial de guías de remisión' },
                  { key: 'secuencial_retencion', label: 'Secuencial de retenciones' },
                  { key: 'secuencial_proforma', label: 'Secuencial de proformas' }
                ] as Array<{ key: keyof PuntoFilters; label: string }>
              ).map(({ key, label }) => {
                const seq = puntoFilters[key] as unknown as SeqFilter;
                return (
                  <div key={String(key)} className="est-filter-group wide">
                    <label className="est-filter-label long">{label}</label>
                    <div className="est-filter-range">
                      <select
                        className="est-filter-select"
                        value={seq.op}
                        onChange={(e) => {
                          const op = e.target.value as SeqOp;
                          setPuntoFilters((prev) => ({
                            ...prev,
                            [key]: { ...(prev[key] as unknown as SeqFilter), op }
                          } as PuntoFilters));
                        }}
                      >
                        <option value="gte">Mayor o igual que</option>
                        <option value="lte">Menor o igual que</option>
                        <option value="eq">Igual que</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="est-filter-input"
                        placeholder="Número"
                        value={seq.value}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                          setPuntoFilters((prev) => ({
                            ...prev,
                            [key]: { ...(prev[key] as unknown as SeqFilter), value: onlyDigits }
                          } as PuntoFilters));
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="est-filter-group wide">
                <label className="est-filter-label">Fecha de creación</label>
                <div className="est-filter-range">
                  <input
                    type="date"
                    className="est-filter-input"
                    value={puntoFilters.fecha_creacion_desde}
                    onChange={(e) => setPuntoFilters((prev) => ({ ...prev, fecha_creacion_desde: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="est-filter-input"
                    value={puntoFilters.fecha_creacion_hasta}
                    onChange={(e) => setPuntoFilters((prev) => ({ ...prev, fecha_creacion_hasta: e.target.value }))}
                  />
                </div>
              </div>

              <div className="est-filter-group wide">
                <label className="est-filter-label">Fecha de última actualización</label>
                <div className="est-filter-range">
                  <input
                    type="date"
                    className="est-filter-input"
                    value={puntoFilters.fecha_actualizacion_desde}
                    onChange={(e) => setPuntoFilters((prev) => ({ ...prev, fecha_actualizacion_desde: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="est-filter-input"
                    value={puntoFilters.fecha_actualizacion_hasta}
                    onChange={(e) => setPuntoFilters((prev) => ({ ...prev, fecha_actualizacion_hasta: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {activePuntoFiltersCount > 0 && (
              <div className="est-filters-actions">
                <button
                  className="est-btn-clear-filters"
                  onClick={resetPuntoTable}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="estd-table-wrapper"
          style={{
            overflowX: activePuntoFiltersCount > 0 && totalPuntos === 0 ? 'hidden' : undefined
          }}
        >
          {activePuntoFiltersCount > 0 && totalPuntos === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: 14,
                fontStyle: 'italic',
                pointerEvents: 'none',
                background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.85) 0%, rgba(255, 255, 255, 0.9) 100%)'
              }}
            >
              No se encontraron puntos de emisión con los filtros aplicados.
            </div>
          )}
            <table className="estd-table">
              <thead>
                <tr>
                  <th className="estd-th sticky-codigo" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('codigo')}>
                    CÓDIGO {sortByPunto === 'codigo' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th sticky-nombre" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('nombre')}>
                    NOMBRE {sortByPunto === 'nombre' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th sticky-estado" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('estado_operatividad')}>
                    ESTADO DE OPERATIVIDAD {sortByPunto === 'estado_operatividad' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('estado_disponibilidad')}>
                    ESTADO DE DISPONIBILIDAD {sortByPunto === 'estado_disponibilidad' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('usuario')}>
                    USUARIO ASOCIADO {sortByPunto === 'usuario' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_factura')}>
                    SECUENCIAL FACTURAS {sortByPunto === 'secuencial_factura' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_liquidacion_compra')}>
                    SECUENCIAL LIQUIDACIONES COMPRA {sortByPunto === 'secuencial_liquidacion_compra' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_nota_credito')}>
                    SECUENCIAL NOTAS CRÉDITO {sortByPunto === 'secuencial_nota_credito' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_nota_debito')}>
                    SECUENCIAL NOTAS DÉBITO {sortByPunto === 'secuencial_nota_debito' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_guia_remision')}>
                    SECUENCIAL GUÍAS REMISIÓN {sortByPunto === 'secuencial_guia_remision' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_retencion')}>
                    SECUENCIAL RETENCIONES {sortByPunto === 'secuencial_retencion' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_proforma')}>
                    SECUENCIAL PROFORMAS {sortByPunto === 'secuencial_proforma' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('created_at')}>
                    FECHA DE CREACIÓN {sortByPunto === 'created_at' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('updated_at')}>
                    FECHA DE ACTUALIZACIÓN {sortByPunto === 'updated_at' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="estd-th sticky-acciones">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (totalPuntos === 0) {
                    return (
                      <tr>
                        <td colSpan={15} className="estd-empty-cell">
                          {activePuntoFiltersCount > 0
                            ? '\u00A0'
                            : 'No hay puntos de emisión registrados'}
                        </td>
                      </tr>
                    );
                  }

                  return paginatedPuntos.map((punto: any, idx: number) => (
                    <tr 
                      key={punto.id ?? idx}
                      className={`estd-tr ${idx % 2 === 0 ? 'even' : 'odd'}`}
                    >
                      <td className="estd-td sticky-codigo">
                        <a 
                          href={`/emisores/${id}/establecimientos/${estId}/puntos/${punto.id}`}
                          onClick={(e) => { 
                            e.preventDefault(); 
                            navigate(`/emisores/${id}/establecimientos/${estId}/puntos/${punto.id}`); 
                          }} 
                          className="estd-punto-link"
                        >
                          {punto.codigo ?? '-'}
                        </a>
                      </td>
                      <td className="estd-td sticky-nombre">{punto.nombre ?? '-'}</td>
                      <td className="estd-td sticky-estado">
                        <span className={`estd-punto-estado ${punto.estado === 'ACTIVO' ? 'activo' : 'inactivo'}`}>
                          {punto.estado === 'ACTIVO' ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="estd-td">
                        <span className={`estd-punto-estado ${punto.estado_disponibilidad === 'OCUPADO' ? 'inactivo' : 'activo'}`}>
                          {punto.estado_disponibilidad === 'OCUPADO' ? 'Ocupado' : 'Libre'}
                        </span>
                      </td>
                      <td className="estd-td">
                        {punto?.user?.id ? (
                          <a
                            href={`/usuarios/${punto.user.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/usuarios/${punto.user.id}`);
                            }}
                            className="estd-punto-link"
                            title="Ver usuario"
                          >
                            {(() => {
                              const role = (punto.user?.role?.value ?? punto.user?.role ?? '').toString().toUpperCase();
                              const username = (punto.user?.username ?? '').toString().toUpperCase();
                              const nombres = (punto.user?.nombres ?? '').toString().toUpperCase();
                              const apellidos = (punto.user?.apellidos ?? '').toString().toUpperCase();
                              return `${role} – ${username} – ${nombres} – ${apellidos}`;
                            })()}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Sin asignar</span>
                        )}
                      </td>
                      <td className="estd-td">{punto.secuencial_factura ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_liquidacion_compra ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_nota_credito ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_nota_debito ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_guia_remision ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_retencion ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_proforma ?? '-'}</td>
                      <td className="estd-td">{formatDate(punto.created_at)}</td>
                      <td className="estd-td">{formatDate(punto.updated_at)}</td>
                      <td className="estd-td sticky-acciones">
                        <div className="estd-action-buttons">
                          <button
                            type="button"
                            title={isLimitedRole ? 'Tu rol no permite editar puntos de emisión' : 'Editar punto'}
                            className={`estd-action-btn edit ${isLimitedRole ? 'disabled' : ''}`}
                            disabled={isLimitedRole}
                            onClick={() => {
                              if (isLimitedRole) return;
                              setSelectedPunto(punto);
                              setPuntoFormOpen(true);
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            title={isLimitedRole ? 'Tu rol no permite eliminar puntos de emisión' : 'Eliminar punto'}
                            className={`estd-action-btn delete ${isLimitedRole ? 'disabled' : ''}`}
                            disabled={isLimitedRole}
                            onClick={() => {
                              if (isLimitedRole) return;
                              setPuntoToDelete(punto);
                              setPuntoDeleteOpen(true);
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Paginación moderna (estilo establecimientos) */}
          <div className="est-pagination" style={{ marginTop: 12 }}>
            <div className="est-pagination-info">
              <label>
                Mostrar
                <select
                  className="est-per-page-select"
                  value={perPagePunto}
                  onChange={(e) => {
                    setPerPagePunto(Number(e.target.value));
                    setPagePunto(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                por página
              </label>
              <span className="est-page-range">
                {startIdxPunto}–{endIdxPunto} de {totalPuntos} (en esta página: {paginatedPuntos.length})
              </span>
            </div>

            <div className="est-pagination-buttons">
              <button className="est-page-btn" onClick={() => setPagePunto(1)} disabled={pagePunto <= 1}>⏮</button>
              <button className="est-page-btn" onClick={() => setPagePunto((p) => Math.max(1, p - 1))} disabled={pagePunto <= 1}>◀</button>
              <button className="est-page-btn" onClick={() => setPagePunto((p) => Math.min(lastPagePunto, p + 1))} disabled={pagePunto >= lastPagePunto}>▶</button>
              <button className="est-page-btn" onClick={() => setPagePunto(lastPagePunto)} disabled={pagePunto >= lastPagePunto}>⏭</button>
            </div>
          </div>
        </div>

      {openEdit && (
        <EstablishmentFormModal
          open={openEdit}
          companyId={id!}
          editingEst={est}
          codigoEditable={codigoEditable}
          onClose={() => { setOpenEdit(false); }}
          onUpdated={(updated:any) => { 
            // Force refresh by reloading from server to ensure cache-busting works
            // Create a new promise to refresh data
            (async () => {
              if (!id || !estId) return;
              try {
                const [rEst, rComp] = await Promise.all([
                  establecimientosApi.show(id, estId),
                  emisoresApi.get(id)
                ]);
                const dataEst = rEst.data?.data ?? rEst.data;
                const dataComp = rComp.data?.data ?? rComp.data;
                
                // Force cache-busting for logo by adding timestamp
                if (dataEst.logo_url) {
                  const separator = dataEst.logo_url.includes('?') ? '&' : '?';
                  dataEst.logo_url = dataEst.logo_url.split('?')[0] + separator + 't=' + Date.now();
                }
                
                setEst(dataEst);
                setCompany(dataComp);
              } catch (e: any) {
                show({ title: 'Error', message: 'No se pudo recargar el establecimiento', type: 'error' });
              }
            })();
            
            setOpenEdit(false);
            show({ title: 'Éxito', message: 'Establecimiento actualizado', type: 'success' });
          }}
        />
      )}

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

      {/* Punto Emisión Form Modal */}
      {puntoFormOpen && (
        <PuntoEmisionFormModal
          isOpen={puntoFormOpen}
          companyId={Number(id)}
          establecimientoId={Number(estId)}
          initialData={selectedPunto}
          onClose={() => { setPuntoFormOpen(false); setSelectedPunto(null); }}
          onSave={async (savedPunto: PuntoEmision) => {
            const wasEditing = !!selectedPunto;
            setPuntoFormOpen(false);
            setSelectedPunto(null);
            // Recargar establecimiento para actualizar la lista de puntos
            try {
              const rEst = await establecimientosApi.show(id!, estId!);
              const dataEst = rEst.data?.data ?? rEst.data;
              setEst(dataEst);
              // Mostrar notificación después de actualizar el estado
              setTimeout(() => {
                show({ 
                  title: 'Éxito', 
                  message: wasEditing ? 'Punto de emisión actualizado' : 'Punto de emisión creado', 
                  type: 'success' 
                });
              }, 100);
            } catch (e:any) {
              show({ title: 'Error', message: 'No se pudo recargar los datos', type: 'error' });
            }
          }}
          existingPuntos={est?.puntos_emision ?? []}
        />
      )}

      {/* Punto Emisión Delete Modal */}
      {puntoDeleteOpen && puntoToDelete && (
        <PuntoEmisionDeleteModal
          isOpen={puntoDeleteOpen}
          punto={puntoToDelete}
          companyId={Number(id)}
          establecimientoId={Number(estId)}
          onClose={() => { setPuntoDeleteOpen(false); setPuntoToDelete(null); }}
          onSuccess={async () => {
            setPuntoDeleteOpen(false);
            setPuntoToDelete(null);
            // Recargar establecimiento para actualizar la lista de puntos
            try {
              const rEst = await establecimientosApi.show(id!, estId!);
              const dataEst = rEst.data?.data ?? rEst.data;
              setEst(dataEst);
            } catch (e:any) {
              // Error silencioso
            }
          }}
          onError={(msg: string) => {
            show({ title: 'Error', message: msg, type: 'error' });
          }}
          onSuccess_notification={(msg: string) => {
            show({ title: 'Éxito', message: msg, type: 'success' });
          }}
        />
      )}

      {/* Image Viewer Modal */}
      <ImageViewerModal 
        open={viewerOpen} 
        imageUrl={viewerImage} 
        onClose={() => setViewerOpen(false)} 
      />

      {/* Usuario Detail Modal */}
      <UsuarioDetailModal
        open={userDetailOpen}
        user={selectedUserDetail}
        loading={userDetailLoading}
        onClose={() => {
          setUserDetailOpen(false);
          setSelectedUserDetail(null);
          setUserDetailLoading(false);
        }}
      />
      </div>
    </div>
  );
};

export default EstablecimientoEditInfo;
