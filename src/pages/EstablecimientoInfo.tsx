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
import './EstablecimientosTab.css';

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

  // Filtros combinables para puntos de emisión (igual a establecimientos)
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

      // Try numeric comparison when both are numeric-ish
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
        
        // Filtrar puntos de emisión para Gerente/Cajero
        if (user && isLimitedRole && dataEst?.puntos_emision) {
          let user_puntos_ids = (user as any).puntos_emision_ids || [];
          
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
        <LoadingSpinner fullHeight />
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

          <button onClick={() => navigate(`/emisores/${id}/establecimientos`)} style={{ padding: '8px 12px', borderRadius: 8 }}>Volver</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Emisor asociado</h4>
          <p>
            <strong>RUC:</strong>{' '}
            {company?.id ? (
              <a href={`/emisores/${company.id}`} onClick={(e) => { e.preventDefault(); navigate(`/emisores/${company.id}`); }} style={{ color: '#1b4ab4', fontWeight: 700 }}>{company?.ruc}</a>
            ) : company?.ruc ?? '-'}
          </p>
          <p><strong>Razón Social:</strong> {company?.razon_social ?? '-'}</p>
          <p><strong>Estado:</strong> {company?.estado ? <span style={{ background: company.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: company.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{company.estado === 'ABIERTO' ? 'ABIERTO' : company.estado}</span> : <span style={{ background: '#bbf7d0', padding: '6px 8px', borderRadius: 6, color: '#059669', fontWeight: 700 }}>ABIERTO</span>}</p>
        </div>

        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Logo</h4>
          {est?.logo_url || est?.logo_path || est?.logo ? (
            <img 
              src={getImageUrl(est.logo_url || est.logo_path || est.logo)} 
              alt="logo" 
              title="Haz clic para ampliar" 
              onClick={() => { 
                const logoUrl = est.logo_url || est.logo_path || est.logo;
                console.log('Logo clicked, URL:', logoUrl); 
                if (logoUrl) {
                  const imageUrl = getImageUrl(logoUrl);
                  console.log('getImageUrl result:', imageUrl);
                  setViewerImage(imageUrl || null); 
                  setViewerOpen(true); 
                }
              }} 
              style={{ width: '100%', height: 180, objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.2s ease', transform: 'scale(1)' }} 
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')} 
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} 
            />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220, justifyContent: 'flex-end' }}>
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

        <div className="est-filters-section" style={{ margin: '12px 20px 0 20px' }}>
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
                const seq = puntoFilters[key] as unknown as { op: 'gte' | 'lte' | 'eq'; value: string };
                return (
                  <div key={String(key)} className="est-filter-group wide">
                    <label className="est-filter-label long">{label}</label>
                    <div className="est-filter-range">
                      <select
                        className="est-filter-select"
                        value={seq.op}
                        onChange={(e) => {
                          const op = e.target.value as 'gte' | 'lte' | 'eq';
                          setPuntoFilters((prev) => ({
                            ...prev,
                            [key]: { ...(prev[key] as unknown as any), op }
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
                            [key]: { ...(prev[key] as unknown as any), value: onlyDigits }
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

            <div className="est-filters-actions">
              <button
                className="est-btn-clear-filters"
                onClick={resetPuntoTable}
                type="button"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            overflowX: activePuntoFiltersCount > 0 && totalPuntos === 0 ? 'hidden' : 'auto',
            overflowY: 'visible',
            position: 'relative'
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
          <table className="puntos-table-modern" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
            <thead>
              <tr>
                <th className="th-sticky sticky-left-0" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('codigo')}>
                  Código {sortByPunto === 'codigo' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="th-sticky sticky-left-1" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('nombre')}>
                  Nombre {sortByPunto === 'nombre' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="th-sticky sticky-left-2" style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('estado_operatividad')}>
                  Estado de operatividad {sortByPunto === 'estado_operatividad' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('estado_disponibilidad')}>
                  Estado de disponibilidad {sortByPunto === 'estado_disponibilidad' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('usuario')}>
                  Usuario asociado {sortByPunto === 'usuario' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_factura')}>
                  Secuencial Facturas {sortByPunto === 'secuencial_factura' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_liquidacion_compra')}>
                  Secuencial Liquidaciones de compra {sortByPunto === 'secuencial_liquidacion_compra' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_nota_credito')}>
                  Secuencial Notas Crédito {sortByPunto === 'secuencial_nota_credito' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_nota_debito')}>
                  Secuencial Notas Débito {sortByPunto === 'secuencial_nota_debito' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_guia_remision')}>
                  Secuencial Guías de remisión {sortByPunto === 'secuencial_guia_remision' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_retencion')}>
                  Secuencial Retenciones {sortByPunto === 'secuencial_retencion' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('secuencial_proforma')}>
                  Secuencial Proformas {sortByPunto === 'secuencial_proforma' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('created_at')}>
                  Fecha de creación {sortByPunto === 'created_at' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSortPunto('updated_at')}>
                  Fecha de actualización {sortByPunto === 'updated_at' ? (sortDirPunto === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="th-sticky sticky-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(est?.puntos_emision) && est.puntos_emision.length > 0 ? (
                paginatedPuntos.length > 0 ? (
                  paginatedPuntos.map((p: any) => (
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
                        {p.estado === 'ACTIVO' ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {p.estado_disponibilidad === 'OCUPADO' ? 'Ocupado' : 'Libre'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {p?.user?.id ? (
                        <a
                          href={`/usuarios/${p.user.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/usuarios/${p.user.id}`);
                          }}
                          style={{ color: '#1b4ab4', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {(() => {
                            const roleValue = (p.user?.role?.value ?? p.user?.role ?? '').toString().toUpperCase();
                            const username = (p.user?.username ?? '').toString().toUpperCase();
                            const nombres = (p.user?.nombres ?? '').toString().toUpperCase();
                            const apellidos = (p.user?.apellidos ?? '').toString().toUpperCase();
                            return `${roleValue} – ${username} – ${nombres} – ${apellidos}`;
                          })()}
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Sin asignar</span>
                      )}
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
                    <td style={{ textAlign: 'center', padding: '16px 8px' }} colSpan={15}>
                      {activePuntoFiltersCount > 0
                        ? '\u00A0'
                        : 'No hay puntos de emisión registrados'}
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td style={{ textAlign: 'center', padding: '16px 8px' }} colSpan={15}>No hay puntos de emisión registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación moderna (estilo establecimientos) */}
        <div className="est-pagination" style={{ margin: '12px 20px 16px 20px' }}>
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
