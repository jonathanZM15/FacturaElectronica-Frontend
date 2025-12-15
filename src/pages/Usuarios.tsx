import React from 'react';
import './Emisores.css'; // Reutilizar estilos de Emisores
import './UsuariosModern.css'; // Estilos modernos para usuarios
import { usuariosApi } from '../services/usuariosApi';
import { emisoresApi } from '../services/emisoresApi';
import UsuarioFormModal from './UsuarioFormModal';
import UsuarioDetailModal from './UsuarioDetailModal';
import UsuarioDeleteModal from './UsuarioDeleteModal';
import { User } from '../types/user';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import {
  navigateToEmisor,
  navigateToEstablecimiento,
  navigateToPuntoEmision,
  formatEmisorInfo,
  formatEstablecimientoInfo,
  formatPuntoEmisionInfo,
  formatCreadorInfo,
  shouldShowCreador
} from '../helpers/navigation';

interface ListResponse {
  data: User[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

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
  emisor: string;
  dateFrom: string;
  dateTo: string;
  updateDateFrom: string;
  updateDateTo: string;
}

const Usuarios: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { show } = useNotification();
  const { user: currentUser } = useUser();
  const [openNew, setOpenNew] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [openDelete, setOpenDelete] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
  const [openDetail, setOpenDetail] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
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
    emisor: '',
    dateFrom: '',
    dateTo: '',
    updateDateFrom: '',
    updateDateTo: ''
  });

  const usuariosListParams = React.useMemo(() => ({
    page: currentPage,
    per_page: itemsPerPage,
    search: searchQuery,
  }), [currentPage, itemsPerPage, searchQuery]);

  const usuariosCacheKey = React.useMemo(
    () => `usuarios:list:${usuariosListParams.page}:${usuariosListParams.per_page}:${usuariosListParams.search || ''}`,
    [usuariosListParams]
  );

  const fetchUsuarios = React.useCallback(async () => {
    const response = await usuariosApi.list(usuariosListParams);
    return response.data as ListResponse;
  }, [usuariosListParams]);

  const {
    data: usuariosResponse,
    loading: loadingUsuarios,
    error: usuariosError,
    refetch: refetchUsuarios,
  } = useRealtimeResource<ListResponse>({
    cacheKey: usuariosCacheKey,
    fetcher: fetchUsuarios,
    interval: 15000,
    ttl: 1000 * 10,
    enabled: true,
    useCacheOnMount: true,
  });

  React.useEffect(() => {
    if (!usuariosError) return;
    const msg =
      (usuariosError as any)?.response?.data?.message ||
      (usuariosError as Error)?.message ||
      'Error cargando usuarios';
    show({ title: 'Error', message: msg, type: 'error' });
  }, [usuariosError, show]);

  const users = usuariosResponse?.data ?? [];
  const totalItems = usuariosResponse?.meta?.total ?? 0;

  // Aplicar filtros locales
  const applyFilters = (data: User[]): User[] => {
    return data.filter((u) => {
      if (filters.cedula && !u.cedula?.toLowerCase().includes(filters.cedula.toLowerCase())) {
        return false;
      }
      if (filters.nombres && !u.nombres?.toLowerCase().includes(filters.nombres.toLowerCase())) {
        return false;
      }
      if (filters.apellidos && !u.apellidos?.toLowerCase().includes(filters.apellidos.toLowerCase())) {
        return false;
      }
      if (filters.username && !u.username?.toLowerCase().includes(filters.username.toLowerCase())) {
        return false;
      }
      if (filters.email && !u.email?.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      if (filters.roles.length > 0 && !filters.roles.includes(u.role)) {
        return false;
      }
      if (filters.estados.length > 0 && !filters.estados.includes(u.estado || 'activo')) {
        return false;
      }
      if (filters.creator) {
        const creatorText = `${u.created_by_role || ''} ${u.created_by_username || ''} ${u.created_by_nombres || ''} ${u.created_by_apellidos || ''}`.toLowerCase();
        if (!creatorText.includes(filters.creator.toLowerCase())) {
          return false;
        }
      }
      if (filters.establishment) {
        const establishments = u.establecimientos || [];
        const hasMatch = establishments.some(est => 
          est.codigo.toLowerCase().includes(filters.establishment.toLowerCase()) ||
          est.nombre.toLowerCase().includes(filters.establishment.toLowerCase())
        );
        if (!hasMatch) return false;
      }
      if (filters.emisor) {
        const emisorText = `${u.emisor_ruc || ''} ${u.emisor_razon_social || ''}`.toLowerCase();
        if (!emisorText.includes(filters.emisor.toLowerCase())) {
          return false;
        }
      }
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

  // Aplicar ordenamiento
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
      emisor: '',
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

  /**
   * Verifica si el usuario actual puede editar/eliminar usuarios
   * Solo administrador y distribuidor tienen estos permisos
   */
  const canEditOrDeleteUser = React.useCallback((targetUser: User): boolean => {
    if (!currentUser) return false;
    
    // Solo administrador y distribuidor pueden editar/eliminar
    if (currentUser.role === 'administrador' || currentUser.role === 'distribuidor') {
      return true;
    }
    
    return false;
  }, [currentUser]);

  /**
   * Verifica si el usuario actual puede editar un usuario específico
   * Condiciones:
   *  - El usuario autenticado debe ser administrador o distribuidor
   *  - Solo se permiten ediciones sobre usuarios cuyo rol sea administrador o distribuidor
   */
  const canEditUser = React.useCallback((targetUser: User): boolean => {
    if (!currentUser) return false;

    const currentIsAllowed = currentUser.role === 'administrador' || currentUser.role === 'distribuidor';
    if (!currentIsAllowed) return false;

    const targetIsAllowed = targetUser.role === 'administrador' || targetUser.role === 'distribuidor';
    return targetIsAllowed;
  }, [currentUser]);

  /**
   * Verifica si un usuario puede ser eliminado (debe estar en estado "Nuevo")
   */
  const canDeleteUser = React.useCallback((targetUser: User): boolean => {
    if (!canEditOrDeleteUser(targetUser)) {
      return false;
    }
    
    // Solo se puede eliminar si el estado es "Nuevo"
    if (targetUser.estado !== 'nuevo') {
      return false;
    }
    
    return true;
  }, [canEditOrDeleteUser]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Aplicar filtros y ordenamiento a los usuarios cargados
  const filteredAndSortedUsers = React.useMemo(() => {
    let result = users;
    result = applyFilters(result);
    result = applySorting(result);
    return result;
  }, [users, filters, sortField, sortDirection]);

  // Crear usuario
  const handleCreate = async (newData: User & { password_confirmation?: string }) => {
    try {
      await usuariosApi.create(newData);
      show({ title: 'Éxito', message: 'Usuario creado exitosamente', type: 'success' });
      setOpenNew(false);
      setCurrentPage(1);
      await refetchUsuarios({ forceFresh: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error creando usuario';
      show({ title: 'Error', message: msg, type: 'error' });
    }
  };

  // Actualizar usuario
  const handleUpdate = async (newData: User & { password_confirmation?: string }) => {
    if (!editingUser || !editingUser.id) return;
    try {
      await usuariosApi.update(editingUser.id, newData);
      show({ title: 'Éxito', message: 'Usuario actualizado exitosamente', type: 'success' });
      setOpenEdit(false);
      setEditingUser(null);
      await refetchUsuarios({ forceFresh: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error actualizando usuario';
      show({ title: 'Error', message: msg, type: 'error' });
    }
  };

  // Abrir modal de eliminación
  const handleDelete = (user: User) => {
    // Validar que el usuario esté en estado "Nuevo"
    if (user.estado !== 'nuevo') {
      show({ 
        title: '❌ No permitido', 
        message: `Solo se pueden eliminar usuarios en estado "Nuevo". Este usuario está en estado "${user.estado}". Para cambiar su estado a "Retirado", utiliza la opción editar.`, 
        type: 'error' 
      });
      return;
    }
    
    setDeletingUser(user);
    setOpenDelete(true);
  };

  // Confirmar eliminación con contraseña
  const handleConfirmDelete = async (password: string) => {
    if (!deletingUser?.id) return;
    
    try {
      await usuariosApi.delete(deletingUser.id, password);
      show({ title: 'Éxito', message: 'Usuario eliminado exitosamente', type: 'success' });
      setOpenDelete(false);
      setDeletingUser(null);
      await refetchUsuarios({ forceFresh: true });
    } catch (err: any) {
      // El error lo maneja el modal
      throw err;
    }
  };

  const handleOpenDetail = React.useCallback(
    async (initialUser?: User | null, userIdOverride?: number | string) => {
      const targetId = userIdOverride ?? initialUser?.id;
      if (!targetId) return;

      if (initialUser) {
        setSelectedUser(initialUser);
      } else {
        setSelectedUser(null);
      }

      setOpenDetail(true);
      setDetailLoading(true);

      try {
        const response = await usuariosApi.get(targetId);
        let detailedUser: User | null = response.data?.data ?? initialUser ?? null;
        if (!detailedUser) {
          throw new Error('No se pudo cargar la información del usuario');
        }

        if (detailedUser.emisor_id) {
          try {
            const emisorResponse = await emisoresApi.get(detailedUser.emisor_id);
            const emisorData = emisorResponse.data?.data;
            if (emisorData) {
              detailedUser = {
                ...detailedUser,
                emisor_ruc: emisorData.ruc,
                emisor_razon_social: emisorData.razon_social,
                emisor_estado: emisorData.estado,
              };
            }
          } catch (emisorError) {
            console.error('Error cargando emisor asociado al usuario', emisorError);
          }
        }

        setSelectedUser(detailedUser);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Error obteniendo detalles del usuario';
        show({ title: 'Error', message: msg, type: 'error' });
        if (!initialUser) {
          setOpenDetail(false);
        }
      } finally {
        setDetailLoading(false);
      }
    },
    [show]
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const columns: Array<{
    key: keyof User;
    label: string;
    width?: number;
    render?: (row: User) => React.ReactNode;
  }> = [
    { 
      key: 'cedula', 
      label: 'Cédula', 
      width: 140,
      render: (row) => (
        <span 
          className="cedula-link"
          onClick={() => handleOpenDetail(row)}
        >
          <span className="cedula-numero">{row.cedula || 'Sin cédula'}</span>
        </span>
      )
    },
    { 
      key: 'nombres', 
      label: 'Nombres y Apellidos', 
      width: 280,
      render: (row) => `${row.nombres || ''} ${row.apellidos || ''}`.trim() || '-'
    },
    { key: 'username', label: 'Usuario', width: 180 },
    { 
      key: 'email', 
      label: 'Email', 
      width: 300,
      render: (row) => (
        <span className="email-cell">{row.email}</span>
      )
    },
    { 
      key: 'role', 
      label: 'Rol',
      width: 150,
      render: (row) => (
        <span 
          className="badge-rol"
          style={{
            background: {
              'administrador': '#7c3aed',
              'distribuidor': '#f97316',
              'emisor': '#3b82f6',
              'gerente': '#10b981',
              'cajero': '#8b5cf6'
            }[row.role as string] || '#9ca3af'
          }}
        >
          {row.role}
        </span>
      )
    },
    {
      key: 'estado',
      label: 'Estados',
      width: 200,
      render: (row) => {
        const labelMap: Record<string, string> = {
          nuevo: 'Nuevo',
          activo: 'Activo',
          pendiente_verificacion: 'Pendiente de verificación',
          suspendido: 'Suspendido',
          retirado: 'Retirado',
        };
        const colorMap: Record<string, string> = {
          nuevo: '#6366f1',
          activo: '#16a34a',
          pendiente_verificacion: '#f59e0b',
          suspendido: '#ec4899',
          retirado: '#6b7280',
        };
        const estadoDescriptions: Record<string, string> = {
          nuevo: '🆕 Usuario creado, pero sin validar correo. El nombre de usuario y el correo pueden modificarse. Sin acceso al sistema.',
          activo: '✅ Usuario con correo validado y acceso normal. El nombre de usuario se vuelve inalterable. No puede volver a estado Nuevo.',
          pendiente_verificacion: '⏳ Estado temporal cuando el usuario solicita cambio de correo. Requiere ingresar su contraseña y verificar el nuevo correo. Sin acceso al sistema.',
          suspendido: '🚫 Acceso bloqueado temporalmente por decisión de un usuario con jerarquía superior. No puede iniciar sesión hasta su reactivación.',
          retirado: '👋 Baja formal del usuario dentro del emisor (temporal o permanente). No tiene acceso. Solo puede reactivarse mediante nueva verificación de correo solicitada por el creador.',
        };
        const key = (row.estado || 'nuevo') as string;
        const description = estadoDescriptions[key] || 'Estado sin descripción disponible.';
        
        return (
          <div className="tooltip-container">
            <span 
              className="badge-estado"
              style={{
                background: colorMap[key] || '#9ca3af'
              }}
            >
              {labelMap[key] || row.estado}
            </span>
            <div className="tooltip-content">
              {description}
            </div>
          </div>
        );
      }
    },
    { 
      key: 'emisor_ruc' as keyof User, 
      label: 'Emisor', 
      width: 300,
      render: (row) => {
        if (!row.emisor_ruc && !row.emisor_razon_social) return '-';
        return (
          <div className="emisor-info">
            <a href="#" onClick={(e) => {
              e.preventDefault();
              if (row.emisor_id) {
                navigateToEmisor(row.emisor_id);
              }
            }}>
              {formatEmisorInfo(row.emisor_ruc, row.emisor_razon_social)}
            </a>
          </div>
        );
      }
    },
    { 
      key: 'establecimientos' as keyof User, 
      label: 'Establecimientos', 
      width: 250,
      render: (row) => {
        const establecimientos = row.establecimientos || [];
        if (establecimientos.length === 0) return '-';
        
        return (
          <div className="list-items">
            {establecimientos.map((est, idx) => (
              <div key={idx} className="list-item-link">
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  if (row.emisor_id) {
                    navigateToEstablecimiento(row.emisor_id, est.id);
                  }
                }}>
                  {formatEstablecimientoInfo(est.codigo, est.nombre)}
                </a>
              </div>
            ))}
          </div>
        );
      }
    },
    { 
      key: 'puntos_emision' as keyof User, 
      label: 'Puntos de Emisión', 
      width: 280,
      render: (row) => {
        const puntosEmision = row.puntos_emision || [];
        if (puntosEmision.length === 0) return '-';
        
        return (
          <div className="list-items">
            {puntosEmision.map((punto, idx) => (
              <div key={idx} className="list-item-link">
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  if (row.emisor_id && punto.establecimiento_id) {
                    navigateToPuntoEmision(row.emisor_id, punto.establecimiento_id, punto.id);
                  }
                }}>
                  {formatPuntoEmisionInfo(punto.codigo, punto.nombre)}
                </a>
              </div>
            ))}
          </div>
        );
      }
    },
    { 
      key: 'created_by_username' as keyof User, 
      label: 'Usuario creador', 
      width: 300,
      render: (row) => {
        if (!row.created_by_username) return '-';
        
        // No mostrar si el creador es Admin o Distribuidor
        if (!shouldShowCreador(row.created_by_role)) {
          return '-';
        }
        
        const creatorInfo = formatCreadorInfo(
          row.created_by_role,
          row.created_by_username,
          row.created_by_nombres,
          row.created_by_apellidos
        );
        
        return (
          <span 
            className="creator-link"
            onClick={() => {
              if (row.created_by_id) {
                handleOpenDetail(null, row.created_by_id);
              }
            }}
            style={{
              cursor: row.created_by_id ? 'pointer' : 'default',
              color: row.created_by_id ? '#6366f1' : '#64748b',
              fontWeight: 500,
              fontSize: '13px'
            }}
          >
            {creatorInfo}
          </span>
        );
      }
    },
    { 
      key: 'created_at', 
      label: 'Fecha de creación', 
      width: 180,
      render: (row) => {
        if (!row.created_at) return '-';
        const date = new Date(row.created_at);
        return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    },
    { 
      key: 'updated_at', 
      label: 'Última actualización', 
      width: 180,
      render: (row) => {
        if (!row.updated_at) return '-';
        const date = new Date(row.updated_at);
        return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    },
  ];

  return (
    <div className="usuarios-page-container">
      <div className="usuarios-header">
        <h1>Gestión de Usuarios</h1>
        <div className="header-actions">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="btn-toggle-filters"
            title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            style={{
              background: showFilters ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 24px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginRight: '12px'
            }}
          >
            🔍 {showFilters ? 'Ocultar' : 'Filtros'}
          </button>
          <button 
            className="btn-nuevo"
            onClick={() => setOpenNew(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Panel de filtros avanzados */}
      {showFilters && (
        <div className="filters-panel" style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          border: '2px solid #dee2e6',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <div className="filters-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Cédula</label>
              <input
                type="text"
                value={filters.cedula}
                onChange={(e) => setFilters({...filters, cedula: e.target.value})}
                placeholder="Buscar por cédula"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Nombres</label>
              <input
                type="text"
                value={filters.nombres}
                onChange={(e) => setFilters({...filters, nombres: e.target.value})}
                placeholder="Buscar por nombres"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Apellidos</label>
              <input
                type="text"
                value={filters.apellidos}
                onChange={(e) => setFilters({...filters, apellidos: e.target.value})}
                placeholder="Buscar por apellidos"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => setFilters({...filters, username: e.target.value})}
                placeholder="Buscar por username"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Email</label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => setFilters({...filters, email: e.target.value})}
                placeholder="Buscar por email"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Emisor</label>
              <input
                type="text"
                value={filters.emisor}
                onChange={(e) => setFilters({...filters, emisor: e.target.value})}
                placeholder="RUC o razón social"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Establecimiento</label>
              <input
                type="text"
                value={filters.establishment}
                onChange={(e) => setFilters({...filters, establishment: e.target.value})}
                placeholder="Código o nombre"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Usuario creador</label>
              <input
                type="text"
                value={filters.creator}
                onChange={(e) => setFilters({...filters, creator: e.target.value})}
                placeholder="Buscar por creador"
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Roles</label>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {['administrador', 'distribuidor', 'emisor', 'gerente', 'cajero'].map(role => (
                  <label key={role} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={filters.roles.includes(role)}
                      onChange={() => toggleRoleFilter(role)}
                      style={{cursor: 'pointer'}}
                    />
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Estados</label>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {['nuevo', 'activo', 'pendiente_verificacion', 'suspendido', 'retirado'].map(estado => (
                  <label key={estado} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={filters.estados.includes(estado)}
                      onChange={() => toggleEstadoFilter(estado)}
                      style={{cursor: 'pointer'}}
                    />
                    {estado === 'pendiente_verificacion' ? 'Pendiente' : estado.charAt(0).toUpperCase() + estado.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Fecha creación desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Fecha creación hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Actualización desde</label>
              <input
                type="date"
                value={filters.updateDateFrom}
                onChange={(e) => setFilters({...filters, updateDateFrom: e.target.value})}
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>

            <div className="filter-group">
              <label style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>Actualización hasta</label>
              <input
                type="date"
                value={filters.updateDateTo}
                onChange={(e) => setFilters({...filters, updateDateTo: e.target.value})}
                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
              />
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid #dee2e6'}}>
            <button onClick={clearFilters} style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 600
            }}>
              🗑️ Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="usuarios-search-container">
        <div className="usuarios-search-wrapper">
          <svg 
            className="usuarios-search-icon"
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, email o cédula..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="usuarios-search-input"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="usuarios-table-container">
        <div className="usuarios-table-wrapper">
          <table className="usuarios-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
          <tbody>
            {loadingUsuarios ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '20px' }}>
                  <LoadingSpinner message="Cargando usuarios…" />
                </td>
              </tr>
            ) : filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers.map(user => (
                <tr key={user.id}>
                  {columns.map(col => (
                    <td key={`${user.id}-${col.key}`}>
                      {col.render ? col.render(user) : (user[col.key] as any)?.toString() || '-'}
                    </td>
                  ))}
                  <td>
                    <div className="usuarios-actions">
                      <button
                        className="btn-action btn-editar"
                        onClick={() => {
                          setEditingUser(user);
                          setOpenEdit(true);
                        }}
                        disabled={!canEditUser(user)}
                        title={
                          canEditUser(user)
                            ? 'Editar'
                            : !currentUser || (currentUser.role !== 'administrador' && currentUser.role !== 'distribuidor')
                            ? 'Solo un usuario con rol Administrador o Distribuidor puede editar'
                            : 'Solo se pueden editar usuarios con rol Administrador o Distribuidor'
                        }
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-action btn-eliminar"
                        onClick={() => handleDelete(user)}
                        disabled={!canDeleteUser(user)}
                        title={
                          !canEditOrDeleteUser(user)
                            ? 'Solo administrador o distribuidor puede eliminar'
                            : user.estado !== 'nuevo'
                            ? 'Solo se pueden eliminar usuarios en estado Nuevo'
                            : 'Eliminar'
                        }
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
        
        {/* Paginación dentro de la tabla - SIEMPRE VISIBLE */}
        <div className="pagination-controls">
          <div className="pagination-info-left" style={{fontSize: '13px', color: '#374151', fontWeight: 500}}>
            Mostrando {filteredAndSortedUsers.length} de {totalItems} usuarios
          </div>
          <div className="pagination-info">
            Filas por página: 
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="items-per-page-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="page-range">
              {totalItems === 0 ? '0-0' : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}`} de {totalItems}
            </span>
          </div>
          
          <div className="pagination-buttons">
            <button 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
              title="Primera página"
              className="page-btn"
            >
              ⟪
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              title="Página anterior"
              className="page-btn"
            >
              ‹
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage >= totalPages}
              title="Página siguiente"
              className="page-btn"
            >
              ›
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage >= totalPages}
              title="Última página"
              className="page-btn"
            >
              ⟫
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      <UsuarioFormModal
        isOpen={openNew}
        initialData={null}
        onClose={() => setOpenNew(false)}
        onSubmit={handleCreate}
        isEditing={false}
      />

      <UsuarioFormModal
        isOpen={openEdit}
        initialData={editingUser}
        onClose={() => {
          setOpenEdit(false);
          setEditingUser(null);
        }}
        onSubmit={handleUpdate}
        isEditing={true}
      />

      <UsuarioDetailModal
        open={openDetail}
        user={selectedUser}
        loading={detailLoading}
        onClose={() => {
          setOpenDetail(false);
          setSelectedUser(null);
          setDetailLoading(false);
        }}
        onEdit={() => {
          if (selectedUser) {
            setEditingUser(selectedUser);
            setOpenEdit(true);
            setOpenDetail(false);
          }
        }}
        onDelete={() => {
          if (selectedUser) {
            handleDelete(selectedUser);
            setOpenDetail(false);
          }
        }}
      />

      <UsuarioDeleteModal
        isOpen={openDelete}
        onClose={() => {
          setOpenDelete(false);
          setDeletingUser(null);
        }}
        onSubmit={handleConfirmDelete}
      />
    </div>
  );
};

export default Usuarios;
