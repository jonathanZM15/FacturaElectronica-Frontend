import React, { useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚠️ Eliminar Usuario</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {step === 'confirmation' ? (
          <div style={{ padding: '20px' }}>
            <p style={{ marginBottom: '20px', fontSize: '16px' }}>
              ¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirm}
                disabled={loading}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
              Para confirmar la eliminación del usuario, ingrese su contraseña de administrador:
            </p>

            <div className="form-group">
              <label htmlFor="password">Contraseña del administrador *</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="Ingrese su contraseña"
                className={passwordError ? 'form-input error' : 'form-input'}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && password.trim()) {
                    handleDelete();
                  }
                }}
              />
              {passwordError && <span className="error-text">{passwordError}</span>}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
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
                className="btn-danger"
                onClick={handleDelete}
                disabled={loading || !password.trim()}
              >
                {loading ? (
                  <LoadingSpinner inline size={18} message="Eliminando…" />
                ) : (
                  'Eliminar usuario'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsuarioDeleteModal;
