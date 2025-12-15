import React from 'react';
import { Plan, planesApi } from '../services/planesApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import './UsuarioDeleteModalModern.css';

interface Props {
  open: boolean;
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}

const PlanDeleteModal: React.FC<Props> = ({ open, plan, onClose, onSuccess }) => {
  const { show } = useNotification();
  const { user: currentUser } = useUser();
  const [loading, setLoading] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const passwordInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleDelete = async () => {
    if (!plan.id || !password) return;

    try {
      setLoading(true);
      setError(null);
      await planesApi.delete(plan.id, { password });
      show({ title: '✅ Éxito', message: 'Plan eliminado exitosamente', type: 'success' });
      setPassword('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al eliminar el plan';
      setError(msg);
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="delete-modal-overlay" onClick={handleClose}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <h2>
            <span className="icon">⚠️</span>
            Eliminar Plan
          </h2>
          <button
            className="delete-modal-close"
            onClick={handleClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-confirmation-text">
            ¿Está seguro de eliminar el plan <strong>{plan.nombre}</strong>?
          </p>

          <div className="delete-warning-box">
            <span className="icon">⚠️</span>
            <div>
              <strong>Información del plan a eliminar:</strong>
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                <div>Nombre: <strong>{plan.nombre}</strong></div>
                <div>Precio: <strong>${parseFloat(String(plan.precio)).toFixed(2)}</strong> - {plan.periodo}</div>
                <div>Comprobantes: <strong>{plan.cantidad_comprobantes.toLocaleString()}</strong></div>
                <div>Estado: <strong>{plan.estado}</strong></div>
              </div>
            </div>
          </div>

          <div className="delete-form-group">
            <label htmlFor="delete-password" className="delete-form-label">
              Ingresa tu contraseña para confirmar *
            </label>
            <input
              ref={passwordInputRef}
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              className={`delete-form-input ${error ? 'error' : ''}`}
              disabled={loading}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && password && !loading) {
                  handleDelete();
                }
              }}
            />
            {error && (
              <div className="delete-error-text">
                <span className="icon">❌</span>
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="delete-modal-footer">
          <button
            type="button"
            className="delete-btn delete-btn-cancel"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="delete-btn delete-btn-danger"
            onClick={handleDelete}
            disabled={loading || !password}
          >
            {loading ? 'Eliminando...' : '🗑️ Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanDeleteModal;
