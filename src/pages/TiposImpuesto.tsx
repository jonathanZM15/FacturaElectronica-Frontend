import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  tiposImpuestoApi, 
  TipoImpuesto, 
  TipoImpuestoFilters,
  TipoImpuestoEnum,
  TipoTarifaEnum,
} from '../services/tiposImpuestoApi';
import { useNotification } from '../contexts/NotificationContext';
import TipoImpuestoFormModal from './TipoImpuestoFormModal';
import TipoImpuestoDeleteModal from './TipoImpuestoDeleteModal';
import './TiposImpuesto.css';

type SortDirection = 'asc' | 'desc';

const TiposImpuesto: React.FC = () => {
  const { show } = useNotification();
  
  // Estado para datos
  const [tiposImpuesto, setTiposImpuesto] = useState<TipoImpuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estado para ordenamiento
  const [sortBy, setSortBy] = useState<string>('nombre');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  
  // Estado para filtros
  const [filters, setFilters] = useState<TipoImpuestoFilters>({});
  const [activeFilters, setActiveFilters] = useState<TipoImpuestoFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Estados para modales
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedTipoImpuesto, setSelectedTipoImpuesto] = useState<TipoImpuesto | null>(null);

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeFilters.fecha_creacion_desde) count++;
    if (activeFilters.fecha_creacion_hasta) count++;
    if (activeFilters.fecha_actualizacion_desde) count++;
    if (activeFilters.fecha_actualizacion_hasta) count++;
    if (activeFilters.tipos_impuesto?.length) count++;
    if (activeFilters.nombre) count++;
    if (activeFilters.codigo) count++;
    if (activeFilters.valor_tarifa_max) count++;
    if (activeFilters.tipo_tarifa) count++;
    if (activeFilters.estado) count++;
    return count;
  }, [activeFilters]);

  // Estadísticas por tipo
  const stats = useMemo(() => {
    const iva = tiposImpuesto.filter(t => t.tipo_impuesto === 'IVA').length;
    const ice = tiposImpuesto.filter(t => t.tipo_impuesto === 'ICE').length;
    const irbpnr = tiposImpuesto.filter(t => t.tipo_impuesto === 'IRBPNR').length;
    return { iva, ice, irbpnr, total: totalItems };
  }, [tiposImpuesto, totalItems]);

  // Cargar tipos de impuesto
  const loadTiposImpuesto = useCallback(async () => {
    try {
      setLoading(true);
      
      const params: Record<string, any> = {
        page: currentPage,
        per_page: itemsPerPage,
        sort_by: sortBy,
        sort_dir: sortDir,
        ...activeFilters,
      };

      const response = await tiposImpuestoApi.list(params);
      
      setTiposImpuesto(response.data.data || []);
      setTotalItems(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.last_page || 1);
      
    } catch (err: any) {
      console.error('Error al cargar tipos de impuesto:', err);
      const msg = err?.response?.data?.message || 'Error al cargar tipos de impuesto';
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortDir, activeFilters, show]);

  useEffect(() => {
    loadTiposImpuesto();
  }, [loadTiposImpuesto]);

  // Manejar ordenamiento
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Aplicar filtros
  const applyFilters = () => {
    setActiveFilters({ ...filters });
    setCurrentPage(1);
    setSortBy('nombre');
    setSortDir('asc');
    setFiltersOpen(false);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters({});
    setActiveFilters({});
    setCurrentPage(1);
    setSortBy('nombre');
    setSortDir('asc');
  };

  // Manejar cambio de filtro
  const handleFilterChange = (key: keyof TipoImpuestoFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  // Manejar filtro de tipos de impuesto
  const handleTipoImpuestoFilterChange = (tipo: TipoImpuestoEnum, checked: boolean) => {
    setFilters(prev => {
      const current = prev.tipos_impuesto || [];
      if (checked) {
        return { ...prev, tipos_impuesto: [...current, tipo] };
      } else {
        return { ...prev, tipos_impuesto: current.filter(t => t !== tipo) };
      }
    });
  };

  // Manejar edición
  const handleEdit = (tipoImpuesto: TipoImpuesto) => {
    setSelectedTipoImpuesto(tipoImpuesto);
    setOpenEdit(true);
  };

  // Manejar eliminación
  const handleDelete = (tipoImpuesto: TipoImpuesto) => {
    setSelectedTipoImpuesto(tipoImpuesto);
    setOpenDelete(true);
  };

  // Formatear valor de tarifa
  const formatValorTarifa = (valor: number | string | null | undefined, tipoTarifa: TipoTarifaEnum) => {
    const numValue = typeof valor === 'string' ? parseFloat(valor) : (valor || 0);
    if (isNaN(numValue)) return { value: '0.00', suffix: tipoTarifa === 'Porcentaje' ? '%' : '$' };
    
    return {
      value: numValue.toFixed(2),
      suffix: tipoTarifa === 'Porcentaje' ? '%' : '$',
      isPorcentaje: tipoTarifa === 'Porcentaje'
    };
  };

  // Formatear fecha
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return { fecha: '-', hora: '' };
    const date = new Date(dateStr);
    return {
      fecha: date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hora: date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Obtener ícono por tipo
  const getTipoIcon = (tipo: TipoImpuestoEnum) => {
    const icons: Record<TipoImpuestoEnum, string> = {
      'IVA': '💰',
      'ICE': '🍺',
      'IRBPNR': '♻️',
    };
    return icons[tipo] || '📄';
  };

  // Renderizar sort icon
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Generar páginas para paginación
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="tipos-impuesto-page">
      {/* Header */}
      <div className="tipos-impuesto-header">
        <h1>
          <span className="icon">🧾</span>
          Tipos de Impuesto
        </h1>
        <button className="btn-nuevo" onClick={() => setOpenCreate(true)}>
          <span>➕</span>
          Nuevo Tipo de Impuesto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon iva">💰</div>
          <div className="stat-info">
            <h3>{stats.iva}</h3>
            <p>Tipos IVA</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon ice">🍺</div>
          <div className="stat-info">
            <h3>{stats.ice}</h3>
            <p>Tipos ICE</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon irbpnr">♻️</div>
          <div className="stat-info">
            <h3>{stats.irbpnr}</h3>
            <p>Tipos IRBPNR</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total">📊</div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Registros</p>
          </div>
        </div>
      </div>

      {/* Panel de Filtros Colapsable */}
      <div className="filters-panel">
        <button className="filters-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
          <div className="filters-toggle-left">
            <span>🔍</span>
            <span>Filtros de Búsqueda</span>
          </div>
          <div className="filters-toggle-right">
            {activeFiltersCount > 0 && (
              <span className="active-filters-count">{activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}</span>
            )}
            <span className={`chevron-icon ${filtersOpen ? 'open' : ''}`}>▼</span>
          </div>
        </button>
        
        <div className={`filters-content ${filtersOpen ? 'open' : ''}`}>
          <div className="filters-grid">
            {/* Filtros de Fecha */}
            <div className="filter-section">
              <div className="filter-section-title">Fechas de Creación</div>
              <div className="filter-row">
                <div className="filter-input-group">
                  <label>Desde</label>
                  <input
                    type="date"
                    value={filters.fecha_creacion_desde || ''}
                    onChange={(e) => handleFilterChange('fecha_creacion_desde', e.target.value)}
                  />
                </div>
                <div className="filter-input-group">
                  <label>Hasta</label>
                  <input
                    type="date"
                    value={filters.fecha_creacion_hasta || ''}
                    onChange={(e) => handleFilterChange('fecha_creacion_hasta', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-title">Fechas de Actualización</div>
              <div className="filter-row">
                <div className="filter-input-group">
                  <label>Desde</label>
                  <input
                    type="date"
                    value={filters.fecha_actualizacion_desde || ''}
                    onChange={(e) => handleFilterChange('fecha_actualizacion_desde', e.target.value)}
                  />
                </div>
                <div className="filter-input-group">
                  <label>Hasta</label>
                  <input
                    type="date"
                    value={filters.fecha_actualizacion_hasta || ''}
                    onChange={(e) => handleFilterChange('fecha_actualizacion_hasta', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Filtro Tipo Impuesto */}
            <div className="filter-section">
              <div className="filter-section-title">Tipo de Impuesto</div>
              <div className="tipo-impuesto-checkboxes">
                {(['IVA', 'ICE', 'IRBPNR'] as TipoImpuestoEnum[]).map((tipo) => (
                  <label
                    key={tipo}
                    className={`tipo-checkbox ${tipo.toLowerCase()} ${filters.tipos_impuesto?.includes(tipo) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.tipos_impuesto?.includes(tipo) || false}
                      onChange={(e) => handleTipoImpuestoFilterChange(tipo, e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <span className="tipo-label">{tipo}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtros de Búsqueda */}
            <div className="filter-section">
              <div className="filter-section-title">Búsqueda General</div>
              <div className="filter-row">
                <div className="filter-input-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    placeholder="Buscar nombre..."
                    value={filters.nombre || ''}
                    onChange={(e) => handleFilterChange('nombre', e.target.value)}
                  />
                </div>
                <div className="filter-input-group">
                  <label>Código</label>
                  <input
                    type="text"
                    placeholder="Buscar código..."
                    value={filters.codigo || ''}
                    onChange={(e) => handleFilterChange('codigo', e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-row">
                <div className="filter-input-group">
                  <label>Valor máximo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="≤ valor"
                    value={filters.valor_tarifa_max || ''}
                    onChange={(e) => handleFilterChange('valor_tarifa_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div className="filter-input-group">
                  <label>Tipo de tarifa</label>
                  <select
                    value={filters.tipo_tarifa || ''}
                    onChange={(e) => handleFilterChange('tipo_tarifa', e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="Porcentaje">Porcentaje</option>
                    <option value="Importe fijo por unidad">Importe fijo</option>
                  </select>
                </div>
                <div className="filter-input-group">
                  <label>Estado</label>
                  <select
                    value={filters.estado || ''}
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="Activo">Activo</option>
                    <option value="Desactivado">Desactivado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="filters-actions">
            <button className="btn-clear" onClick={clearFilters}>
              <span>🗑️</span>
              Limpiar
            </button>
            <button className="btn-apply" onClick={applyFilters}>
              <span>✓</span>
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="results-info">
          Mostrando <strong>{tiposImpuesto.length}</strong> de <strong>{totalItems}</strong> registros
        </div>
        <div className="per-page-control">
          <label>Por página:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[5, 10, 15, 25, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="loading-overlay">
          <div className="tipos-loading-spinner"></div>
        </div>
      ) : tiposImpuesto.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No se encontraron tipos de impuesto</h3>
          <p>Intenta ajustar los filtros o crea un nuevo tipo de impuesto</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="impuestos-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('tipo_impuesto')}>
                  <div className="th-content">
                    Tipo {renderSortIcon('tipo_impuesto')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('nombre')}>
                  <div className="th-content">
                    Nombre {renderSortIcon('nombre')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('codigo')}>
                  <div className="th-content">
                    Código {renderSortIcon('codigo')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('valor_tarifa')}>
                  <div className="th-content">
                    Valor {renderSortIcon('valor_tarifa')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('tipo_tarifa')}>
                  <div className="th-content">
                    Tarifa {renderSortIcon('tipo_tarifa')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('estado')}>
                  <div className="th-content">
                    Estado {renderSortIcon('estado')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('created_at')}>
                  <div className="th-content">
                    Creación {renderSortIcon('created_at')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('updated_at')}>
                  <div className="th-content">
                    Actualización {renderSortIcon('updated_at')}
                  </div>
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tiposImpuesto.map((ti) => {
                const valorFormateado = formatValorTarifa(ti.valor_tarifa, ti.tipo_tarifa);
                const fechaCreacion = formatDate(ti.created_at);
                const fechaActualizacion = formatDate(ti.updated_at);
                
                return (
                  <tr key={ti.id}>
                    <td>
                      <span className={`badge-tipo ${ti.tipo_impuesto.toLowerCase()}`}>
                        <span className="badge-tipo-icon">{getTipoIcon(ti.tipo_impuesto)}</span>
                        {ti.tipo_impuesto}
                      </span>
                    </td>
                    <td><strong>{ti.nombre}</strong></td>
                    <td>{ti.codigo}</td>
                    <td>
                      <span className={`valor-tarifa ${valorFormateado.isPorcentaje ? 'porcentaje' : 'importe'}`}>
                        {valorFormateado.isPorcentaje ? '' : '$'}{valorFormateado.value}{valorFormateado.isPorcentaje ? '%' : ''}
                      </span>
                    </td>
                    <td>{ti.tipo_tarifa}</td>
                    <td>
                      <span className={`badge-estado ${ti.estado === 'Activo' ? 'activo' : 'desactivado'}`}>
                        <span className="badge-estado-dot"></span>
                        {ti.estado}
                      </span>
                    </td>
                    <td>
                      <div className="fecha-cell">
                        <div className="fecha">{fechaCreacion.fecha}</div>
                        <div className="hora">{fechaCreacion.hora}</div>
                      </div>
                    </td>
                    <td>
                      <div className="fecha-cell">
                        <div className="fecha">{fechaActualizacion.fecha}</div>
                        <div className="hora">{fechaActualizacion.hora}</div>
                      </div>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn-action edit"
                          onClick={() => handleEdit(ti)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-action delete"
                          onClick={() => handleDelete(ti)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
          >
            ««
          </button>
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            «
          </button>
          
          {getPageNumbers().map((page, idx) => (
            typeof page === 'number' ? (
              <button
                key={idx}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="pagination-info">...</span>
            )
          ))}
          
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            »
          </button>
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            »»
          </button>
        </div>
      )}

      {/* Modales */}
      {openCreate && (
        <TipoImpuestoFormModal
          onClose={() => setOpenCreate(false)}
          onSuccess={() => {
            setOpenCreate(false);
            loadTiposImpuesto();
          }}
        />
      )}

      {openEdit && selectedTipoImpuesto && (
        <TipoImpuestoFormModal
          tipoImpuesto={selectedTipoImpuesto}
          onClose={() => {
            setOpenEdit(false);
            setSelectedTipoImpuesto(null);
          }}
          onSuccess={() => {
            setOpenEdit(false);
            setSelectedTipoImpuesto(null);
            loadTiposImpuesto();
          }}
        />
      )}

      {openDelete && selectedTipoImpuesto && (
        <TipoImpuestoDeleteModal
          tipoImpuesto={selectedTipoImpuesto}
          onClose={() => {
            setOpenDelete(false);
            setSelectedTipoImpuesto(null);
          }}
          onSuccess={() => {
            setOpenDelete(false);
            setSelectedTipoImpuesto(null);
            loadTiposImpuesto();
          }}
        />
      )}
    </div>
  );
};

export default TiposImpuesto;
