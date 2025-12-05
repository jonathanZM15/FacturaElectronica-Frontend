import React from 'react';
import './Emisores.css'; // Reutilizar estilos de Emisores
import './UsuariosModern.css'; // Estilos modernos para usuarios
import { usuariosApi } from '../services/usuariosApi';
import UsuarioFormModal from './UsuarioFormModal';
import UsuarioDetailModal from './UsuarioDetailModal';
import UsuarioDeleteModal from './UsuarioDeleteModal';
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
  const [openDelete, setOpenDelete] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
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

  // Abrir modal de eliminación
  const handleDelete = (user: User) => {
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
      await loadUsers();
    } catch (err: any) {
      // El error lo maneja el modal
      throw err;
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
                        ✏️
                      </button>
                      <button
                        className="btn-action btn-eliminar"
                        onClick={() => handleDelete(user)}
                        title="Eliminar"
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
        onClose={() => {
          setOpenDetail(false);
          setSelectedUser(null);
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
