import React from 'react';
import { Plan, planesApi } from '../services/planesApi';
import { useNotification } from '../contexts/NotificationContext';
import './UsuarioDeleteModalModern.css';

interface Props {
  open: boolean;
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}

const PlanDeleteModal: React.FC<Props> = ({ open, plan, onClose, onSuccess }) => {
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!plan.id) return;

    try {
      setLoading(true);
      await planesApi.delete(plan.id);
      show({ title: 'Éxito', message: 'Plan eliminado correctamente', type: 'success' });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al eliminar el plan';
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-icon-container">
            <span className="delete-icon">🗑️</span>
          </div>
          <h2>¿Eliminar Plan?</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="delete-modal-body">
          <p className="warning-text">
            Estás a punto de eliminar el siguiente plan:
          </p>
          
          <div className="plan-info-card">
            <div className="info-row">
              <span className="label">Nombre:</span>
              <span className="value">{plan.nombre}</span>
            </div>
            <div className="info-row">
              <span className="label">Precio:</span>
              <span className="value">
                ${plan.precio.toFixed(2)} - {plan.periodo}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Comprobantes:</span>
              <span className="value">{plan.cantidad_comprobantes.toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="label">Estado:</span>
              <span className={`badge ${plan.estado === 'Activo' ? 'badge-success' : 'badge-danger'}`}>
                {plan.estado}
              </span>
            </div>
            {plan.observacion && (
              <div className="info-row">
                <span className="label">Observación:</span>
                <span className="value">{plan.observacion}</span>
              </div>
            )}
          </div>

          <div className="alert alert-warning">
            <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. El plan será eliminado del sistema.
          </div>
        </div>

        <div className="delete-modal-actions">
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
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Eliminando...' : 'Sí, Eliminar Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanDeleteModal;
