import React from 'react';
import { usuariosEmisorApi } from '../services/usuariosEmisorApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import { User } from '../types/user';
import LoadingSpinner from '../components/LoadingSpinner';
import './Usuarios.css';

interface EmisorUsuariosListProps {
  emiId: string | number;
  onEdit?: (usuario: User) => void;
  onOpenModal?: () => void;
  refreshTrigger?: number;
  distributorCreator?: User | null;
}

type DisplayUser = User & { isDistributorCreator?: boolean };

const EmisorUsuariosList: React.FC<EmisorUsuariosListProps> = ({
  emiId,
  onEdit,
  onOpenModal,
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

  const load = React.useCallback(async () => {
    if (!emiId) return;
    setLoading(true);
    try {
      const res = await usuariosEmisorApi.list(emiId, page, perPage);
      let data = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      
      // Roles con visibilidad limitada: gerente ve cajeros y su propio usuario; cajero solo se ve a sí mismo
      if (user?.role === 'gerente') {
        data = data.filter((u: User) => u.role === 'cajero' || u.id === user.id);
      } else if (user?.role === 'cajero') {
        data = data.filter((u: User) => u.id === user.id);
      }
      
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

  React.useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const handleDelete = async (usuario: User) => {
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

  const canEditUser = React.useCallback((usuario: User) => {
    if (!user) return false;
    if (user.role === 'administrador' || user.role === 'emisor' || user.role === 'distribuidor') {
      return true;
    }
    if (user.role === 'gerente') {
      return usuario.role === 'cajero' || usuario.id === user.id;
    }
    if (user.role === 'cajero') {
      return usuario.id === user.id;
    }
    return false;
  }, [user]);

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: '#1a63d6' }}>Usuarios del emisor</h3>
        <button
          onClick={onOpenModal}
          style={{
            padding: '10px 20px',
            background: '#1a63d6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Nuevo usuario
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Cargando usuarios del emisor…" fullHeight />
      ) : displayUsuarios.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
          No hay usuarios registrados para este emisor
        </p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14
            }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Cédula</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Nombres</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Username</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Rol</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayUsuarios.map(u => {
                  const isDistributorCreatorRow = !!u.isDistributorCreator;
                  const editEnabled = canEditUser(u);
                  const deleteEnabled = editEnabled;
                  const roleBg = u.role === 'gerente'
                    ? '#e3f2fd'
                    : u.role === 'cajero'
                      ? '#fff3e0'
                      : u.role === 'distribuidor'
                        ? '#e0f2fe'
                        : '#f3e5f5';
                  const roleColor = u.role === 'gerente'
                    ? '#1976d2'
                    : u.role === 'cajero'
                      ? '#f57c00'
                      : u.role === 'distribuidor'
                        ? '#0369a1'
                        : '#7b1fa2';

                  return (
                    <tr
                      key={`${u.id}-${isDistributorCreatorRow ? 'distribuidor' : 'usuario'}`}
                      style={{
                        borderBottom: '1px solid #eee',
                        background: isDistributorCreatorRow ? '#fdf6ec' : undefined
                      }}
                    >
                      <td style={{ padding: '12px' }}>{u.cedula || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        {u.nombres} {u.apellidos}
                        {isDistributorCreatorRow && (
                          <div style={{ fontSize: 12, color: '#b45309', marginTop: 4 }}>
                            Distribuidor que registró este emisor
                          </div>
                        )}
                      </td>
                    <td style={{ padding: '12px' }}>{u.username}</td>
                    <td style={{ padding: '12px' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: roleBg,
                        color: roleColor,
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {isDistributorCreatorRow ? 'distribuidor' : u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <>
                        <button
                          disabled={!editEnabled}
                          onClick={() => onEdit?.(u)}
                          style={{
                            background: editEnabled ? '#1a63d6' : '#ccc',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: editEnabled ? 'pointer' : 'not-allowed',
                            fontSize: 12,
                            marginRight: 8,
                            opacity: editEnabled ? 1 : 0.6
                          }}
                          title={editEnabled ? 'Editar' : 'No tienes permisos'}
                        >
                          Editar
                        </button>
                        <button
                          disabled={!deleteEnabled}
                          onClick={() => setDeleteConfirm(u)}
                          style={{
                            background: deleteEnabled ? '#ff6b6b' : '#ccc',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: deleteEnabled ? 'pointer' : 'not-allowed',
                            fontSize: 12,
                            opacity: deleteEnabled ? 1 : 0.6
                          }}
                          title={deleteEnabled ? 'Eliminar' : 'No tienes permisos'}
                        >
                          Eliminar
                        </button>
                      </>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                background: page === 1 ? '#f0f0f0' : '#fff',
                borderRadius: 4,
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Anterior
            </button>
            <span style={{ padding: '8px 12px' }}>
              Página {page} de {lastPage}
            </span>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page === lastPage}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                background: page === lastPage ? '#f0f0f0' : '#fff',
                borderRadius: 4,
                cursor: page === lastPage ? 'not-allowed' : 'pointer'
              }}
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(500px, 92vw)', padding: 28 }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a63d6', textAlign: 'center' }}>
              Eliminar usuario
            </h3>
            <p style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
              ¿Está seguro de eliminar a <strong>{deleteConfirm.nombres} {deleteConfirm.apellidos}</strong>?
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
                Ingresa tu contraseña para confirmar:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeletePassword('');
                }}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #ddd',
                  background: '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: deleting ? '#ccc' : '#ff6b6b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>

          <style>{`
            .mf-modal-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 3000;
            }
            .mf-modal {
              background: #fff;
              border-radius: 12px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default EmisorUsuariosList;
