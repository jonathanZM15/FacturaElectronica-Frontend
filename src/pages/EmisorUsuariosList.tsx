import React, { useMemo } from 'react';
import { usuariosEmisorApi } from '../services/usuariosEmisorApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import { User } from '../types/user';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  navigateToEstablecimiento,
  navigateToPuntoEmision,
  openUsuarioDetail,
  formatEstablecimientoInfo,
  formatPuntoEmisionInfo,
  formatCreadorInfo,
  shouldShowCreador
} from '../helpers/navigation';
import './EmisorUsuariosListModern.css';

interface EmisorUsuariosListProps {
  emiId: string | number;
  onEdit?: (usuario: User) => void;
  onOpenModal?: () => void;
  onViewDetail?: (usuario: User) => void;
  refreshTrigger?: number;
  distributorCreator?: User | null;
}

type DisplayUser = User & { isDistributorCreator?: boolean };

type SortField = 'cedula' | 'nombres' | 'username' | 'email' | 'estado' | 'role' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

interface Filters {
  cedula: string;
  nombres: string;
  apellidos: string;
  username: string;
  email: string;
  roles: string[];
  estados: string[];
  creator: string;
  establishment: string;
  dateFrom: string;
  dateTo: string;
  updateDateFrom: string;
  updateDateTo: string;
}

