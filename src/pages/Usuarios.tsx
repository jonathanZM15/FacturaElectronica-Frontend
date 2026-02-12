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
  formatEstablecimientoInfo
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

type SortField = 'cedula' | 'nombres' | 'apellidos' | 'username' | 'email' | 'estado' | 'role' | 'created_at' | 'updated_at';
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
  const [emisorInfoById, setEmisorInfoById] = React.useState<Record<string, { ruc?: string; razon_social?: string }>>({});
  const [creatorInfoById, setCreatorInfoById] = React.useState<
    Record<string, { role?: string; username?: string; nombres?: string; apellidos?: string }>
  >({});
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

  React.useEffect(() => {
    setCurrentPage((p) => (p === 1 ? p : 1));
    setSortField('created_at');
    setSortDirection('desc');
  }, [filters]);

  const usuariosListParams = React.useMemo(() => ({
    page: currentPage,
    per_page: itemsPerPage,
    search: searchQuery,
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
    emisor: filters.emisor || undefined,
    created_from: filters.dateFrom || undefined,
    created_to: filters.dateTo || undefined,
    updated_from: filters.updateDateFrom || undefined,
    updated_to: filters.updateDateTo || undefined,
  }), [currentPage, itemsPerPage, searchQuery, filters, sortField, sortDirection]);

  const usuariosCacheKey = React.useMemo(
    () => `usuarios:list:${JSON.stringify(usuariosListParams)}`,
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

  React.useEffect(() => {
    let cancelled = false;

    const loadMissingEmisores = async () => {
      const emisorIdsToFetch = Array.from(
        new Set(
          (users || [])
            .filter((u) => !!u.emisor_id && !u.emisor_ruc && !u.emisor_razon_social)
            .map((u) => String(u.emisor_id))
        )
      ).filter((id) => !emisorInfoById[id]);

      if (emisorIdsToFetch.length === 0) return;

      try {
        const results = await Promise.all(
          emisorIdsToFetch.map(async (id) => {
            try {
              const res = await emisoresApi.get(id);
              const emisorData = res.data?.data;
              return [id, { ruc: emisorData?.ruc, razon_social: emisorData?.razon_social }] as const;
            } catch {
              return [id, { ruc: undefined, razon_social: undefined }] as const;
            }
          })
        );

        if (cancelled) return;

        setEmisorInfoById((prev) => {
          const next = { ...prev };
          for (const [id, info] of results) {
            next[id] = info;
          }
          return next;
        });
      } catch {
        // Silencioso: es un enriquecimiento visual del listado
      }
    };

    loadMissingEmisores();

    return () => {
      cancelled = true;
    };
  }, [users, emisorInfoById]);

  React.useEffect(() => {
    let cancelled = false;

    const loadMissingCreators = async () => {
      const creatorIdsToFetch = Array.from(
        new Set(
          (users || [])
            .filter((u) => {
              if (!u.created_by_id) return false;
              const hasAllInline =
                !!u.created_by_role &&
                !!u.created_by_username &&
                !!u.created_by_nombres &&
                !!u.created_by_apellidos;
              return !hasAllInline;
            })
            .map((u) => String(u.created_by_id))
        )
      ).filter((id) => !creatorInfoById[id]);

      if (creatorIdsToFetch.length === 0) return;

      try {
        const results = await Promise.all(
          creatorIdsToFetch.map(async (id) => {
            try {
              const res = await usuariosApi.get(id);
              const creator = res.data?.data;
              return [
                id,
                {
                  role: creator?.role,
                  username: creator?.username,
                  nombres: creator?.nombres,
                  apellidos: creator?.apellidos,
                },
              ] as const;
            } catch {
              return [id, { role: undefined, username: undefined, nombres: undefined, apellidos: undefined }] as const;
            }
          })
        );

        if (cancelled) return;

        setCreatorInfoById((prev) => {
          const next = { ...prev };
          for (const [id, info] of results) {
            next[id] = info;
          }
          return next;
        });
      } catch {
        // Silencioso: es un enriquecimiento visual del listado
      }
    };

    loadMissingCreators();

    return () => {
      cancelled = true;
    };
  }, [users, creatorInfoById]);

  // Aplicar ordenamiento
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
  const filteredAndSortedUsers = React.useMemo(() => users, [users]);

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

  const formatDateTime = React.useCallback((dateString?: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    const date = d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  }, []);

  // Columnas principales para la tabla (simplificadas)
  const columns: Array<{
    key: keyof User;
    label: string;
    width?: number;
    sortKey?: SortField;
    render?: (row: User) => React.ReactNode;
  }> = [
    { 
      key: 'cedula', 
      label: 'Cédula', 
      width: 150,
      sortKey: 'cedula',
      render: (row) => (
        <span className="cedula-numero">{row.cedula || 'Sin cédula'}</span>
      )
    },
    { 
      key: 'nombres', 
      label: 'Nombres', 
      width: 180,
      sortKey: 'nombres',
      render: (row) => <span className="nombre-cell">{row.nombres || '-'}</span>
    },
    { 
      key: 'apellidos', 
      label: 'Apellidos', 
      width: 180,
      sortKey: 'apellidos',
      render: (row) => <span className="apellido-cell">{row.apellidos || '-'}</span>
    },
    { 
      key: 'username', 
      label: 'Usuario', 
      width: 140,
      sortKey: 'username',
      render: (row) =>
        row.id ? (
          <button
            type="button"
            className="username-link"
            onClick={() => handleOpenDetail(row)}
          >
            {row.username || '-'}
          </button>
        ) : (
          <span className="username-cell">{row.username || '-'}</span>
        )
    },
    { 
      key: 'email', 
      label: 'Email', 
      width: 260,
      sortKey: 'email',
      render: (row) => (
        <span className="email-cell">{row.email}</span>
      )
    },
    {
      key: 'emisor_ruc',
      label: 'Emisor',
      width: 300,
      render: (row) => {
        const cached = row.emisor_id ? emisorInfoById[String(row.emisor_id)] : undefined;
        const text = formatEmisorInfo(row.emisor_ruc || cached?.ruc, row.emisor_razon_social || cached?.razon_social);
        if (text === '—' || text === '-') return '-';

        return (
          <div className="emisor-info">
            {row.emisor_id ? (
              <a
                href={`/emisores/${row.emisor_id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToEmisor(row.emisor_id as any);
                }}
              >
                {text}
              </a>
            ) : (
              <span>{text}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'establecimientos',
      label: 'Establecimientos',
      width: 280,
      render: (row) => {
        const establecimientos = row.establecimientos || [];
        if (establecimientos.length === 0) return '-';

        return (
          <div className="list-items">
            {establecimientos.map((est) => {
              const label = formatEstablecimientoInfo(est.codigo, est.nombre);
              const canLink = !!row.emisor_id && !!est.id;
              return (
                <div className="list-item-link" key={String(est.id ?? est.codigo)}>
                  {canLink ? (
                    <a
                      href={`/emisores/${row.emisor_id}/establecimientos/${est.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToEstablecimiento(row.emisor_id as any, est.id as any);
                      }}
                    >
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'puntos_emision',
      label: 'Puntos de emisión',
      width: 340,
      render: (row) => {
        const puntos = row.puntos_emision || [];
        if (puntos.length === 0) return '-';

        const establecimientos = row.establecimientos || [];

        return (
          <div className="list-items">
            {puntos.map((p) => {
              const estCodigo =
                p.establecimiento_codigo ||
                establecimientos.find((e) => String(e.id) === String(p.establecimiento_id))?.codigo ||
                '—';

              const label = `${estCodigo} – ${p.codigo || '—'} – ${p.nombre || '—'}`;
              const canLink = !!row.emisor_id && !!p.establecimiento_id && !!p.id;

              return (
                <div className="list-item-link" key={String(p.id ?? `${p.establecimiento_id}-${p.codigo}`)}>
                  {canLink ? (
                    <a
                      href={`/emisores/${row.emisor_id}/establecimientos/${p.establecimiento_id}/puntos/${p.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToPuntoEmision(row.emisor_id as any, p.establecimiento_id as any, p.id as any);
                      }}
                    >
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'created_by_username',
      label: 'Usuario creador',
      width: 360,
      render: (row) => {
        const cachedCreator = row.created_by_id ? creatorInfoById[String(row.created_by_id)] : undefined;

        if (
          !row.created_by_role &&
          !row.created_by_username &&
          !row.created_by_nombres &&
          !row.created_by_apellidos &&
          !cachedCreator?.role &&
          !cachedCreator?.username &&
          !cachedCreator?.nombres &&
          !cachedCreator?.apellidos
        ) {
          return '-';
        }

        const role = (row.created_by_role || cachedCreator?.role || '—').toUpperCase();
        const username = (row.created_by_username || cachedCreator?.username || '—').toUpperCase();
        const nombres = (row.created_by_nombres || cachedCreator?.nombres || '—').toUpperCase();
        const apellidos = (row.created_by_apellidos || cachedCreator?.apellidos || '—').toUpperCase();

        return (
          <span className="creator-cell">
            <span>{role}</span>
            <span> – </span>
            {row.created_by_id ? (
              <button
                type="button"
                className="creator-link"
                onClick={() => handleOpenDetail(null, row.created_by_id)}
              >
                {username}
              </button>
            ) : (
              <span>{username}</span>
            )}
            <span>{` – ${nombres} – ${apellidos}`}</span>
          </span>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Fecha de creación',
      width: 180,
      sortKey: 'created_at',
      render: (row) => <span className="datetime-cell">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'updated_at',
      label: 'Última actualización',
      width: 200,
      sortKey: 'updated_at',
      render: (row) => <span className="datetime-cell">{formatDateTime(row.updated_at)}</span>,
    },
    { 
      key: 'role', 
      label: 'Rol',
      width: 140,
      sortKey: 'role',
      render: (row) => (
        <span 
          className="badge-rol"
          style={{
            background: {
              'administrador': 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              'distribuidor': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              'emisor': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              'gerente': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              'cajero': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
            }[row.role as string] || 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
          }}
        >
          {row.role ? row.role.charAt(0).toUpperCase() + row.role.slice(1) : '-'}
        </span>
      )
    },
    {
      key: 'estado',
      label: 'Estado',
      width: 160,
      sortKey: 'estado',
      render: (row) => {
        const labelMap: Record<string, string> = {
          nuevo: 'Nuevo',
          activo: 'Activo',
          pendiente_verificacion: 'Pendiente',
          suspendido: 'Suspendido',
          retirado: 'Retirado',
        };
        const colorMap: Record<string, string> = {
          nuevo: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          activo: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          pendiente_verificacion: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          suspendido: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
          retirado: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        };
        const estadoDescriptions: Record<string, string> = {
          nuevo: '🆕 Usuario creado, pero sin validar correo.',
          activo: '✅ Usuario con correo validado y acceso normal.',
          pendiente_verificacion: '⏳ Estado temporal cuando se solicita cambio de correo.',
          suspendido: '🚫 Acceso bloqueado temporalmente.',
          retirado: '👋 Baja formal del usuario.',
        };
        const key = (row.estado || 'nuevo') as string;
        const description = estadoDescriptions[key] || 'Estado sin descripción.';
        
        return (
          <div className="tooltip-container">
            <span 
              className="badge-estado"
              style={{ background: colorMap[key] || 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' }}
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
  ];

  // Calcular estadísticas de usuarios
  const stats = React.useMemo(() => {
    const total = users.length;
    const activos = users.filter(u => u.estado === 'activo').length;
    const nuevos = users.filter(u => u.estado === 'nuevo').length;
    const inactivos = users.filter(u => u.estado === 'suspendido' || u.estado === 'retirado').length;
    return { total, activos, nuevos, inactivos };
  }, [users]);

  // Las columnas adicionales estarán disponibles en el modal de detalle

  return (
    <div className="usuarios-page-container">
      {/* Header estilo Suscripciones */}
      <div className="usuarios-header">
        <div className="usuarios-header-left">
          <div className="usuarios-header-title">
            <span className="usuarios-header-icon">👥</span>
            <h1>Gestión de Usuarios</h1>
          </div>
          <p className="usuarios-header-subtitle">Administra los usuarios del sistema de facturación</p>
        </div>
        <div className="header-actions">
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

      {/* Tarjetas de estadísticas */}
      <div className="usuarios-stats-grid">
        <div className="usuarios-stat-card">
          <div className="usuarios-stat-icon total">📊</div>
          <div className="usuarios-stat-info">
            <span className="usuarios-stat-value">{stats.total}</span>
            <span className="usuarios-stat-label">Total Usuarios</span>
          </div>
        </div>
        <div className="usuarios-stat-card">
          <div className="usuarios-stat-icon activos">✅</div>
          <div className="usuarios-stat-info">
            <span className="usuarios-stat-value">{stats.activos}</span>
            <span className="usuarios-stat-label">Activos</span>
          </div>
        </div>
        <div className="usuarios-stat-card">
          <div className="usuarios-stat-icon nuevos">🆕</div>
          <div className="usuarios-stat-info">
            <span className="usuarios-stat-value">{stats.nuevos}</span>
            <span className="usuarios-stat-label">Nuevos</span>
          </div>
        </div>
        <div className="usuarios-stat-card">
          <div className="usuarios-stat-icon inactivos">⚠️</div>
          <div className="usuarios-stat-info">
            <span className="usuarios-stat-value">{stats.inactivos}</span>
            <span className="usuarios-stat-label">Suspendidos/Retirados</span>
          </div>
        </div>
      </div>

      {/* Filtros de búsqueda colapsables */}
      <div className="usuarios-filters-section">
        <button 
          className="usuarios-filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="usuarios-filters-toggle-left">
            <span>🔍</span>
            <span>Filtros de Búsqueda</span>
          </div>
          <span className={`usuarios-filters-toggle-icon ${showFilters ? 'expanded' : ''}`}>▼</span>
        </button>

        {showFilters && (
          <div className="usuarios-filters-content">
            <div className="usuarios-filters-grid">
            <div className="usuarios-filter-group">
              <label>🔢 Cédula</label>
              <input
                type="text"
                value={filters.cedula}
                onChange={(e) => setFilters({...filters, cedula: e.target.value})}
                placeholder="Buscar por cédula"
              />
            </div>

            <div className="usuarios-filter-group">
              <label>👤 Nombres</label>
              <input
                type="text"
                value={filters.nombres}
                onChange={(e) => setFilters({...filters, nombres: e.target.value})}
                placeholder="Buscar por nombres"
              />
            </div>

            <div className="usuarios-filter-group">
              <label>👥 Apellidos</label>
              <input
                type="text"
                value={filters.apellidos}
                onChange={(e) => setFilters({...filters, apellidos: e.target.value})}
                placeholder="Buscar por apellidos"
              />
            </div>

            <div className="usuarios-filter-group">
              <label>📝 Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => setFilters({...filters, username: e.target.value})}
                placeholder="Buscar por username"
              />
            </div>

            <div className="usuarios-filter-group">
              <label>📧 Email</label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => setFilters({...filters, email: e.target.value})}
                placeholder="Buscar por email"
              />
            </div>

            <div className="usuarios-filter-group">
              <label>🏢 Emisor</label>
              <input
                type="text"
                value={filters.emisor}
                onChange={(e) => setFilters({...filters, emisor: e.target.value})}
                placeholder="RUC o razón social"
              />
            </div>

            <div className="usuarios-filter-group">
              <label>🏪 Establecimiento</label>
              <input
                type="text"
                value={filters.establishment}
                onChange={(e) => setFilters({...filters, establishment: e.target.value})}
                placeholder="Código o nombre"
              />
            </div>

            <div className="usuarios-filter-group">
              <label>✍️ Usuario creador</label>
              <input
                type="text"
                value={filters.creator}
                onChange={(e) => setFilters({...filters, creator: e.target.value})}
                placeholder="Buscar por creador"
              />
            </div>

            <div className="usuarios-filter-group roles-filter">
              <label>🎭 Roles</label>
              <div className="usuarios-checkbox-group">
                {['administrador', 'distribuidor', 'emisor', 'gerente', 'cajero'].map(role => (
                  <label key={role} className="usuarios-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={filters.roles.includes(role)}
                      onChange={() => toggleRoleFilter(role)}
                    />
                    <span className={`usuarios-role-tag ${role}`}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="usuarios-filter-group estados-filter">
              <label>📊 Estados</label>
              <div className="usuarios-checkbox-group">
                {['nuevo', 'activo', 'pendiente_verificacion', 'suspendido', 'retirado'].map(estado => (
                  <label key={estado} className="usuarios-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={filters.estados.includes(estado)}
                      onChange={() => toggleEstadoFilter(estado)}
                    />
                    <span className={`usuarios-estado-tag ${estado}`}>
                      {estado === 'pendiente_verificacion' ? 'Pendiente' : estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="usuarios-filter-group">
              <label>📅 Fecha creación desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>

            <div className="usuarios-filter-group">
              <label>📅 Fecha creación hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>

            <div className="usuarios-filter-group">
              <label>🔄 Actualización desde</label>
              <input
                type="date"
                value={filters.updateDateFrom}
                onChange={(e) => setFilters({...filters, updateDateFrom: e.target.value})}
              />
            </div>

            <div className="usuarios-filter-group">
              <label>🔄 Actualización hasta</label>
              <input
                type="date"
                value={filters.updateDateTo}
                onChange={(e) => setFilters({...filters, updateDateTo: e.target.value})}
              />
            </div>
          </div>

          <div className="usuarios-filters-actions">
            <button onClick={clearFilters} className="btn-clear-filters">
              🗑️ Limpiar filtros
            </button>
          </div>
          </div>
        )}
      </div>

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
      {loadingUsuarios ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
          <LoadingSpinner size={48} />
        </div>
      ) : (
      <div className="usuarios-table-container">
        <div className="usuarios-table-wrapper">
          <table className="usuarios-table">
            <thead>
              <tr>
                {columns.map(col => {
                  const sortable = !!col.sortKey;
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width, cursor: sortable ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (!sortable) return;
                        handleSort(col.sortKey!);
                      }}
                      title={sortable ? 'Ordenar' : undefined}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {col.label}
                        {sortable ? <span style={{ opacity: 0.9 }}>{getSortIcon(col.sortKey!)}</span> : null}
                      </span>
                    </th>
                  );
                })}
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
          <tbody>
            {filteredAndSortedUsers.length === 0 ? (
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
      )}

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
