import React, { useState } from 'react';
import { tiposRetencionApi, TipoRetencion } from '../../services/tiposRetencionApi';
import { useNotification } from '../../contexts/NotificationContext';
import './TipoRetencionDeleteModal.css';

interface Props {
  tipoRetencion: TipoRetencion;
  onClose: () => void;
  onSuccess: () => void;
}

const TipoRetencionDeleteModal: React.FC<Props> = ({ tipoRetencion, onClose, onSuccess }) => {
  const { show } = useNotification();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('La contraseña es obligatoria');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await tiposRetencionApi.delete(tipoRetencion.id!, password);
      show({
        type: 'success',
        title: 'Eliminado',
        message: 'Tipo de retención eliminado exitosamente'
      });
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Error al eliminar el tipo de retención';
      setError(message);
      show({
        type: 'error',
        title: 'Error',
        message: message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="retencion-delete-overlay">
      <div className="retencion-delete-container">
        {/* Header */}
        <div className="retencion-delete-header">
          <div className="retencion-delete-icon">🗑️</div>
          <h2>Eliminar Tipo de Retención</h2>
          <p>Esta acción es irreversible</p>
        </div>

        {/* Body */}
        <div className="retencion-delete-body">
          {/* Info del registro */}
          <div className="retencion-delete-info">
            <div className="retencion-delete-info-row">
              <span className="retencion-delete-info-label">Tipo:</span>
              <span className="retencion-delete-info-value tipo">{tipoRetencion.tipo_retencion}</span>
            </div>
            <div className="retencion-delete-info-row">
              <span className="retencion-delete-info-label">Código:</span>
              <span className="retencion-delete-info-value">{tipoRetencion.codigo}</span>
            </div>
            <div className="retencion-delete-info-row">
              <span className="retencion-delete-info-label">Nombre:</span>
              <span className="retencion-delete-info-value">{tipoRetencion.nombre}</span>
            </div>
            <div className="retencion-delete-info-row">
              <span className="retencion-delete-info-label">Porcentaje:</span>
              <span className="retencion-delete-info-value porcentaje">
                {Number(tipoRetencion.porcentaje).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="retencion-delete-warning">
            <span className="retencion-delete-warning-icon">⚠️</span>
            <div className="retencion-delete-warning-text">
              <strong>¡Atención!</strong>
              Esta acción eliminará permanentemente el tipo de retención del sistema. 
              No podrá recuperarse una vez confirmada la eliminación.
            </div>
          </div>

          {/* Password */}
          <form onSubmit={handleSubmit}>
            <div className="retencion-delete-password">
              <label>
                <span className="icon">🔑</span>
                Contraseña de Confirmación
                <span className="required">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className={error ? 'error' : ''}
                placeholder="Ingresa tu contraseña para confirmar"
                autoFocus
              />
              {error && (
                <div className="retencion-delete-error">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="retencion-delete-footer">
          <button 
            className="retencion-delete-btn retencion-delete-btn-cancel" 
            onClick={onClose}
            disabled={loading}
          >
            <span>✕</span>
            Cancelar
          </button>
          <button 
            className="retencion-delete-btn retencion-delete-btn-confirm"
            onClick={handleSubmit}
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <>
                <span>⏳</span>
                Eliminando...
              </>
            ) : (
              <>
                <span>🗑️</span>
                Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TipoRetencionDeleteModal;
