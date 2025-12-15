import React from 'react';
import './Emisores.css'; // Reutilizar estilos de Emisores
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

type SortField = 'nombre' | 'precio' | 'periodo' | 'estado' | 'created_at';
type SortDirection = 'asc' | 'desc';

const Planes: React.FC = () => {
  const [planes, setPlanes] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { show } = useNotification();
  const { user: currentUser } = useUser();
  const [openNew, setOpenNew] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<Plan | null>(null);
  const [openDelete, setOpenDelete] = React.useState(false);
  const [deletingPlan, setDeletingPlan] = React.useState<Plan | null>(null);
  const [sortField, setSortField] = React.useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [filterEstado, setFilterEstado] = React.useState<string>('');
  const [filterPeriodo, setFilterPeriodo] = React.useState<string>('');

  // Verificar que el usuario sea administrador
  const isAdmin = currentUser?.role === 'administrador';

  // Cargar planes
  const loadPlanes = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await planesApi.list({
        page: currentPage,
        per_page: itemsPerPage,
        search: searchQuery,
        estado: filterEstado,
        periodo: filterPeriodo,
        sort_by: sortField,
        sort_dir: sortDirection,
      });
      
      const data = response.data as ListResponse;
      setPlanes(data.data);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error cargando planes';
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, filterEstado, filterPeriodo, sortField, sortDirection, show]);

  // Cargar en el primer render y cuando cambien los filtros
  React.useEffect(() => {
    loadPlanes();
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
          <button className="btn-primary" onClick={() => setOpenNew(true)}>
            <span className="icon">+</span>
            Nuevo Plan
          </button>
        </div>

        <div className="search-filters-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar por nombre u observación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filters-group">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Desactivado">Desactivado</option>
            </select>

            <select
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los períodos</option>
              <option value="Mensual">Mensual</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
              <option value="Bianual">Bianual</option>
              <option value="Trianual">Trianual</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="10">10 por página</option>
              <option value="25">25 por página</option>
              <option value="50">50 por página</option>
              <option value="100">100 por página</option>
            </select>
          </div>
        </div>
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
                  <th>Comprobantes</th>
                  <th onClick={() => handleSort('precio')} style={{ cursor: 'pointer' }}>
                    Precio {renderSortIcon('precio')}
                  </th>
                  <th onClick={() => handleSort('periodo')} style={{ cursor: 'pointer' }}>
                    Período {renderSortIcon('periodo')}
                  </th>
                  <th>Colores</th>
                  <th onClick={() => handleSort('estado')} style={{ cursor: 'pointer' }}>
                    Estado {renderSortIcon('estado')}
                  </th>
                  <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                    Fecha Creación {renderSortIcon('created_at')}
                  </th>
                  <th className="actions-column">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {planes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      {searchQuery || filterEstado || filterPeriodo
                        ? 'No se encontraron planes con los filtros aplicados'
                        : 'No hay planes registrados'}
                    </td>
                  </tr>
                ) : (
                  planes.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <strong>{plan.nombre}</strong>
                        {plan.observacion && (
                          <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                            {plan.observacion.length > 50
                              ? `${plan.observacion.substring(0, 50)}...`
                              : plan.observacion}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{plan.cantidad_comprobantes.toLocaleString()} comprobantes</div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          Mín: {plan.comprobantes_minimos}
                        </div>
                      </td>
                      <td>
                        <strong>{formatPrecio(plan.precio)}</strong>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          Días mín: {plan.dias_minimos}
                        </div>
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
                        <span className={`badge ${plan.estado === 'Activo' ? 'badge-success' : 'badge-danger'}`}>
                          {plan.estado}
                        </span>
                      </td>
                      <td>{formatDate(plan.created_at)}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(plan)}
                          title="Editar plan"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(plan)}
                          title="Eliminar plan"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {currentPage} de {totalPages} ({totalItems} planes en total)
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="pagination-btn"
              >
                Siguiente
              </button>
            </div>
          )}
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
