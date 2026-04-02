import React from 'react';
import './PlanesModern.css'; // Estilos modernos para planes
import { planesApi, Plan } from '../../services/planesApi';
import PlanFormModal from './PlanFormModal';
import PlanDeleteModal from './PlanDeleteModal';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/userContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import SortArrow from '../../components/SortArrow';

interface ListResponse {
  data: Plan[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

type SortField = 'nombre' | 'cantidad_comprobantes' | 'precio' | 'periodo' | 'observacion' | 'estado' | 'comprobantes_minimos' | 'dias_minimos' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

interface PlanesFilters {
  nombre: string;
  cantidad_comprobantes: string;
  precio: string;
  periodo: string;
  observacion: string;
  estados: string[];
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
}

const Planes: React.FC = () => {
  const [planes, setPlanes] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);
  const { show } = useNotification();
  const { user: currentUser } = useUser();
  const [openNew, setOpenNew] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<Plan | null>(null);
  const [openDelete, setOpenDelete] = React.useState(false);
  const [deletingPlan, setDeletingPlan] = React.useState<Plan | null>(null);
  const [sortField, setSortField] = React.useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = React.useState(false);
  
  // Filtros
  const defaultFilters: PlanesFilters = {
    nombre: '',
    cantidad_comprobantes: '',
    precio: '',
    periodo: '',
    observacion: '',
    estados: [],
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
  };
  const [filters, setFilters] = React.useState<PlanesFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = React.useState<PlanesFilters>(defaultFilters);

  // Verificar que el usuario sea administrador
  const isAdmin = currentUser?.role === 'administrador';

  // Toggle estado filter
  const toggleEstadoFilter = (estado: string) => {
    setFilters(prev => ({
      ...prev,
      estados: prev.estados.includes(estado)
        ? prev.estados.filter(e => e !== estado)
        : [...prev.estados, estado]
    }));
  };

  // Actualizar filtro
  const updateFilter = (key: keyof PlanesFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Aplicar filtros
  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
  };

  // Estado para estadísticas (todos los planes sin paginación)
  const [planesForStats, setPlanesForStats] = React.useState<Plan[]>([]);

  // Cargar planes
  const loadPlanes = React.useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        per_page: itemsPerPage,
        sort_by: sortField,
        sort_dir: sortDirection,
      };
      
      // Aplicar filtros
      if (appliedFilters.nombre) params.nombre = appliedFilters.nombre;
      if (appliedFilters.cantidad_comprobantes) params.cantidad_comprobantes_gte = appliedFilters.cantidad_comprobantes;
      if (appliedFilters.precio) params.precio = appliedFilters.precio;
      if (appliedFilters.periodo) params.periodo = appliedFilters.periodo;
      if (appliedFilters.observacion) params.observacion = appliedFilters.observacion;
      if (appliedFilters.estados.length > 0) params.estado = appliedFilters.estados.join(',');
      if (appliedFilters.createdFrom) params.created_at_from = appliedFilters.createdFrom;
      if (appliedFilters.createdTo) params.created_at_to = appliedFilters.createdTo;
      if (appliedFilters.updatedFrom) params.updated_at_from = appliedFilters.updatedFrom;
      if (appliedFilters.updatedTo) params.updated_at_to = appliedFilters.updatedTo;
      
