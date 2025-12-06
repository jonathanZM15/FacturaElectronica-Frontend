import React from 'react';
import { User } from '../types/user';
import './UsuarioDetailModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

const UsuarioDetailModal: React.FC<Props> = ({ open, onClose, user, onEdit, onDelete }) => {
  if (!open || !user) return null;

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'administrador': '#ef4444',
      'distribuidor': '#f97316',
      'emisor': '#3b82f6',
      'gerente': '#10b981',
      'cajero': '#8b5cf6'
    };
    return colors[role] || '#9ca3af';
  };

  const getEstadoBadge = (estado: string) => {
    const data: Record<string, { color: string; label: string }> = {
      'nuevo': { color: '#6366f1', label: 'Nuevo' },
      'activo': { color: '#16a34a', label: 'Activo' },
      'pendiente_verificacion': { color: '#f59e0b', label: 'Pendiente de verificación' },
      'suspendido': { color: '#ef4444', label: 'Suspendido' },
      'retirado': { color: '#6b7280', label: 'Retirado' }
    };
    return data[estado] || { color: '#9ca3af', label: estado };
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No registrada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const estadoBadge = getEstadoBadge(user.estado || 'nuevo');

  return (
    <div className="modal-overlay-detail">
      <div className="modal-content-detail" onClick={(e) => e.stopPropagation()}>
        {/* Header con gradiente */}
        <div className="modal-header-detail">
          <div className="user-avatar-large">
            {user.nombres?.charAt(0) || user.username?.charAt(0) || 'U'}
          </div>
          <div className="header-info">
            <h2 className="user-name-large">
              {user.nombres} {user.apellidos}
            </h2>
            <p className="user-username">@{user.username}</p>
            <div className="badges-container">
              <span 
                className="badge-role-large" 
                style={{ backgroundColor: getRoleBadge(user.role || '') }}
              >
                {user.role}
              </span>
              <span 
                className="badge-estado-large" 
                style={{ backgroundColor: estadoBadge.color }}
              >
                {estadoBadge.label}
              </span>
            </div>
          </div>
          
          {/* Menú de acciones */}
          <div className="action-menu">
            {onEdit && (
              <button className="action-button edit-button" onClick={onEdit} title="Editar usuario">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </button>
            )}
            {onDelete && (
              <button className="action-button delete-button" onClick={onDelete} title="Eliminar usuario">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Eliminar
              </button>
            )}
          </div>
          
          <button className="close-button-detail" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body con información detallada en 3 secciones */}
        <div className="modal-body-detail">
          
          {/* SECCIÓN 1: EMISOR */}
          {user.emisor_id && (
            <div className="info-section-full">
              <h3 className="section-title-major">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Emisor Asociado
              </h3>
              <div className="info-grid-emisor">
                <div className="info-row">
                  <span className="info-label">RUC</span>
                  <span className="info-value link-value" style={{ cursor: 'pointer', color: '#6366f1' }}>
                    {user.emisor_ruc || 'No asignado'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Razón Social</span>
                  <span className="info-value">{user.emisor_razon_social || 'No asignado'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Estado del Emisor</span>
                  <span className="info-value">
                    <span className="inline-badge" style={{ backgroundColor: '#16a34a' }}>Activo</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: USUARIO */}
          <div className="info-section-full">
            <h3 className="section-title-major">
              <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Información del Usuario
            </h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Número de Cédula</span>
                <span className="info-value">{user.cedula || 'No registrada'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Nombres</span>
                <span className="info-value">{user.nombres || 'No registrado'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Apellidos</span>
                <span className="info-value">{user.apellidos || 'No registrado'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Nombre de Usuario</span>
                <span className="info-value">@{user.username}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Correo Electrónico</span>
                <span className="info-value email-value">
                  <a href={`mailto:${user.email}`}>{user.email}</a>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Estado</span>
                <span className="info-value">
                  <span className="inline-badge" style={{ backgroundColor: estadoBadge.color }}>
                    {estadoBadge.label}
                  </span>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Rol</span>
                <span className="info-value">
                  <span className="inline-badge" style={{ backgroundColor: getRoleBadge(user.role || '') }}>
                    {user.role}
                  </span>
                </span>
              </div>
              {user.created_by_username && (
                <div className="info-row">
                  <span className="info-label">Usuario Creador</span>
                  <span className="info-value link-value" style={{ cursor: 'pointer', color: '#6366f1' }}>
                    {`${(user.created_by_role || '').toUpperCase()} – ${user.created_by_username || ''} – ${user.created_by_nombres || ''} ${user.created_by_apellidos || ''}`.trim()}
                  </span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Fecha de Creación</span>
                <span className="info-value">{formatDate(user.created_at)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Fecha de Última Actualización</span>
                <span className="info-value">{formatDate(user.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: ESTABLECIMIENTOS Y PUNTOS DE EMISIÓN */}
          {user.role !== 'administrador' && user.role !== 'distribuidor' && (
            <div className="info-section-full">
              <h3 className="section-title-major">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Establecimientos y Puntos de Emisión
              </h3>
              <div className="establecimientos-table">
                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  No hay establecimientos asignados a este usuario
                </p>
                {/* TODO: Aquí irá la tabla de establecimientos cuando el backend envíe esa información */}
              </div>
            </div>
          )}

        </div>

        {/* Footer con animación */}
        <div className="modal-footer-detail">
          <div className="footer-decoration"></div>
          <p className="footer-text">
            <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Información del usuario actualizada automáticamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default UsuarioDetailModal;
