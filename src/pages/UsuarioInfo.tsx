import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usuariosApi } from '../services/usuariosApi';
import UsuarioFormModal from './UsuarioFormModal';
import UsuarioDeleteModal from './UsuarioDeleteModal';
import { User } from '../types/user';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './Emisores.css'; // Reutilizar estilos

const UsuarioInfo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [deleteModal, setDeleteModal] = React.useState(false);

  const loadUser = React.useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await usuariosApi.get(id);
      const userData = res.data?.data ?? res.data;
      setUser(userData);
      } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error cargando usuario';
      setError(msg);
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, show]);

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleUpdate = async (updatedData: Partial<User>) => {
    if (!id) return;
    try {
      await usuariosApi.update(id, updatedData);
      show({ title: 'Éxito', message: 'Usuario actualizado exitosamente', type: 'success' });
      setOpenEdit(false);
      loadUser();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error actualizando usuario';
      show({ title: 'Error', message: msg, type: 'error' });
    }
  };

  const handleDelete = async (password: string) => {
    if (!id) return;
    try {
      await usuariosApi.delete(id, password);
      show({ title: 'Éxito', message: 'Usuario eliminado exitosamente', type: 'success' });
      setDeleteModal(false);
      setTimeout(() => navigate('/usuarios'), 500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error eliminando usuario';
      show({ title: 'Error', message: msg, type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner fullHeight message="Cargando usuario…" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page-container">
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          {error || 'Usuario no encontrado'}
        </div>
        <button className="btn-secondary" onClick={() => navigate('/usuarios')}>
          ← Volver a Usuarios
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button
          className="btn-secondary"
          onClick={() => navigate('/usuarios')}
          style={{ marginRight: '10px' }}
        >
          ← Volver
        </button>
        <h1>Información del Usuario</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => setOpenEdit(true)}
          >
            ✏️ Editar
          </button>
          <button
            className="btn-danger"
            onClick={() => setDeleteModal(true)}
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>

      {/* Información del usuario */}
      <div className="info-card" style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '30px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              ID
            </label>
            <p style={{ fontSize: '16px', margin: 0 }}>{user.id}</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Cédula
            </label>
            <p style={{ fontSize: '16px', margin: 0 }}>{user.cedula || '-'}</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Nombres
            </label>
            <p style={{ fontSize: '16px', margin: 0 }}>{user.nombres || '-'}</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Apellidos
            </label>
            <p style={{ fontSize: '16px', margin: 0 }}>{user.apellidos || '-'}</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Nombre de Usuario
            </label>
            <p style={{ fontSize: '16px', margin: 0 }}>{user.username || '-'}</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Email
            </label>
            <p style={{ fontSize: '16px', margin: 0 }}>
              <a href={`mailto:${user.email}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                {user.email}
              </a>
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Rol
            </label>
            <span style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              background: user.role === 'administrador' ? '#fee2e2' : '#e0e7ff',
              color: user.role === 'administrador' ? '#991b1b' : '#3730a3'
            }}>
              {user.role === 'administrador' ? '👤 Administrador' : `👤 ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Creado
            </label>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString('es-EC', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '-'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
              Última actualización
            </label>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {user.updated_at
                ? new Date(user.updated_at).toLocaleDateString('es-EC', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className="btn-primary"
          onClick={() => setOpenEdit(true)}
        >
          ✏️ Editar usuario
        </button>
        <button
          className="btn-danger"
          onClick={() => setDeleteModal(true)}
        >
          🗑️ Eliminar usuario
        </button>
      </div>

      {/* Modales */}
      <UsuarioFormModal
        isOpen={openEdit}
        initialData={user}
        onClose={() => setOpenEdit(false)}
        onSubmit={handleUpdate}
        isEditing={true}
      />

      <UsuarioDeleteModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onSubmit={handleDelete}
      />
    </div>
  );
};

export default UsuarioInfo;