      const response = await planesApi.list(params);
      const data = response.data as ListResponse;
      setPlanes(data.data);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error cargando planes';
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, appliedFilters, sortField, sortDirection, show]);

  // Cargar todos los planes sin paginación (para estadísticas)
  const loadPlanesForStats = React.useCallback(async () => {
    try {
      const params: Record<string, any> = {
        page: 1,
        per_page: 10000,
      };
      
      // Aplicar solo filtros de estado, ignorar búsqueda y paginación
      if (appliedFilters.estados.length > 0) params.estado = appliedFilters.estados.join(',');
      
      const response = await planesApi.list(params);
      const data = response.data as ListResponse;
      setPlanesForStats(data.data);
    } catch (err: any) {
      // Silencioso: es solo para estadísticas
    }
  }, [appliedFilters.estados]);

  // Cargar al montar y cuando cambien página/sort/appliedFilters
  React.useEffect(() => {
    loadPlanes();
  }, [loadPlanes]);

  // Cargar stats cuando cambien filtros
  React.useEffect(() => {
    loadPlanesForStats();
  }, [loadPlanesForStats]);

  // Manejar cambio de ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Manejar edición
  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setOpenEdit(true);
  };

  // Manejar eliminación
  const handleDelete = (plan: Plan) => {
    setDeletingPlan(plan);
    setOpenDelete(true);
  };

  // Renderizar ícono de ordenamiento
  const renderSortIcon = (field: SortField) => {
    return <SortArrow active={sortField === field} direction={sortDirection} />;
  };

  // Formatear precio
  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(precio);
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

  // Calcular rango de páginas
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Calcular estadísticas basadas en todos los planes
  const stats = React.useMemo(() => {
    const total = planesForStats.length;
    const activos = planesForStats.filter(p => p.estado === 'Activo').length;
    const inactivos = planesForStats.filter(p => p.estado === 'Desactivado').length;
    const precioPromedio = planesForStats.length > 0 
      ? planesForStats.reduce((sum, p) => sum + p.precio, 0) / planesForStats.length 
      : 0;
    return { total, activos, inactivos, precioPromedio };
  }, [planesForStats]);

  if (!isAdmin) {
    return (
      <div className="planes-page-container">
        <div className="planes-access-denied">
          <span className="planes-access-denied-icon">🔒</span>
          <h1>Acceso Denegado</h1>
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="planes-page-container">
      {/* Header */}
      <div className="planes-header">
        <div className="planes-header-left">
          <div className="planes-header-title">
            <span className="planes-header-icon">📋</span>
            <h1>Gestión de Planes</h1>
          </div>
          <p className="planes-header-subtitle">Administra los planes de facturación del sistema</p>
        </div>
        <button className="btn-nuevo" onClick={() => setOpenNew(true)}>
          <span>+</span>
          Nuevo Plan
        </button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="planes-stats-grid">
        <div className="planes-stat-card">
          <div className="planes-stat-icon total">📊</div>
          <div className="planes-stat-info">
            <span className="planes-stat-value">{stats.total}</span>
            <span className="planes-stat-label">Total Planes</span>
          </div>
        </div>
        <div className="planes-stat-card">
          <div className="planes-stat-icon activos">✅</div>
          <div className="planes-stat-info">
            <span className="planes-stat-value">{stats.activos}</span>
            <span className="planes-stat-label">Activos</span>
          </div>
        </div>
        <div className="planes-stat-card">
          <div className="planes-stat-icon precio">💰</div>
          <div className="planes-stat-info">
            <span className="planes-stat-value">{formatPrecio(stats.precioPromedio)}</span>
            <span className="planes-stat-label">Precio Promedio</span>
          </div>
        </div>
        <div className="planes-stat-card">
          <div className="planes-stat-icon inactivos">⏸️</div>
          <div className="planes-stat-info">
            <span className="planes-stat-value">{stats.inactivos}</span>
            <span className="planes-stat-label">Desactivados</span>
          </div>
        </div>
      </div>

      {/* Filtros colapsables */}
      <div className="planes-filters-section">
        <button 
          className="planes-filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="planes-filters-toggle-left">
            <span>🔍</span>
            <span>Filtros de Búsqueda</span>
          </div>
          <span className={`planes-filters-toggle-icon ${showFilters ? 'expanded' : ''}`}>▼</span>
        </button>

        {showFilters && (
          <div className="planes-filters-content">
            <div className="planes-filters-grid">
              <div className="planes-filter-group">
                <label>📝 Nombre</label>
                <input
                  type="text"
                  value={filters.nombre}
                  onChange={(e) => updateFilter('nombre', e.target.value)}
                  placeholder="Buscar por nombre..."
                />
              </div>

              <div className="planes-filter-group">
                <label>📦 Comprobantes (≥)</label>
                <input
                  type="number"
                  value={filters.cantidad_comprobantes}
                  onChange={(e) => updateFilter('cantidad_comprobantes', e.target.value)}
                  placeholder="Mínimo..."
                  min="0"
                />
              </div>

              <div className="planes-filter-group">
                <label>💵 Precio (≤)</label>
                <input
                  type="number"
                  value={filters.precio}
                  onChange={(e) => updateFilter('precio', e.target.value)}
                  placeholder="Máximo..."
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="planes-filter-group">
                <label>📅 Período</label>
                <select
                  value={filters.periodo}
                  onChange={(e) => updateFilter('periodo', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                  <option value="Bianual">Bianual</option>
                  <option value="Trianual">Trianual</option>
                </select>
              </div>

              <div className="planes-filter-group">
                <label>💬 Observación</label>
                <input
                  type="text"
                  value={filters.observacion}
                  onChange={(e) => updateFilter('observacion', e.target.value)}
                  placeholder="Buscar en observación..."
                />
              </div>

              <div className="planes-filter-group">
                <label>📊 Estado</label>
                <div className="planes-checkbox-group">
                  <label className="planes-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.estados.includes('Activo')}
                      onChange={() => toggleEstadoFilter('Activo')}
                    />
                    ✅ Activo
                  </label>
                  <label className="planes-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.estados.includes('Desactivado')}
                      onChange={() => toggleEstadoFilter('Desactivado')}
                    />
                    ⏸️ Desactivado
                  </label>
                </div>
              </div>

              <div className="planes-filter-group">
                <label>📅 Creación desde</label>
                <input
                  type="date"
                  value={filters.createdFrom}
                  onChange={(e) => updateFilter('createdFrom', e.target.value)}
                />
              </div>

              <div className="planes-filter-group">
                <label>📅 Creación hasta</label>
                <input
                  type="date"
                  value={filters.createdTo}
                  onChange={(e) => updateFilter('createdTo', e.target.value)}
                />
              </div>

              <div className="planes-filter-group">
                <label>🔄 Actualización desde</label>
                <input
                  type="date"
                  value={filters.updatedFrom}
                  onChange={(e) => updateFilter('updatedFrom', e.target.value)}
                />
              </div>

              <div className="planes-filter-group">
                <label>🔄 Actualización hasta</label>
                <input
                  type="date"
                  value={filters.updatedTo}
                  onChange={(e) => updateFilter('updatedTo', e.target.value)}
                />
              </div>
            </div>

            <div className="planes-filters-actions">
              <button onClick={applyFilters} className="planes-btn-apply">
                🔍 Aplicar filtros
              </button>
              <button onClick={clearFilters} className="planes-btn-clear">
                🗑️ Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="planes-loading">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="planes-table-container">
            <table className="planes-table">
              <thead>
                <tr>
                  <th className="planes-th-sticky-left" onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Nombre {renderSortIcon('nombre')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('cantidad_comprobantes')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Comprobantes {renderSortIcon('cantidad_comprobantes')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('precio')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Precio {renderSortIcon('precio')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('periodo')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Período {renderSortIcon('periodo')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('observacion')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Observación {renderSortIcon('observacion')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('estado')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Estado {renderSortIcon('estado')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('comprobantes_minimos')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Comprobantes Mínimos {renderSortIcon('comprobantes_minimos')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('dias_minimos')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Días Mínimos {renderSortIcon('dias_minimos')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Creación {renderSortIcon('created_at')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Actualización {renderSortIcon('updated_at')}
                    </span>
                  </th>
                  <th className="planes-th-sticky-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {planes.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="planes-empty-row">
                      <div className="planes-empty-state">
                        <span className="planes-empty-icon">📋</span>
                        <p>
                          {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== '')
                            ? 'No se encontraron planes con los filtros aplicados'
                            : 'No hay planes registrados'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  planes.map((plan) => (
                    <tr key={plan.id}>
                      <td className="planes-td-sticky-left">
                        <div className="planes-nombre-cell">
                          <span className="planes-nombre-icon">📋</span>
                          <strong>{plan.nombre}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="planes-comprobantes-badge">
                          {plan.cantidad_comprobantes.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="planes-precio-cell">
                          {formatPrecio(plan.precio)}
                        </span>
                      </td>
                      <td>
                        <span className={`planes-badge-periodo ${plan.periodo.toLowerCase()}`}>
                          {plan.periodo}
                        </span>
                      </td>
                      <td className="planes-observacion-cell">
                        {plan.observacion
                          ? (plan.observacion.length > 60
                              ? `${plan.observacion.substring(0, 60)}...`
                              : plan.observacion)
                          : <span className="planes-empty-text">-</span>}
                      </td>
                      <td>
                        <span className={`planes-badge-estado ${plan.estado === 'Activo' ? 'activo' : 'inactivo'}`}>
                          {plan.estado === 'Activo' ? '✅' : '⏸️'} {plan.estado}
                        </span>
                      </td>
                      <td className="planes-number-cell">{plan.comprobantes_minimos}</td>
                      <td className="planes-number-cell">{plan.dias_minimos}</td>
                      <td className="planes-date-cell">{formatDate(plan.created_at)}</td>
                      <td className="planes-date-cell">{formatDate(plan.updated_at)}</td>
                      <td className="planes-td-sticky-right">
                        <div className="planes-actions-cell">
                          <button 
                            className="planes-btn-action edit" 
                            onClick={() => handleEdit(plan)} 
                            title="Editar plan"
                          >
                            ✏️
                          </button>
                          <button 
                            className="planes-btn-action delete" 
                            onClick={() => handleDelete(plan)} 
                            title="Eliminar plan"
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
          <div className="planes-pagination">
            <div className="planes-pagination-info">
              Mostrando <strong>{planes.length}</strong> de <strong>{totalItems}</strong> planes
            </div>
            <div className="planes-pagination-controls">
              <div className="planes-per-page">
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
              <div className="planes-pagination-buttons">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="planes-pagination-btn"
                  title="Primera página"
                >
                  ⟪
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="planes-pagination-btn"
                  title="Página anterior"
                >
                  ‹
                </button>
                <span className="planes-pagination-current">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="planes-pagination-btn"
                  title="Página siguiente"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="planes-pagination-btn"
                  title="Última página"
                >
                  ⟫
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {openNew && (
        <PlanFormModal
          open={openNew}
          onClose={() => setOpenNew(false)}
          onSuccess={() => {
            setOpenNew(false);
            loadPlanes();
          }}
        />
      )}

      {openEdit && editingPlan && (
        <PlanFormModal
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setEditingPlan(null);
          }}
          onSuccess={() => {
            setOpenEdit(false);
            setEditingPlan(null);
            loadPlanes();
          }}
          plan={editingPlan}
        />
      )}

      {openDelete && deletingPlan && (
        <PlanDeleteModal
          open={openDelete}
          plan={deletingPlan}
          onClose={() => {
            setOpenDelete(false);
            setDeletingPlan(null);
          }}
          onSuccess={() => {
            setOpenDelete(false);
            setDeletingPlan(null);
            loadPlanes();
          }}
        />
      )}
    </div>
  );
};

export default Planes;
