import React from 'react';
import './Emisores.css'; // Reutilizar estilos de Emisores
import { usuariosApi } from '../services/usuariosApi';
import UsuarioFormModal from './UsuarioFormModal';
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
  const [itemsPerPage] = React.useState(10);
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
      width: 120,
      render: (row) => row.cedula || '-'
    },
    { 
      key: 'nombres', 
      label: 'Nombres y Apellidos', 
      width: 250,
      render: (row) => `${row.nombres || ''} ${row.apellidos || ''}`.trim() || '-'
    },
    { key: 'username', label: 'Usuario', width: 150 },
    { key: 'email', label: 'Email', width: 250 },
    { 
      key: 'role', 
      label: 'Rol',
      width: 120,
      render: (row) => (
        <span style={{
          display: 'inline-block',
          padding: '6px 12px',
          borderRadius: '20px',
          fontWeight: 600,
          color: '#fff',
          background: {
            'administrador': '#ef4444',
            'distribuidor': '#f97316',
            'emisor': '#3b82f6',
            'gerente': '#10b981',
            'cajero': '#8b5cf6'
          }[row.role as string] || '#9ca3af'
        }}>
          {row.role}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Fecha de creación', 
      width: 150,
      render: (row) => {
        if (!row.created_at) return '-';
        const date = new Date(row.created_at);
        return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
        <button 
          className="btn-primary"
          onClick={() => setOpenNew(true)}
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="form-input"
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    width: col.width,
                    fontWeight: 600,
                    color: '#374151'
                  }}
                >
                  {col.label}
                </th>
              ))}
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontWeight: 600, 
                color: '#374151',
                width: 150 
              }}>
                Acciones
              </th>
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
                <tr 
                  key={user.id} 
                  style={{ 
                    borderBottom: '1px solid #e5e7eb'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {columns.map(col => (
                    <td 
                      key={`${user.id}-${col.key}`}
                      style={{ 
                        padding: '12px',
                        color: '#1f2937',
                        fontSize: '14px'
                      }}
                    >
                      {col.render ? col.render(user) : (user[col.key] as any)?.toString() || '-'}
                    </td>
                  ))}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setOpenEdit(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        marginRight: '8px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => user.id && handleDelete(user.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              background: currentPage === 1 ? '#e5e7eb' : '#3b82f6',
              color: currentPage === 1 ? '#9ca3af' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Anterior
          </button>
          <span style={{ padding: '8px 12px', color: '#1f2937' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              background: currentPage === totalPages ? '#e5e7eb' : '#3b82f6',
              color: currentPage === totalPages ? '#9ca3af' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Siguiente
          </button>
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
    </div>
  );
};

export default Usuarios;
