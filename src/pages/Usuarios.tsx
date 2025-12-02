import React from 'react';
import './Emisores.css'; // Reutilizar estilos de Emisores
import './UsuariosModern.css'; // Estilos modernos para usuarios
import { usuariosApi } from '../services/usuariosApi';
import UsuarioFormModal from './UsuarioFormModal';
import UsuarioDetailModal from './UsuarioDetailModal';
import { User } from '../types/user';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';

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

const Usuarios: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [totalItems, setTotalItems] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { show } = useNotification();
  const [openNew, setOpenNew] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingUserId, setDeletingUserId] = React.useState<number | string | null>(null);
  const [deletingUserName, setDeletingUserName] = React.useState<string>('');
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [openDetail, setOpenDetail] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Cargar usuarios
  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await usuariosApi.list({
        page: currentPage,
        per_page: itemsPerPage,
        search: searchQuery,
      });
      
      const data = response.data as ListResponse;
      setUsers(data.data);
      setTotalItems(data.meta.total);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error cargando usuarios';
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, show]);

  // Cargar en el primer render y cuando cambien los filtros
  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Crear usuario
  const handleCreate = async (newData: User & { password_confirmation?: string }) => {
    try {
      await usuariosApi.create(newData);
      show({ title: 'Éxito', message: 'Usuario creado exitosamente', type: 'success' });
      setOpenNew(false);
      setCurrentPage(1);
      await loadUsers();
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
      await loadUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error actualizando usuario';
      show({ title: 'Error', message: msg, type: 'error' });
    }
  };

  // Eliminar usuario
  const handleDelete = async (id: number | string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await usuariosApi.delete(id, '');
      show({ title: 'Éxito', message: 'Usuario eliminado exitosamente', type: 'success' });
      await loadUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error eliminando usuario';
      show({ title: 'Error', message: msg, type: 'error' });
    }
  };

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
          onClick={() => {
            setSelectedUser(row);
            setOpenDetail(true);
          }}
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
              'administrador': '#ef4444',
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
      width: 180,
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
          suspendido: '#ef4444',
          retirado: '#6b7280',
        };
        const key = (row.estado || 'nuevo') as string;
        return (
          <span 
            className="badge-estado"
            style={{
              background: colorMap[key] || '#9ca3af'
            }}
          >
            {labelMap[key] || row.estado}
          </span>
        );
      }
    },
    {
      key: 'id' as keyof User,
      label: 'Detalle',
      width: 100,
      render: (row) => {
        const estadoDescriptions: Record<string, string> = {
          nuevo: '👤 Usuario recién creado. Aún no ha verificado su email ni configurado su contraseña.',
          activo: '✅ Usuario activo. Ha verificado su email y puede acceder al sistema sin restricciones.',
          pendiente_verificacion: '⏳ Usuario pendiente de verificación. Debe verificar su email para activar su cuenta.',
          suspendido: '🚫 Usuario suspendido. No puede acceder al sistema temporalmente por decisión administrativa.',
          retirado: '👋 Usuario retirado. Ya no forma parte del sistema y no tiene acceso.',
        };
        const estado = (row.estado || 'nuevo') as string;
        const description = estadoDescriptions[estado] || 'Estado sin descripción disponible.';
        
        return (
          <div className="tooltip-container">
            <svg 
              className="info-icon" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div className="tooltip-content">
              {description}
            </div>
          </div>
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
  ];

  return (
    <div className="usuarios-page-container">
      <div className="usuarios-header">
        <h1>Gestión de Usuarios</h1>
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
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '20px' }}>
                  <LoadingSpinner message="Cargando usuarios…" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              users.map(user => (
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
                        title="Editar"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-action btn-eliminar"
                        onClick={() => user.id && handleDelete(user.id)}
                        title="Eliminar"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
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
        <div className="usuarios-pagination">
          <div className="pagination-left">
            <span style={{ marginRight: '8px' }}>Filas por página:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="pagination-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
            <span className="pagination-info-text" style={{ marginLeft: '16px' }}>
              {totalItems > 0 ? `${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems}` : '0-0 de 0'}
            </span>
          </div>
          <div className="pagination-center">
            <button
              className="btn-pagination"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="Primera página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
            <button
              className="btn-pagination"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              title="Página anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="pagination-info">
              Página {currentPage} de {totalPages || 1}
            </span>
            <button
              className="btn-pagination"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              title="Página siguiente"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              className="btn-pagination"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              title="Última página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
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
        onClose={() => {
          setOpenDetail(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default Usuarios;
