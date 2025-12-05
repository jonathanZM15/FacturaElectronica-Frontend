import React from 'react';
import { usuariosEmisorApi } from '../services/usuariosEmisorApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import { User } from '../types/user';
import LoadingSpinner from '../components/LoadingSpinner';
import './EmisorUsuarios.css';
import './UsuarioDeleteModalModern.css';

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
    <div className="emisor-usuarios-container">
      
      <div className="usuarios-header">
        <h3>Usuarios del emisor</h3>
        <button onClick={onOpenModal} className="btn-new-user">
          Nuevo +
        </button>
      </div>

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
                    <th className="th-sticky sticky-left-1">Cédula</th>
                    <th>Nombres</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Rol</th>
                    <th className="th-sticky sticky-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayUsuarios.map((u, index) => {
                    const isDistributorCreatorRow = !!u.isDistributorCreator;
                    const editEnabled = canEditUser(u);
                    const deleteEnabled = editEnabled;
                    
                    const roleClass = u.role === 'gerente' ? 'role-gerente' :
                                     u.role === 'cajero' ? 'role-cajero' :
                                     u.role === 'distribuidor' ? 'role-distribuidor' :
                                     'role-emisor';

                    return (
                      <tr
                        key={`${u.id}-${isDistributorCreatorRow ? 'distribuidor' : 'usuario'}`}
                        className={isDistributorCreatorRow ? 'distributor-row' : ''}
                      >
                        <td className="td-sticky sticky-left-1 cedula-cell">{u.cedula || '—'}</td>
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
            <div className="per-page-selector">
              <span>Filas por página:</span>
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                <option value={5}>5</option>
                <option value={10}>10</option>
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
            </div>

            <div className="delete-modal-footer">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmisorUsuariosList;
