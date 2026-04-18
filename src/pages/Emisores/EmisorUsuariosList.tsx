import React, { useMemo } from 'react';
import { usuariosEmisorApi } from '../../services/usuariosEmisorApi';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/userContext';
import { User } from '../../types/user';
import LoadingSpinner from '../../components/LoadingSpinner';
import SortArrow from '../../components/SortArrow';
import {
  navigateToEstablecimiento,
  navigateToPuntoEmision,
  openUsuarioDetail,
  formatEstablecimientoInfo,
  formatPuntoEmisionInfo,
  formatCreadorInfo,
  shouldShowCreador
} from '../../helpers/navigation';
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
  const [usuariosForStats, setUsuariosForStats] = React.useState<User[]>([]);
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

  const emptyFilters: Filters = {
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
  };

  const [filters, setFilters] = React.useState<Filters>({ ...emptyFilters });
  const [appliedFilters, setAppliedFilters] = React.useState<Filters>({ ...emptyFilters });

  const load = React.useCallback(async () => {
    if (!emiId) return;
    setLoading(true);
    try {
      const res = await usuariosEmisorApi.list(emiId, {
        page,
        per_page: perPage,
        sort_by: sortField,
        sort_dir: sortDirection,
        cedula: appliedFilters.cedula || undefined,
        nombres: appliedFilters.nombres || undefined,
        apellidos: appliedFilters.apellidos || undefined,
        username: appliedFilters.username || undefined,
        email: appliedFilters.email || undefined,
        roles: appliedFilters.roles.length > 0 ? appliedFilters.roles : undefined,
        estados: appliedFilters.estados.length > 0 ? appliedFilters.estados : undefined,
        creator: appliedFilters.creator || undefined,
        establecimiento: appliedFilters.establishment || undefined,
        created_from: appliedFilters.dateFrom || undefined,
        created_to: appliedFilters.dateTo || undefined,
        updated_from: appliedFilters.updateDateFrom || undefined,
        updated_to: appliedFilters.updateDateTo || undefined,
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
  }, [emiId, page, perPage, show, appliedFilters, sortField, sortDirection]);

  const loadUsuariosForStats = React.useCallback(async () => {
    if (!emiId) return;
    try {
      const res = await usuariosEmisorApi.list(emiId, {
        page: 1,
        per_page: 10000,
        roles: appliedFilters.roles.length > 0 ? appliedFilters.roles : undefined,
        estados: appliedFilters.estados.length > 0 ? appliedFilters.estados : undefined,
      });
      let data = res.data?.data ?? [];
      setUsuariosForStats(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setUsuariosForStats([]);
    }
  }, [emiId, appliedFilters.roles, appliedFilters.estados]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setFilters({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
    setPage(1);
    setSortField('created_at');
    setSortDirection('desc');
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setSortField('created_at');
    setSortDirection('desc');
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
  }, [load, refreshTrigger]);

  React.useEffect(() => {
    loadUsuariosForStats();
  }, [loadUsuariosForStats]);

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
    return <SortArrow active={sortField === field} direction={sortDirection} />;
  };

  // Calcular estadísticas basadas en todos los usuarios
  const stats = useMemo(() => {
    const activos = usuariosForStats.filter(u => u.estado === 'activo').length;
    const nuevos = usuariosForStats.filter(u => u.estado === 'nuevo').length;
    const pendientes = usuariosForStats.filter(u => u.estado === 'pendiente_verificacion').length;
    const inactivos = usuariosForStats.filter(u => u.estado === 'suspendido' || u.estado === 'retirado').length;
    const gerentes = usuariosForStats.filter(u => u.role === 'gerente').length;
    const cajeros = usuariosForStats.filter(u => u.role === 'cajero').length;
    return { total: usuariosForStats.length, activos, nuevos, pendientes, inactivos, gerentes, cajeros };
  }, [usuariosForStats]);

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
    if (appliedFilters.cedula) count++;
    if (appliedFilters.nombres) count++;
    if (appliedFilters.apellidos) count++;
    if (appliedFilters.username) count++;
    if (appliedFilters.email) count++;
    if (appliedFilters.roles.length > 0) count++;
    if (appliedFilters.estados.length > 0) count++;
    if (appliedFilters.creator) count++;
    if (appliedFilters.establishment) count++;
    if (appliedFilters.dateFrom || appliedFilters.dateTo) count++;
    if (appliedFilters.updateDateFrom || appliedFilters.updateDateTo) count++;
    return count;
  }, [appliedFilters]);

  // Obtener iniciales del usuario
  const getInitials = (u: User) => {
    const n = u.nombres?.charAt(0) || '';
    const a = u.apellidos?.charAt(0) || '';
    return (n + a).toUpperCase() || '?';
  };

  const canCreateUsuario = Boolean(user && ['administrador', 'distribuidor', 'emisor', 'gerente'].includes(user.role));

  return (
    <div className="emisor-usuarios-modern">
      {/* Header */}
      <div className="eu-header">
        <div className="eu-header-left">
          <h2>👥 Usuarios del Emisor</h2>
          <p>Gestiona los usuarios asociados a este emisor</p>
        </div>
        {canCreateUsuario && (
          <button onClick={onOpenModal} className="btn-nuevo-usuario">
            <span>➕</span>
            Nuevo Usuario
          </button>
        )}
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
            <span className="eu-toggle-icon">🔍</span>
            <span className="eu-toggle-label">Filtros de Búsqueda</span>
          </div>
          <div className="eu-filters-toggle-right">
            {activeFilterCount > 0 && (
              <span className="eu-active-filters-badge">{activeFilterCount}</span>
            )}
            <span className={`eu-chevron ${showFilters ? 'open' : ''}`}>▼</span>
          </div>
        </button>
        
        <div className={`eu-filters-content ${showFilters ? 'open' : ''}`}>
          {/* Card 1: Datos Personales */}
          <div className="eu-fcard">
            <div className="eu-fcard-header">
              <span className="eu-fcard-icon personal">👤</span>
              <span className="eu-fcard-title">Datos Personales</span>
            </div>
            <div className="eu-fcard-body">
              <div className="eu-fcard-grid cols-4">
                <div className="eu-ffield">
                  <label>🪪 Cédula</label>
                  <input
                    type="text"
                    value={filters.cedula}
                    onChange={(e) => setFilters({...filters, cedula: e.target.value})}
                    placeholder="Buscar por cédula..."
                  />
                </div>
                <div className="eu-ffield">
                  <label>🏷️ Nombres</label>
                  <input
                    type="text"
                    value={filters.nombres}
                    onChange={(e) => setFilters({...filters, nombres: e.target.value})}
                    placeholder="Buscar por nombres..."
                  />
                </div>
                <div className="eu-ffield">
                  <label>📝 Apellidos</label>
                  <input
                    type="text"
                    value={filters.apellidos}
                    onChange={(e) => setFilters({...filters, apellidos: e.target.value})}
                    placeholder="Buscar por apellidos..."
                  />
                </div>
                <div className="eu-ffield">
                  <label>👤 Username</label>
                  <input
                    type="text"
                    value={filters.username}
                    onChange={(e) => setFilters({...filters, username: e.target.value})}
                    placeholder="Buscar por username..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contacto y Asociación */}
          <div className="eu-fcard">
            <div className="eu-fcard-header">
              <span className="eu-fcard-icon contact">📞</span>
              <span className="eu-fcard-title">Contacto y Asociación</span>
            </div>
            <div className="eu-fcard-body">
              <div className="eu-fcard-grid cols-2">
                <div className="eu-ffield">
                  <label>✉️ Email</label>
                  <input
                    type="text"
                    value={filters.email}
                    onChange={(e) => setFilters({...filters, email: e.target.value})}
                    placeholder="Buscar por email..."
                  />
                </div>
                <div className="eu-ffield">
                  <label>🏢 Establecimiento</label>
                  <input
                    type="text"
                    value={filters.establishment}
                    onChange={(e) => setFilters({...filters, establishment: e.target.value})}
                    placeholder="Código o nombre..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Roles y Estados */}
          <div className="eu-fcard">
            <div className="eu-fcard-header">
              <span className="eu-fcard-icon roles">🛡️</span>
              <span className="eu-fcard-title">Roles y Estados</span>
            </div>
            <div className="eu-fcard-body">
              <div className="eu-fcard-grid cols-2">
                <div className="eu-ffield">
                  <label>🎭 Roles</label>
                  <div className="eu-fchips-group">
                    {['emisor', 'gerente', 'cajero'].map(role => {
                      const icons: Record<string, string> = { emisor: '🏢', gerente: '👔', cajero: '💼' };
                      const isActive = filters.roles.includes(role);
                      return (
                        <label 
                          key={role}
                          className={`eu-fchip role-${role} ${isActive ? 'active' : ''}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isActive}
                            onChange={() => toggleRoleFilter(role)}
                          />
                          <span className="eu-fchip-icon">{icons[role]}</span>
                          <span className="eu-fchip-label">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                          {isActive && <span className="eu-fchip-check">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="eu-ffield">
                  <label>📊 Estados</label>
                  <div className="eu-fchips-group">
                    {[
                      { key: 'nuevo', label: 'Nuevo', icon: '🆕' },
                      { key: 'activo', label: 'Activo', icon: '✅' },
                      { key: 'pendiente_verificacion', label: 'Pendiente', icon: '⏳' },
                      { key: 'suspendido', label: 'Suspendido', icon: '⛔' },
                      { key: 'retirado', label: 'Retirado', icon: '🚪' }
                    ].map(estado => {
                      const isActive = filters.estados.includes(estado.key);
                      return (
                        <label 
                          key={estado.key}
                          className={`eu-fchip estado-${estado.key} ${isActive ? 'active' : ''}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isActive}
                            onChange={() => toggleEstadoFilter(estado.key)}
                          />
                          <span className="eu-fchip-icon">{estado.icon}</span>
                          <span className="eu-fchip-label">{estado.label}</span>
                          {isActive && <span className="eu-fchip-check">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Fechas */}
          <div className="eu-fcard">
            <div className="eu-fcard-header">
              <span className="eu-fcard-icon dates">📅</span>
              <span className="eu-fcard-title">Fechas</span>
            </div>
            <div className="eu-fcard-body">
              <div className="eu-fcard-grid cols-2">
                <div className="eu-ffield-date">
                  <label>📅 Fecha Creación</label>
                  <div className="eu-date-pair">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    />
                    <span className="eu-date-arrow">→</span>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    />
                  </div>
                </div>
                <div className="eu-ffield-date">
                  <label>🔄 Fecha Actualización</label>
                  <div className="eu-date-pair">
                    <input
                      type="date"
                      value={filters.updateDateFrom}
                      onChange={(e) => setFilters({...filters, updateDateFrom: e.target.value})}
                    />
                    <span className="eu-date-arrow">→</span>
                    <input
                      type="date"
                      value={filters.updateDateTo}
                      onChange={(e) => setFilters({...filters, updateDateTo: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="eu-filters-actions">
            <button onClick={clearFilters} className="eu-btn-clear">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Limpiar Filtros
            </button>
            <button onClick={applyFilters} className="eu-btn-apply">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.33 4L6 11.33 2.67 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Aplicar Filtros
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
            <h3>
              {activeFilterCount > 0
                ? 'No se encontraron usuarios con los filtros aplicados.'
                : 'No hay usuarios registrados'}
            </h3>
          </div>
        </div>
      ) : (
        <>
          <div className="eu-table-wrapper">
            <table className="eu-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('nombres')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Usuario {getSortIcon('nombres')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('email')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Email {getSortIcon('email')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('role')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Rol {getSortIcon('role')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('estado')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Estado {getSortIcon('estado')}
                    </span>
                  </th>
                  <th>Asignaciones</th>
                  <th onClick={() => handleSort('created_at')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Registro {getSortIcon('created_at')}
                    </span>
                  </th>
                  <th className="eu-th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayUsuarios.map((u) => {
                  const isDistributorCreatorRow = !!u.isDistributorCreator;
                  const editEnabled = canEditUser(u);
                  const deleteEnabled = canDeleteUser(u);

                  const establecimientos = u.establecimientos || [];
                  const puntosEmision = u.puntos_emision || [];
                  
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
                      {/* Usuario */}
                      <td>
                        <div className="eu-user-cell">
                          <div className={`eu-user-avatar ${isDistributorCreatorRow ? 'distribuidor' : u.role}`}>
                            {getInitials(u)}
                          </div>
                          <div className="eu-user-info">
                            <div className="eu-user-name-row">
                              {onViewDetail ? (
                                <button className="eu-user-name-link" onClick={() => onViewDetail(u)}>
                                  {u.nombres} {u.apellidos}
                                </button>
                              ) : (
                                <span className="eu-user-name">{u.nombres} {u.apellidos}</span>
                              )}
                            </div>
                            <span className="eu-user-username">@{u.username}</span>
                            {u.cedula && <span className="eu-user-cedula">🪪 {u.cedula}</span>}
                            {isDistributorCreatorRow && (
                              <span className="eu-distributor-badge">⭐ Distribuidor creador</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <span className="eu-email" title={u.email}>{u.email}</span>
                      </td>

                      {/* Rol */}
                      <td>
                        <span className={`eu-role-badge ${isDistributorCreatorRow ? 'distribuidor' : u.role}`}>
                          {isDistributorCreatorRow ? 'Distribuidor' : u.role}
                        </span>
                      </td>

                      {/* Estado */}
                      <td>
                        <span className={`eu-badge ${u.estado?.toLowerCase() || 'activo'}`}>
                          <span className="eu-badge-dot"></span>
                          {u.estado?.replace('_', ' ').toUpperCase() || 'ACTIVO'}
                        </span>
                      </td>

                      {/* Asignaciones */}
                      <td>
                        <div className="eu-assignments">
                          <div className="eu-assignment-row">
                            <span className="eu-assignment-label">🏢</span>
                            {displayEstablecimientos.length > 0 ? (
                              <div className="eu-chips">
                                {displayEstablecimientos.slice(0, 3).map((est: any, idx: number) => (
                                  <button 
                                    key={idx} 
                                    className="eu-chip"
                                    onClick={() => navigateToEstablecimiento(emiId, est.id)}
                                    title={est.nombre || `Establecimiento ${est.codigo}`}
                                  >
                                    {est.codigo}
                                  </button>
                                ))}
                                {displayEstablecimientos.length > 3 && (
                                  <span className="eu-chip-more">+{displayEstablecimientos.length - 3}</span>
                                )}
                              </div>
                            ) : <span className="eu-no-data">—</span>}
                          </div>
                          <div className="eu-assignment-row">
                            <span className="eu-assignment-label">📍</span>
                            {puntosEmision.length > 0 ? (
                              <div className="eu-chips">
                                {puntosEmision.slice(0, 3).map((punto: any, idx: number) => (
                                  <button 
                                    key={idx} 
                                    className="eu-chip punto"
                                    onClick={() => punto.establecimiento_id && navigateToPuntoEmision(emiId, punto.establecimiento_id, punto.id)}
                                    title={`Punto ${punto.codigo}`}
                                  >
                                    {punto.codigo}
                                  </button>
                                ))}
                                {puntosEmision.length > 3 && (
                                  <span className="eu-chip-more">+{puntosEmision.length - 3}</span>
                                )}
                              </div>
                            ) : <span className="eu-no-data">—</span>}
                          </div>
                        </div>
                      </td>

                      {/* Registro */}
                      <td>
                        <div className="eu-registro-cell">
                          {shouldShowCreador(u.created_by_role) && u.created_by_username ? (
                            <div className="eu-creator-info">
                              {u.created_by_id && onViewDetail ? (
                                <button 
                                  className="eu-creator-link"
                                  onClick={() => {
                                    // Intentar obtener el usuario creador como objeto completo
                                    const creator = usuarios.find(us => us.id === u.created_by_id);
                                    if (creator) {
                                      onViewDetail(creator);
                                    }
                                  }}
                                  title={`Ver ${u.created_by_username}`}
                                >
                                  <span className="eu-creator-role">{u.created_by_role?.charAt(0).toUpperCase()}{u.created_by_role?.slice(1)}</span>
                                  <span className="eu-creator-name">{u.created_by_username}</span>
                                </button>
                              ) : (
                                <div>
                                  <span className="eu-creator-role">{u.created_by_role?.charAt(0).toUpperCase()}{u.created_by_role?.slice(1)}</span>
                                  <span className="eu-creator-name">{u.created_by_username}</span>
                                </div>
                              )}
                            </div>
                          ) : null}
                          {u.created_at && (
                            <div className="eu-date-info">
                              <span>{new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <span className="eu-date-time">{new Date(u.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="eu-actions">
                          <button
                            className="eu-btn-action edit"
                            disabled={!editEnabled}
                            onClick={() => onEdit?.(u)}
                            title={editEnabled ? 'Editar usuario' : 'No tienes permisos'}
                          >
                            ✏️
                          </button>
                          <button
                            className="eu-btn-action delete"
                            disabled={!deleteEnabled}
                            onClick={() => setDeleteConfirm(u)}
                            title={deleteEnabled ? 'Eliminar usuario' : 'Solo estado Nuevo'}
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
