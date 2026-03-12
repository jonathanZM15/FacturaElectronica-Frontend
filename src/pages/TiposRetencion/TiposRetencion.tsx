import React, { useState, useEffect, useCallback } from 'react';
import { tiposRetencionApi, TipoRetencion, TipoRetencionFilters, TIPOS_RETENCION, TipoRetencionEnum } from '../../services/tiposRetencionApi';
import { useNotification } from '../../contexts/NotificationContext';
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
  const [appliedFilters, setAppliedFilters] = useState<TipoRetencionFilters>({});
  
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
      
      const response = await tiposRetencionApi.getAll({
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_dir: sortDir,
        filters: appliedFilters,
      });
      
      setTiposRetencion(response.data);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.last_page);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      show({ type: 'error', title: 'Error', message: 'Error al cargar tipos de retención: ' + errorMessage });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortDir, appliedFilters, show]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cargar stats considerando filtros aplicados
  useEffect(() => {
    tiposRetencionApi.getAll({ 
      per_page: 1000,
      filters: appliedFilters,
    }).then(allResponse => {
      const allData = allResponse.data;
      setStats({
        iva: allData.filter((t: any) => t.tipo_retencion === 'IVA').length,
        renta: allData.filter((t: any) => t.tipo_retencion === 'RENTA').length,
        isd: allData.filter((t: any) => t.tipo_retencion === 'ISD').length,
        total: allData.length,
      });
    }).catch(() => {});
  }, [appliedFilters]);

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
    setFilters(prev => {
      const current = prev.tipos_retencion || [];
      const updated = current.includes(tipo) 
        ? current.filter(t => t !== tipo) 
        : [...current, tipo];
      return { ...prev, tipos_retencion: updated.length > 0 ? updated : undefined };
    });
  };

  const handleFilterChange = (key: keyof TipoRetencionFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setSortBy('nombre');
    setSortDir('asc');
  };

  const handleLimpiarFiltros = () => {
    setFilters({});
    setAppliedFilters({});
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
    (appliedFilters.tipos_retencion?.length ?? 0) > 0,
    appliedFilters.nombre,
    appliedFilters.codigo,
    appliedFilters.fecha_creacion_desde,
    appliedFilters.fecha_creacion_hasta,
    appliedFilters.fecha_actualizacion_desde,
    appliedFilters.fecha_actualizacion_hasta,
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
      <div className="ret-filters-panel">
        <button className="ret-filters-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
          <div className="ret-filters-toggle-left">
            <span className="ret-filters-toggle-icon">🔍</span>
            <span className="ret-filters-toggle-label">Filtros de Búsqueda</span>
          </div>
          <div className="ret-filters-toggle-right">
            {activeFiltersCount > 0 && (
              <span className="ret-active-badge">{activeFiltersCount}</span>
            )}
            <span className={`ret-chevron ${filtersOpen ? 'open' : ''}`}>▼</span>
          </div>
        </button>
        
        <div className={`ret-filters-body ${filtersOpen ? 'open' : ''}`}>
          <div className="ret-filters-content">
            {/* Fila superior: Tipo + Búsqueda + Fecha Creación */}
            <div className="ret-filters-row-top">
              <div className="ret-filter-card">
                <div className="ret-filter-card-header">
                  <span className="ret-filter-card-icon tipo">📋</span>
                  <span className="ret-filter-card-title">Tipo de Retención</span>
                </div>
                <div className="ret-filter-card-body">
                  <div className="ret-tipo-chips">
                    {TIPOS_RETENCION.map((tipo) => {
                      const isChecked = filters.tipos_retencion?.includes(tipo) || false;
                      const icons: Record<string, string> = { IVA: '🧾', RENTA: '💰', ISD: '🌍' };
                      return (
                        <label
                          key={tipo}
                          className={`ret-tipo-chip ${tipo.toLowerCase()} ${isChecked ? 'active' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTipoToggle(tipo)}
                          />
                          <span className="ret-chip-icon">{icons[tipo]}</span>
                          <span className="ret-chip-label">{tipo}</span>
                          {isChecked && <span className="ret-chip-check">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="ret-filter-card">
                <div className="ret-filter-card-header">
                  <span className="ret-filter-card-icon search">🔎</span>
                  <span className="ret-filter-card-title">Búsqueda</span>
                </div>
                <div className="ret-filter-card-body">
                  <div className="ret-search-fields">
                    <div className="ret-filter-field">
                      <label>🏷️ Nombre</label>
                      <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={filters.nombre || ''}
                        onChange={(e) => handleFilterChange('nombre', e.target.value)}
                      />
                    </div>
                    <div className="ret-filter-field">
                      <label>🔢 Código</label>
                      <input
                        type="text"
                        placeholder="Buscar por código..."
                        value={filters.codigo || ''}
                        onChange={(e) => handleFilterChange('codigo', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="ret-filter-card">
                <div className="ret-filter-card-header">
                  <span className="ret-filter-card-icon calendar">📅</span>
                  <span className="ret-filter-card-title">Fecha de Creación</span>
                </div>
                <div className="ret-filter-card-body">
                  <div className="ret-filter-date-pair">
                    <div className="ret-filter-field">
                      <label>Desde</label>
                      <input
                        type="date"
                        value={filters.fecha_creacion_desde || ''}
                        onChange={(e) => handleFilterChange('fecha_creacion_desde', e.target.value)}
                      />
                    </div>
                    <span className="ret-date-separator">→</span>
                    <div className="ret-filter-field">
                      <label>Hasta</label>
                      <input
                        type="date"
                        value={filters.fecha_creacion_hasta || ''}
                        onChange={(e) => handleFilterChange('fecha_creacion_hasta', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila inferior: Fecha actualización */}
            <div className="ret-filters-row-bottom">
              <div className="ret-filter-card">
                <div className="ret-filter-card-header">
                  <span className="ret-filter-card-icon update">🔄</span>
                  <span className="ret-filter-card-title">Fecha de Actualización</span>
                </div>
                <div className="ret-filter-card-body">
                  <div className="ret-filter-date-pair">
                    <div className="ret-filter-field">
                      <label>Desde</label>
                      <input
                        type="date"
                        value={filters.fecha_actualizacion_desde || ''}
                        onChange={(e) => handleFilterChange('fecha_actualizacion_desde', e.target.value)}
                      />
                    </div>
                    <span className="ret-date-separator">→</span>
                    <div className="ret-filter-field">
                      <label>Hasta</label>
                      <input
                        type="date"
                        value={filters.fecha_actualizacion_hasta || ''}
                        onChange={(e) => handleFilterChange('fecha_actualizacion_hasta', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="ret-filters-actions">
            <button className="ret-btn-clear" onClick={handleLimpiarFiltros}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Limpiar Filtros
            </button>
            <button className="ret-btn-apply" onClick={applyFilters}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.33 4L6 11.33 2.67 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Aplicar Filtros
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
