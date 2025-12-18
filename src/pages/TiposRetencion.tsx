import React, { useState, useEffect, useCallback } from 'react';
import { tiposRetencionApi, TipoRetencion, TipoRetencionFilters, TIPOS_RETENCION, TipoRetencionEnum } from '../services/tiposRetencionApi';
import { useNotification } from '../contexts/NotificationContext';
import TipoRetencionFormModal from './TipoRetencionFormModal';
import TipoRetencionDeleteModal from './TipoRetencionDeleteModal';
import './TiposRetencion.css';

const TiposRetencion: React.FC = () => {
  const { show } = useNotification();
  
  // Estado de datos
  const [tiposRetencion, setTiposRetencion] = useState<TipoRetencion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Ordenamiento
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<TipoRetencionFilters>({});
  const [tiposSeleccionados, setTiposSeleccionados] = useState<TipoRetencionEnum[]>([]);
  const [nombreSearch, setNombreSearch] = useState('');
  const [codigoSearch, setCodigoSearch] = useState('');
  const [fechaCreacionDesde, setFechaCreacionDesde] = useState('');
  const [fechaCreacionHasta, setFechaCreacionHasta] = useState('');
  const [fechaActualizacionDesde, setFechaActualizacionDesde] = useState('');
  const [fechaActualizacionHasta, setFechaActualizacionHasta] = useState('');
  
  // Modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRetencion, setSelectedRetencion] = useState<TipoRetencion | undefined>(undefined);
  
  // Stats
  const [stats, setStats] = useState({ iva: 0, renta: 0, isd: 0, total: 0 });

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const currentFilters: TipoRetencionFilters = {
        ...filters,
        tipos_retencion: tiposSeleccionados.length > 0 ? tiposSeleccionados : undefined,
        nombre: nombreSearch || undefined,
        codigo: codigoSearch || undefined,
        fecha_creacion_desde: fechaCreacionDesde || undefined,
        fecha_creacion_hasta: fechaCreacionHasta || undefined,
        fecha_actualizacion_desde: fechaActualizacionDesde || undefined,
        fecha_actualizacion_hasta: fechaActualizacionHasta || undefined,
      };
      
      const response = await tiposRetencionApi.getAll({
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_dir: sortDir,
        filters: currentFilters,
      });
      
      setTiposRetencion(response.data);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.last_page);
      
      // Calcular stats
      const allResponse = await tiposRetencionApi.getAll({ per_page: 1000 });
      const allData = allResponse.data;
      setStats({
        iva: allData.filter(t => t.tipo_retencion === 'IVA').length,
        renta: allData.filter(t => t.tipo_retencion === 'RENTA').length,
        isd: allData.filter(t => t.tipo_retencion === 'ISD').length,
        total: allData.length,
      });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      show({ type: 'error', title: 'Error', message: 'Error al cargar tipos de retención: ' + errorMessage });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortDir, filters, tiposSeleccionados, nombreSearch, codigoSearch, 
      fechaCreacionDesde, fechaCreacionHasta, fechaActualizacionDesde, fechaActualizacionHasta, show]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejadores
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleTipoToggle = (tipo: TipoRetencionEnum) => {
    setTiposSeleccionados(prev => 
      prev.includes(tipo) 
        ? prev.filter(t => t !== tipo) 
        : [...prev, tipo]
    );
    setPage(1);
  };

  const handleLimpiarFiltros = () => {
    setFilters({});
    setTiposSeleccionados([]);
    setNombreSearch('');
    setCodigoSearch('');
    setFechaCreacionDesde('');
    setFechaCreacionHasta('');
    setFechaActualizacionDesde('');
    setFechaActualizacionHasta('');
    setSortBy('nombre');
    setSortDir('asc');
    setPage(1);
  };

  const handleNuevo = () => {
    setSelectedRetencion(undefined);
    setShowFormModal(true);
  };

  const handleEditar = (retencion: TipoRetencion) => {
    setSelectedRetencion(retencion);
    setShowFormModal(true);
  };

  const handleEliminar = (retencion: TipoRetencion) => {
    setSelectedRetencion(retencion);
    setShowDeleteModal(true);
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setSelectedRetencion(undefined);
    loadData();
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedRetencion(undefined);
    loadData();
  };

  // Contar filtros activos
  const activeFiltersCount = [
    tiposSeleccionados.length > 0,
    nombreSearch,
    codigoSearch,
    fechaCreacionDesde,
    fechaCreacionHasta,
    fechaActualizacionDesde,
    fechaActualizacionHasta,
  ].filter(Boolean).length;

  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-EC'),
      time: date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // Renderizar paginación
  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(
        <button key={1} className="retencion-pagination-btn" onClick={() => setPage(1)}>1</button>
      );
      if (start > 2) {
        pages.push(<span key="ellipsis1" className="retencion-pagination-ellipsis">...</span>);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          className={`retencion-pagination-btn ${page === i ? 'active' : ''}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="retencion-pagination-ellipsis">...</span>);
      }
      pages.push(
        <button key={totalPages} className="retencion-pagination-btn" onClick={() => setPage(totalPages)}>
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="tipos-retencion-page">
      {/* Header */}
      <div className="tipos-retencion-header">
        <h1>
          <span className="icon">📋</span>
          Tipos de Retención
        </h1>
        <button className="retencion-btn-nuevo" onClick={handleNuevo}>
          <span>➕</span>
          Nuevo Tipo de Retención
        </button>
      </div>

      {/* Stats */}
      <div className="retencion-stats-row">
        <div className="retencion-stat-card">
          <div className="retencion-stat-icon iva">🧾</div>
          <div className="retencion-stat-info">
            <h3>{stats.iva}</h3>
            <p>Retenciones IVA</p>
          </div>
        </div>
        <div className="retencion-stat-card">
          <div className="retencion-stat-icon renta">💰</div>
          <div className="retencion-stat-info">
            <h3>{stats.renta}</h3>
            <p>Retenciones Renta</p>
          </div>
        </div>
        <div className="retencion-stat-card">
          <div className="retencion-stat-icon isd">🌍</div>
          <div className="retencion-stat-info">
            <h3>{stats.isd}</h3>
            <p>Retenciones ISD</p>
          </div>
        </div>
        <div className="retencion-stat-card">
          <div className="retencion-stat-icon total">📊</div>
          <div className="retencion-stat-info">
            <h3>{stats.total}</h3>
            <p>Total Registrados</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="retencion-filters-panel">
        <button className="retencion-filters-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
          <div className="retencion-filters-toggle-left">
            <span>🔍</span>
            <span>Filtros de Búsqueda</span>
          </div>
          <div className="retencion-filters-toggle-right">
            {activeFiltersCount > 0 && (
              <span className="retencion-active-filters-count">{activeFiltersCount} activos</span>
            )}
            <span className={`retencion-chevron-icon ${filtersOpen ? 'open' : ''}`}>▼</span>
          </div>
        </button>
        
        <div className={`retencion-filters-content ${filtersOpen ? 'open' : ''}`}>
          <div className="retencion-filters-grid">
            {/* Tipo de Retención */}
            <div className="retencion-filter-section">
              <h4><span className="icon">📋</span> Tipo de Retención</h4>
              <div className="retencion-tipo-checkboxes">
                {TIPOS_RETENCION.map((tipo) => (
                  <label
                    key={tipo}
                    className={`retencion-tipo-checkbox ${tiposSeleccionados.includes(tipo) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={tiposSeleccionados.includes(tipo)}
                      onChange={() => handleTipoToggle(tipo)}
                    />
                    <span className="retencion-checkbox-icon">
                      {tiposSeleccionados.includes(tipo) ? '✓' : ''}
                    </span>
                    {tipo}
                  </label>
                ))}
              </div>
            </div>

            {/* Búsqueda por texto */}
            <div className="retencion-filter-section">
              <h4><span className="icon">🔎</span> Búsqueda</h4>
              <div className="retencion-search-inputs">
                <div className="retencion-search-input">
                  <span className="icon">🏷️</span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={nombreSearch}
                    onChange={(e) => { setNombreSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="retencion-search-input">
                  <span className="icon">🔢</span>
                  <input
                    type="text"
                    placeholder="Buscar por código..."
                    value={codigoSearch}
                    onChange={(e) => { setCodigoSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            </div>

            {/* Fecha de creación */}
            <div className="retencion-filter-section">
              <h4><span className="icon">📅</span> Fecha de Creación</h4>
              <div className="retencion-date-range">
                <div className="retencion-date-input-group">
                  <label>Desde</label>
                  <input
                    type="date"
                    value={fechaCreacionDesde}
                    onChange={(e) => { setFechaCreacionDesde(e.target.value); setPage(1); }}
                  />
                </div>
                <span className="retencion-date-separator">—</span>
                <div className="retencion-date-input-group">
                  <label>Hasta</label>
                  <input
                    type="date"
                    value={fechaCreacionHasta}
                    onChange={(e) => { setFechaCreacionHasta(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            </div>

            {/* Fecha de actualización */}
            <div className="retencion-filter-section">
              <h4><span className="icon">🔄</span> Fecha de Actualización</h4>
              <div className="retencion-date-range">
                <div className="retencion-date-input-group">
                  <label>Desde</label>
                  <input
                    type="date"
                    value={fechaActualizacionDesde}
                    onChange={(e) => { setFechaActualizacionDesde(e.target.value); setPage(1); }}
                  />
                </div>
                <span className="retencion-date-separator">—</span>
                <div className="retencion-date-input-group">
                  <label>Hasta</label>
                  <input
                    type="date"
                    value={fechaActualizacionHasta}
                    onChange={(e) => { setFechaActualizacionHasta(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="retencion-filter-actions">
            <button className="retencion-btn-limpiar" onClick={handleLimpiarFiltros}>
              <span>🗑️</span>
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="retencion-table-container">
        <div className="retencion-table-header">
          <div className="retencion-table-title">
            <span className="icon">📋</span>
            Lista de Tipos de Retención
          </div>
          <div className="retencion-table-info">
            <div className="retencion-per-page">
              <span>Mostrar:</span>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="retencion-results-count">
              Mostrando <strong>{tiposRetencion.length}</strong> de <strong>{totalItems}</strong>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="retencion-loading">
            <div className="retencion-loading-spinner"></div>
            <p>Cargando tipos de retención...</p>
          </div>
        ) : tiposRetencion.length === 0 ? (
          <div className="retencion-empty-state">
            <div className="retencion-empty-icon">📋</div>
            <h3>No se encontraron tipos de retención</h3>
            <p>No hay registros que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <>
            <div className="retencion-table-wrapper">
              <table className="retencion-table">
                <thead>
                  <tr>
                    <th 
                      className={sortBy === 'tipo_retencion' ? 'sorted' : ''} 
                      onClick={() => handleSort('tipo_retencion')}
                    >
                      Tipo
                      <span className="sort-indicator">{sortBy === 'tipo_retencion' ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}</span>
                    </th>
                    <th 
                      className={sortBy === 'nombre' ? 'sorted' : ''} 
                      onClick={() => handleSort('nombre')}
                    >
                      Nombre
                      <span className="sort-indicator">{sortBy === 'nombre' ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}</span>
                    </th>
                    <th 
                      className={sortBy === 'codigo' ? 'sorted' : ''} 
                      onClick={() => handleSort('codigo')}
                    >
                      Código
                      <span className="sort-indicator">{sortBy === 'codigo' ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}</span>
                    </th>
                    <th 
                      className={sortBy === 'porcentaje' ? 'sorted' : ''} 
                      onClick={() => handleSort('porcentaje')}
                    >
                      Porcentaje
                      <span className="sort-indicator">{sortBy === 'porcentaje' ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}</span>
                    </th>
                    <th 
                      className={sortBy === 'created_at' ? 'sorted' : ''} 
                      onClick={() => handleSort('created_at')}
                    >
                      Fecha Creación
                      <span className="sort-indicator">{sortBy === 'created_at' ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}</span>
                    </th>
                    <th 
                      className={sortBy === 'updated_at' ? 'sorted' : ''} 
                      onClick={() => handleSort('updated_at')}
                    >
                      Fecha Actualización
                      <span className="sort-indicator">{sortBy === 'updated_at' ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}</span>
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tiposRetencion.map((retencion) => {
                    const createdDate = formatDate(retencion.created_at);
                    const updatedDate = formatDate(retencion.updated_at);
                    
                    return (
                      <tr key={retencion.id}>
                        <td>
                          <span className={`retencion-tipo-badge ${retencion.tipo_retencion.toLowerCase()}`}>
                            {retencion.tipo_retencion === 'IVA' && '🧾'}
                            {retencion.tipo_retencion === 'RENTA' && '💰'}
                            {retencion.tipo_retencion === 'ISD' && '🌍'}
                            {retencion.tipo_retencion}
                          </span>
                        </td>
                        <td>{retencion.nombre}</td>
                        <td><code>{retencion.codigo}</code></td>
                        <td>
                          <span className="retencion-porcentaje">
                            {Number(retencion.porcentaje).toFixed(2)}
                            <span className="symbol">%</span>
                          </span>
                        </td>
                        <td>
                          <span className="retencion-fecha">
                            <span className="date">{typeof createdDate === 'object' ? createdDate.date : createdDate}</span>
                            <span className="time">{typeof createdDate === 'object' ? createdDate.time : ''}</span>
                          </span>
                        </td>
                        <td>
                          <span className="retencion-fecha">
                            <span className="date">{typeof updatedDate === 'object' ? updatedDate.date : updatedDate}</span>
                            <span className="time">{typeof updatedDate === 'object' ? updatedDate.time : ''}</span>
                          </span>
                        </td>
                        <td>
                          <div className="retencion-actions">
                            <button 
                              className="retencion-btn-action edit" 
                              onClick={() => handleEditar(retencion)}
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button 
                              className="retencion-btn-action delete" 
                              onClick={() => handleEliminar(retencion)}
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

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="retencion-pagination">
                <button 
                  className="retencion-pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Anterior
                </button>
                {renderPagination()}
                <button 
                  className="retencion-pagination-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      {showFormModal && (
        <TipoRetencionFormModal
          tipoRetencion={selectedRetencion}
          onClose={() => { setShowFormModal(false); setSelectedRetencion(undefined); }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDeleteModal && selectedRetencion && (
        <TipoRetencionDeleteModal
          tipoRetencion={selectedRetencion}
          onClose={() => { setShowDeleteModal(false); setSelectedRetencion(undefined); }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default TiposRetencion;
