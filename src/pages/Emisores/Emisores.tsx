import React from 'react';
import { Link } from 'react-router-dom';
import './Emisores.css';
import '../Usuarios/UsuarioDeleteModalModern.css';
import { emisoresApi } from '../../services/emisoresApi';
import { suscripcionesApi, PlanActivo } from '../../services/suscripcionesApi';
import { usuariosApi } from '../../services/usuariosApi';
import EmisorFormModal from './EmisorFormModal';
import ImageViewerModal from '../../components/ImageViewerModal/ImageViewerModal';
import UsuarioDetailModal from '../Usuarios/UsuarioDetailModal';
import { Emisor } from '../../types/emisor';
import { User } from '../../types/user';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/userContext';
import { getImageUrl } from '../../helpers/imageUrl';
import LoadingSpinner from '../../components/LoadingSpinner';

// Helper para truncar a un máximo de N palabras
function truncateWords(text: string, maxWords: number = 10): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

const createDynamicColumns = (
  formatPlanDateIso: (value?: string | null) => string,
  onOpenUserDetail: (userId: number, emisorRow: Emisor) => void
) : Array<{
  key: keyof Emisor | 'logo';
  label: string;
  width?: number;
  render?: (row: Emisor) => React.ReactNode;
}> => [
  { 
    key: 'estado', 
    label: 'Estado',
    width: 140,
    render: (row) => {
      const isActivo = row.estado === 'ACTIVO';
      const displayEstado = isActivo ? 'Activo' : 'Desactivado';
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '25px',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.5px',
          color: '#fff',
          background: isActivo 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
          boxShadow: isActivo 
            ? '0 4px 15px rgba(16, 185, 129, 0.4)' 
            : '0 4px 15px rgba(156, 163, 175, 0.4)',
          animation: isActivo ? 'pulseGlow 2s ease-in-out infinite' : 'none'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#fff',
            boxShadow: '0 0 8px rgba(255,255,255,0.8)'
          }}></span>
          {displayEstado}
        </span>
      );
    }
  },
  { 
    key: 'tipo_plan', 
    label: 'Plan de suscripción vigente',
    render: (row: any) => {
      const vigentes = row.suscripciones_vigentes || row.suscripcionesVigentes;
      // Intentar obtener la suscripción vigente desde la relación
      if (vigentes && Array.isArray(vigentes) && vigentes.length > 0) {
        const susc = vigentes[0];
        const plan = susc.plan;
        if (plan) {
          const nombre = plan.nombre || '-';
          const periodo = plan.periodo || '-';
          const comprobantes = plan.cantidad_comprobantes || '-';
          const precio = plan.precio ? `$${Number(plan.precio).toFixed(2)}` : '-';
          return `${nombre} - ${periodo} - ${comprobantes} C - ${precio}`;
        }
      }
      // Fallback a tipo_plan si existe
      if (row.tipo_plan) {
        const planData = typeof row.tipo_plan === 'object' ? (row.tipo_plan as any) : { nombre: row.tipo_plan };
        const nombre = (planData?.nombre || row.tipo_plan) as string;
        const periodo = (planData?.periodo || '-') as string;
        const comprobantes = (planData?.cantidad_comprobantes || '-') as string | number;
        const precio = planData?.precio ? `$${Number(planData.precio).toFixed(2)}` : '-';
        return `${nombre} - ${periodo} - ${comprobantes} C - ${precio}`;
      }
      return '-';
    }
  },
  { 
    key: 'fecha_inicio_plan', 
    label: 'Fecha Inicio de la suscripción vigente',
    render: (row: any) => {
      const vigentes = row.suscripciones_vigentes || row.suscripcionesVigentes;
      // Intentar obtener fecha de la suscripción vigente
      if (vigentes && Array.isArray(vigentes) && vigentes.length > 0) {
        return formatPlanDateIso(vigentes[0].fecha_inicio) || formatPlanDateIso(row.fecha_inicio_plan);
      }
      return formatPlanDateIso(row.fecha_inicio_plan);
    }
  },
  { 
    key: 'fecha_fin_plan', 
    label: 'Fecha Final de la suscripción vigente',
    render: (row: any) => {
      const vigentes = row.suscripciones_vigentes || row.suscripcionesVigentes;
      // Intentar obtener fecha de la suscripción vigente
      if (vigentes && Array.isArray(vigentes) && vigentes.length > 0) {
        return formatPlanDateIso(vigentes[0].fecha_fin) || formatPlanDateIso(row.fecha_fin_plan);
      }
      return formatPlanDateIso(row.fecha_fin_plan);
    }
  },
  { key: 'cantidad_creados', label: 'Cantidad de comprobantes creados', width: 240 },
  { key: 'cantidad_restantes', label: 'Cantidad de comprobantes restantes', width: 240 },

  { key: 'nombre_comercial', label: 'Nombre comercial', width: 200 },
  { key: 'direccion_matriz', label: 'Dirección Matriz', width: 240 },
  {
    key: 'logo',
    label: 'Logo',
    width: 130,
    render: (row) =>
      row.logo_url ? (
        <img 
          className="logo-cell" 
          src={getImageUrl(row.logo_url)} 
          alt="logo"
          title="Haz clic para ampliar"
          style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
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

  { 
    key: 'obligado_contabilidad', 
    label: 'Obligado a llevar contabilidad', 
    width: 200,
    render: (row) => row.obligado_contabilidad === 'SI' ? 'Sí' : 'No'
  },
  { 
    key: 'contribuyente_especial', 
    label: 'Contribuyente Especial', 
    width: 250,
    render: (row: any) => {
      if (row.contribuyente_especial === 'SI') {
        const resolucion = row.numero_resolucion_contribuyente_especial || '';
        return resolucion ? `Sí - Res. ${resolucion}` : 'Sí';
      }
      return 'No';
    }
  },
  { 
    key: 'agente_retencion', 
    label: 'Agente de Retención', 
    width: 250,
    render: (row: any) => {
      if (row.agente_retencion === 'SI') {
        const resolucion = row.numero_resolucion_agente_retencion || '';
        return resolucion ? `Sí - Res. ${resolucion}` : 'Sí';
      }
      return 'No';
    }
  },
  { key: 'codigo_artesano', label: 'Código Artesano', width: 180 },
  { key: 'tipo_persona', label: 'Tipo de persona', width: 160 },
  { key: 'ambiente', label: 'Ambiente', width: 150 },
  { key: 'tipo_emision', label: 'Tipo de Emisión', width: 160 },

  { 
    key: 'created_at', 
    label: 'Fecha y hora de Creación', 
    width: 180,
    render: (row) => {
      if (!row.created_at) return '-';
      const date = new Date(row.created_at);
      return date.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  },
  { 
    key: 'updated_at', 
    label: 'Fecha y hora de Actualización', 
    width: 200,
    render: (row) => {
      if (!row.updated_at) return '-';
      const date = new Date(row.updated_at);
      return date.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  },
  { 
    key: 'created_by_name', 
    label: 'Nombre del Registrador', 
    width: 350,
    render: (row: any) => {
      // Formato: ROL – USERNAME – NOMBRES – APELLIDOS
      const creator = row.creator;
      if (creator) {
        const rol = (creator.role || 'USUARIO').toUpperCase();
        const username = creator.username || creator.name || '-';
        const nombres = creator.nombres || '';
        const apellidos = creator.apellidos || '';
        const fullName = `${nombres} ${apellidos}`.trim() || username;
        return (
          <span>
            {rol} –{' '}
            <button
              type="button"
              title="Ver usuario"
              onClick={() => onOpenUserDetail(creator.id, row)}
              style={{
                color: '#6366f1',
                textDecoration: 'none',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              {username}
            </button>
            {' '}– {fullName}
          </span>
        );
      }
      // Fallback si no hay relación creator
      return row.created_by_name || '-';
    }
  },
  { 
    key: 'ultimo_login', 
    label: 'Fecha y hora de Último Inicio de Sesión', 
    width: 280,
    render: (row) => {
      if (!row.ultimo_login) return '-';
      const date = new Date(row.ultimo_login);
      return date.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  },
  { 
    key: 'ultimo_comprobante', 
    label: 'Fecha y hora de Último Comprobante Creado', 
    width: 300,
    render: (row) => {
      if (!row.ultimo_comprobante) return '-';
      const date = new Date(row.ultimo_comprobante);
      return date.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  },
];

const Emisores: React.FC = () => {
  const [data, setData] = React.useState<Emisor[]>([]);
  const { show } = useNotification();
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = React.useState(false);
  const deleteInFlightRef = React.useRef(false);
  // Dynamic filtering
  type FilterField = 'ruc'|'razon_social'|'estado'|'tipo_plan'|'cantidad_creados_gt'|'cantidad_restantes_lt'|'nombre_comercial'|'direccion_matriz'|'regimen_tributario'|'obligado_contabilidad'|'contribuyente_especial'|'agente_retencion'|'codigo_artesano'|'tipo_persona'|'ambiente'|'tipo_emision'|'registrador';
  const [activeFilter, setActiveFilter] = React.useState<FilterField | null>(null);
  const [filterValue, setFilterValue] = React.useState<string>('');
  const [estado, setEstado] = React.useState('ACTIVO');
  const [q, setQ] = React.useState('');

  // Pretty labels to show consistent "Buscando por ..." caption like the Estado filter design
  const filterLabels: Record<FilterField, string> = {
    ruc: 'RUC',
    razon_social: 'Razón Social',
    estado: 'Estado',
    tipo_plan: 'Plan de suscripción vigente',
    cantidad_creados_gt: 'Cantidad de Comprobantes Creados',
    cantidad_restantes_lt: 'Cantidad de Comprobantes Restantes',
    nombre_comercial: 'Nombre Comercial',
    direccion_matriz: 'Dirección Matriz',
    regimen_tributario: 'Régimen Tributario',
    obligado_contabilidad: 'Obligado a llevar contabilidad',
    contribuyente_especial: 'Contribuyente Especial',
    agente_retencion: 'Agente de Retención',
    codigo_artesano: 'Código Artesano',
    tipo_persona: 'Tipo de Persona',
    ambiente: 'Ambiente',
    tipo_emision: 'Tipo de Emisión',
    registrador: 'Nombre del Registrador',
  };
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
  const hastaInputRef = React.useRef<HTMLInputElement | null>(null);

  // Collapsible filters panel
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filterRuc, setFilterRuc] = React.useState('');
  const [filterRazonSocial, setFilterRazonSocial] = React.useState('');
  const [filterEstado, setFilterEstado] = React.useState('ACTIVO');
  const [filterNombreComercial, setFilterNombreComercial] = React.useState('');
  const [filterDireccionMatriz, setFilterDireccionMatriz] = React.useState('');
  const [filterRegimenTributario, setFilterRegimenTributario] = React.useState('');
  const [filterObligadoContabilidad, setFilterObligadoContabilidad] = React.useState('');
  const [filterAgenteRetencion, setFilterAgenteRetencion] = React.useState('');
  const [filterContribuyenteEspecial, setFilterContribuyenteEspecial] = React.useState('');
  const [filterCodigoArtesano, setFilterCodigoArtesano] = React.useState('');
  const [filterTipoPersona, setFilterTipoPersona] = React.useState('');
  const [filterAmbiente, setFilterAmbiente] = React.useState('');
  const [filterTipoEmision, setFilterTipoEmision] = React.useState('');
  const [filterRegistrador, setFilterRegistrador] = React.useState('');

  // Plan vigente (multi-select)
  const [planesActivos, setPlanesActivos] = React.useState<PlanActivo[]>([]);
  const [filterPlanIds, setFilterPlanIds] = React.useState<number[]>([]);

  // Cantidades (criterio + entero)
  type CmpOp = '' | 'gte' | 'lte' | 'eq';
  const [filterCreadosOp, setFilterCreadosOp] = React.useState<CmpOp>('');
  const [filterCreadosVal, setFilterCreadosVal] = React.useState<string>('');
  const [filterRestantesOp, setFilterRestantesOp] = React.useState<CmpOp>('');
  const [filterRestantesVal, setFilterRestantesVal] = React.useState<string>('');

  // Fechas adicionales
  const [filterPlanInicioFrom, setFilterPlanInicioFrom] = React.useState('');
  const [filterPlanInicioTo, setFilterPlanInicioTo] = React.useState('');
  const [filterPlanFinFrom, setFilterPlanFinFrom] = React.useState('');
  const [filterPlanFinTo, setFilterPlanFinTo] = React.useState('');
  const [filterUltimoLoginFrom, setFilterUltimoLoginFrom] = React.useState('');
  const [filterUltimoLoginTo, setFilterUltimoLoginTo] = React.useState('');
  const [filterUltimoComprobanteFrom, setFilterUltimoComprobanteFrom] = React.useState('');
  const [filterUltimoComprobanteTo, setFilterUltimoComprobanteTo] = React.useState('');

  const [filterCreatedFrom, setFilterCreatedFrom] = React.useState('');
  const [filterCreatedTo, setFilterCreatedTo] = React.useState('');
  const [filterUpdatedFrom, setFilterUpdatedFrom] = React.useState('');
  const [filterUpdatedTo, setFilterUpdatedTo] = React.useState('');

  React.useEffect(() => {
    // Cargar planes activos para el filtro de multi-selección
    suscripcionesApi.getPlanesActivos()
      .then((res) => {
        const list = (res.data?.data ?? []) as PlanActivo[];
        setPlanesActivos(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setPlanesActivos([]);
      });
  }, []);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filterRuc) count++;
    if (filterRazonSocial) count++;
    if (filterEstado && filterEstado !== 'ACTIVO') count++;
    if (filterNombreComercial) count++;
    if (filterDireccionMatriz) count++;
    if (filterPlanIds.length > 0) count++;
    if (filterCreadosOp && filterCreadosVal) count++;
    if (filterRestantesOp && filterRestantesVal) count++;
    if (filterAgenteRetencion) count++;
    if (filterContribuyenteEspecial) count++;
    if (filterCodigoArtesano) count++;
    if (filterTipoEmision) count++;
    if (filterRegistrador) count++;
    if (filterPlanInicioFrom) count++;
    if (filterPlanInicioTo) count++;
    if (filterPlanFinFrom) count++;
    if (filterPlanFinTo) count++;
    if (filterUltimoLoginFrom) count++;
    if (filterUltimoLoginTo) count++;
    if (filterUltimoComprobanteFrom) count++;
    if (filterUltimoComprobanteTo) count++;
    if (filterRegimenTributario) count++;
    if (filterObligadoContabilidad) count++;
    if (filterTipoPersona) count++;
    if (filterAmbiente) count++;
    if (filterCreatedFrom) count++;
    if (filterCreatedTo) count++;
    if (filterUpdatedFrom) count++;
    if (filterUpdatedTo) count++;
    return count;
  }, [
    filterRuc,
    filterRazonSocial,
    filterEstado,
    filterNombreComercial,
    filterDireccionMatriz,
    filterPlanIds,
    filterCreadosOp,
    filterCreadosVal,
    filterRestantesOp,
    filterRestantesVal,
    filterAgenteRetencion,
    filterContribuyenteEspecial,
    filterCodigoArtesano,
    filterTipoEmision,
    filterRegistrador,
    filterPlanInicioFrom,
    filterPlanInicioTo,
    filterPlanFinFrom,
    filterPlanFinTo,
    filterUltimoLoginFrom,
    filterUltimoLoginTo,
    filterUltimoComprobanteFrom,
    filterUltimoComprobanteTo,
    filterRegimenTributario,
    filterObligadoContabilidad,
    filterTipoPersona,
    filterAmbiente,
    filterCreatedFrom,
    filterCreatedTo,
    filterUpdatedFrom,
    filterUpdatedTo,
  ]);

  const clearAllFilters = React.useCallback(() => {
    setFilterRuc('');
    setFilterRazonSocial('');
    setFilterEstado('ACTIVO');
    setFilterNombreComercial('');
    setFilterDireccionMatriz('');
    setFilterPlanIds([]);
    setFilterCreadosOp('');
    setFilterCreadosVal('');
    setFilterRestantesOp('');
    setFilterRestantesVal('');
    setFilterAgenteRetencion('');
    setFilterContribuyenteEspecial('');
    setFilterCodigoArtesano('');
    setFilterRegimenTributario('');
    setFilterObligadoContabilidad('');
    setFilterTipoPersona('');
    setFilterAmbiente('');
    setFilterTipoEmision('');
    setFilterRegistrador('');
    setFilterPlanInicioFrom('');
    setFilterPlanInicioTo('');
    setFilterPlanFinFrom('');
    setFilterPlanFinTo('');
    setFilterUltimoLoginFrom('');
    setFilterUltimoLoginTo('');
    setFilterUltimoComprobanteFrom('');
    setFilterUltimoComprobanteTo('');
    setFilterCreatedFrom('');
    setFilterCreatedTo('');
    setFilterUpdatedFrom('');
    setFilterUpdatedTo('');
    setActiveFilter(null);
    setFilterValue('');
    setDesde('');
    setHasta('');
    setEstado('');
    setQ('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
    // Reload immediately with default params (only estado=ACTIVO)
    loadClean();
  }, []);

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);

  // Sorting states - Por defecto: fecha de creación descendente
  const [sortBy, setSortBy] = React.useState<keyof Emisor | 'logo' | null>('created_at');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Image viewer states
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);
  const hasAutoLoadedRef = React.useRef(false);

  // Usuario detail modal states
  const [userDetailOpen, setUserDetailOpen] = React.useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = React.useState<User | null>(null);
  const [userDetailLoading, setUserDetailLoading] = React.useState(false);

  const handleOpenUserDetail = React.useCallback(
    async (userId: number, emisorRow?: Emisor) => {
      if (!userId) return;

      setUserDetailLoading(true);
      setUserDetailOpen(true);
      setSelectedUserDetail(null);

      try {
        const response = await usuariosApi.get(userId);
        let userData: any = response.data?.data ?? response.data;

        if (
          emisorRow &&
          userData?.emisor_id != null &&
          emisorRow?.id != null &&
          String(userData.emisor_id) === String(emisorRow.id)
        ) {
          userData = {
            ...userData,
            emisor_ruc: emisorRow.ruc,
            emisor_razon_social: emisorRow.razon_social,
            emisor_estado: emisorRow.estado,
          };
        }

        setSelectedUserDetail(userData);
      } catch (error: any) {
        show({ title: 'Error', message: 'No se pudo cargar la información del usuario', type: 'error' });
        setUserDetailOpen(false);
      } finally {
        setUserDetailLoading(false);
      }
    },
    [show]
  );

  const formatDate = React.useCallback((iso: string) => {
    if (!iso) return '';
    // Expecting yyyy-mm-dd
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }, []);

  const formatPlanDateIso = React.useCallback((value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
    // Try to normalize values like dd/mm/yyyy
    const parts = value.split(/[\/\-]/); // split by / or -
    if (parts.length === 3) {
      let [a, b, c] = parts;
      if (a.length === 4) {
        return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      }
      if (c.length === 4) {
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      }
    }
    return value;
  }, []);

  const dynamicColumns = React.useMemo(
    () => createDynamicColumns(formatPlanDateIso, handleOpenUserDetail),
    [formatPlanDateIso, handleOpenUserDetail]
  );

  // Verificar si el usuario tiene permisos para editar/eliminar un emisor
  const canEditEmit = React.useCallback((emit: Emisor) => {
    if (!user) return false;
    // Admin puede editar todos
    if (user.role === 'administrador') return true;
    // Distribuidor solo puede editar los que creó
    if (user.role === 'distribuidor') {
      return emit.created_by === user.id;
    }
    // Emisor puede editar:
    // 1. Emisores que creó
    // 2. Su propio emisor asignado (comparar ID del emisor con ID del usuario)
    if (user.role === 'emisor') {
      return emit.created_by === user.id || emit.id === (user as any).emisor_id;
    }
    // Otros roles no pueden editar
    return false;
  }, [user]);

  // Scroll sync refs para una sola área scrollable
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Focus first input when date modal opens (no outside click handler - modal uses Portal)
  React.useEffect(() => {
    if (!dateOpen) return;
    setTimeout(() => desdeInputRef.current?.focus(), 0);
  }, [dateOpen]);

  // Load with clean/default params (used by clearAllFilters)
  const loadClean = React.useCallback(async () => {
    if (userLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        estado: 'ACTIVO',
        page: 1,
        per_page: 200,
      };
      const res = await emisoresApi.list(params);
      const emisores = res.data?.data ?? res.data ?? [];
      let list = emisores as Emisor[];
      if (user && (user.role === 'gerente' || user.role === 'cajero')) {
        const user_emisor_id = (user as any).emisor_id;
        if (user_emisor_id) {
          list = list.filter((e) => e.id === user_emisor_id);
        }
      }
      setData(list);
      setTotalItems(list.length);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cargar emisores');
    } finally {
      setLoading(false);
    }
  }, [user, userLoading]);

  const load = React.useCallback(async () => {
    if (userLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        q: q || undefined,
        created_at_from: filterCreatedFrom || desde || undefined,
        created_at_to: filterCreatedTo || hasta || undefined,
        page: 1,
        per_page: 200,
      };
      // Send panel filters to backend
      if (filterRuc) params.ruc = filterRuc;
      if (filterRazonSocial) params.razon_social = filterRazonSocial;
      if (filterEstado) params.estado = filterEstado;
      if (filterNombreComercial) params.nombre_comercial = filterNombreComercial;
      if (filterDireccionMatriz) params.direccion_matriz = filterDireccionMatriz;
      if (filterRegimenTributario) params.regimen_tributario = filterRegimenTributario;
      if (filterObligadoContabilidad) params.obligado_contabilidad = filterObligadoContabilidad;
      if (filterAgenteRetencion) params.agente_retencion = filterAgenteRetencion;
      if (filterContribuyenteEspecial) params.contribuyente_especial = filterContribuyenteEspecial;
      if (filterCodigoArtesano) params.codigo_artesano = filterCodigoArtesano;
      if (filterTipoPersona) params.tipo_persona = filterTipoPersona;
      if (filterAmbiente) params.ambiente = filterAmbiente;
      if (filterTipoEmision) params.tipo_emision = filterTipoEmision;
      if (filterRegistrador) params.registrador = filterRegistrador;
      if (filterUpdatedFrom) params.updated_at_from = filterUpdatedFrom;
      if (filterUpdatedTo) params.updated_at_to = filterUpdatedTo;

      // Plan vigente (multi-select)
      if (filterPlanIds.length > 0) params.plan_ids = filterPlanIds.join(',');

      // Cantidades (criterio + entero)
      if (filterCreadosOp && filterCreadosVal) {
        params.vigente_creados_op = filterCreadosOp;
        params.vigente_creados = filterCreadosVal;
      }
      if (filterRestantesOp && filterRestantesVal) {
        params.vigente_restantes_op = filterRestantesOp;
        params.vigente_restantes = filterRestantesVal;
      }

      // Fechas de suscripción vigente
      if (filterPlanInicioFrom) params.vigente_inicio_from = filterPlanInicioFrom;
      if (filterPlanInicioTo) params.vigente_inicio_to = filterPlanInicioTo;
      if (filterPlanFinFrom) params.vigente_fin_from = filterPlanFinFrom;
      if (filterPlanFinTo) params.vigente_fin_to = filterPlanFinTo;

      // Fechas de último login / último comprobante
      if (filterUltimoLoginFrom) params.ultimo_login_from = filterUltimoLoginFrom;
      if (filterUltimoLoginTo) params.ultimo_login_to = filterUltimoLoginTo;
      if (filterUltimoComprobanteFrom) params.ultimo_comprobante_from = filterUltimoComprobanteFrom;
      if (filterUltimoComprobanteTo) params.ultimo_comprobante_to = filterUltimoComprobanteTo;

      // Old column-header filter system (for non-panel filters)
      if (activeFilter && activeFilter !== 'estado' && filterValue.trim()) {
        params[activeFilter] = filterValue.trim();
      }

      const res = await emisoresApi.list(params);
      const emisores = res.data?.data ?? res.data ?? [];
      let list = emisores as Emisor[];

      if (activeFilter === 'tipo_plan' && filterValue.trim()) {
        const term = filterValue.trim().toLowerCase();
        list = list.filter((e) => (e as any).tipo_plan && String((e as any).tipo_plan).toLowerCase().includes(term));
      }
      // Si el usuario es gerente o cajero, solo mostrar su emisor asignado
      if (user && (user.role === 'gerente' || user.role === 'cajero')) {
        const user_emisor_id = (user as any).emisor_id;
        if (user_emisor_id) {
          list = list.filter((e) => e.id === user_emisor_id);
        }
      }
  setData(list);
  setTotalItems(list.length);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cargar emisores');
    } finally {
      setLoading(false);
    }
  }, [
    activeFilter,
    filterValue,
    q,
    desde,
    hasta,
    user,
    userLoading,
    filterRuc,
    filterRazonSocial,
    filterEstado,
    filterNombreComercial,
    filterDireccionMatriz,
    filterRegimenTributario,
    filterObligadoContabilidad,
    filterAgenteRetencion,
    filterContribuyenteEspecial,
    filterCodigoArtesano,
    filterTipoPersona,
    filterAmbiente,
    filterTipoEmision,
    filterRegistrador,
    filterPlanIds,
    filterCreadosOp,
    filterCreadosVal,
    filterRestantesOp,
    filterRestantesVal,
    filterPlanInicioFrom,
    filterPlanInicioTo,
    filterPlanFinFrom,
    filterPlanFinTo,
    filterUltimoLoginFrom,
    filterUltimoLoginTo,
    filterUltimoComprobanteFrom,
    filterUltimoComprobanteTo,
    filterCreatedFrom,
    filterCreatedTo,
    filterUpdatedFrom,
    filterUpdatedTo,
  ]);


  // Initial load: only once when user is ready
  React.useEffect(() => {
    if (userLoading) return;
    if (hasAutoLoadedRef.current) return;
    hasAutoLoadedRef.current = true;
    load();
  }, [load, user, userLoading]);

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

    const getVigente = (row: any) => {
      const vigentes = row?.suscripciones_vigentes || row?.suscripcionesVigentes;
      if (vigentes && Array.isArray(vigentes) && vigentes.length > 0) return vigentes[0];
      return null;
    };

    const normalizeIsoDate = (value: any): string => {
      if (!value) return '';
      // Prefer YYYY-MM-DD when possible
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
      const text = String(value);
      const parts = text.split(/[\/\-]/);
      if (parts.length === 3) {
        let [a, b, c] = parts;
        if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      }
      return text;
    };

    const toSortValue = (row: Emisor, key: keyof Emisor | 'logo'): string | number | null => {
      if (key === 'logo') return null;

      const anyRow = row as any;
      const vigente = getVigente(anyRow);

      if (key === 'tipo_plan') {
        // Ordenar por el mismo texto que se muestra
        if (vigente?.plan) {
          const nombre = vigente.plan.nombre || '-';
          const periodo = vigente.plan.periodo || '-';
          const comprobantes = vigente.plan.cantidad_comprobantes ?? '-';
          const precio = vigente.plan.precio ? `$${Number(vigente.plan.precio).toFixed(2)}` : '-';
          return `${nombre} - ${periodo} - ${comprobantes} C - ${precio}`;
        }
        if (anyRow.tipo_plan) return String(anyRow.tipo_plan);
        return '';
      }

      if (key === 'fecha_inicio_plan') {
        return normalizeIsoDate(vigente?.fecha_inicio || anyRow.fecha_inicio_plan);
      }
      if (key === 'fecha_fin_plan') {
        return normalizeIsoDate(vigente?.fecha_fin || anyRow.fecha_fin_plan);
      }

      if (key === 'cantidad_creados') {
        const v = anyRow.cantidad_creados ?? vigente?.comprobantes_usados;
        return v == null || v === '' ? null : Number(v);
      }
      if (key === 'cantidad_restantes') {
        const v = anyRow.cantidad_restantes;
        if (v != null && v !== '') return Number(v);
        if (vigente) {
          const asignados = Number(vigente.cantidad_comprobantes ?? 0);
          const usados = Number(vigente.comprobantes_usados ?? 0);
          return asignados - usados;
        }
        return null;
      }

      if (key === 'ultimo_login') {
        return anyRow.ultimo_login ? String(anyRow.ultimo_login) : '';
      }
      if (key === 'ultimo_comprobante') {
        return anyRow.ultimo_comprobante ? String(anyRow.ultimo_comprobante) : '';
      }

      const raw = (row as any)[key];
      if (raw == null) return null;
      return typeof raw === 'number' ? raw : String(raw);
    };

    const sorted = [...data].sort((a, b) => {
      const aVal = toSortValue(a, sortBy as any);
      const bVal = toSortValue(b, sortBy as any);

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (bVal == null) return sortOrder === 'asc' ? -1 : 1;

      // Compare values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr, 'es')
        : bStr.localeCompare(aStr, 'es');
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
        <h2><span className="emisores-title-icon">🏢</span> Emisores</h2>
        <button 
            className="btn-nuevo" 
            onClick={() => setOpenNew(true)}
            disabled={user?.role === 'gerente' || user?.role === 'emisor' || user?.role === 'cajero'}
            style={{
              opacity: (user?.role === 'gerente' || user?.role === 'emisor' || user?.role === 'cajero') ? 0.5 : 1,
              cursor: (user?.role === 'gerente' || user?.role === 'emisor' || user?.role === 'cajero') ? 'not-allowed' : 'pointer',
              background: (user?.role === 'gerente' || user?.role === 'emisor' || user?.role === 'cajero') ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' : undefined
            }}
            title={user?.role === 'gerente' ? 'Los gerentes no pueden crear emisores' : user?.role === 'emisor' ? 'Los emisores no pueden crear emisores' : user?.role === 'cajero' ? 'Los cajeros no pueden crear emisores' : 'Crear nuevo emisor'}
          >
            ✨ Nuevo
          </button>
      </div>

      {/* Panel de Filtros Colapsable */}
      <div className="emisores-filters-section">
        <button 
          className="emisores-filters-toggle" 
          onClick={() => setFiltersOpen(!filtersOpen)}
          type="button"
        >
          <div className="emisores-filters-toggle-left">
            <span>🔍</span>
            <span>Filtros de Búsqueda</span>
            {activeFiltersCount > 0 && (
              <span className="emisores-filters-count">{activeFiltersCount}</span>
            )}
          </div>
          <span className={`emisores-filters-chevron ${filtersOpen ? 'open' : ''}`}>▼</span>
        </button>

        {filtersOpen && (
          <div className="emisores-filters-content">
            {/* Fila 1: Campos de texto */}
            <div className="emisores-filters-grid">
              <div className="emisores-filter-group">
                <label>🆔 RUC</label>
                <input
                  type="text"
                  placeholder="Buscar por RUC"
                  value={filterRuc}
                  onChange={(e) => setFilterRuc(e.target.value)}
                />
              </div>
              <div className="emisores-filter-group">
                <label>🏢 Razón Social</label>
                <input
                  type="text"
                  placeholder="Buscar por razón social"
                  value={filterRazonSocial}
                  onChange={(e) => setFilterRazonSocial(e.target.value)}
                />
              </div>
              <div className="emisores-filter-group">
                <label>🏪 Nombre Comercial</label>
                <input
                  type="text"
                  placeholder="Buscar por nombre comercial"
                  value={filterNombreComercial}
                  onChange={(e) => setFilterNombreComercial(e.target.value)}
                />
              </div>
            </div>

            {/* Fila 1.1: Más texto */}
            <div className="emisores-filters-grid" style={{ marginTop: 18 }}>
              <div className="emisores-filter-group">
                <label>📍 Dirección Matriz</label>
                <input
                  type="text"
                  placeholder="Buscar por dirección matriz"
                  value={filterDireccionMatriz}
                  onChange={(e) => setFilterDireccionMatriz(e.target.value)}
                />
              </div>
              <div className="emisores-filter-group">
                <label>🧾 Nombre del Registrador</label>
                <input
                  type="text"
                  placeholder="Buscar por registrador"
                  value={filterRegistrador}
                  onChange={(e) => setFilterRegistrador(e.target.value)}
                />
              </div>
              <div className="emisores-filter-group">
                <label>🧵 Código Artesano</label>
                <input
                  type="text"
                  placeholder="Buscar por código artesano"
                  value={filterCodigoArtesano}
                  onChange={(e) => setFilterCodigoArtesano(e.target.value)}
                />
              </div>
            </div>

            {/* Fila 1.2: Contribuyente/Retención */}
            <div className="emisores-filters-grid" style={{ marginTop: 18 }}>
              <div className="emisores-filter-group">
                <label>🧾 Contribuyente Especial</label>
                <input
                  type="text"
                  placeholder='Ej: SI, NO o # resolución'
                  value={filterContribuyenteEspecial}
                  onChange={(e) => setFilterContribuyenteEspecial(e.target.value)}
                />
              </div>
              <div className="emisores-filter-group">
                <label>🧾 Agente de Retención</label>
                <input
                  type="text"
                  placeholder='Ej: SI, NO o # resolución'
                  value={filterAgenteRetencion}
                  onChange={(e) => setFilterAgenteRetencion(e.target.value)}
                />
              </div>
              <div className="emisores-filter-group">
                <label>📦 Plan de suscripción vigente</label>
                <select
                  multiple
                  value={filterPlanIds.map(String)}
                  onChange={(e) => {
                    const ids = Array.from(e.currentTarget.selectedOptions)
                      .map((o) => Number(o.value))
                      .filter((v) => Number.isFinite(v));
                    setFilterPlanIds(ids);
                  }}
                  size={4}
                >
                  {planesActivos.length === 0 ? (
                    <option value="" disabled>
                      (Sin planes disponibles)
                    </option>
                  ) : (
                    planesActivos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Fila 2: Selects */}
            <div className="emisores-filters-grid" style={{ marginTop: 18 }}>
              <div className="emisores-filter-group">
                <label>📊 Estado</label>
                <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="DESACTIVADO">Desactivado</option>
                </select>
              </div>
              <div className="emisores-filter-group">
                <label>📋 Régimen Tributario</label>
                <select value={filterRegimenTributario} onChange={(e) => setFilterRegimenTributario(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="GENERAL">General</option>
                  <option value="RIMPE_POPULAR">RIMPE Negocio Popular</option>
                  <option value="RIMPE_EMPRENDEDOR">RIMPE Emprendedor</option>
                  <option value="MICRO_EMPRESA">Microempresa</option>
                </select>
              </div>
              <div className="emisores-filter-group">
                <label>📒 Obligado Contabilidad</label>
                <select value={filterObligadoContabilidad} onChange={(e) => setFilterObligadoContabilidad(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="SI">Sí</option>
                  <option value="NO">No</option>
                </select>
              </div>
              <div className="emisores-filter-group">
                <label>👤 Tipo de Persona</label>
                <select value={filterTipoPersona} onChange={(e) => setFilterTipoPersona(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="NATURAL">Natural</option>
                  <option value="JURIDICA">Jurídica</option>
                </select>
              </div>
              <div className="emisores-filter-group">
                <label>🌐 Ambiente</label>
                <select value={filterAmbiente} onChange={(e) => setFilterAmbiente(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="PRODUCCION">Producción</option>
                  <option value="PRUEBAS">Pruebas</option>
                </select>
              </div>

              <div className="emisores-filter-group">
                <label>📡 Tipo de Emisión</label>
                <select value={filterTipoEmision} onChange={(e) => setFilterTipoEmision(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="NORMAL">Normal</option>
                  <option value="INDISPONIBILIDAD">Indisponibilidad del SRI</option>
                </select>
              </div>
            </div>

            {/* Fila 2.1: Cantidades */}
            <div className="emisores-filters-grid" style={{ marginTop: 18 }}>
              <div className="emisores-filter-group">
                <label>📄 Cantidad de comprobantes creados (suscripción vigente)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select
                    value={filterCreadosOp}
                    onChange={(e) => setFilterCreadosOp(e.target.value as CmpOp)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Criterio</option>
                    <option value="gte">Mayor o igual que</option>
                    <option value="lte">Menor o igual que</option>
                    <option value="eq">Igual que</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={filterCreadosVal}
                    onChange={(e) => setFilterCreadosVal(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="emisores-filter-group">
                <label>📄 Cantidad de comprobantes restantes (suscripción vigente)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select
                    value={filterRestantesOp}
                    onChange={(e) => setFilterRestantesOp(e.target.value as CmpOp)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Criterio</option>
                    <option value="gte">Mayor o igual que</option>
                    <option value="lte">Menor o igual que</option>
                    <option value="eq">Igual que</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={filterRestantesVal}
                    onChange={(e) => setFilterRestantesVal(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {/* Fila 3: Fechas */}
            <div className="emisores-filters-grid" style={{ marginTop: 18 }}>
              <div className="emisores-filter-group">
                <label>📅 Creación desde</label>
                <input type="date" value={filterCreatedFrom} onChange={(e) => setFilterCreatedFrom(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>📅 Creación hasta</label>
                <input type="date" value={filterCreatedTo} onChange={(e) => setFilterCreatedTo(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🔄 Actualización desde</label>
                <input type="date" value={filterUpdatedFrom} onChange={(e) => setFilterUpdatedFrom(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🔄 Actualización hasta</label>
                <input type="date" value={filterUpdatedTo} onChange={(e) => setFilterUpdatedTo(e.target.value)} />
              </div>
            </div>

            {/* Fila 4: Fechas suscripción vigente */}
            <div className="emisores-filters-grid" style={{ marginTop: 18 }}>
              <div className="emisores-filter-group">
                <label>🗓️ Inicio suscripción vigente desde</label>
                <input type="date" value={filterPlanInicioFrom} onChange={(e) => setFilterPlanInicioFrom(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🗓️ Inicio suscripción vigente hasta</label>
                <input type="date" value={filterPlanInicioTo} onChange={(e) => setFilterPlanInicioTo(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🗓️ Final suscripción vigente desde</label>
                <input type="date" value={filterPlanFinFrom} onChange={(e) => setFilterPlanFinFrom(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🗓️ Final suscripción vigente hasta</label>
                <input type="date" value={filterPlanFinTo} onChange={(e) => setFilterPlanFinTo(e.target.value)} />
              </div>
            </div>

            {/* Fila 5: Fechas último login / comprobante */}
            <div className="emisores-filters-grid" style={{ marginTop: 18 }}>
              <div className="emisores-filter-group">
                <label>🔐 Último inicio de sesión desde</label>
                <input type="date" value={filterUltimoLoginFrom} onChange={(e) => setFilterUltimoLoginFrom(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🔐 Último inicio de sesión hasta</label>
                <input type="date" value={filterUltimoLoginTo} onChange={(e) => setFilterUltimoLoginTo(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🧾 Último comprobante creado desde</label>
                <input type="date" value={filterUltimoComprobanteFrom} onChange={(e) => setFilterUltimoComprobanteFrom(e.target.value)} />
              </div>
              <div className="emisores-filter-group">
                <label>🧾 Último comprobante creado hasta</label>
                <input type="date" value={filterUltimoComprobanteTo} onChange={(e) => setFilterUltimoComprobanteTo(e.target.value)} />
              </div>
            </div>

            {/* Acciones de filtros */}
            <div className="emisores-filters-actions">
              <button type="button" className="emisores-btn-apply" onClick={() => load()}>
                ✓ Aplicar filtros
              </button>
              {activeFiltersCount > 0 && (
                <button type="button" className="emisores-btn-clear" onClick={clearAllFilters}>
                  🗑️ Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>


      {error && <div className="alert-error"><span style={{ marginRight: '8px' }}>⚠️</span> {error}</div>}

      <div className="tabla-wrapper">
        {paginatedData.length === 0 && !loading && (
          <div className="tabla-empty-overlay">
            <div className="tabla-empty-content">
              <span style={{ fontSize: '64px', marginBottom: '16px', display: 'block' }}>🏢</span>
              <span style={{ fontSize: '18px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                {activeFiltersCount > 0 || (activeFilter && filterValue) || desde || hasta
                  ? 'No se encontraron emisores con los filtros aplicados.' 
                  : 'No hay emisores registrados'}
              </span>
              <span style={{ fontSize: '14px', color: '#9ca3af', display: 'block' }}>
                {activeFiltersCount > 0 || (activeFilter && filterValue) || desde || hasta
                  ? 'Intenta con otros criterios de búsqueda o limpia los filtros' 
                  : 'Haz clic en "✨ Nuevo" para agregar uno'}
              </span>
            </div>
          </div>
        )}
        <div className="tabla-scroll-container" ref={scrollContainerRef}>
          <table className="tabla-emisores">
            <thead>
              <tr>
                {/* Fijos izquierda */}
                <th 
                  className="th-sticky sticky-left-1 sortable" 
                  onClick={() => { 
                    handleSort('ruc'); 
                    setActiveFilter('ruc');
                    setFilterValue('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    RUC 
                    <span style={{ opacity: sortBy === 'ruc' ? 1 : 0.5, fontSize: '26px' }}>{sortBy === 'ruc' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                    {activeFilter === 'ruc' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}></span>}
                  </span>
                </th>
                <th 
                  className="th-sticky sticky-left-2 sortable" 
                  onClick={() => { 
                    handleSort('razon_social'); 
                    setActiveFilter('razon_social');
                    setFilterValue('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    Razón Social 
                    <span style={{ opacity: sortBy === 'razon_social' ? 1 : 0.5, fontSize: '26px' }}>{sortBy === 'razon_social' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                    {activeFilter === 'razon_social' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}></span>}
                  </span>
                </th>

                {/* Columnas dinámicas */}
                {dynamicColumns.map((c) => {
                  const isFilterable = ['estado','tipo_plan','cantidad_creados','cantidad_restantes','nombre_comercial','direccion_matriz','regimen_tributario','obligado_contabilidad','contribuyente_especial','agente_retencion','codigo_artesano','tipo_persona','ambiente','tipo_emision','created_by_name'].includes(String(c.key));
                  const keyToFilter: Record<string, FilterField> = {
                    estado: 'estado',
                    tipo_plan: 'tipo_plan',
                    cantidad_creados: 'cantidad_creados_gt',
                    cantidad_restantes: 'cantidad_restantes_lt',
                    nombre_comercial: 'nombre_comercial',
                    direccion_matriz: 'direccion_matriz',
                    regimen_tributario: 'regimen_tributario',
                    obligado_contabilidad: 'obligado_contabilidad',
                    contribuyente_especial: 'contribuyente_especial',
                    agente_retencion: 'agente_retencion',
                    codigo_artesano: 'codigo_artesano',
                    tipo_persona: 'tipo_persona',
                    ambiente: 'ambiente',
                    tipo_emision: 'tipo_emision',
                    created_by_name: 'registrador',
                  };
                  const filterField = keyToFilter[String(c.key)];
                  return (
                    <th
                      key={String(c.key)}
                      className={`th-dyn ${c.key !== 'logo' ? 'sortable' : ''}`}
                      style={{
                        minWidth: c.width ?? 200,
                        width: c.width ?? 200,
                        cursor: c.key !== 'logo' ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                          if (c.key !== 'logo') handleSort(c.key as any);
                          if (isFilterable && filterField) {
                            setActiveFilter(filterField);
                            setFilterValue('');
                          }
                        }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {c.label} 
                        {c.key !== 'logo' && <span style={{ opacity: sortBy === c.key ? 1 : 0.5, fontSize: '26px' }}>{sortBy === c.key ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>}
                        {activeFilter === filterField && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}></span>}
                      </span>
                    </th>
                  );
                })}

                {/* Fijo derecha */}
                <th className="th-sticky sticky-right">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    ⚡ Acciones
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="loading-row" colSpan={dynamicColumns.length + 3}>
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : paginatedData.length ? (
                paginatedData.map((row) => (
                  <tr key={row.id}>
                    {/* Fijos izquierda */}
                    <td className="td-sticky sticky-left-1">
                      <Link className="link-ruc" to={`/emisores/${row.id}`}>{truncateWords(row.ruc || '')}</Link>
                    </td>
                    <td className="td-sticky sticky-left-2">
                      {truncateWords(row.razon_social || '')}
                    </td>

                    {/* Celdas dinámicas */}
                    {dynamicColumns.map((c) => {
                      let content: React.ReactNode =
                        c.render
                          ? c.render(row)
                          : (row[c.key as keyof Emisor] as any) ?? '-';

                      // Truncar sólo si es un string plano
                      if (typeof content === 'string') {
                        content = truncateWords(content);
                      }

                      // Special handling for logo column
                      if (c.key === 'logo' && row.logo_url) {
                        content = (
                          <img 
                            className="logo-cell" 
                            src={getImageUrl(row.logo_url)} 
                            alt="logo"
                            title="Haz clic para ampliar"
                            onClick={() => { 
                              if (row.logo_url) {
                                console.log('Logo clicked from table, URL:', row.logo_url); 
                                setViewerImage(row.logo_url); 
                                setViewerOpen(true);
                              }
                            }}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            onError={(e) => {
                              console.error('Error cargando imagen:', row.logo_url);
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={() => console.log('Imagen cargada correctamente:', row.logo_url)}
                          />
                        );
                      }

                      const rawValue = row[c.key as keyof Emisor] as any;
                      const isNumber = typeof rawValue === 'number';
                      const isRestantes = c.key === 'cantidad_restantes';
                      const isCantidad = c.key === 'cantidad_creados';

                      return (
                        <td
                          key={String(c.key)}
                          className="td-dyn"
                          style={{
                            minWidth: c.width ?? 200,
                            width: c.width ?? 200,
                            fontWeight: isNumber ? 700 : 'normal',
                            color: isRestantes ? '#ef4444' : (isCantidad ? '#6366f1' : (isNumber ? '#6366f1' : 'inherit'))
                          }}
                        >
                          {isNumber && !isRestantes ? (
                            <span style={{
                              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontWeight: 700
                            }}>{content}</span>
                          ) : isRestantes ? (
                            <span style={{
                              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontWeight: 700,
                              color: '#dc2626'
                            }}>{content}</span>
                          ) : (content ?? '-')}
                        </td>
                      );
                    })}

                    {/* Fijo derecha */}
                    <td className="td-sticky sticky-right acciones">
                      <button 
                        title={canEditEmit(row) ? "Editar emisor" : "No tienes permisos para editar"}
                        disabled={!canEditEmit(row)}
                        onClick={async () => {
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
                        }}
                        style={{ opacity: canEditEmit(row) ? 1 : 0.5, cursor: canEditEmit(row) ? 'pointer' : 'not-allowed' }}
                      >✏️</button>
                      <button 
                        title={canEditEmit(row) ? "Eliminar" : "No tienes permisos para eliminar"}
                        disabled={!canEditEmit(row)}
                        onClick={async () => {
                          // Validate if the emisor can be deleted before opening the modal
                          try {
                            const res = await emisoresApi.validateDelete(row.id!);
                            const { can_delete, blockers, message } = res.data;
                            
                            if (!can_delete) {
                              // Show error message with blockers
                              const blockersList = Array.isArray(blockers) ? blockers.join('\n• ') : '';
                              show({
                                title: 'No se puede eliminar',
                                message: blockersList
                                  ? `Este emisor no puede ser eliminado por las siguientes razones:\n• ${blockersList}`
                                  : (message || 'Este emisor no puede ser eliminado.'),
                                type: 'error'
                              });
                              return;
                            }
                            
                            // If validation passes, open delete modal
                            setDeletingId(row.id || null);
                            setDeletingName(row.razon_social || null);
                            setDeletePassword('');
                            setDeleteError(null);
                            setDeleteOpen(true);
                          } catch (err: any) {
                            show({
                              title: 'Error',
                              message: 'No se pudo verificar si el emisor puede ser eliminado',
                              type: 'error'
                            });
                          }
                        }}
                        style={{ opacity: canEditEmit(row) ? 1 : 0.5, cursor: canEditEmit(row) ? 'pointer' : 'not-allowed' }}
                      >🗑️</button>
                      {/** Show 'prepare deletion' for emisores inactive >=1 year */}
                      {((row.estado === 'DESACTIVADO') && ((row.updated_at && new Date(row.updated_at) <= new Date(Date.now() - 365*24*60*60*1000)) || (row.fecha_actualizacion && new Date(row.fecha_actualizacion) <= new Date(Date.now() - 365*24*60*60*1000)))) && (
                        <button 
                          title={canEditEmit(row) ? "Eliminar (con historial)" : "No tienes permisos"}
                          disabled={!canEditEmit(row)}
                          onClick={async () => {
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
                        }}
                        style={{ opacity: canEditEmit(row) ? 1 : 0.5, cursor: canEditEmit(row) ? 'pointer' : 'not-allowed' }}
                        >🗄️</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ display: 'none' }}>
                  <td colSpan={dynamicColumns.length + 3}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="pagination-controls">
          <div className="pagination-info">
            <span style={{ color: '#6b7280' }}>Filas por página:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="items-per-page-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
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
      <div className="delete-modal-overlay">
        <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="delete-modal-header">
            <h2>
              <span className="icon">⚠️</span>
              Eliminar emisor
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
              ¿Está seguro que desea eliminar al emisor:
            </p>
            <p style={{ textAlign: 'center', marginTop: 12, marginBottom: 20, fontSize: 18 }}>
              <span style={{ color: '#dc2626', fontWeight: 800 }}>{data.find(d => d.id === deletingId)?.ruc ?? ''}</span>
              <span style={{ fontWeight: 600 }}> - </span>
              <span style={{ color: '#dc2626', fontWeight: 800 }}>{deletingName}</span>
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

    {/* History prepared modal: shows backup link and allows admin to proceed to deletion */}
    {historyPreparedOpen && (
      <div className="delete-modal-overlay">
        <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="delete-modal-header">
            <h2>
              <span className="icon">💾</span>
              Respaldo generado
            </h2>
            <button 
              className="delete-modal-close" 
              onClick={() => setHistoryPreparedOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="delete-modal-body">
            <p className="delete-confirmation-text">
              Se generó un respaldo con la información del emisor y se envió una notificación al cliente (si aplica).
            </p>
            {backupUrl && (
              <p style={{ textAlign: 'center', margin: '16px 0' }}>
                <a 
                  href={backupUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ 
                    color: '#2563eb', 
                    fontWeight: 600, 
                    textDecoration: 'none',
                    borderBottom: '2px solid #2563eb'
                  }}
                >
                  📥 Descargar respaldo
                </a>
              </p>
            )}
            <div className="delete-warning-box" style={{ marginTop: 16 }}>
              <span className="icon">⚠️</span>
              <div>
                <strong>Advertencia:</strong> Al continuar, se eliminará permanentemente el emisor del sistema.
              </div>
            </div>
          </div>

          <div className="delete-modal-footer">
            <button 
              type="button"
              className="delete-btn delete-btn-cancel" 
              onClick={() => setHistoryPreparedOpen(false)}
            >
              Cancelar
            </button>
            <button 
              type="button"
              className="delete-btn delete-btn-danger" 
              onClick={() => { 
                setHistoryPreparedOpen(false); 
                setDeletingWithHistory(true); 
                setDeletePassword(''); 
                setDeleteError(null); 
                setDeletePasswordOpen(true); 
              }}
            >
              🗑️ Eliminar permanentemente
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
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••"
                className={deleteError ? 'delete-form-input error' : 'delete-form-input'}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && deletePassword && !deleteLoading) {
                    (async () => {
                      if (!deletingId) return;
                      if (deleteInFlightRef.current) return;
                      deleteInFlightRef.current = true;
                      setDeleteLoading(true);
                      setDeleteError(null);
                      try {
                        if (deletingWithHistory) {
                          await emisoresApi.deletePermanent(deletingId, deletePassword);
                        } else {
                          await emisoresApi.delete(deletingId, deletePassword);
                        }
                        setData((prev) => {
                          const newData = prev.filter(p => p.id !== deletingId);
                          setTotalItems(newData.length);
                          return newData;
                        });
                        setDeletePasswordOpen(false);
                        setDeletingWithHistory(false);
                        show({ title: 'Éxito', message: 'Emisor eliminado correctamente', type: 'success' });
                      } catch (err: any) {
                        const blockers = err?.response?.data?.blockers;
                        const blockersList = Array.isArray(blockers) ? blockers.join('\n• ') : '';
                        const msg = err?.response?.data?.message || 'No se pudo eliminar el emisor';
                        setDeleteError(blockersList ? `${msg}\n• ${blockersList}` : msg);
                      } finally {
                        setDeleteLoading(false);
                        deleteInFlightRef.current = false;
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
              }} 
              disabled={deleteLoading}
            >
              Cancelar
            </button>
            <button 
              type="button"
              className="delete-btn delete-btn-danger" 
              onClick={async () => {
                if (!deletingId) return;
                if (deleteInFlightRef.current) return;
                deleteInFlightRef.current = true;
                setDeleteLoading(true);
                setDeleteError(null);
                try {
                  if (deletingWithHistory) {
                    await emisoresApi.deletePermanent(deletingId, deletePassword);
                  } else {
                    await emisoresApi.delete(deletingId, deletePassword);
                  }
                  setData((prev) => {
                    const newData = prev.filter(p => p.id !== deletingId);
                    setTotalItems(newData.length);
                    return newData;
                  });
                  setDeletePasswordOpen(false);
                  setDeletingWithHistory(false);
                  show({ title: 'Éxito', message: 'Emisor eliminado correctamente', type: 'success' });
                } catch (err: any) {
                  const blockers = err?.response?.data?.blockers;
                  const blockersList = Array.isArray(blockers) ? blockers.join('\n• ') : '';
                  const msg = err?.response?.data?.message || 'No se pudo eliminar el emisor';
                  setDeleteError(blockersList ? `${msg}\n• ${blockersList}` : msg);
                } finally {
                  setDeleteLoading(false);
                  deleteInFlightRef.current = false;
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
    <EmisorFormModal
      open={openEdit}
      onClose={() => setOpenEdit(false)}
      editingId={editingId}
      initialData={editingInitial ?? undefined}
      rucEditable={editingRucEditable}
      onUpdated={(updated) => {
        // Force refresh of the entire list to ensure cache-busting works
        load();
        setOpenEdit(false);
        show({ title: 'Éxito', message: 'Emisor actualizado correctamente', type: 'success' });
      }}
    />

    {/* notifications handled by NotificationProvider */}
    <ImageViewerModal open={viewerOpen} imageUrl={viewerImage} onClose={() => setViewerOpen(false)} />
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
    </>
  );
};

export default Emisores;
