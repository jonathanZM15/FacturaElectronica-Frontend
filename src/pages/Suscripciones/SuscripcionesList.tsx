import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { suscripcionesApi, Suscripcion, SuscripcionFilters } from '../../services/suscripcionesApi';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/userContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import SortArrow from '../../components/SortArrow';
import SuscripcionFormModal from './SuscripcionFormModal';
import SuscripcionEstadoModal from './SuscripcionEstadoModal';
import './SuscripcionesList.css';

interface Props {
  emisorId: number;
}

interface EstadosData {
  todos: string[];
  formas_pago: string[];
  estados_transaccion: string[];
  estados_comision: string[];
}

type SortDirection = 'asc' | 'desc';

const SuscripcionesList: React.FC<Props> = ({ emisorId }) => {
  const navigate = useNavigate();
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [suscripcionesForStats, setSuscripcionesForStats] = useState<Suscripcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openEstado, setOpenEstado] = useState(false);
  const [selectedSuscripcion, setSelectedSuscripcion] = useState<Suscripcion | null>(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { show } = useNotification();
  const { user: currentUser } = useUser();

  // Estados para filtros
  const [estados, setEstados] = useState<EstadosData | null>(null);
  const [activeFilters, setActiveFilters] = useState<SuscripcionFilters>({});
  
  // Formulario de filtros: todos los campos disponibles simultáneamente
  const [filterForm, setFilterForm] = useState({
    fecha_registro_desde: '',
    fecha_registro_hasta: '',
    fecha_actualizacion_desde: '',
    fecha_actualizacion_hasta: '',
    fecha_inicio_desde: '',
    fecha_inicio_hasta: '',
    fecha_fin_desde: '',
    fecha_fin_hasta: '',
    plan: '',
    cantidad_comprobantes_min: '',
    comprobantes_usados_min: '',
    comprobantes_restantes_max: '',
    monto_max: '',
    usuario_registrador: '',
    estado_suscripcion: '',
    estado_transaccion: '',
    forma_pago: '',
    estado_comision: '',
  });

  const emptyFilterForm = {
    fecha_registro_desde: '',
    fecha_registro_hasta: '',
    fecha_actualizacion_desde: '',
    fecha_actualizacion_hasta: '',
    fecha_inicio_desde: '',
    fecha_inicio_hasta: '',
    fecha_fin_desde: '',
    fecha_fin_hasta: '',
    plan: '',
    cantidad_comprobantes_min: '',
    comprobantes_usados_min: '',
    comprobantes_restantes_max: '',
    monto_max: '',
    usuario_registrador: '',
    estado_suscripcion: '',
    estado_transaccion: '',
    forma_pago: '',
    estado_comision: '',
  };
  // Ordenamiento
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  
  // Estado para panel de filtros colapsable
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isAdmin = currentUser?.role === 'administrador';
  const isDistribuidor = currentUser?.role === 'distribuidor';
  const canCreate = isAdmin || isDistribuidor;

  // Cargar estados disponibles
  useEffect(() => {
    const loadEstados = async () => {
      try {
        const response = await suscripcionesApi.getEstados();
        setEstados(response.data.data);
      } catch (err) {
        console.error('Error cargando estados:', err);
      }
    };
    loadEstados();
  }, []);

  // Evaluar estados automáticamente solo una vez al montar
  useEffect(() => {
    suscripcionesApi.evaluarEstados(emisorId).catch(err => {
      console.warn('Error evaluando estados:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emisorId]);

  // Cargar suscripciones
  const loadSuscripciones = useCallback(async () => {
    try {
      setLoading(true);
      
      const params: Record<string, any> = {
        page: currentPage,
        per_page: itemsPerPage,
        sort_by: sortBy,
        sort_dir: sortDir,
        ...activeFilters,
      };

      const response = await suscripcionesApi.list(emisorId, params);
      const data = response.data as { data: Suscripcion[]; pagination: any };
      setSuscripciones(data.data);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error cargando suscripciones';
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [emisorId, currentPage, itemsPerPage, sortBy, sortDir, activeFilters, show]);

  const loadSuscripcionesForStats = useCallback(async () => {
    try {
      const params: Record<string, any> = {
        page: 1,
        per_page: 10000,
        ...activeFilters,
      };
      const response = await suscripcionesApi.list(emisorId, params);
      const data = response.data as { data: Suscripcion[]; pagination: any };
      setSuscripcionesForStats(data.data);
    } catch (err: any) {
      setSuscripcionesForStats([]);
    }
  }, [emisorId, activeFilters]);

  useEffect(() => {
    loadSuscripciones();
  }, [loadSuscripciones]);

  useEffect(() => {
    loadSuscripcionesForStats();
  }, [loadSuscripcionesForStats]);

  // Aplicar filtros
  const applyFilters = () => {
    const newFilters: SuscripcionFilters = {};

    // Fechas
    if (filterForm.fecha_registro_desde) newFilters.fecha_registro_desde = filterForm.fecha_registro_desde;
    if (filterForm.fecha_registro_hasta) newFilters.fecha_registro_hasta = filterForm.fecha_registro_hasta;
    if (filterForm.fecha_actualizacion_desde) newFilters.fecha_actualizacion_desde = filterForm.fecha_actualizacion_desde;
    if (filterForm.fecha_actualizacion_hasta) newFilters.fecha_actualizacion_hasta = filterForm.fecha_actualizacion_hasta;
    if (filterForm.fecha_inicio_desde) newFilters.fecha_inicio_desde = filterForm.fecha_inicio_desde;
    if (filterForm.fecha_inicio_hasta) newFilters.fecha_inicio_hasta = filterForm.fecha_inicio_hasta;
    if (filterForm.fecha_fin_desde) newFilters.fecha_fin_desde = filterForm.fecha_fin_desde;
    if (filterForm.fecha_fin_hasta) newFilters.fecha_fin_hasta = filterForm.fecha_fin_hasta;

    // Texto y números
    if (filterForm.plan) newFilters.plan = filterForm.plan;
    if (filterForm.cantidad_comprobantes_min) newFilters.cantidad_comprobantes_min = parseInt(filterForm.cantidad_comprobantes_min) || undefined;
    if (filterForm.comprobantes_usados_min) newFilters.comprobantes_usados_min = parseInt(filterForm.comprobantes_usados_min) || undefined;
    if (filterForm.comprobantes_restantes_max) newFilters.comprobantes_restantes_max = parseInt(filterForm.comprobantes_restantes_max) || undefined;
    if (filterForm.monto_max) newFilters.monto_max = parseFloat(filterForm.monto_max) || undefined;
    if (filterForm.usuario_registrador) newFilters.usuario_registrador = filterForm.usuario_registrador;

    // Selects
    if (filterForm.estado_suscripcion) newFilters.estado_suscripcion = filterForm.estado_suscripcion;
    if (filterForm.estado_transaccion) newFilters.estado_transaccion = filterForm.estado_transaccion;
    if (filterForm.forma_pago) newFilters.forma_pago = filterForm.forma_pago;
    if (filterForm.estado_comision) newFilters.estado_comision = filterForm.estado_comision;

    setActiveFilters(newFilters);
    setCurrentPage(1);
    setSortBy('created_at');
    setSortDir('desc');
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setActiveFilters({});
    setFilterForm({ ...emptyFilterForm });
    setCurrentPage(1);
    setSortBy('created_at');
    setSortDir('desc');
  };

  // Manejar ordenamiento
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  // Renderizar icono de ordenamiento
  const renderSortIcon = (column: string) => {
    return <SortArrow active={sortBy === column} direction={sortDir} />;
  };

  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Formatear fecha y hora
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formatear monto
  const formatMonto = (monto?: number) => {
    if (monto === undefined || monto === null) return '-';
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(monto);
  };

  // Formatear plan como: NOMBRE - PERIODO - COMPROBANTES C - $PRECIO
  const formatPlan = (suscripcion: Suscripcion) => {
    if (!suscripcion.plan) return '-';
    const { nombre, periodo, cantidad_comprobantes, precio } = suscripcion.plan;
    const precioNum = typeof precio === 'number' ? precio : parseFloat(precio) || 0;
    return `${nombre?.toUpperCase() || '-'} - ${periodo?.toUpperCase() || '-'} - ${cantidad_comprobantes || 0} C - $${precioNum.toFixed(2)}`;
  };

  // Formatear usuario registrador: ROL – USERNAME – NOMBRES – APELLIDOS
  const formatUsuarioRegistrador = (suscripcion: Suscripcion) => {
    if (!suscripcion.createdBy) return '-';
    const { role, username, nombres, apellidos } = suscripcion.createdBy;
    return `${role.toUpperCase()} – ${username.toUpperCase()} – ${nombres.toUpperCase()} ${apellidos.toUpperCase()}`;
  };

  // Obtener color del badge según estado de suscripción
  const getEstadoSuscripcionBadgeClass = (estado: string) => {
    switch (estado) {
      case 'Vigente':
        return 'badge-success';
      case 'Suspendido':
      case 'Caducado':
      case 'Sin comprobantes':
        return 'badge-danger';
      case 'Pendiente':
      case 'Programado':
        return 'badge-warning';
      case 'Proximo a caducar':
      case 'Pocos comprobantes':
      case 'Proximo a caducar y con pocos comprobantes':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  };

  // Obtener color del badge según estado de comisión
  const getEstadoComisionBadgeClass = (estado?: string) => {
    switch (estado) {
      case 'Pagada':
        return 'badge-success';
      case 'Pendiente':
        return 'badge-warning';
      case 'Sin comision':
      default:
        return 'badge-secondary';
    }
  };

  // Manejar edición
  const handleEdit = (suscripcion: Suscripcion) => {
    setSelectedSuscripcion(suscripcion);
    setOpenEdit(true);
  };

  // Manejar cambio de estado
  const handleChangeEstado = (suscripcion: Suscripcion) => {
    setSelectedSuscripcion(suscripcion);
    setOpenEstado(true);
  };

  // Manejar eliminación
  const handleDeleteClick = (suscripcion: Suscripcion) => {
    setSelectedSuscripcion(suscripcion);
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedSuscripcion?.id) return;
    
    try {
      setDeleteLoading(true);
      
      // Llamar al endpoint de eliminación
      await suscripcionesApi.delete(emisorId, selectedSuscripcion.id);
      
      show({ 
        title: 'Éxito', 
        message: '✅ Suscripción eliminada correctamente.', 
        type: 'success' 
      });
      
      // Recargar la lista
      loadSuscripciones();
      
    } catch (err: any) {
      const msg = err?.response?.data?.message || '❌ Error al intentar eliminar la suscripción. Intente nuevamente.';
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setDeleteLoading(false);
      setOpenDelete(false);
      setSelectedSuscripcion(null);
    }
  };

  // Navegar al usuario
  const navigateToUser = (userId: number) => {
    navigate(`/usuarios/${userId}`);
  };

  // Renderizar archivo (comprobante/factura)
  const renderFileLink = (filePath?: string, label?: string) => {
    if (!filePath) return <span style={{ color: '#94a3b8' }}>-</span>;
    const fileName = filePath.split('/').pop() || label || 'Ver archivo';
    return (
      <a 
        href={`${process.env.REACT_APP_API_URL || ''}/storage/${filePath}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="susc-file-link"
        title={fileName}
      >
        📎 {fileName.length > 12 ? fileName.substring(0, 12) + '...' : fileName}
      </a>
    );
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Verificar si hay filtros activos
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  
  // Calcular el número de filtros activos
  const activeFilterCount = Object.keys(activeFilters).length;

  // Calcular estadísticas basadas en todas las suscripciones
  const stats = useMemo(() => {
    const vigentes = suscripcionesForStats.filter(s => s.estado_suscripcion === 'Vigente').length;
    const pendientes = suscripcionesForStats.filter(s => s.estado_suscripcion === 'Pendiente' || s.estado_suscripcion === 'Programado').length;
    const suspendidos = suscripcionesForStats.filter(s => ['Suspendido', 'Caducado', 'Sin comprobantes'].includes(s.estado_suscripcion)).length;
    return { vigentes, pendientes, suspendidos, total: suscripcionesForStats.length };
  }, [suscripcionesForStats]);

  // Badge class para estado suscripción (nuevo)
  const getBadgeClass = (estado: string): string => {
    switch (estado) {
      case 'Vigente': return 'vigente';
      case 'Suspendido': return 'suspendido';
      case 'Caducado': return 'caducado';
      case 'Sin comprobantes': return 'sin-comprobantes';
      case 'Pendiente': return 'pendiente';
      case 'Programado': return 'programado';
      case 'Proximo a caducar':
      case 'Pocos comprobantes':
      case 'Proximo a caducar y con pocos comprobantes':
        return 'proximo';
      default: return '';
    }
  };

  return (
    <div className="suscripciones-page">
      {/* Header */}
      <div className="susc-header">
        <div className="susc-header-left">
          <h2>📋 Suscripciones</h2>
          <p>Gestiona las suscripciones de facturación del emisor</p>
        </div>
        {canCreate && (
          <button className="btn-nueva-susc" onClick={() => setOpenNew(true)}>
            <span>➕</span>
            Nueva Suscripción
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="susc-stats-row">
        <div className="susc-stat-card">
          <div className="susc-stat-icon total">📊</div>
          <div className="susc-stat-info">
            <h3>{stats.total}</h3>
            <p>Total Suscripciones</p>
          </div>
        </div>
        <div className="susc-stat-card">
          <div className="susc-stat-icon vigente">✅</div>
          <div className="susc-stat-info">
            <h3>{stats.vigentes}</h3>
            <p>Vigentes</p>
          </div>
        </div>
        <div className="susc-stat-card">
          <div className="susc-stat-icon pendiente">⏳</div>
          <div className="susc-stat-info">
            <h3>{stats.pendientes}</h3>
            <p>Pendientes</p>
          </div>
        </div>
        <div className="susc-stat-card">
          <div className="susc-stat-icon suspendido">⚠️</div>
          <div className="susc-stat-info">
            <h3>{stats.suspendidos}</h3>
            <p>Suspendidos/Caducados</p>
          </div>
        </div>
      </div>

      {/* Panel de Filtros Colapsable */}
      <div className="susc-filters-panel">
        <button 
          className="susc-filters-toggle"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <div className="susc-filters-toggle-left">
            <span className="susc-toggle-icon">🔍</span>
            <span className="susc-toggle-label">Filtros de Búsqueda</span>
          </div>
          <div className="susc-filters-toggle-right">
            {activeFilterCount > 0 && (
              <span className="susc-active-filters-badge">{activeFilterCount}</span>
            )}
            <span className={`susc-chevron ${filtersOpen ? 'open' : ''}`}>▼</span>
          </div>
        </button>
        
        <div className={`susc-filters-content ${filtersOpen ? 'open' : ''}`}>
          {/* Card 1: Plan y Búsqueda */}
          <div className="sf-card">
            <div className="sf-card-header search">
              <span className="sf-card-icon">🔎</span>
              <span className="sf-card-title">Plan y Búsqueda</span>
            </div>
            <div className="sf-card-body">
              <div className="sf-grid cols-3">
                <div className="sf-field">
                  <label>📦 Plan</label>
                  <input
                    type="text"
                    value={filterForm.plan}
                    onChange={(e) => setFilterForm({...filterForm, plan: e.target.value})}
                    placeholder="Buscar por nombre de plan..."
                  />
                </div>
                <div className="sf-field">
                  <label>💰 Monto máximo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filterForm.monto_max}
                    onChange={(e) => setFilterForm({...filterForm, monto_max: e.target.value})}
                    placeholder="≤ Valor máximo..."
                  />
                </div>
                <div className="sf-field">
                  <label>👤 Usuario registrador</label>
                  <input
                    type="text"
                    value={filterForm.usuario_registrador}
                    onChange={(e) => setFilterForm({...filterForm, usuario_registrador: e.target.value})}
                    placeholder="Username, nombres o apellidos..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Comprobantes */}
          <div className="sf-card">
            <div className="sf-card-header comprobantes">
              <span className="sf-card-icon">🔢</span>
              <span className="sf-card-title">Comprobantes</span>
            </div>
            <div className="sf-card-body">
              <div className="sf-grid cols-3">
                <div className="sf-field">
                  <label>📋 Del plan (≥)</label>
                  <input
                    type="number"
                    min="0"
                    value={filterForm.cantidad_comprobantes_min}
                    onChange={(e) => setFilterForm({...filterForm, cantidad_comprobantes_min: e.target.value})}
                    placeholder="Mínimo del plan..."
                  />
                </div>
                <div className="sf-field">
                  <label>✏️ Creados (≥)</label>
                  <input
                    type="number"
                    min="0"
                    value={filterForm.comprobantes_usados_min}
                    onChange={(e) => setFilterForm({...filterForm, comprobantes_usados_min: e.target.value})}
                    placeholder="Mínimo creados..."
                  />
                </div>
                <div className="sf-field">
                  <label>📉 Restantes (≤)</label>
                  <input
                    type="number"
                    min="0"
                    value={filterForm.comprobantes_restantes_max}
                    onChange={(e) => setFilterForm({...filterForm, comprobantes_restantes_max: e.target.value})}
                    placeholder="Máximo restantes..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Estados y Pagos */}
          <div className="sf-card">
            <div className="sf-card-header estados">
              <span className="sf-card-icon">🛡️</span>
              <span className="sf-card-title">Estados y Pagos</span>
            </div>
            <div className="sf-card-body">
              <div className="sf-grid cols-2">
                <div className="sf-field">
                  <label>📊 Estado Suscripción</label>
                  <select
                    value={filterForm.estado_suscripcion}
                    onChange={(e) => setFilterForm({...filterForm, estado_suscripcion: e.target.value})}
                  >
                    <option value="">Todos los estados</option>
                    {estados?.todos.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div className="sf-field">
                  <label>🔄 Estado Transacción</label>
                  <select
                    value={filterForm.estado_transaccion}
                    onChange={(e) => setFilterForm({...filterForm, estado_transaccion: e.target.value})}
                  >
                    <option value="">Todas</option>
                    {estados?.estados_transaccion.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div className="sf-field">
                  <label>💳 Forma de Pago</label>
                  <select
                    value={filterForm.forma_pago}
                    onChange={(e) => setFilterForm({...filterForm, forma_pago: e.target.value})}
                  >
                    <option value="">Todas</option>
                    {estados?.formas_pago.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="sf-field">
                  <label>🏷️ Estado Comisión</label>
                  <select
                    value={filterForm.estado_comision}
                    onChange={(e) => setFilterForm({...filterForm, estado_comision: e.target.value})}
                  >
                    <option value="">Todos</option>
                    {estados?.estados_comision.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Fechas */}
          <div className="sf-card">
            <div className="sf-card-header dates">
              <span className="sf-card-icon">📅</span>
              <span className="sf-card-title">Fechas</span>
            </div>
            <div className="sf-card-body">
              <div className="sf-grid cols-2">
                <div className="sf-field-date">
                  <label>📅 Fecha Registro</label>
                  <div className="sf-date-pair">
                    <input
                      type="date"
                      value={filterForm.fecha_registro_desde}
                      onChange={(e) => setFilterForm({...filterForm, fecha_registro_desde: e.target.value})}
                    />
                    <span className="sf-date-arrow">→</span>
                    <input
                      type="date"
                      value={filterForm.fecha_registro_hasta}
                      onChange={(e) => setFilterForm({...filterForm, fecha_registro_hasta: e.target.value})}
                    />
                  </div>
                </div>
                <div className="sf-field-date">
                  <label>🔄 Fecha Actualización</label>
                  <div className="sf-date-pair">
                    <input
                      type="date"
                      value={filterForm.fecha_actualizacion_desde}
                      onChange={(e) => setFilterForm({...filterForm, fecha_actualizacion_desde: e.target.value})}
                    />
                    <span className="sf-date-arrow">→</span>
                    <input
                      type="date"
                      value={filterForm.fecha_actualizacion_hasta}
                      onChange={(e) => setFilterForm({...filterForm, fecha_actualizacion_hasta: e.target.value})}
                    />
                  </div>
                </div>
                <div className="sf-field-date">
                  <label>▶️ Fecha Inicio</label>
                  <div className="sf-date-pair">
                    <input
                      type="date"
                      value={filterForm.fecha_inicio_desde}
                      onChange={(e) => setFilterForm({...filterForm, fecha_inicio_desde: e.target.value})}
                    />
                    <span className="sf-date-arrow">→</span>
                    <input
                      type="date"
                      value={filterForm.fecha_inicio_hasta}
                      onChange={(e) => setFilterForm({...filterForm, fecha_inicio_hasta: e.target.value})}
                    />
                  </div>
                </div>
                <div className="sf-field-date">
                  <label>⏹️ Fecha Fin</label>
                  <div className="sf-date-pair">
                    <input
                      type="date"
                      value={filterForm.fecha_fin_desde}
                      onChange={(e) => setFilterForm({...filterForm, fecha_fin_desde: e.target.value})}
                    />
                    <span className="sf-date-arrow">→</span>
                    <input
                      type="date"
                      value={filterForm.fecha_fin_hasta}
                      onChange={(e) => setFilterForm({...filterForm, fecha_fin_hasta: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="susc-filters-actions">
            <button className="susc-btn-clear" onClick={clearAllFilters}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Limpiar Filtros
            </button>
            <button className="susc-btn-apply" onClick={applyFilters}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.33 4L6 11.33 2.67 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="susc-toolbar">
        <div className="susc-results-info">
          Mostrando <strong>{suscripciones.length}</strong> de <strong>{totalItems}</strong> suscripciones
        </div>
        <div className="susc-per-page">
          <span>Filas:</span>
          <select value={itemsPerPage} onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="susc-loading">
          <LoadingSpinner />
        </div>
      ) : suscripciones.length === 0 ? (
        <div className="susc-empty-state">
          <div className="susc-empty-illustration">
            {hasActiveFilters ? '🔍' : '📄'}
          </div>
          <h3 className="susc-empty-title">
            {hasActiveFilters ? 'Sin resultados' : 'Aún no hay suscripciones'}
          </h3>
          <p className="susc-empty-desc">
            {hasActiveFilters 
              ? 'No se encontraron suscripciones con los filtros aplicados. Intenta ajustar los criterios de búsqueda.'
              : 'Este emisor no tiene suscripciones registradas todavía. Crea una nueva suscripción para comenzar a facturar.'
            }
          </p>
          {hasActiveFilters ? (
            <button className="susc-empty-btn secondary" onClick={clearAllFilters}>
              🗑️ Limpiar filtros
            </button>
          ) : canCreate ? (
            <button className="susc-empty-btn primary" onClick={() => setOpenNew(true)}>
              ➕ Crear primera suscripción
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="susc-table-wrapper">
            <div className="susc-table-scroll">
              <table className="susc-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('plan_id')} className="sortable">
                      <div className="susc-th-content">Plan {renderSortIcon('plan_id')}</div>
                    </th>
                    <th onClick={() => handleSort('cantidad_comprobantes')} className="sortable">
                      <div className="susc-th-content">Comprobantes Plan {renderSortIcon('cantidad_comprobantes')}</div>
                    </th>
                    <th onClick={() => handleSort('comprobantes_usados')} className="sortable">
                      <div className="susc-th-content">Creados {renderSortIcon('comprobantes_usados')}</div>
                    </th>
                    <th>
                      <div className="susc-th-content">Restantes</div>
                    </th>
                    <th onClick={() => handleSort('fecha_inicio')} className="sortable">
                      <div className="susc-th-content">Fecha Inicio {renderSortIcon('fecha_inicio')}</div>
                    </th>
                    <th onClick={() => handleSort('fecha_fin')} className="sortable">
                      <div className="susc-th-content">Fecha Fin {renderSortIcon('fecha_fin')}</div>
                    </th>
                    <th onClick={() => handleSort('estado_suscripcion')} className="sortable">
                      <div className="susc-th-content">Estado Suscripción {renderSortIcon('estado_suscripcion')}</div>
                    </th>
                    <th onClick={() => handleSort('estado_transaccion')} className="sortable">
                      <div className="susc-th-content">Estado Transacción {renderSortIcon('estado_transaccion')}</div>
                    </th>
                    <th onClick={() => handleSort('monto')} className="sortable">
                      <div className="susc-th-content">Monto {renderSortIcon('monto')}</div>
                    </th>
                    <th onClick={() => handleSort('forma_pago')} className="sortable">
                      <div className="susc-th-content">Forma de Pago {renderSortIcon('forma_pago')}</div>
                    </th>
                    <th>Comprobante</th>
                    <th>Factura</th>
                    <th onClick={() => handleSort('created_by_id')} className="sortable">
                      <div className="susc-th-content">Registrador {renderSortIcon('created_by_id')}</div>
                    </th>
                    <th onClick={() => handleSort('estado_comision')} className="sortable">
                      <div className="susc-th-content">Estado Comisión {renderSortIcon('estado_comision')}</div>
                    </th>
                    <th onClick={() => handleSort('monto_comision')} className="sortable">
                      <div className="susc-th-content">Comisión {renderSortIcon('monto_comision')}</div>
                    </th>
                    <th>Comprobante Comisión</th>
                    <th onClick={() => handleSort('created_at')} className="sortable">
                      <div className="susc-th-content">Fecha Registro {renderSortIcon('created_at')}</div>
                    </th>
                    <th onClick={() => handleSort('updated_at')} className="sortable">
                      <div className="susc-th-content">Fecha Actualización {renderSortIcon('updated_at')}</div>
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suscripciones.length === 0 ? (
                    <tr style={{ display: 'none' }}>
                      <td colSpan={19}></td>
                    </tr>
                  ) : (
                    suscripciones.map((suscripcion) => {
                      const restantes = suscripcion.comprobantes_restantes ?? (suscripcion.cantidad_comprobantes - suscripcion.comprobantes_usados);
                      const restantesBajo = restantes <= 10;
                      
                      return (
                        <tr key={suscripcion.id}>
                          {/* Plan */}
                          <td>
                            <div className="susc-plan-cell">
                              <div className="susc-plan-name">{suscripcion.plan?.nombre || '-'}</div>
                              <div className="susc-plan-details">
                                {suscripcion.plan?.periodo || '-'} • ${(typeof suscripcion.plan?.precio === 'number' ? suscripcion.plan.precio : parseFloat(String(suscripcion.plan?.precio ?? '0'))).toFixed(2)}
                              </div>
                            </div>
                          </td>
                          {/* Cantidad comprobantes del plan */}
                          <td className="susc-comprobantes">
                            <span className="susc-comprobantes-value">{suscripcion.cantidad_comprobantes}</span>
                          </td>
                          {/* Comprobantes creados */}
                          <td className="susc-comprobantes">
                            <span className="susc-comprobantes-value">{suscripcion.comprobantes_usados}</span>
                          </td>
                          {/* Comprobantes restantes */}
                          <td className="susc-comprobantes">
                            <span className={`susc-comprobantes-value susc-comprobantes-restantes ${restantesBajo ? 'bajo' : ''}`}>
                              {restantes}
                            </span>
                          </td>
                          {/* Fecha inicio */}
                          <td>
                            <div className="susc-fecha">
                              <div className="susc-fecha-date">{formatDate(suscripcion.fecha_inicio)}</div>
                            </div>
                          </td>
                          {/* Fecha fin */}
                          <td>
                            <div className="susc-fecha">
                              <div className="susc-fecha-date">{formatDate(suscripcion.fecha_fin)}</div>
                            </div>
                          </td>
                          {/* Estado suscripción */}
                          <td>
                            <span className={`susc-badge ${getBadgeClass(suscripcion.estado_suscripcion)}`}>
                              <span className="susc-badge-dot"></span>
                              {suscripcion.estado_suscripcion}
                            </span>
                          </td>
                          {/* Estado transacción */}
                          <td>
                            <span className={`susc-badge ${suscripcion.estado_transaccion === 'Confirmada' ? 'confirmada' : 'trans-pendiente'}`}>
                              <span className="susc-badge-dot"></span>
                              {suscripcion.estado_transaccion}
                            </span>
                          </td>
                          {/* Monto */}
                          <td>
                            <span className="susc-monto">{formatMonto(suscripcion.monto)}</span>
                          </td>
                          {/* Forma de pago */}
                          <td style={{ fontSize: '12px' }}>{suscripcion.forma_pago || '-'}</td>
                          {/* Comprobante de pago */}
                          <td>{renderFileLink(suscripcion.comprobante_pago, 'Comprobante')}</td>
                          {/* Factura */}
                          <td>{renderFileLink(suscripcion.factura, 'Factura')}</td>
                          {/* Usuario registrador */}
                          <td>
                            {suscripcion.createdBy ? (
                              <button
                                type="button"
                                onClick={() => navigateToUser(suscripcion.createdBy!.id)}
                                className="susc-usuario-btn"
                                title="Ver usuario"
                              >
                                👤 {suscripcion.createdBy.username}
                              </button>
                            ) : <span style={{ color: '#94a3b8' }}>-</span>}
                          </td>
                          {/* Estado comisión */}
                          <td>
                            <span className={`susc-badge ${suscripcion.estado_comision === 'Pagada' ? 'pagada' : suscripcion.estado_comision === 'Pendiente' ? 'trans-pendiente' : 'sin-comision'}`}>
                              {suscripcion.estado_comision || 'Sin comisión'}
                            </span>
                          </td>
                          {/* Monto comisión */}
                          <td>
                            <span className="susc-monto" style={{ color: suscripcion.monto_comision ? '#059669' : '#94a3b8' }}>
                              {formatMonto(suscripcion.monto_comision)}
                            </span>
                          </td>
                          {/* Comprobante comisión */}
                          <td>{renderFileLink(suscripcion.comprobante_comision, 'Comprobante')}</td>
                          {/* Fecha registro */}
                          <td>
                            <div className="susc-fecha">
                              <div className="susc-fecha-date">{formatDate(suscripcion.created_at)}</div>
                              <div className="susc-fecha-time">
                                {suscripcion.created_at ? new Date(suscripcion.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          </td>
                          {/* Fecha actualización */}
                          <td>
                            <div className="susc-fecha">
                              <div className="susc-fecha-date">{formatDate(suscripcion.updated_at)}</div>
                              <div className="susc-fecha-time">
                                {suscripcion.updated_at ? new Date(suscripcion.updated_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          </td>
                          {/* Acciones */}
                          <td>
                            <div className="susc-actions">
                              <button
                                className="susc-btn-action edit"
                                onClick={() => handleEdit(suscripcion)}
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                className="susc-btn-action estado"
                                onClick={() => handleChangeEstado(suscripcion)}
                                title="Cambiar Estado"
                              >
                                🔄
                              </button>
                              <button
                                className="susc-btn-action delete"
                                onClick={() => handleDeleteClick(suscripcion)}
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          {totalItems > 0 && (
            <div className="susc-pagination">
              <div className="susc-pagination-info">
                Página {currentPage} de {totalPages} ({totalItems} total)
              </div>
              <div className="susc-pagination-controls">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="susc-page-btn"
                  title="Primera página"
                >
                  ⟪
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="susc-page-btn"
                  title="Anterior"
                >
                  ‹
                </button>
                <span className="susc-page-info">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="susc-page-btn"
                  title="Siguiente"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="susc-page-btn"
                  title="Última página"
                >
                  ⟫
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Nueva Suscripción */}
      {openNew && (
        <SuscripcionFormModal
          open={openNew}
          emisorId={emisorId}
          onClose={() => setOpenNew(false)}
          onSuccess={() => {
            setOpenNew(false);
            loadSuscripciones();
          }}
        />
      )}

      {/* Modal Editar Suscripción */}
      {openEdit && selectedSuscripcion && (
        <SuscripcionFormModal
          open={openEdit}
          emisorId={emisorId}
          suscripcion={selectedSuscripcion}
          onClose={() => {
            setOpenEdit(false);
            setSelectedSuscripcion(null);
          }}
          onSuccess={() => {
            setOpenEdit(false);
            setSelectedSuscripcion(null);
            loadSuscripciones();
          }}
        />
      )}

      {/* Modal Cambiar Estado */}
      {openEstado && selectedSuscripcion && (
        <SuscripcionEstadoModal
          open={openEstado}
          emisorId={emisorId}
          suscripcion={selectedSuscripcion}
          onClose={() => {
            setOpenEstado(false);
            setSelectedSuscripcion(null);
          }}
          onSuccess={() => {
            setOpenEstado(false);
            setSelectedSuscripcion(null);
            loadSuscripciones();
          }}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {openDelete && selectedSuscripcion && (
        <div className="susc-delete-modal-overlay" onClick={() => !deleteLoading && setOpenDelete(false)}>
          <div className="susc-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="susc-delete-modal-header">
              <h3>⚠️ Confirmar Eliminación</h3>
              <button className="susc-delete-modal-close" onClick={() => setOpenDelete(false)} disabled={deleteLoading}>×</button>
            </div>
            <div className="susc-delete-modal-body">
              <p style={{ marginBottom: '16px' }}>¿Estás seguro de que deseas eliminar esta suscripción?</p>
              
              <div className="susc-delete-info">
                <p><strong>Plan:</strong> {selectedSuscripcion.plan?.nombre || '-'}</p>
                <p><strong>Estado suscripción:</strong> {selectedSuscripcion.estado_suscripcion}</p>
                <p><strong>Estado transacción:</strong> {selectedSuscripcion.estado_transaccion}</p>
                <p><strong>Comprobantes emitidos:</strong> {selectedSuscripcion.comprobantes_usados || 0}</p>
              </div>
              
              {/* Advertencias */}
              {selectedSuscripcion.estado_transaccion !== 'Pendiente' && (
                <div className="susc-delete-error">⚠️ La transacción ya fue confirmada. No se puede eliminar.</div>
              )}
              {!['Suspendido', 'Pendiente'].includes(selectedSuscripcion.estado_suscripcion) && (
                <div className="susc-delete-error">⚠️ Solo se pueden eliminar suscripciones en estado Suspendido o Pendiente.</div>
              )}
              {(selectedSuscripcion.comprobantes_usados || 0) > 0 && (
                <div className="susc-delete-error">⚠️ Ya existen comprobantes emitidos. No se puede eliminar.</div>
              )}
              
              <div className="susc-delete-warning">⚡ Esta acción es irreversible.</div>
            </div>
            <div className="susc-delete-modal-footer">
              <button 
                className="susc-btn-cancel" 
                onClick={() => setOpenDelete(false)}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button 
                className="susc-btn-delete" 
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuscripcionesList;
