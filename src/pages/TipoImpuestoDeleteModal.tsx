import React, { useState, useEffect } from 'react';
import { tiposImpuestoApi, TipoImpuesto } from '../services/tiposImpuestoApi';
import { useNotification } from '../contexts/NotificationContext';
import './UsuarioFormModalModern.css';
import './Emisores.css';

interface Props {
  tipoImpuesto: TipoImpuesto;
  onClose: () => void;
  onSuccess: () => void;
}

const TipoImpuestoDeleteModal: React.FC<Props> = ({ tipoImpuesto, onClose, onSuccess }) => {
  const { show } = useNotification();
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tieneProductos, setTieneProductos] = useState(false);
  const [cantidadProductos, setCantidadProductos] = useState(0);
  const [checkingProducts, setCheckingProducts] = useState(true);

  // Verificar si tiene productos asociados
  useEffect(() => {
    const checkProductos = async () => {
      try {
        setCheckingProducts(true);
        const response = await tiposImpuestoApi.get(tipoImpuesto.id!);
        setTieneProductos(response.data.data.tiene_productos || false);
        setCantidadProductos(response.data.data.cantidad_productos || 0);
      } catch (err) {
        console.error('Error al verificar productos:', err);
      } finally {
        setCheckingProducts(false);
      }
    };
    
    checkProductos();
  }, [tipoImpuesto.id]);

  const handleDelete = async () => {
    if (!password.trim()) {
      setError('La contraseña es obligatoria.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await tiposImpuestoApi.delete(tipoImpuesto.id!, password);
      show({ 
        title: 'Éxito', 
        message: '✅ Tipo de impuesto eliminado exitosamente.', 
        type: 'success' 
      });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al eliminar tipo de impuesto';
      setError(msg);
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-sm">
        <div className="modal-header">
          <h2>⚠️ Confirmar Eliminación</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {checkingProducts ? (
            <p>Verificando productos asociados...</p>
          ) : tieneProductos ? (
            <div className="error-box">
              <p><strong>❌ No se puede eliminar</strong></p>
              <p>
                Este tipo de impuesto tiene <strong>{cantidadProductos} producto(s)</strong> asociado(s).
              </p>
              <p>
                Para eliminarlo, primero debe desasociar o eliminar los productos relacionados, 
                o cambiar el estado a "Desactivado".
              </p>
            </div>
          ) : (
            <>
              <p>¿Estás seguro de que deseas eliminar este tipo de impuesto?</p>
              
              <div className="info-summary">
                <p><strong>Tipo:</strong> {tipoImpuesto.tipo_impuesto}</p>
                <p><strong>Nombre:</strong> {tipoImpuesto.nombre}</p>
                <p><strong>Código:</strong> {tipoImpuesto.codigo}</p>
                <p><strong>Valor:</strong> {
                  tipoImpuesto.tipo_tarifa === 'Porcentaje' 
                    ? `${tipoImpuesto.valor_tarifa}%` 
                    : `$${tipoImpuesto.valor_tarifa}`
                }</p>
              </div>
              
              <p className="warning-text">
                ⚠️ Esta acción es irreversible. El tipo de impuesto será eliminado permanentemente.
              </p>
              
              <div className="form-group">
                <label htmlFor="password">
                  Contraseña de Confirmación <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ingresa tu contraseña"
                  className={error ? 'error' : ''}
                  disabled={loading}
                />
                {error && <span className="field-error">{error}</span>}
              </div>
            </>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            {tieneProductos ? 'Cerrar' : 'Cancelar'}
          </button>
          
          {!tieneProductos && !checkingProducts && (
            <button 
              className="btn-danger" 
              onClick={handleDelete}
              disabled={loading || !password.trim()}
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TipoImpuestoDeleteModal;
