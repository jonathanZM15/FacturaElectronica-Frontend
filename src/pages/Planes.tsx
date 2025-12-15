import React from 'react';
import './Emisores.css'; // Reutilizar estilos de Emisores
import './EmisorUsuarios.css'; // Estilos del panel de filtros
import { planesApi, Plan } from '../services/planesApi';
import PlanFormModal from './PlanFormModal';
import PlanDeleteModal from './PlanDeleteModal';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const [filters, setFilters] = React.useState<PlanesFilters>({
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
  });

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
    // Resetear ordenamiento al aplicar filtro
    setSortField('created_at');
    setSortDirection('desc');
  };

  // Actualizar filtro y resetear ordenamiento
  const updateFilter = (key: keyof PlanesFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Resetear ordenamiento al aplicar filtro
    setSortField('created_at');
    setSortDirection('desc');
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters({
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
    });
    setSortField('created_at');
    setSortDirection('desc');
    setCurrentPage(1);
  };

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
      if (filters.nombre) params.nombre = filters.nombre;
      if (filters.cantidad_comprobantes) params.cantidad_comprobantes_gte = filters.cantidad_comprobantes;
      if (filters.precio) params.precio = filters.precio;
      if (filters.periodo) params.periodo = filters.periodo;
      if (filters.observacion) params.observacion = filters.observacion;
      if (filters.estados.length > 0) params.estado = filters.estados.join(',');
      if (filters.createdFrom) params.created_at_from = filters.createdFrom;
      if (filters.createdTo) params.created_at_to = filters.createdTo;
      if (filters.updatedFrom) params.updated_at_from = filters.updatedFrom;
      if (filters.updatedTo) params.updated_at_to = filters.updatedTo;
      
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
  }, [currentPage, itemsPerPage, filters, sortField, sortDirection, show]);

  // Debounce para filtros en tiempo real
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPlanes();
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timeoutId);
  }, [loadPlanes]);

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
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
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

  if (!isAdmin) {
    return (
      <div className="emisores-container">
        <div className="content-header">
          <h1>Acceso Denegado</h1>
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="emisores-container">
      <div className="content-header">
        <div className="header-top">
          <div className="title-section">
            <h1>Gestión de Planes</h1>
            <p className="subtitle">Administra los planes de facturación del sistema</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
              🔍 {showFilters ? 'Ocultar' : 'Filtros'}
            </button>
            <button className="btn-primary" onClick={() => setOpenNew(true)}>
              <span className="icon">+</span>
              Nuevo Plan
            </button>
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={filters.nombre}
                  onChange={(e) => updateFilter('nombre', e.target.value)}
                  placeholder="Buscar por nombre..."
                />
              </div>

              <div className="filter-group">
                <label>Cantidad de comprobantes (≥)</label>
                <input
                  type="number"
                  value={filters.cantidad_comprobantes}
                  onChange={(e) => updateFilter('cantidad_comprobantes', e.target.value)}
                  placeholder="Mínimo..."
                  min="0"
                />
              </div>

              <div className="filter-group">
                <label>Precio</label>
                <input
                  type="number"
                  value={filters.precio}
                  onChange={(e) => updateFilter('precio', e.target.value)}
                  placeholder="Precio..."
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="filter-group">
                <label>Período</label>
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

              <div className="filter-group">
                <label>Observación</label>
                <input
                  type="text"
                  value={filters.observacion}
                  onChange={(e) => updateFilter('observacion', e.target.value)}
                  placeholder="Buscar en observación..."
                />
              </div>

              <div className="filter-group">
                <label>Estado</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.estados.includes('Activo')}
                      onChange={() => toggleEstadoFilter('Activo')}
                    />
                    Activo
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.estados.includes('Desactivado')}
                      onChange={() => toggleEstadoFilter('Desactivado')}
                    />
                    Desactivado
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <label>Fecha creación desde</label>
                <input
                  type="date"
                  value={filters.createdFrom}
                  onChange={(e) => updateFilter('createdFrom', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Fecha creación hasta</label>
                <input
                  type="date"
                  value={filters.createdTo}
                  onChange={(e) => updateFilter('createdTo', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Fecha actualización desde</label>
                <input
                  type="date"
                  value={filters.updatedFrom}
                  onChange={(e) => updateFilter('updatedFrom', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Fecha actualización hasta</label>
                <input
                  type="date"
                  value={filters.updatedTo}
                  onChange={(e) => updateFilter('updatedTo', e.target.value)}
                />
              </div>
            </div>

            <div className="filters-actions">
              <button onClick={clearFilters} className="btn-clear-filters">
                🗑️ Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Cargando planes..." />
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>
                    Nombre {renderSortIcon('nombre')}
                  </th>
                  <th onClick={() => handleSort('cantidad_comprobantes')} style={{ cursor: 'pointer' }}>
                    Cantidad de comprobantes {renderSortIcon('cantidad_comprobantes')}
                  </th>
                  <th onClick={() => handleSort('precio')} style={{ cursor: 'pointer' }}>
                    Precio {renderSortIcon('precio')}
                  </th>
                  <th onClick={() => handleSort('periodo')} style={{ cursor: 'pointer' }}>
                    Período {renderSortIcon('periodo')}
                  </th>
                  <th>Colores</th>
                  <th onClick={() => handleSort('observacion')} style={{ cursor: 'pointer' }}>
                    Observación {renderSortIcon('observacion')}
                  </th>
                  <th onClick={() => handleSort('estado')} style={{ cursor: 'pointer' }}>
                    Estado {renderSortIcon('estado')}
                  </th>
                  <th onClick={() => handleSort('comprobantes_minimos')} style={{ cursor: 'pointer' }}>
                    Comprobantes mínimos {renderSortIcon('comprobantes_minimos')}
                  </th>
                  <th onClick={() => handleSort('dias_minimos')} style={{ cursor: 'pointer' }}>
                    Días mínimos {renderSortIcon('dias_minimos')}
                  </th>
                  <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                    Fecha de creación {renderSortIcon('created_at')}
                  </th>
                  <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer' }}>
                    Fecha de actualización {renderSortIcon('updated_at')}
                  </th>
                  <th className="actions-column">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {planes.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '2rem' }}>
                      {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== '')
                        ? 'No se encontraron planes con los filtros aplicados'
                        : 'No hay planes registrados'}
                    </td>
                  </tr>
                ) : (
                  planes.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <strong>{plan.nombre}</strong>
                      </td>
                      <td>{plan.cantidad_comprobantes.toLocaleString()}</td>
                      <td>
                        <strong>{formatPrecio(plan.precio)}</strong>
                      </td>
                      <td>{plan.periodo}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              backgroundColor: plan.color_fondo,
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                            title={`Fondo: ${plan.color_fondo}`}
                          />
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              backgroundColor: plan.color_texto,
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                            title={`Texto: ${plan.color_texto}`}
                          />
                        </div>
                      </td>
                      <td>
                        {plan.observacion
                          ? (plan.observacion.length > 80
                              ? `${plan.observacion.substring(0, 80)}...`
                              : plan.observacion)
                          : '-'}
                      </td>
                      <td>
                        <span className={`badge ${plan.estado === 'Activo' ? 'badge-success' : 'badge-danger'}`}>
                          {plan.estado}
                        </span>
                      </td>
                      <td>{plan.comprobantes_minimos}</td>
                      <td>{plan.dias_minimos}</td>
                      <td>{formatDate(plan.created_at)}</td>
                      <td>{formatDate(plan.updated_at)}</td>
                      <td className="actions-cell">
                        <button className="btn-icon btn-edit" onClick={() => handleEdit(plan)} title="Editar plan">
                          ✏️
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(plan)} title="Eliminar plan">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-container">
            <div className="pagination-info-left">
              Mostrando {planes.length} de {totalItems} planes
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
