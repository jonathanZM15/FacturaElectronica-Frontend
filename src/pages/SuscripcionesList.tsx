import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { suscripcionesApi, Suscripcion, SuscripcionFilters } from '../services/suscripcionesApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';
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
  
  // Estado para rango de fechas activo
  const [dateRangeType, setDateRangeType] = useState<'registro' | 'actualizacion' | 'inicio' | 'fin'>('registro');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Estado para filtro de búsqueda activo
  const [searchFilterType, setSearchFilterType] = useState<string>('');
  const [searchFilterValue, setSearchFilterValue] = useState<string>('');

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

  // Cargar suscripciones
  const loadSuscripciones = useCallback(async () => {
    try {
      setLoading(true);
      
      // Primero evaluar estados automáticamente (sincroniza estados según fechas/uso)
      try {
        await suscripcionesApi.evaluarEstados(emisorId);
      } catch (evalErr) {
        // Silenciosamente ignorar errores de evaluación, continuar cargando
        console.warn('Error evaluando estados:', evalErr);
      }
      
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

  useEffect(() => {
    loadSuscripciones();
  }, [loadSuscripciones]);

  // Aplicar filtros
  const applyFilters = () => {
    const newFilters: SuscripcionFilters = {};

    // Aplicar filtros de fecha según el tipo seleccionado
    if (dateFrom || dateTo) {
      switch (dateRangeType) {
        case 'registro':
          if (dateFrom) newFilters.fecha_registro_desde = dateFrom;
          if (dateTo) newFilters.fecha_registro_hasta = dateTo;
          break;
        case 'actualizacion':
          if (dateFrom) newFilters.fecha_actualizacion_desde = dateFrom;
          if (dateTo) newFilters.fecha_actualizacion_hasta = dateTo;
          break;
        case 'inicio':
          if (dateFrom) newFilters.fecha_inicio_desde = dateFrom;
          if (dateTo) newFilters.fecha_inicio_hasta = dateTo;
          break;
        case 'fin':
          if (dateFrom) newFilters.fecha_fin_desde = dateFrom;
          if (dateTo) newFilters.fecha_fin_hasta = dateTo;
          break;
      }
    }

    // Aplicar filtro de búsqueda (solo uno a la vez)
    if (searchFilterType && searchFilterValue) {
      switch (searchFilterType) {
        case 'plan':
          newFilters.plan = searchFilterValue;
          break;
        case 'cantidad_comprobantes_min':
          newFilters.cantidad_comprobantes_min = parseInt(searchFilterValue) || undefined;
          break;
        case 'comprobantes_usados_min':
          newFilters.comprobantes_usados_min = parseInt(searchFilterValue) || undefined;
          break;
        case 'comprobantes_restantes_max':
          newFilters.comprobantes_restantes_max = parseInt(searchFilterValue) || undefined;
          break;
        case 'estado_suscripcion':
          newFilters.estado_suscripcion = searchFilterValue;
          break;
        case 'estado_transaccion':
          newFilters.estado_transaccion = searchFilterValue;
          break;
        case 'monto_max':
          newFilters.monto_max = parseFloat(searchFilterValue) || undefined;
          break;
        case 'forma_pago':
          newFilters.forma_pago = searchFilterValue;
          break;
        case 'usuario_registrador':
          newFilters.usuario_registrador = searchFilterValue;
          break;
        case 'estado_comision':
          newFilters.estado_comision = searchFilterValue;
          break;
      }
    }

    setActiveFilters(newFilters);
    setCurrentPage(1);
    // Resetear ordenamiento a por defecto
    setSortBy('created_at');
    setSortDir('desc');
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setActiveFilters({});
    setDateRangeType('registro');
    setDateFrom('');
    setDateTo('');
    setSearchFilterType('');
    setSearchFilterValue('');
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
    if (sortBy !== column) return <span className="susc-sort-icon">⇅</span>;
    return <span className="susc-sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
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

  // Calcular estadísticas
  const stats = useMemo(() => {
    const vigentes = suscripciones.filter(s => s.estado_suscripcion === 'Vigente').length;
    const pendientes = suscripciones.filter(s => s.estado_suscripcion === 'Pendiente' || s.estado_suscripcion === 'Programado').length;
    const suspendidos = suscripciones.filter(s => ['Suspendido', 'Caducado', 'Sin comprobantes'].includes(s.estado_suscripcion)).length;
    return { vigentes, pendientes, suspendidos, total: totalItems };
  }, [suscripciones, totalItems]);

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
            <span>🔍</span>
            Filtros de Búsqueda
          </div>
          <div className="susc-filters-toggle-right">
            {activeFilterCount > 0 && (
              <span className="susc-active-filters-badge">{activeFilterCount} activo{activeFilterCount > 1 ? 's' : ''}</span>
            )}
            <span className={`susc-chevron ${filtersOpen ? 'open' : ''}`}>▼</span>
          </div>
        </button>
        
        <div className={`susc-filters-content ${filtersOpen ? 'open' : ''}`}>
          <div className="susc-filters-grid">
            {/* Filtros de Fecha */}
            <div className="susc-filter-section">
              <div className="susc-filter-section-title">Rango de Fechas</div>
              <div className="susc-filter-row">
                <select 
                  value={dateRangeType} 
                  onChange={(e) => setDateRangeType(e.target.value as any)}
                  className="susc-filter-select"
                >
                  <option value="registro">Fecha de registro</option>
                  <option value="actualizacion">Fecha de actualización</option>
                  <option value="inicio">Fecha de inicio</option>
                  <option value="fin">Fecha de fin</option>
                </select>
              </div>
              <div className="susc-filter-row" style={{ marginTop: '8px' }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Desde"
                  className="susc-filter-input"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Hasta"
                  className="susc-filter-input"
                />
              </div>
            </div>

            {/* Filtros de Búsqueda */}
            <div className="susc-filter-section">
              <div className="susc-filter-section-title">Filtro Específico</div>
              <div className="susc-filter-row">
                <select 
                  value={searchFilterType} 
                  onChange={(e) => {
                    setSearchFilterType(e.target.value);
                    setSearchFilterValue('');
                  }}
                  className="susc-filter-select"
                >
                  <option value="">Seleccionar filtro...</option>
                  <option value="plan">Plan (texto)</option>
                  <option value="cantidad_comprobantes_min">Comprobantes del plan (≥)</option>
                  <option value="comprobantes_usados_min">Comprobantes creados (≥)</option>
                  <option value="comprobantes_restantes_max">Comprobantes restantes (≤)</option>
                  <option value="estado_suscripcion">Estado de suscripción</option>
                  <option value="estado_transaccion">Estado de transacción</option>
                  <option value="monto_max">Monto (≤)</option>
                  <option value="forma_pago">Forma de pago</option>
                  <option value="usuario_registrador">Usuario registrador</option>
                  <option value="estado_comision">Estado de comisión</option>
                </select>
              </div>
              <div className="susc-filter-row" style={{ marginTop: '8px' }}>
                {/* Input dinámico según el tipo de filtro */}
                {searchFilterType === 'estado_suscripcion' && estados ? (
                  <select 
                    value={searchFilterValue} 
                    onChange={(e) => setSearchFilterValue(e.target.value)}
                    className="susc-filter-select"
                  >
                    <option value="">Todos</option>
                    {estados.todos.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                ) : searchFilterType === 'estado_transaccion' && estados ? (
                  <select 
                    value={searchFilterValue} 
                    onChange={(e) => setSearchFilterValue(e.target.value)}
                    className="susc-filter-select"
                  >
                    <option value="">Todos</option>
                    {estados.estados_transaccion.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                ) : searchFilterType === 'forma_pago' && estados ? (
                  <select 
                    value={searchFilterValue} 
                    onChange={(e) => setSearchFilterValue(e.target.value)}
                    className="susc-filter-select"
                  >
                    <option value="">Todas</option>
                    {estados.formas_pago.map(forma => (
                      <option key={forma} value={forma}>{forma}</option>
                    ))}
                  </select>
                ) : searchFilterType === 'estado_comision' && estados ? (
                  <select 
                    value={searchFilterValue} 
                    onChange={(e) => setSearchFilterValue(e.target.value)}
                    className="susc-filter-select"
                  >
                    <option value="">Todos</option>
                    {estados.estados_comision.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                ) : searchFilterType && ['cantidad_comprobantes_min', 'comprobantes_usados_min', 'comprobantes_restantes_max'].includes(searchFilterType) ? (
                  <input
                    type="number"
                    min="0"
                    value={searchFilterValue}
                    onChange={(e) => setSearchFilterValue(e.target.value)}
                    placeholder="Ingrese cantidad"
                    className="susc-filter-input"
                  />
                ) : searchFilterType === 'monto_max' ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={searchFilterValue}
                    onChange={(e) => setSearchFilterValue(e.target.value)}
                    placeholder="Monto máximo"
                    className="susc-filter-input"
                  />
                ) : searchFilterType ? (
                  <input
                    type="text"
                    value={searchFilterValue}
                    onChange={(e) => setSearchFilterValue(e.target.value)}
                    placeholder="Texto de búsqueda..."
                    className="susc-filter-input"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    placeholder="Seleccione un filtro primero"
                    className="susc-filter-input"
                    style={{ opacity: 0.5 }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="susc-filters-actions">
            <button className="susc-btn-clear" onClick={clearAllFilters} disabled={!hasActiveFilters}>
              🗑️ Limpiar
            </button>
            <button className="susc-btn-apply" onClick={applyFilters}>
              🔍 Aplicar Filtros
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
      ) : (
        <>
          <div className="susc-table-wrapper">
            {suscripciones.length === 0 && (
              <div className="susc-empty-overlay">
                <div className="susc-empty-content">
                  <div className="susc-empty-icon">📋</div>
                  <h3>{hasActiveFilters ? 'Sin resultados' : 'Sin suscripciones'}</h3>
                  <p>{hasActiveFilters 
                    ? 'No se encontraron suscripciones con los filtros aplicados.'
                    : 'No hay suscripciones registradas para este emisor.'
                  }</p>
                </div>
              </div>
            )}
            <div className="susc-table-scroll">
              <table className="susc-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('plan_id')} className="sortable">
                      <div className="susc-th-content">Plan {renderSortIcon('plan_id')}</div>
                    </th>
                    <th onClick={() => handleSort('cantidad_comprobantes')} className="sortable">
                      <div className="susc-th-content">Comp. Plan {renderSortIcon('cantidad_comprobantes')}</div>
                    </th>
                    <th onClick={() => handleSort('comprobantes_usados')} className="sortable">
                      <div className="susc-th-content">Creados {renderSortIcon('comprobantes_usados')}</div>
                    </th>
                    <th>
                      <div className="susc-th-content">Restantes</div>
                    </th>
                    <th onClick={() => handleSort('fecha_inicio')} className="sortable">
                      <div className="susc-th-content">F. Inicio {renderSortIcon('fecha_inicio')}</div>
                    </th>
                    <th onClick={() => handleSort('fecha_fin')} className="sortable">
                      <div className="susc-th-content">F. Fin {renderSortIcon('fecha_fin')}</div>
                    </th>
                    <th onClick={() => handleSort('estado_suscripcion')} className="sortable">
                      <div className="susc-th-content">Estado Susc. {renderSortIcon('estado_suscripcion')}</div>
                    </th>
                    <th onClick={() => handleSort('estado_transaccion')} className="sortable">
                      <div className="susc-th-content">Estado Trans. {renderSortIcon('estado_transaccion')}</div>
                    </th>
                    <th onClick={() => handleSort('monto')} className="sortable">
                      <div className="susc-th-content">Monto {renderSortIcon('monto')}</div>
                    </th>
                    <th onClick={() => handleSort('forma_pago')} className="sortable">
                      <div className="susc-th-content">F. Pago {renderSortIcon('forma_pago')}</div>
                    </th>
                    <th>Comprobante</th>
                    <th>Factura</th>
                    <th onClick={() => handleSort('created_by_id')} className="sortable">
                      <div className="susc-th-content">Registrador {renderSortIcon('created_by_id')}</div>
                    </th>
                    <th onClick={() => handleSort('estado_comision')} className="sortable">
                      <div className="susc-th-content">Est. Comisión {renderSortIcon('estado_comision')}</div>
                    </th>
                    <th onClick={() => handleSort('monto_comision')} className="sortable">
                      <div className="susc-th-content">Comisión {renderSortIcon('monto_comision')}</div>
                    </th>
                    <th>Comp. Com.</th>
                    <th onClick={() => handleSort('created_at')} className="sortable">
                      <div className="susc-th-content">Registro {renderSortIcon('created_at')}</div>
                    </th>
                    <th onClick={() => handleSort('updated_at')} className="sortable">
                      <div className="susc-th-content">Actualización {renderSortIcon('updated_at')}</div>
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
              {!['Pendiente', 'Programado'].includes(selectedSuscripcion.estado_suscripcion) && (
                <div className="susc-delete-error">⚠️ Solo se pueden eliminar suscripciones en estado Pendiente o Programado.</div>
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