const EmisorUsuariosList: React.FC<EmisorUsuariosListProps> = ({
  emiId,
  onEdit,
  onOpenModal,
  onViewDetail,
  refreshTrigger,
  distributorCreator
}) => {
  const { show } = useNotification();
  const { user } = useUser();
  const [usuarios, setUsuarios] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);
  const [deleteConfirm, setDeleteConfirm] = React.useState<User | null>(null);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [sortField, setSortField] = React.useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<Filters>({
    cedula: '',
    nombres: '',
    apellidos: '',
    username: '',
    email: '',
    roles: [],
    estados: [],
    creator: '',
    establishment: '',
    dateFrom: '',
    dateTo: '',
    updateDateFrom: '',
    updateDateTo: ''
  });

  React.useEffect(() => {
    setPage((p) => (p === 1 ? p : 1));
    setSortField('created_at');
    setSortDirection('desc');
  }, [filters]);

  const load = React.useCallback(async () => {
    if (!emiId) return;
    setLoading(true);
    try {
      const res = await usuariosEmisorApi.list(emiId, {
        page,
        per_page: perPage,
        sort_by: sortField,
        sort_dir: sortDirection,
        cedula: filters.cedula || undefined,
        nombres: filters.nombres || undefined,
        apellidos: filters.apellidos || undefined,
        username: filters.username || undefined,
        email: filters.email || undefined,
        roles: filters.roles.length > 0 ? filters.roles : undefined,
        estados: filters.estados.length > 0 ? filters.estados : undefined,
        creator: filters.creator || undefined,
        establecimiento: filters.establishment || undefined,
        created_from: filters.dateFrom || undefined,
        created_to: filters.dateTo || undefined,
        updated_from: filters.updateDateFrom || undefined,
        updated_to: filters.updateDateTo || undefined,
      });

      let data = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};

      setUsuarios(Array.isArray(data) ? data : []);
      setTotal(meta.total || 0);
      setLastPage(meta.last_page || 1);
    } catch (e: any) {
      show({ title: 'Error', message: 'No se pudo cargar usuarios', type: 'error' });
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [emiId, page, perPage, show, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setFilters({
      cedula: '',
      nombres: '',
      apellidos: '',
      username: '',
      email: '',
      roles: [],
      estados: [],
      creator: '',
      establishment: '',
      dateFrom: '',
      dateTo: '',
      updateDateFrom: '',
      updateDateTo: ''
    });
  };

  const toggleRoleFilter = (role: string) => {
    setFilters(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const toggleEstadoFilter = (estado: string) => {
    setFilters(prev => ({
      ...prev,
      estados: prev.estados.includes(estado)
        ? prev.estados.filter(e => e !== estado)
        : [...prev.estados, estado]
    }));
  };

  React.useEffect(() => {
    load();
  }, [load, refreshTrigger, sortField, sortDirection, filters]);

  const handleDelete = async (usuario: User) => {
    // Validar que el usuario esté en estado "Nuevo"
    if (usuario.estado !== 'nuevo') {
      show({ 
        title: '❌ No permitido', 
        message: `Solo se pueden eliminar usuarios en estado "Nuevo". Este usuario está en estado "${usuario.estado}". Para cambiar su estado a "Retirado", utiliza la opción editar.`, 
        type: 'error' 
      });
      setDeleteConfirm(null);
      setDeletePassword('');
      return;
    }

    if (!deletePassword) {
      show({ title: 'Error', message: 'Ingresa tu contraseña', type: 'error' });
      return;
    }

    setDeleting(true);
    try {
      await usuariosEmisorApi.delete(emiId, usuario.id!, deletePassword);
      show({ title: 'Éxito', message: 'Usuario eliminado', type: 'success' });
      setDeleteConfirm(null);
      setDeletePassword('');
      load();
    } catch (e: any) {
      show({ title: 'Error', message: e.response?.data?.message || 'Error al eliminar', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Determina si el usuario actual puede editar/eliminar un usuario específico
   * Restricciones:
   * - Administrador: Puede editar/eliminar cualquier usuario
   * - Distribuidor: Solo usuarios de emisores que él registró
   * - Emisor: Solo gerentes y cajeros de su emisor
   * - Gerente: Solo cajeros asociados a sus establecimientos (y a sí mismo para ver)
   * - Cajero: Solo puede verse a sí mismo (sin editar/eliminar otros)
   */
  const canEditUser = React.useCallback((usuario: User) => {
    if (!user) return false;
    
    // Administrador puede editar/eliminar cualquier usuario
    if (user.role === 'administrador') {
      return true;
    }
    
    // Distribuidor puede editar/eliminar usuarios de emisores que registró
    if (user.role === 'distribuidor') {
      return true; // La restricción real está en el backend
    }
    
    // Emisor puede editar/eliminar gerentes y cajeros de su emisor
    if (user.role === 'emisor') {
      return usuario.role === 'gerente' || usuario.role === 'cajero';
    }
    
    // Gerente puede editar/eliminar cajeros asociados a sus establecimientos
    // También puede editar su propio perfil
    if (user.role === 'gerente') {
      if (usuario.id === user.id) return true; // Puede editarse a sí mismo
      if (usuario.role !== 'cajero') return false; // Solo puede editar cajeros
      
      // Verificar si el cajero está en los mismos establecimientos que el gerente
      let gerenteEsts = user.establecimientos_ids || [];
      let cajeroEsts = usuario.establecimientos_ids || [];
      
      // Parsear si es string
      if (typeof gerenteEsts === 'string') {
        try { gerenteEsts = JSON.parse(gerenteEsts); } catch { gerenteEsts = []; }
      }
      if (typeof cajeroEsts === 'string') {
        try { cajeroEsts = JSON.parse(cajeroEsts); } catch { cajeroEsts = []; }
      }
      
      // Asegurar que sean arrays
      if (!Array.isArray(gerenteEsts)) gerenteEsts = [];
      if (!Array.isArray(cajeroEsts)) cajeroEsts = [];
      
      // El cajero debe tener al menos un establecimiento en común con el gerente
      const hasCommonEst = gerenteEsts.some((estId: number | string) => 
        cajeroEsts.includes(estId) || cajeroEsts.includes(Number(estId)) || cajeroEsts.includes(String(estId))
      );
      
      return hasCommonEst;
    }
    
    // Cajero solo puede verse a sí mismo, no editar/eliminar a nadie
    if (user.role === 'cajero') {
      return false; // No puede editar ni eliminar
    }
    
    return false;
  }, [user]);

  /**
   * Determina si el usuario actual puede eliminar un usuario específico
   * Adicional a las restricciones de canEditUser, solo se puede eliminar si el estado es "Nuevo"
   */
  const canDeleteUser = React.useCallback((usuario: User) => {
    // Primero verificar si tiene permisos de edición
    if (!canEditUser(usuario)) {
      return false;
    }
    
    // Solo se puede eliminar si el estado es "Nuevo"
    if (usuario.estado !== 'nuevo') {
      return false;
    }
    
    return true;
  }, [canEditUser]);

  const displayUsuarios = React.useMemo<DisplayUser[]>(() => {
    let list: DisplayUser[] = Array.isArray(usuarios)
      ? usuarios.map((u) => ({ ...u }))
      : [];

    if (
      user?.role === 'administrador' &&
      distributorCreator &&
      distributorCreator.role === 'distribuidor'
    ) {
      const existsIndex = list.findIndex((u) => u.id === distributorCreator.id);
      const distributorRow: DisplayUser = {
        ...(distributorCreator as User),
        isDistributorCreator: true
      };
      if (existsIndex >= 0) {
        list[existsIndex] = { ...list[existsIndex], ...distributorRow };
      } else {
        list = [distributorRow, ...list];
      }
    }

    return list;
  }, [usuarios, user, distributorCreator]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="eu-sort-icon">⇅</span>;
    return <span className="eu-sort-icon active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    const activos = displayUsuarios.filter(u => u.estado === 'activo').length;
    const nuevos = displayUsuarios.filter(u => u.estado === 'nuevo').length;
    const pendientes = displayUsuarios.filter(u => u.estado === 'pendiente_verificacion').length;
    const inactivos = displayUsuarios.filter(u => u.estado === 'suspendido' || u.estado === 'retirado').length;
    const gerentes = displayUsuarios.filter(u => u.role === 'gerente').length;
    const cajeros = displayUsuarios.filter(u => u.role === 'cajero').length;
    return { total: displayUsuarios.length, activos, nuevos, pendientes, inactivos, gerentes, cajeros };
  }, [displayUsuarios]);

  const totalForDisplay = useMemo(() => {
    if (
      user?.role === 'administrador' &&
      distributorCreator &&
      distributorCreator.role === 'distribuidor'
    ) {
      const isInPage = usuarios.some((u) => u.id === distributorCreator.id);
      return total + (isInPage ? 0 : 1);
    }
    return total;
  }, [total, user, distributorCreator, usuarios]);

  // Contar filtros activos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.cedula) count++;
    if (filters.nombres) count++;
    if (filters.apellidos) count++;
    if (filters.username) count++;
    if (filters.email) count++;
    if (filters.roles.length > 0) count++;
    if (filters.estados.length > 0) count++;
    if (filters.creator) count++;
    if (filters.establishment) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.updateDateFrom || filters.updateDateTo) count++;
    return count;
  }, [filters]);

  // Obtener iniciales del usuario
  const getInitials = (u: User) => {
    const n = u.nombres?.charAt(0) || '';
    const a = u.apellidos?.charAt(0) || '';
    return (n + a).toUpperCase() || '?';
  };

  return (
    <div className="emisor-usuarios-modern">
      {/* Header */}
      <div className="eu-header">
        <div className="eu-header-left">
          <h2>👥 Usuarios del Emisor</h2>
          <p>Gestiona los usuarios asociados a este emisor</p>
        </div>
        <button onClick={onOpenModal} className="btn-nuevo-usuario">
          <span>➕</span>
          Nuevo Usuario
        </button>
      </div>

      {/* Stats Cards */}
      <div className="eu-stats-row">
        <div className="eu-stat-card">
          <div className="eu-stat-icon total">📊</div>
          <div className="eu-stat-info">
            <h3>{stats.total}</h3>
            <p>Total Usuarios</p>
          </div>
        </div>
        <div className="eu-stat-card">
          <div className="eu-stat-icon activos">✅</div>
          <div className="eu-stat-info">
            <h3>{stats.activos}</h3>
            <p>Activos</p>
          </div>
        </div>
        <div className="eu-stat-card">
          <div className="eu-stat-icon pendientes">⏳</div>
          <div className="eu-stat-info">
            <h3>{stats.pendientes + stats.nuevos}</h3>
            <p>Pendientes</p>
          </div>
        </div>
        <div className="eu-stat-card">
          <div className="eu-stat-icon gerentes">👔</div>
          <div className="eu-stat-info">
            <h3>{stats.gerentes}</h3>
            <p>Gerentes</p>
          </div>
        </div>
        <div className="eu-stat-card">
          <div className="eu-stat-icon cajeros">🧑‍💼</div>
          <div className="eu-stat-info">
            <h3>{stats.cajeros}</h3>
            <p>Cajeros</p>
          </div>
        </div>
      </div>

      {/* Panel de Filtros Colapsable */}
      <div className="eu-filters-panel">
        <button 
          className="eu-filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="eu-filters-toggle-left">
            <span>🔍</span>
            Filtros de Búsqueda
          </div>
          <div className="eu-filters-toggle-right">
            {activeFilterCount > 0 && (
              <span className="eu-active-filters-badge">{activeFilterCount} activo{activeFilterCount > 1 ? 's' : ''}</span>
            )}
            <span className={`eu-chevron ${showFilters ? 'open' : ''}`}>▼</span>
          </div>
        </button>
        
        <div className={`eu-filters-content ${showFilters ? 'open' : ''}`}>
          <div className="eu-filters-grid">
            <div className="eu-filter-group">
              <label>Cédula</label>
              <input
                type="text"
                value={filters.cedula}
                onChange={(e) => setFilters({...filters, cedula: e.target.value})}
                placeholder="Buscar por cédula..."
                className="eu-filter-input"
              />
            </div>

            <div className="eu-filter-group">
              <label>Nombres</label>
              <input
                type="text"
                value={filters.nombres}
                onChange={(e) => setFilters({...filters, nombres: e.target.value})}
                placeholder="Buscar por nombres..."
                className="eu-filter-input"
              />
            </div>

            <div className="eu-filter-group">
              <label>Apellidos</label>
              <input
                type="text"
                value={filters.apellidos}
                onChange={(e) => setFilters({...filters, apellidos: e.target.value})}
                placeholder="Buscar por apellidos..."
                className="eu-filter-input"
              />
            </div>

            <div className="eu-filter-group">
              <label>Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => setFilters({...filters, username: e.target.value})}
                placeholder="Buscar por username..."
                className="eu-filter-input"
              />
            </div>

            <div className="eu-filter-group">
              <label>Email</label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => setFilters({...filters, email: e.target.value})}
                placeholder="Buscar por email..."
                className="eu-filter-input"
              />
            </div>

            <div className="eu-filter-group">
              <label>Establecimiento</label>
              <input
                type="text"
                value={filters.establishment}
                onChange={(e) => setFilters({...filters, establishment: e.target.value})}
                placeholder="Código o nombre..."
                className="eu-filter-input"
              />
            </div>

            <div className="eu-filter-group">
              <label>Roles</label>
              <div className="eu-checkbox-group">
                {['emisor', 'gerente', 'cajero'].map(role => (
                  <label 
                    key={role}
                    className={`eu-checkbox-pill ${filters.roles.includes(role) ? 'active' : ''}`}
                  >
                    <input 
                      type="checkbox" 
                      checked={filters.roles.includes(role)}
                      onChange={() => toggleRoleFilter(role)}
                    />
                    <span className="check-icon">{filters.roles.includes(role) ? '✓' : ''}</span>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="eu-filter-group">
              <label>Estados</label>
              <div className="eu-checkbox-group">
                {[
                  { key: 'nuevo', label: 'Nuevo' },
                  { key: 'activo', label: 'Activo' },
                  { key: 'pendiente_verificacion', label: 'Pendiente' },
                  { key: 'suspendido', label: 'Suspendido' },
                  { key: 'retirado', label: 'Retirado' }
                ].map(estado => (
                  <label 
                    key={estado.key}
                    className={`eu-checkbox-pill ${filters.estados.includes(estado.key) ? 'active' : ''}`}
                  >
                    <input 
                      type="checkbox" 
                      checked={filters.estados.includes(estado.key)}
                      onChange={() => toggleEstadoFilter(estado.key)}
                    />
                    <span className="check-icon">{filters.estados.includes(estado.key) ? '✓' : ''}</span>
                    {estado.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="eu-filter-group">
              <label>Fecha Creación</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="eu-filter-input"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="eu-filter-input"
                />
              </div>
            </div>

            <div className="eu-filter-group">
              <label>Fecha Actualización</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={filters.updateDateFrom}
                  onChange={(e) => setFilters({...filters, updateDateFrom: e.target.value})}
                  className="eu-filter-input"
                />
                <input
                  type="date"
                  value={filters.updateDateTo}
                  onChange={(e) => setFilters({...filters, updateDateTo: e.target.value})}
                  className="eu-filter-input"
                />
              </div>
            </div>
          </div>

          <div className="eu-filters-actions">
            <button onClick={clearFilters} className="eu-btn-clear" disabled={activeFilterCount === 0}>
              🗑️ Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="eu-toolbar">
        <div className="eu-results-info">
          Mostrando <strong>{displayUsuarios.length}</strong> de <strong>{totalForDisplay}</strong> usuarios
        </div>
        <div className="eu-per-page">
          <span>Filas:</span>
          <select value={perPage} onChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(1);
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
        <div className="eu-loading">
          <LoadingSpinner />
        </div>
      ) : displayUsuarios.length === 0 ? (
        <div className="eu-table-wrapper">
          <div className="eu-empty-state">
            <div className="eu-empty-icon">👥</div>
            <h3>No hay usuarios registrados</h3>
            <p>No se encontraron usuarios para este emisor con los filtros aplicados.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="eu-table-wrapper">
            <div className="eu-table-scroll">
              <table className="eu-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('cedula')}>
                      <div className="eu-th-content">Cédula {getSortIcon('cedula')}</div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('nombres')}>
                      <div className="eu-th-content">Usuario {getSortIcon('nombres')}</div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('email')}>
                      <div className="eu-th-content">Email {getSortIcon('email')}</div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('estado')}>
                      <div className="eu-th-content">Estado {getSortIcon('estado')}</div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('role')}>
                      <div className="eu-th-content">Rol {getSortIcon('role')}</div>
                    </th>
                    <th>Establecimientos</th>
                    <th>Puntos de Emisión</th>
                    <th>Creador</th>
                    <th className="sortable" onClick={() => handleSort('created_at')}>
                      <div className="eu-th-content">Creado {getSortIcon('created_at')}</div>
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayUsuarios.map((u, index) => {
                    const isDistributorCreatorRow = !!u.isDistributorCreator;
                    const editEnabled = canEditUser(u);
                    const deleteEnabled = canDeleteUser(u);

                    const establecimientos = u.establecimientos || [];
                    const puntosEmision = u.puntos_emision || [];
                    
                    // Si no hay establecimientos pero sí puntos de emisión
                    let displayEstablecimientos = establecimientos;
                    if (establecimientos.length === 0 && puntosEmision.length > 0) {
                      const estIdsFromPuntos = Array.from(new Set(puntosEmision.map((p: any) => p.establecimiento_id).filter(Boolean)));
                      displayEstablecimientos = estIdsFromPuntos.map((estId: any) => {
                        const punto = puntosEmision.find((p: any) => p.establecimiento_id === estId);
                        return {
                          id: estId,
                          codigo: (punto as any)?.establecimiento_codigo || '???',
                          nombre: (punto as any)?.establecimiento_nombre || `Establecimiento ${estId}`,
                        };
                      });
                    }

                    return (
                      <tr
                        key={`${u.id}-${isDistributorCreatorRow ? 'distribuidor' : 'usuario'}`}
                        className={isDistributorCreatorRow ? 'distributor-row' : ''}
                      >
                        {/* Cédula */}
                        <td>
                          {onViewDetail && u.cedula ? (
                            <button 
                              className="eu-cedula-link"
                              onClick={() => onViewDetail(u)}
                            >
                              {u.cedula}
                            </button>
                          ) : (
                            <span style={{ color: '#64748b' }}>{u.cedula || '—'}</span>
                          )}
                        </td>
                        
                        {/* Usuario Info */}
                        <td>
                          <div className="eu-user-cell">
                            <div className={`eu-user-avatar ${u.role}`}>
                              {getInitials(u)}
                            </div>
                            <div className="eu-user-info">
                              <span className="eu-user-name">
                                {u.nombres} {u.apellidos}
                              </span>
                              <span className="eu-user-username">@{u.username}</span>
                              {isDistributorCreatorRow && (
                                <span className="eu-distributor-badge">Distribuidor creador</span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Email */}
                        <td>
                          <span className="eu-email" title={u.email}>{u.email}</span>
                        </td>
                        
                        {/* Estado */}
                        <td>
                          <span className={`eu-badge ${u.estado?.toLowerCase() || 'activo'}`}>
                            <span className="eu-badge-dot"></span>
                            {u.estado?.replace('_', ' ').toUpperCase() || 'ACTIVO'}
                          </span>
                        </td>
                        
                        {/* Rol */}
                        <td>
                          <span className={`eu-role-badge ${isDistributorCreatorRow ? 'distribuidor' : u.role}`}>
                            {isDistributorCreatorRow ? 'Distribuidor' : u.role}
                          </span>
                        </td>
                        
                        {/* Establecimientos */}
                        <td>
                          {displayEstablecimientos.length > 0 ? (
                            <div className="eu-links-list">
                              {displayEstablecimientos.slice(0, 3).map((est: any, idx: number) => (
                                <button 
                                  key={idx} 
                                  className="eu-link-item"
                                  onClick={() => navigateToEstablecimiento(emiId, est.id)}
                                >
                                  🏢 {est.codigo}
                                </button>
                              ))}
                              {displayEstablecimientos.length > 3 && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  +{displayEstablecimientos.length - 3} más
                                </span>
                              )}
                            </div>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        
                        {/* Puntos de Emisión */}
                        <td>
                          {puntosEmision.length > 0 ? (
                            <div className="eu-links-list">
                              {puntosEmision.slice(0, 3).map((punto: any, idx: number) => (
                                <button 
                                  key={idx} 
                                  className="eu-link-item"
                                  onClick={() => punto.establecimiento_id && navigateToPuntoEmision(emiId, punto.establecimiento_id, punto.id)}
                                >
                                  📍 {punto.codigo}
                                </button>
                              ))}
                              {puntosEmision.length > 3 && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  +{puntosEmision.length - 3} más
                                </span>
                              )}
                            </div>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        
                        {/* Creador */}
                        <td>
                          {shouldShowCreador(u.created_by_role) && u.created_by_username ? (
                            <span className="eu-creator">
                              {u.created_by_role?.charAt(0).toUpperCase()}{u.created_by_role?.slice(1)} • {u.created_by_username}
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        
                        {/* Fecha Creación */}
                        <td>
                          {u.created_at ? (
                            <div className="eu-fecha">
                              <div className="eu-fecha-date">
                                {new Date(u.created_at).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="eu-fecha-time">
                                {new Date(u.created_at).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        
                        {/* Acciones */}
                        <td>
                          <div className="eu-actions">
                            <button
                              className="eu-btn-action edit"
                              disabled={!editEnabled}
                              onClick={() => onEdit?.(u)}
                              title={editEnabled ? 'Editar' : 'No tienes permisos'}
                            >
                              ✏️
                            </button>
                            <button
                              className="eu-btn-action delete"
                              disabled={!deleteEnabled}
                              onClick={() => setDeleteConfirm(u)}
                              title={deleteEnabled ? 'Eliminar' : 'Solo estado Nuevo'}
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
          </div>

          {/* Paginación */}
          <div className="eu-pagination">
            <div className="eu-pagination-info">
              Página {page} de {lastPage} ({total} total)
            </div>
            <div className="eu-pagination-controls">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="eu-page-btn"
                title="Primera página"
              >
                ⟪
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="eu-page-btn"
                title="Anterior"
              >
                ‹
              </button>
              <span className="eu-page-info">
                {page} / {lastPage}
              </span>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="eu-page-btn"
                title="Siguiente"
              >
                ›
              </button>
              <button
                onClick={() => setPage(lastPage)}
                disabled={page === lastPage}
                className="eu-page-btn"
                title="Última página"
              >
                ⟫
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Delete */}
      {deleteConfirm && (
        <div className="eu-delete-modal-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="eu-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eu-delete-modal-header">
              <h3>⚠️ Eliminar Usuario</h3>
              <button 
                className="eu-delete-modal-close" 
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeletePassword('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="eu-delete-modal-body">
              {deleteConfirm.estado !== 'nuevo' ? (
                <div className="eu-delete-warning">
                  <p style={{ margin: 0, fontWeight: 600 }}>⚠️ No se puede eliminar este usuario</p>
                  <p style={{ margin: '8px 0 0' }}>
                    Solo se pueden eliminar usuarios en estado "Nuevo". Este usuario está en estado "<strong>{deleteConfirm.estado}</strong>".
                  </p>
                  <p style={{ margin: '8px 0 0' }}>
                    Para cambiar su estado a "Retirado" o "Suspendido", utiliza la opción editar.
                  </p>
                </div>
              ) : (
                <>
                  <div className="eu-delete-user-info">
                    <div className={`eu-delete-avatar ${deleteConfirm.role}`}>
                      {getInitials(deleteConfirm)}
                    </div>
                    <div className="eu-delete-details">
                      <h4>{deleteConfirm.nombres} {deleteConfirm.apellidos}</h4>
                      <p>@{deleteConfirm.username} • {deleteConfirm.email}</p>
                    </div>
                  </div>

                  <div className="eu-password-group">
                    <label>Ingresa tu contraseña para confirmar *</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="••••••••"
                      className="eu-password-input"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && deletePassword && !deleting) {
                          handleDelete(deleteConfirm);
                        }
                      }}
                    />
                  </div>

                  <div className="eu-delete-error" style={{ marginTop: '16px' }}>
                    ⚡ Esta acción es irreversible.
                  </div>
                </>
              )}
            </div>

            <div className="eu-delete-modal-footer">
              {deleteConfirm.estado !== 'nuevo' ? (
                <button
                  className="eu-btn-cancel"
                  onClick={() => {
                    setDeleteConfirm(null);
                    setDeletePassword('');
                  }}
                >
                  Cerrar
                </button>
              ) : (
                <>
                  <button
                    className="eu-btn-cancel"
                    onClick={() => {
                      setDeleteConfirm(null);
                      setDeletePassword('');
                    }}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>
                  <button
                    className="eu-btn-delete"
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleting || !deletePassword}
                  >
                    {deleting ? 'Eliminando...' : '🗑️ Eliminar'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmisorUsuariosList;
