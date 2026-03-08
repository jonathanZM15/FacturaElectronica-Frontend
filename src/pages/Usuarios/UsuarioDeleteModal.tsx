import React, { useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import './UsuarioDeleteModalModern.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

const UsuarioDeleteModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState<'confirmation' | 'password'>('confirmation');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setStep('password');
    setPassword('');
    setPasswordError(null);
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      setPasswordError('La contraseña es obligatoria');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(password);
      setLoading(false);
      onClose();
      resetModal();
    } catch (error: any) {
      setLoading(false);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Error al eliminar el usuario';

      if (error?.response?.status === 401 || errorMessage.includes('contraseña') || errorMessage.includes('password')) {
        setPasswordError('Contraseña incorrecta');
      } else {
        setPasswordError(errorMessage);
      }
    }
  };

  const resetModal = () => {
    setStep('confirmation');
    setPassword('');
    setPasswordError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <h2>
            <span className="icon">⚠️</span>
            {step === 'confirmation' ? 'Eliminar Usuario' : 'Verificar Contraseña'}
          </h2>
          <button className="delete-modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 'confirmation' ? (
          <>
            <div className="delete-modal-body">
              <p className="delete-confirmation-text">
                ¿Está seguro de que desea <strong>eliminar este usuario</strong>? Esta acción es permanente y no se puede deshacer.
              </p>
              <div className="delete-warning-box">
                <span className="icon">⚠️</span>
                <div>
                  <strong>Esta acción no se puede deshacer.</strong> Todos los datos asociados al usuario serán eliminados permanentemente del sistema.
                </div>
              </div>
              <p className="delete-info-text">
                Para continuar, haz clic en "Eliminar". Se te solicitará que ingreses tu contraseña como medida de seguridad.
              </p>
            </div>
            <div className="delete-modal-footer">
              <button
                type="button"
                className="delete-btn delete-btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="delete-btn delete-btn-danger"
                onClick={handleConfirm}
                disabled={loading}
              >
                🗑️ Sí, eliminar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="delete-modal-body">
              <p className="delete-password-text">
                Por seguridad, debes confirmar tu identidad ingresando tu contraseña de administrador.
              </p>

              <div className="delete-form-group">
                <label htmlFor="password" className="delete-form-label">
                  Contraseña del administrador *
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="Ingresa tu contraseña"
                  className={passwordError ? 'delete-form-input error' : 'delete-form-input'}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && password.trim() && !loading) {
                      handleDelete();
                    }
                  }}
                />
                {passwordError && (
                  <span className="delete-error-text">
                    <span className="icon">⚠️</span>
                    {passwordError}
                  </span>
                )}
              </div>
            </div>
            <div className="delete-modal-footer">
              <button
                type="button"
                className="delete-btn delete-btn-cancel"
                onClick={() => {
                  resetModal();
                  onClose();
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="delete-btn delete-btn-danger"
                onClick={handleDelete}
                disabled={loading || !password.trim()}
              >
                {loading ? (
                  <>
                    <LoadingSpinner inline size={18} message="" />
                    Eliminando...
                  </>
                ) : (
                  '🗑️ Eliminar usuario'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsuarioDeleteModal;
