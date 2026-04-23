import React, { useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { usuariosApi } from '../../services/usuariosApi';

interface Props {
  isOpen: boolean;
  user: { id: string; email: string; nombres?: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ChangeEmailModal: React.FC<Props> = ({ isOpen, user, onClose, onSuccess }) => {
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [errors, setErrors] = useState<{ newEmail?: string; confirmEmail?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmails = (): boolean => {
    const newErrors: typeof errors = {};

    // Validar que el nuevo correo no esté vacío
    if (!newEmail.trim()) {
      newErrors.newEmail = 'El nuevo correo es obligatorio';
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newEmail.trim() && !emailRegex.test(newEmail.trim())) {
      newErrors.newEmail = 'Por favor ingrese un correo válido';
    }

    // Validar que sea diferente del actual
    if (newEmail.trim().toLowerCase() === user?.email.toLowerCase()) {
      newErrors.newEmail = 'El nuevo correo debe ser diferente al actual';
    }

    // Validar que la confirmación no esté vacía
    if (!confirmEmail.trim()) {
      newErrors.confirmEmail = 'Debe confirmar el correo';
    }

    // Validar que coincidan
    if (newEmail.trim() !== confirmEmail.trim()) {
      newErrors.confirmEmail = 'Los correos no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateEmails() || !user) return;

    setLoading(true);
    try {
      // Llamar al nuevo endpoint de solicitud de cambio de email
      await usuariosApi.requestEmailChange(user.id, newEmail.trim());

      setSuccessMessage('✅ ¡Correos enviados exitosamente!\n\nSe han enviado correos de confirmación a:\n📧 ' + user.email + ' → Notificación del cambio\n📧 ' + newEmail.trim() + ' → Link para confirmar (válido 48h)\n\nRevisa tu bandeja de entrada y confirma desde el nuevo correo.');
      
      // Limpiar formulario
      setNewEmail('');
      setConfirmEmail('');
      setErrors({});

      // Cerrar después de 4 segundos
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
        onSuccess();
      }, 4000);
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error?.response?.data?.message || error?.message || 'Error al cambiar el correo';
      setErrors({ general: errorMessage });
    }
  };

  const handleClose = () => {
    setNewEmail('');
    setConfirmEmail('');
    setErrors({});
    setSuccessMessage('');
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>✉️</span>
            Cambiar Correo Electrónico
          </h2>
        </div>

        <div className="modal-body" style={{ padding: '22px 22px 0px 22px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <LoadingSpinner />
              <h3 style={{ color: '#6366f1', marginTop: '20px', fontSize: '16px', fontWeight: '600' }}>
                📧 Enviando correos de confirmación...
              </h3>
              <p style={{ color: '#666', marginTop: '8px', fontSize: '13px' }}>
                Por favor espera mientras enviamos los correos a ambas direcciones
              </p>
            </div>
          )}

          {!loading && (
            <>
              {/* Información del usuario */}
              <div style={{ marginBottom: '16px', padding: '12px 14px', backgroundColor: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)', borderRadius: '10px', borderLeft: '4px solid #6366f1' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#4f46e5', fontWeight: '700', letterSpacing: '0.3px', textTransform: 'uppercase' }}>👤 {user.nombres || 'Usuario'}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}><span>📧</span>{user.email}</p>
              </div>

              {/* Mensaje de éxito */}
              {successMessage && (
                <div style={{ marginBottom: '12px', padding: '12px 14px', backgroundColor: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(74, 222, 128, 0.08) 100%)', borderRadius: '8px', borderLeft: '3px solid #22c55e', animation: 'slideIn 0.3s ease-out' }}>
                  <div style={{ margin: 0, fontSize: '12px', color: '#166534', fontWeight: '500', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {successMessage.split('\n').map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error general */}
              {errors.general && (
                <div style={{ marginBottom: '12px', padding: '10px 12px', backgroundColor: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(248, 113, 113, 0.08) 100%)', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#7f1d1d', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', lineHeight: '1.3' }}>
                    <span>🚫</span>
                    <span><strong>Error:</strong> {errors.general}</span>
                  </p>
                </div>
              )}

              {/* Nuevo correo */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>
                  Nuevo Correo Electrónico
                  <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (errors.newEmail) {
                      const newErrors = { ...errors };
                      delete newErrors.newEmail;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="nuevo@example.com"
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    border: `2px solid ${errors.newEmail ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: errors.newEmail ? 'rgba(239, 68, 68, 0.03)' : '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                    boxShadow: errors.newEmail ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
                  }}
                  onFocus={(e) => {
                    if (!errors.newEmail) {
                      (e.currentTarget as HTMLInputElement).style.borderColor = '#6366f1';
                      (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor = errors.newEmail ? '#ef4444' : '#e2e8f0';
                    (e.currentTarget as HTMLInputElement).style.boxShadow = errors.newEmail ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none';
                  }}
                  disabled={loading}
                />
                {errors.newEmail && (
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#ef4444', fontWeight: '500' }}>
                    ⚠️ {errors.newEmail}
                  </p>
                )}
              </div>

              {/* Confirmar correo */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>
                  Confirmar Correo Electrónico
                  <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    if (errors.confirmEmail) {
                      const newErrors = { ...errors };
                      delete newErrors.confirmEmail;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="nuevo@example.com"
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    border: `2px solid ${errors.confirmEmail ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    background: errors.confirmEmail ? 'rgba(239, 68, 68, 0.03)' : '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                    boxShadow: errors.confirmEmail ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
                  }}
                  onFocus={(e) => {
                    if (!errors.confirmEmail) {
                      (e.currentTarget as HTMLInputElement).style.borderColor = '#6366f1';
                      (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor = errors.confirmEmail ? '#ef4444' : '#e2e8f0';
                    (e.currentTarget as HTMLInputElement).style.boxShadow = errors.confirmEmail ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none';
                  }}
                  disabled={loading}
                />
                {errors.confirmEmail && (
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#ef4444', fontWeight: '500' }}>
                    ⚠️ {errors.confirmEmail}
                  </p>
                )}
              </div>

              {/* Información importante */}
              <div style={{ padding: '10px 12px', backgroundColor: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(234, 179, 8, 0.08) 100%)', borderRadius: '8px', borderLeft: '3px solid #d97706' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#92400e', fontWeight: '500', lineHeight: '1.4', display: 'flex', gap: '5px' }}>
                  <span>ℹ️</span>
                  <span><strong>Importante:</strong> Confirmaremos en ambos correos para completar el cambio.</span>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '10px 22px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1.5px solid #e5e7eb',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '13px',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.backgroundColor = '#e5e7eb';
                btn.style.borderColor = '#d1d5db';
                btn.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.backgroundColor = '#f3f4f6';
                btn.style.borderColor = '#e5e7eb';
                btn.style.transform = 'translateY(0)';
              }
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 26px',
              background: 'linear-gradient(135deg, #6366f1 0%, #764ba2 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '13px',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
              }
            }}
          >
            {loading ? '📧 Enviando correos...' : '✉️ Cambiar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeEmailModal;
