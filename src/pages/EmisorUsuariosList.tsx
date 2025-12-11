import React from 'react';
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
import './EmisorUsuarios.css';
import './UsuarioDeleteModalModern.css';

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

  const load = React.useCallback(async () => {
    if (!emiId) return;
    setLoading(true);
    try {
      const res = await usuariosEmisorApi.list(emiId, page, perPage);
      let data = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      
      // Excluir al usuario actual de la lista (emisor, gerente, cajero no deben verse a sí mismos)
      if (user?.role === 'emisor' || user?.role === 'gerente' || user?.role === 'cajero') {
        data = data.filter((u: User) => u.id !== user.id);
      }
      
      // Gerente solo ve cajeros
      if (user?.role === 'gerente') {
        data = data.filter((u: User) => u.role === 'cajero');
      }
      // Cajero no ve a nadie (lista vacía manejada por backend)
      if (user?.role === 'cajero') {
        data = [];
      }
      
      // Aplicar filtros locales
      data = applyFilters(data);
      
      // Aplicar ordenamiento
      data = applySorting(data);
      
      setUsuarios(Array.isArray(data) ? data : []);
      setTotal(meta.total || 0);
      setLastPage(meta.last_page || 1);
    } catch (e: any) {
      show({ title: 'Error', message: 'No se pudo cargar usuarios', type: 'error' });
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [emiId, page, perPage, show, user]);

  const applyFilters = (data: User[]): User[] => {
    return data.filter((u) => {
      // Filtro por cédula
      if (filters.cedula && !u.cedula?.toLowerCase().includes(filters.cedula.toLowerCase())) {
        return false;
      }
      
      // Filtro por nombres
      if (filters.nombres && !u.nombres?.toLowerCase().includes(filters.nombres.toLowerCase())) {
        return false;
      }
      
      // Filtro por apellidos
      if (filters.apellidos && !u.apellidos?.toLowerCase().includes(filters.apellidos.toLowerCase())) {
        return false;
      }
      
      // Filtro por username
      if (filters.username && !u.username?.toLowerCase().includes(filters.username.toLowerCase())) {
        return false;
      }
      
      // Filtro por email
      if (filters.email && !u.email?.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      
      // Filtro por roles (multi-select)
      if (filters.roles.length > 0 && !filters.roles.includes(u.role)) {
        return false;
      }
      
      // Filtro por estados (multi-select)
      if (filters.estados.length > 0 && !filters.estados.includes(u.estado || 'activo')) {
        return false;
      }
      
      // Filtro por creador
      if (filters.creator) {
        const creatorText = `${u.created_by_role || ''} ${u.created_by_username || ''} ${u.created_by_nombres || ''} ${u.created_by_apellidos || ''}`.toLowerCase();
        if (!creatorText.includes(filters.creator.toLowerCase())) {
          return false;
        }
      }
      
      // Filtro por establecimiento
      if (filters.establishment) {
        const establishments = u.establecimientos || [];
        const hasMatch = establishments.some(est => 
          est.codigo.toLowerCase().includes(filters.establishment.toLowerCase()) ||
          est.nombre.toLowerCase().includes(filters.establishment.toLowerCase())
        );
        if (!hasMatch) return false;
      }
      
      // Filtro por rango de fechas de creación
      if (filters.dateFrom && u.created_at) {
        const createdDate = new Date(u.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (createdDate < fromDate) return false;
      }
      
      if (filters.dateTo && u.created_at) {
        const createdDate = new Date(u.created_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (createdDate > toDate) return false;
      }
      
      // Filtro por rango de fechas de actualización
      if (filters.updateDateFrom && u.updated_at) {
        const updatedDate = new Date(u.updated_at);
        const fromDate = new Date(filters.updateDateFrom);
        if (updatedDate < fromDate) return false;
      }
      
      if (filters.updateDateTo && u.updated_at) {
        const updatedDate = new Date(u.updated_at);
        const toDate = new Date(filters.updateDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (updatedDate > toDate) return false;
      }
      
      return true;
    });
  };

  const applySorting = (data: User[]): User[] => {
    return [...data].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortField) {
        case 'cedula':
          aVal = a.cedula || '';
          bVal = b.cedula || '';
          break;
        case 'nombres':
          aVal = `${a.nombres || ''} ${a.apellidos || ''}`;
          bVal = `${b.nombres || ''} ${b.apellidos || ''}`;
          break;
        case 'username':
          aVal = a.username || '';
          bVal = b.username || '';
          break;
        case 'email':
          aVal = a.email || '';
          bVal = b.email || '';
          break;
        case 'estado':
          aVal = a.estado || 'activo';
          bVal = b.estado || 'activo';
          break;
        case 'role':
          aVal = a.role || '';
          bVal = b.role || '';
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
        case 'updated_at':
          aVal = new Date(a.updated_at || 0).getTime();
          bVal = new Date(b.updated_at || 0).getTime();
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

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
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="emisor-usuarios-container">
      
      <div className="usuarios-header">
        <h3>Usuarios del emisor</h3>
        <div className="header-actions">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="btn-toggle-filters"
            title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          >
            🔍 {showFilters ? 'Ocultar' : 'Filtros'}
          </button>
          <button onClick={onOpenModal} className="btn-new-user">
            Nuevo +
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Cédula</label>
              <input
                type="text"
                value={filters.cedula}
                onChange={(e) => setFilters({...filters, cedula: e.target.value})}
                placeholder="Buscar por cédula"
              />
            </div>

            <div className="filter-group">
              <label>Nombres</label>
              <input
                type="text"
                value={filters.nombres}
                onChange={(e) => setFilters({...filters, nombres: e.target.value})}
                placeholder="Buscar por nombres"
              />
            </div>

            <div className="filter-group">
              <label>Apellidos</label>
              <input
                type="text"
                value={filters.apellidos}
                onChange={(e) => setFilters({...filters, apellidos: e.target.value})}
                placeholder="Buscar por apellidos"
              />
            </div>

            <div className="filter-group">
              <label>Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => setFilters({...filters, username: e.target.value})}
                placeholder="Buscar por username"
              />
            </div>

            <div className="filter-group">
              <label>Email</label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => setFilters({...filters, email: e.target.value})}
                placeholder="Buscar por email"
              />
            </div>

            <div className="filter-group">
              <label>Roles</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.roles.includes('emisor')}
                    onChange={() => toggleRoleFilter('emisor')}
                  />
                  Emisor
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.roles.includes('gerente')}
                    onChange={() => toggleRoleFilter('gerente')}
                  />
                  Gerente
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.roles.includes('cajero')}
                    onChange={() => toggleRoleFilter('cajero')}
                  />
                  Cajero
                </label>
              </div>
            </div>

            <div className="filter-group">
              <label>Estados</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.estados.includes('nuevo')}
                    onChange={() => toggleEstadoFilter('nuevo')}
                  />
                  Nuevo
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.estados.includes('activo')}
                    onChange={() => toggleEstadoFilter('activo')}
                  />
                  Activo
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.estados.includes('pendiente_verificacion')}
                    onChange={() => toggleEstadoFilter('pendiente_verificacion')}
                  />
                  Pendiente
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.estados.includes('suspendido')}
                    onChange={() => toggleEstadoFilter('suspendido')}
                  />
                  Suspendido
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={filters.estados.includes('retirado')}
                    onChange={() => toggleEstadoFilter('retirado')}
                  />
                  Retirado
                </label>
              </div>
            </div>

            <div className="filter-group">
              <label>Establecimiento</label>
              <input
                type="text"
                value={filters.establishment}
                onChange={(e) => setFilters({...filters, establishment: e.target.value})}
                placeholder="Código o nombre"
              />
            </div>

            <div className="filter-group">
              <label>Usuario creador</label>
              <input
                type="text"
                value={filters.creator}
                onChange={(e) => setFilters({...filters, creator: e.target.value})}
                placeholder="Buscar por creador"
              />
            </div>

            <div className="filter-group">
              <label>Fecha creación desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>

            <div className="filter-group">
              <label>Fecha creación hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>

            <div className="filter-group">
              <label>Actualización desde</label>
              <input
                type="date"
                value={filters.updateDateFrom}
                onChange={(e) => setFilters({...filters, updateDateFrom: e.target.value})}
              />
            </div>

            <div className="filter-group">
              <label>Actualización hasta</label>
              <input
                type="date"
                value={filters.updateDateTo}
                onChange={(e) => setFilters({...filters, updateDateTo: e.target.value})}
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

      {loading ? (
        <LoadingSpinner message="Cargando usuarios del emisor…" fullHeight />
      ) : displayUsuarios.length === 0 ? (
        <div className="empty-state">
          📭 No hay usuarios registrados para este emisor
        </div>
      ) : (
        <>
          <div className="tabla-wrapper usuarios-tabla-wrapper">
            <div className="tabla-scroll-container">
              <table className="tabla-emisores">
                <thead>
                  <tr>
                    <th className="th-sticky sticky-left-1 sortable" onClick={() => handleSort('cedula')}>
                      Cédula {getSortIcon('cedula')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('nombres')}>
                      Nombres {getSortIcon('nombres')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('username')}>
                      Username {getSortIcon('username')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('email')}>
                      Email {getSortIcon('email')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('estado')}>
                      Estado {getSortIcon('estado')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('role')}>
                      Rol {getSortIcon('role')}
                    </th>
                    <th>Establecimientos</th>
                    <th>Puntos de Emisión</th>
                    <th>Usuario creador</th>
                    <th className="sortable" onClick={() => handleSort('created_at')}>
                      Creado {getSortIcon('created_at')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('updated_at')}>
                      Actualizado {getSortIcon('updated_at')}
                    </th>
                    <th className="th-sticky sticky-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayUsuarios.map((u, index) => {
                    const isDistributorCreatorRow = !!u.isDistributorCreator;
                    const editEnabled = canEditUser(u);
                    const deleteEnabled = canDeleteUser(u);
                    
                    const roleClass = u.role === 'gerente' ? 'role-gerente' :
                                     u.role === 'cajero' ? 'role-cajero' :
                                     u.role === 'distribuidor' ? 'role-distribuidor' :
                                     'role-emisor';

                    const establecimientos = u.establecimientos || [];
                    const puntosEmision = u.puntos_emision || [];
                    
                    // Si no hay establecimientos pero sí puntos de emisión, 
                    // inferir establecimientos únicos desde los puntos
                    let displayEstablecimientos = establecimientos;
                    if (establecimientos.length === 0 && puntosEmision.length > 0) {
                      const estIdsFromPuntos = Array.from(new Set(puntosEmision.map((p: any) => p.establecimiento_id).filter(Boolean)));
                      // Crear objetos de establecimiento básicos desde los puntos
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
                        <td className="td-sticky sticky-left-1 cedula-cell">
                          {onViewDetail && u.cedula ? (
                            <a 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                onViewDetail(u);
                              }}
                              style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}
                            >
                              {u.cedula}
                            </a>
                          ) : (
                            <span>{u.cedula || '—'}</span>
                          )}
                        </td>
                        <td>
                          {u.nombres} {u.apellidos}
                          {isDistributorCreatorRow && (
                            <div className="distributor-badge">
                              Distribuidor creador
                            </div>
                          )}
                        </td>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`estado-badge estado-${u.estado?.toLowerCase() || 'activo'}`}>
                            {u.estado || 'ACTIVO'}
                          </span>
                        </td>
                        <td>
                          <span className={`role-badge ${roleClass}`}>
                            {isDistributorCreatorRow ? 'distribuidor' : u.role}
                          </span>
                        </td>
                        <td>
                          {displayEstablecimientos.length > 0 ? (
                            <div className="list-items">
                              {displayEstablecimientos.map((est: any, idx: number) => (
                                <div key={idx} className="list-item-link">
                                  <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    navigateToEstablecimiento(emiId, est.id);
                                  }}>
                                    {formatEstablecimientoInfo(est.codigo, est.nombre)}
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          {puntosEmision.length > 0 ? (
                            <div className="list-items">
                              {puntosEmision.map((punto, idx) => (
                                <div key={idx} className="list-item-link">
                                  <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    if (punto.establecimiento_id) {
                                      navigateToPuntoEmision(emiId, punto.establecimiento_id, punto.id);
                                    }
                                  }}>
                                    {formatPuntoEmisionInfo(punto.codigo, punto.nombre)}
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          {shouldShowCreador(u.created_by_role) && u.created_by_username ? (
                            <div className="creator-info">
                              <a href="#" onClick={(e) => {
                                e.preventDefault();
                                if (u.created_by_id) {
                                  // Buscar el usuario creador en la lista para mostrar su detalle
                                  // Por ahora solo mostramos el log
                                  console.log('Ver usuario creador:', u.created_by_id);
                                }
                              }}>
                                {formatCreadorInfo(u.created_by_role, u.created_by_username, u.created_by_nombres, u.created_by_apellidos)}
                              </a>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </td>
                        <td>
                          {u.updated_at ? new Date(u.updated_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </td>
                        <td className="td-sticky sticky-right">
                          <div className="acciones">
                            <button
                              disabled={!editEnabled}
                              onClick={() => onEdit?.(u)}
                              title={editEnabled ? 'Editar' : 'No tienes permisos'}
                            >
                              ✏️
                            </button>
                            <button
                              disabled={!deleteEnabled}
                              onClick={() => setDeleteConfirm(u)}
                              title={deleteEnabled ? 'Eliminar' : 'No tienes permisos'}
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

          {/* Pagination */}
          <div className="pagination-container">
            <div className="pagination-info-left">
              Mostrando {displayUsuarios.length} de {total} usuarios
            </div>
            <div className="per-page-selector">
              <span>Filas por página:</span>
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
            <div className="pagination-controls">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="pagination-btn"
              >
                ⟪
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                ‹
              </button>
              <span className="pagination-info">
                Página {page} de {lastPage}
              </span>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="pagination-btn"
              >
                ›
              </button>
              <button
                onClick={() => setPage(lastPage)}
                disabled={page === lastPage}
                className="pagination-btn"
              >
                ⟫
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>
                <span className="icon">⚠️</span>
                Eliminar usuario
              </h2>
              <button 
                className="delete-modal-close" 
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeletePassword('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              {deleteConfirm.estado !== 'nuevo' ? (
                <>
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#fef3c7', 
                    border: '1px solid #fcd34d', 
                    borderRadius: '8px', 
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, color: '#92400e', fontWeight: 500 }}>
                      ⚠️ No se puede eliminar este usuario
                    </p>
                    <p style={{ margin: '8px 0 0 0', color: '#92400e', fontSize: '14px' }}>
                      Solo se pueden eliminar usuarios en estado "Nuevo". Este usuario está en estado "<strong>{deleteConfirm.estado}</strong>".
                    </p>
                    <p style={{ margin: '8px 0 0 0', color: '#92400e', fontSize: '14px' }}>
                      Para cambiar su estado a "Retirado" o "Suspendido", utiliza la opción editar del usuario.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="delete-confirmation-text">
                    ¿Está seguro de eliminar a <strong>{deleteConfirm.nombres} {deleteConfirm.apellidos}</strong>?
                  </p>

                  <div className="delete-form-group">
                    <label htmlFor="delete-password" className="delete-form-label">
                      Ingresa tu contraseña para confirmar *
                    </label>
                    <input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="••••••••"
                      className="delete-form-input"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && deletePassword && !deleting) {
                          handleDelete(deleteConfirm);
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="delete-modal-footer">
              {deleteConfirm.estado !== 'nuevo' ? (
                <button
                  type="button"
                  className="delete-btn delete-btn-cancel"
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
                    type="button"
                    className="delete-btn delete-btn-cancel"
                    onClick={() => {
                      setDeleteConfirm(null);
                      setDeletePassword('');
                    }}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="delete-btn delete-btn-danger"
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
