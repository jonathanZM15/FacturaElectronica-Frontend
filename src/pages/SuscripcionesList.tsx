import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { suscripcionesApi, Suscripcion, SuscripcionFilters } from '../services/suscripcionesApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SuscripcionFormModal from './SuscripcionFormModal';
import SuscripcionEstadoModal from './SuscripcionEstadoModal';
import './Emisores.css';

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
    if (sortBy !== column) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
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
    return `${nombre.toUpperCase()} - ${periodo.toUpperCase()} - ${cantidad_comprobantes} C - $${precio.toFixed(2)}`;
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
      // TODO: Implementar endpoint de eliminación
      show({ 
        title: 'Información', 
        message: 'La funcionalidad de eliminación será implementada próximamente.', 
        type: 'info' 
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al eliminar la suscripción';
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
    if (!filePath) return '-';
    const fileName = filePath.split('/').pop() || label || 'Ver archivo';
    return (
      <a 
        href={`${process.env.REACT_APP_API_URL || ''}/storage/${filePath}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="file-link"
        title={fileName}
      >
        📎 {fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName}
      </a>
    );
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Verificar si hay filtros activos
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className="suscripciones-container">
      <div className="content-header">
        <div className="header-top">
          <div className="title-section">
            <h2>📋 Suscripciones</h2>
            <p className="subtitle">Gestiona las suscripciones de este emisor</p>
          </div>
          {canCreate && (
            <button className="btn-primary" onClick={() => setOpenNew(true)}>
              <span className="icon">+</span>
              Nueva Suscripción
            </button>
          )}
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="filters-panel">
        <h3>🔍 Filtros</h3>
        
        {/* Filtros de Rango de Fechas */}
        <div className="filter-section">
          <label className="filter-label">Filtrar por Rango de Fechas:</label>
          <div className="filter-row">
            <select 
              value={dateRangeType} 
              onChange={(e) => setDateRangeType(e.target.value as any)}
              className="filter-select"
            >
              <option value="registro">Fecha de registro</option>
              <option value="actualizacion">Fecha de actualización</option>
              <option value="inicio">Fecha de inicio</option>
              <option value="fin">Fecha de fin</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Desde"
              className="filter-input"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Hasta"
              className="filter-input"
            />
          </div>
        </div>

        {/* Filtros de Búsqueda */}
        <div className="filter-section">
          <label className="filter-label">Filtro de Búsqueda:</label>
          <div className="filter-row">
            <select 
              value={searchFilterType} 
              onChange={(e) => {
                setSearchFilterType(e.target.value);
                setSearchFilterValue('');
              }}
              className="filter-select"
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
              <option value="usuario_registrador">Usuario registrador (texto)</option>
              <option value="estado_comision">Estado de comisión</option>
            </select>
            
            {/* Input dinámico según el tipo de filtro */}
            {searchFilterType === 'estado_suscripcion' && estados ? (
              <select 
                value={searchFilterValue} 
                onChange={(e) => setSearchFilterValue(e.target.value)}
                className="filter-select"
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
                className="filter-select"
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
                className="filter-select"
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
                className="filter-select"
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
                className="filter-input"
              />
            ) : searchFilterType === 'monto_max' ? (
              <input
                type="number"
                min="0"
                step="0.01"
                value={searchFilterValue}
                onChange={(e) => setSearchFilterValue(e.target.value)}
                placeholder="Ingrese monto máximo"
                className="filter-input"
              />
            ) : searchFilterType ? (
              <input
                type="text"
                value={searchFilterValue}
                onChange={(e) => setSearchFilterValue(e.target.value)}
                placeholder="Ingrese texto de búsqueda"
                className="filter-input"
              />
            ) : null}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="filter-actions">
          <button className="btn-primary" onClick={applyFilters}>
            Aplicar Filtros
          </button>
          <button className="btn-secondary" onClick={clearAllFilters} disabled={!hasActiveFilters}>
            Limpiar Filtros
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Cargando suscripciones..." />
      ) : (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('plan_id')} className="sortable-header">
                    Plan {renderSortIcon('plan_id')}
                  </th>
                  <th onClick={() => handleSort('cantidad_comprobantes')} className="sortable-header">
                    Comprobantes Plan {renderSortIcon('cantidad_comprobantes')}
                  </th>
                  <th onClick={() => handleSort('comprobantes_usados')} className="sortable-header">
                    Comprobantes Creados {renderSortIcon('comprobantes_usados')}
                  </th>
                  <th className="sortable-header">
                    Comprobantes Restantes
                  </th>
                  <th onClick={() => handleSort('fecha_inicio')} className="sortable-header">
                    Fecha Inicio {renderSortIcon('fecha_inicio')}
                  </th>
                  <th onClick={() => handleSort('fecha_fin')} className="sortable-header">
                    Fecha Fin {renderSortIcon('fecha_fin')}
                  </th>
                  <th onClick={() => handleSort('estado_suscripcion')} className="sortable-header">
                    Estado Suscripción {renderSortIcon('estado_suscripcion')}
                  </th>
                  <th onClick={() => handleSort('estado_transaccion')} className="sortable-header">
                    Estado Transacción {renderSortIcon('estado_transaccion')}
                  </th>
                  <th onClick={() => handleSort('monto')} className="sortable-header">
                    Monto {renderSortIcon('monto')}
                  </th>
                  <th onClick={() => handleSort('forma_pago')} className="sortable-header">
                    Forma de Pago {renderSortIcon('forma_pago')}
                  </th>
                  <th>Comprobante</th>
                  <th>Factura</th>
                  <th onClick={() => handleSort('created_by_id')} className="sortable-header">
                    Usuario Registrador {renderSortIcon('created_by_id')}
                  </th>
                  <th onClick={() => handleSort('estado_comision')} className="sortable-header">
                    Estado Comisión {renderSortIcon('estado_comision')}
                  </th>
                  <th onClick={() => handleSort('monto_comision')} className="sortable-header">
                    Monto Comisión {renderSortIcon('monto_comision')}
                  </th>
                  <th>Comprobante Comisión</th>
                  <th onClick={() => handleSort('created_at')} className="sortable-header">
                    Fecha Registro {renderSortIcon('created_at')}
                  </th>
                  <th onClick={() => handleSort('updated_at')} className="sortable-header">
                    Fecha Actualización {renderSortIcon('updated_at')}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {suscripciones.length === 0 ? (
                  <tr>
                    <td colSpan={19} style={{ textAlign: 'center', padding: '2rem' }}>
                      {hasActiveFilters 
                        ? 'No se encontraron suscripciones con los filtros aplicados.'
                        : 'No hay suscripciones registradas para este emisor'
                      }
                    </td>
                  </tr>
                ) : (
                  suscripciones.map((suscripcion) => (
                    <tr key={suscripcion.id}>
                      {/* Plan */}
                      <td>
                        <strong>{formatPlan(suscripcion)}</strong>
                      </td>
                      {/* Cantidad comprobantes del plan */}
                      <td style={{ textAlign: 'center' }}>
                        {suscripcion.cantidad_comprobantes}
                      </td>
                      {/* Comprobantes creados */}
                      <td style={{ textAlign: 'center' }}>
                        {suscripcion.comprobantes_usados}
                      </td>
                      {/* Comprobantes restantes */}
                      <td style={{ textAlign: 'center' }}>
                        <strong>{suscripcion.comprobantes_restantes ?? (suscripcion.cantidad_comprobantes - suscripcion.comprobantes_usados)}</strong>
                      </td>
                      {/* Fecha inicio */}
                      <td>{formatDate(suscripcion.fecha_inicio)}</td>
                      {/* Fecha fin */}
                      <td>{formatDate(suscripcion.fecha_fin)}</td>
                      {/* Estado suscripción */}
                      <td>
                        <span className={`badge ${getEstadoSuscripcionBadgeClass(suscripcion.estado_suscripcion)}`}>
                          {suscripcion.estado_suscripcion}
                        </span>
                      </td>
                      {/* Estado transacción */}
                      <td>
                        <span className={`badge ${suscripcion.estado_transaccion === 'Confirmada' ? 'badge-success' : 'badge-warning'}`}>
                          {suscripcion.estado_transaccion}
                        </span>
                      </td>
                      {/* Monto */}
                      <td><strong>{formatMonto(suscripcion.monto)}</strong></td>
                      {/* Forma de pago */}
                      <td>{suscripcion.forma_pago}</td>
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
                            className="user-link"
                            title="Ver información del usuario"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                          >
                            {formatUsuarioRegistrador(suscripcion)}
                          </button>
                        ) : '-'}
                      </td>
                      {/* Estado comisión */}
                      <td>
                        <span className={`badge ${getEstadoComisionBadgeClass(suscripcion.estado_comision)}`}>
                          {suscripcion.estado_comision || 'Sin comision'}
                        </span>
                      </td>
                      {/* Monto comisión */}
                      <td>{formatMonto(suscripcion.monto_comision)}</td>
                      {/* Comprobante comisión */}
                      <td>{renderFileLink(suscripcion.comprobante_comision, 'Comprobante')}</td>
                      {/* Fecha registro */}
                      <td>{formatDateTime(suscripcion.created_at)}</td>
                      {/* Fecha actualización */}
                      <td>{formatDateTime(suscripcion.updated_at)}</td>
                      {/* Acciones */}
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => handleEdit(suscripcion)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleChangeEstado(suscripcion)}
                            title="Cambiar Estado"
                            style={{ backgroundColor: '#8b5cf6', color: 'white' }}
                          >
                            🔄
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => handleDeleteClick(suscripcion)}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalItems > 0 && (
            <div className="pagination-container">
              <div className="pagination-info-left">
                Mostrando {suscripciones.length} de {totalItems} suscripciones
              </div>
              <div className="per-page-selector">
                <span>Filas por página:</span>
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
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ⟪
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ‹
                </button>
                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
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
        <div className="modal-overlay">
          <div className="modal-container modal-sm">
            <div className="modal-header">
              <h2>⚠️ Confirmar Eliminación</h2>
              <button className="close-btn" onClick={() => setOpenDelete(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas eliminar esta suscripción?</p>
              <p><strong>Plan:</strong> {formatPlan(selectedSuscripcion)}</p>
              <p><strong>Estado:</strong> {selectedSuscripcion.estado_suscripcion}</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setOpenDelete(false)}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button 
                className="btn-danger" 
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuscripcionesList;
