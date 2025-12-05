import React from 'react';
import { User } from '../types/user';
import './UsuarioDetailModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const UsuarioDetailModal: React.FC<Props> = ({ open, onClose, user }) => {
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
          <button className="close-button-detail" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body con información detallada */}
        <div className="modal-body-detail">
          <div className="info-grid">
            {/* Información Personal */}
            <div className="info-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Información Personal
              </h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-label">Cédula</span>
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
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="info-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Información de Contacto
              </h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value email-value">
                    <a href={`mailto:${user.email}`}>{user.email}</a>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Usuario</span>
                  <span className="info-value">@{user.username}</span>
                </div>
              </div>
            </div>

            {/* Información del Sistema */}
            <div className="info-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Información del Sistema
              </h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-label">Usuario que Realizó la Acción</span>
                  <span className="info-value">{user.created_by_name || 'Sistema'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha de Creación</span>
                  <span className="info-value">{formatDate(user.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Última Actualización</span>
                  <span className="info-value">{formatDate(user.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Información de Acceso */}
            <div className="info-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Información de Acceso
              </h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-label">Rol del Sistema</span>
                  <span className="info-value">
                    <span 
                      className="inline-badge" 
                      style={{ backgroundColor: getRoleBadge(user.role || '') }}
                    >
                      {user.role}
                    </span>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Estado de Cuenta</span>
                  <span className="info-value">
                    <span 
                      className="inline-badge" 
                      style={{ backgroundColor: estadoBadge.color }}
                    >
                      {estadoBadge.label}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
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
