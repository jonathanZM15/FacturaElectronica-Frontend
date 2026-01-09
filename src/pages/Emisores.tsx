import React from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import './Emisores.css';
import './UsuarioDeleteModalModern.css';
import { emisoresApi } from '../services/emisoresApi';
import EmisorFormModal from './EmisorFormModal';
import ImageViewerModal from './ImageViewerModal';
import { Emisor } from '../types/emisor';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import { getImageUrl } from '../helpers/imageUrl';
import LoadingSpinner from '../components/LoadingSpinner';

// Helper para truncar a un máximo de N palabras
function truncateWords(text: string, maxWords: number = 10): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

const createDynamicColumns = (formatPlanDateIso: (value?: string | null) => string) : Array<{
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
          textTransform: 'uppercase',
          animation: isActivo ? 'pulseGlow 2s ease-in-out infinite' : 'none'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#fff',
            boxShadow: '0 0 8px rgba(255,255,255,0.8)'
          }}></span>
          {row.estado}
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
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = React.useState(false);
  // Dynamic filtering
  type FilterField = 'ruc'|'razon_social'|'estado'|'tipo_plan'|'cantidad_creados_gt'|'cantidad_restantes_lt'|'nombre_comercial'|'direccion_matriz'|'regimen_tributario'|'tipo_persona'|'ambiente'|'tipo_emision'|'registrador';
  const [activeFilter, setActiveFilter] = React.useState<FilterField | null>(null);
  const [filterValue, setFilterValue] = React.useState<string>('');
  const [estado, setEstado] = React.useState('ACTIVO');
  const [q, setQ] = React.useState('');

  // Pretty labels to show consistent "Buscando por ..." caption like the Estado filter design
  const filterLabels: Record<FilterField, string> = {
    ruc: 'RUC',
    razon_social: 'Razón Social',
    estado: 'Estado',
    tipo_plan: 'Tipo de Plan',
    cantidad_creados_gt: 'Cantidad de Comprobantes Creados (>)',
    cantidad_restantes_lt: 'Cantidad de Comprobantes Restantes (<)',
    nombre_comercial: 'Nombre Comercial',
    direccion_matriz: 'Dirección Matriz',

    regimen_tributario: 'Régimen Tributario',
    tipo_persona: 'Tipo de Persona',
    ambiente: 'Ambiente',
    tipo_emision: 'Tipo de Emisión',
    registrador: 'Nombre del registrador',
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

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(5);
  const [totalItems, setTotalItems] = React.useState(0);

  // Sorting states
  const [sortBy, setSortBy] = React.useState<keyof Emisor | 'logo' | null>(null);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Image viewer states
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);
  const lastAutoLoadSignature = React.useRef<string | null>(null);
  const hasAutoLoadedRef = React.useRef(false);

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

  const dynamicColumns = React.useMemo(() => createDynamicColumns(formatPlanDateIso), [formatPlanDateIso]);

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

  const load = React.useCallback(async () => {
    if (userLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        q: q || undefined,
        // send created_at range params backend expects
        created_at_from: desde || undefined,
        created_at_to: hasta || undefined,
        page: 1,
        per_page: 200,
      };
      if (activeFilter && filterValue.trim()) {
        params[activeFilter] = filterValue.trim();
      } else if (!activeFilter && estado) {
        params.estado = estado;
      }
      const res = await emisoresApi.list(params);
      const emisores = res.data?.data ?? res.data ?? [];
      console.log('Emisores recibidos:', emisores);
      emisores.forEach((e: any) => {
        if (e.logo_url) {
          console.log(`Emisor ${e.ruc} - Logo URL:`, e.logo_url);
        }
      });
      // Client-side filter for tipo_plan if requested (backend doesn't accept this filter)
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
      setCurrentPage(1); // Reset to first page when filters change
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cargar emisores');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, filterValue, estado, q, desde, hasta, user, userLoading]);

  React.useEffect(() => {
    if (userLoading) return;

    const signature = JSON.stringify({
      activeFilter,
      filterValue,
      estado,
      q,
      desde,
      hasta,
      userId: user?.id ?? null,
      userRole: user?.role ?? null,
      userEmisorId: (user as any)?.emisor_id ?? null,
    });

    const alreadyLoadedSameParams =
      hasAutoLoadedRef.current && lastAutoLoadSignature.current === signature;

    if (alreadyLoadedSameParams) {
      return;
    }

    hasAutoLoadedRef.current = true;
    lastAutoLoadSignature.current = signature;
    load();
  }, [load, activeFilter, filterValue, estado, q, desde, hasta, user, userLoading]);

  // Debounce reload when typing filter
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (activeFilter !== null) {
        load();
      }
    }, 400);
    return () => clearTimeout(t);
  }, [filterValue, activeFilter]);

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
          </div>

          {/* Date Modal - Rendered via Portal */}
          {dateOpen && ReactDOM.createPortal(
            <>
              {/* Overlay oscuro - NO cierra el modal, solo la X */}
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  zIndex: 999998,
                  animation: 'fadeIn 0.2s ease'
                }}
              />
              {/* Modal de fechas */}
              <div 
                role="dialog"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 999999,
                  width: '480px',
                  maxWidth: '95vw',
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.2)',
                  padding: '28px',
                  border: '3px solid #6366f1',
                  animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                {/* Header */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  paddingBottom: '20px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 16px rgba(99, 102, 241, 0.35)'
                    }}>
                      <span style={{ fontSize: '24px' }}>📆</span>
                    </div>
                    <div>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '18px', 
                        fontWeight: 700, 
                        color: '#1e1b4b'
                      }}>
                        Filtrar por Fecha
                      </h4>
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '13px', 
                        color: '#6b7280'
                      }}>
                        Selecciona el rango de fechas
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDateOpen(false)}
                    style={{
                      backgroundColor: '#f3f4f6',
                      border: '2px solid #e5e7eb',
                      fontSize: '16px',
                      cursor: 'pointer',
                      color: '#6b7280',
                      borderRadius: '10px',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Campos de fecha */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  backgroundColor: '#f8fafc',
                  padding: '20px',
                  borderRadius: '14px',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <label style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#4f46e5',
                      marginBottom: '10px'
                    }}>
                      🗓️ Fecha Inicio
                    </label>
                    <input 
                      ref={desdeInputRef} 
                      type="date" 
                      value={desde} 
                      onChange={(e) => setDesde(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <label style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#4f46e5',
                      marginBottom: '10px'
                    }}>
                      🗓️ Fecha Fin
                    </label>
                    <input 
                      ref={hastaInputRef}
                      type="date" 
                      value={hasta} 
                      onChange={(e) => setHasta(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Botones de acción */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '2px solid #e5e7eb'
                }}>
                  <button 
                    type="button" 
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation();
                      // Limpiar estados de forma síncrona
                      setDesde('');
                      setHasta('');
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: '2px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#374151'
                    }}
                  >
                    🗑️ Limpiar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setDateOpen(false); load(); }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#ffffff',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    ✓ Aplicar
                  </button>
                </div>
              </div>
            </>,
            document.body
          )}

          {/* Dynamic filter input (activated by clicking column headers) */}
          <div className="estado-search">
            <div className="input-wrap">
              {activeFilter === 'estado' ? (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="DESACTIVADO">DESACTIVADO</option>
                </select>
              ) : activeFilter === 'tipo_plan' ? (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="BASICO">Básico</option>
                  <option value="ESTANDAR">Estándar</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              ) : activeFilter === 'regimen_tributario' ? (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="GENERAL">GENERAL</option>
                  <option value="RIMPE_POPULAR">RIMPE_POPULAR</option>
                  <option value="RIMPE_EMPRENDEDOR">RIMPE_EMPRENDEDOR</option>
                  <option value="MICRO_EMPRESA">MICRO_EMPRESA</option>
                </select>
              ) : activeFilter === 'tipo_persona' ? (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="NATURAL">NATURAL</option>
                  <option value="JURIDICA">JURIDICA</option>
                </select>
              ) : activeFilter === 'ambiente' ? (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="PRODUCCION">PRODUCCION</option>
                  <option value="PRUEBAS">PRUEBAS</option>
                </select>
              ) : activeFilter === 'tipo_emision' ? (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="INDISPONIBILIDAD">INDISPONIBILIDAD</option>
                </select>
              ) : activeFilter === 'cantidad_creados_gt' || activeFilter === 'cantidad_restantes_lt' ? (
                <input
                  type="number"
                  placeholder={activeFilter === 'cantidad_creados_gt' ? 'Mayor que…' : 'Menor que…'}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  placeholder={activeFilter ? `Filtrar por ${filterLabels[activeFilter]}` : 'Haz clic en un encabezado para filtrar'}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              )}
              <span className="icon">🔍</span>
              {activeFilter && filterValue && (
                <button
                  type="button"
                  className="clear-filter-btn"
                  onClick={() => setFilterValue('')}
                  aria-label="Limpiar filtro"
                  title="Limpiar filtro"
                >×</button>
              )}
            </div>
            <small className="caption">
              {activeFilter ? `Buscando por ${filterLabels[activeFilter]}` : 'Selecciona un encabezado para filtrar'}
              {activeFilter && filterValue && (
                <button
                  type="button"
                  style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  onClick={() => { setFilterValue(''); }}
                >✕ Limpiar</button>
              )}
            </small>
          </div>

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
            <span style={{ marginRight: '8px', fontSize: '18px' }}>✨</span> Nuevo
          </button>
        </div>
      </div>

      {error && <div className="alert-error"><span style={{ marginRight: '8px' }}>⚠️</span> {error}</div>}

      <div className="tabla-wrapper">
        {paginatedData.length === 0 && !loading && (
          <div className="tabla-empty-overlay">
            <div className="tabla-empty-content">
              <span style={{ fontSize: '64px', marginBottom: '16px', display: 'block' }}>🏢</span>
              <span style={{ fontSize: '18px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                {activeFilter && filterValue 
                  ? 'No se encontraron emisores con ese filtro' 
                  : 'No hay emisores registrados'}
              </span>
              <span style={{ fontSize: '14px', color: '#9ca3af', display: 'block' }}>
                {activeFilter && filterValue 
                  ? 'Intenta con otro término de búsqueda' 
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
                  const isFilterable = ['estado','tipo_plan','cantidad_creados','cantidad_restantes','nombre_comercial','direccion_matriz','regimen_tributario','tipo_persona','ambiente','tipo_emision','created_by_name'].includes(String(c.key));
                  const keyToFilter: Record<string, FilterField> = {
                    estado: 'estado',
                    tipo_plan: 'tipo_plan',
                    cantidad_creados: 'cantidad_creados_gt',
                    cantidad_restantes: 'cantidad_restantes_lt',
                    nombre_comercial: 'nombre_comercial',
                    direccion_matriz: 'direccion_matriz',

                    regimen_tributario: 'regimen_tributario',
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
                            const { can_delete, blockers } = res.data;
                            
                            if (!can_delete) {
                              // Show error message with blockers
                              const blockersList = blockers.join('\n• ');
                              show({
                                title: 'No se puede eliminar',
                                message: `Este emisor no puede ser eliminado por las siguientes razones:\n• ${blockersList}`,
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
                        const msg = err?.response?.data?.message || 'No se pudo eliminar el emisor';
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
                  const msg = err?.response?.data?.message || 'No se pudo eliminar el emisor';
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
    </>
  );
};

export default Emisores;