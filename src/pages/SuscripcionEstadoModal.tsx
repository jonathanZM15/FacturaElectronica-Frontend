import React, { useState, useEffect } from 'react';
import { suscripcionesApi, Suscripcion, HistorialEstadoItem } from '../services/suscripcionesApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './UsuarioFormModalModern.css';

interface Props {
  open: boolean;
  emisorId: number;
  suscripcion: Suscripcion;
  onClose: () => void;
  onSuccess: () => void;
}

// Colores para cada estado
const ESTADO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Vigente': { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  'Pendiente': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  'Programado': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  'Suspendido': { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  'Proximo a caducar': { bg: '#ffedd5', text: '#9a3412', border: '#f97316' },
  'Pocos comprobantes': { bg: '#fef9c3', text: '#854d0e', border: '#eab308' },
  'Proximo a caducar y con pocos comprobantes': { bg: '#fed7aa', text: '#9a3412', border: '#fb923c' },
  'Caducado': { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
  'Sin comprobantes': { bg: '#fecaca', text: '#dc2626', border: '#f87171' },
};

const SuscripcionEstadoModal: React.FC<Props> = ({ open, emisorId, suscripcion, onClose, onSuccess }) => {
  const { show } = useNotification();
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [loadingTransiciones, setLoadingTransiciones] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  
  const [transicionesDisponibles, setTransicionesDisponibles] = useState<string[]>([]);
  const [historial, setHistorial] = useState<HistorialEstadoItem[]>([]);
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [activeTab, setActiveTab] = useState<'cambiar' | 'historial'>('cambiar');

  const isAdmin = currentUser?.role === 'administrador';
  const estadoActual = suscripcion.estado_suscripcion;

  // Cargar transiciones disponibles
  useEffect(() => {
    const loadTransiciones = async () => {
      if (!open) return;
      try {
        setLoadingTransiciones(true);
        const response = await suscripcionesApi.getTransicionesDisponibles(emisorId, suscripcion.id!);
        setTransicionesDisponibles(response.data.data.transiciones_disponibles || []);
      } catch (err: any) {
        show({ title: 'Error', message: 'Error al cargar transiciones disponibles', type: 'error' });
      } finally {
        setLoadingTransiciones(false);
      }
    };
    loadTransiciones();
  }, [open, emisorId, suscripcion.id, show]);

  // Cargar historial (solo admin)
  useEffect(() => {
    const loadHistorial = async () => {
      if (!open || !isAdmin) return;
      try {
        setLoadingHistorial(true);
        const response = await suscripcionesApi.getHistorialEstados(emisorId, suscripcion.id!);
        setHistorial(response.data.data.historial || []);
      } catch (err: any) {
        // Silencioso - no mostrar error si no tiene permisos
        setHistorial([]);
      } finally {
        setLoadingHistorial(false);
      }
    };
    loadHistorial();
  }, [open, emisorId, suscripcion.id, isAdmin]);

  // Manejar cambio de estado
  const handleCambiarEstado = async () => {
    if (!selectedEstado) {
      show({ title: 'Error', message: 'Selecciona un estado destino', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const response = await suscripcionesApi.cambiarEstado(
        emisorId,
        suscripcion.id!,
        selectedEstado,
        motivo || undefined
      );

      show({ 
        title: '✅ Estado Actualizado', 
        message: response.data.message || 'El estado ha sido actualizado correctamente.', 
        type: 'success' 
      });

      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al cambiar el estado.';
      show({ title: '❌ Error', message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Obtener estilo para un estado
  const getEstadoStyle = (estado: string) => {
    const colors = ESTADO_COLORS[estado] || { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      padding: '4px 12px',
      borderRadius: '9999px',
      fontWeight: 500,
      fontSize: '13px',
      display: 'inline-block',
    };
  };

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!open) return null;

  return (
    <div className="usuario-modal-overlay">
      <div className="usuario-modal-content usuario-modal-content-barra-izquierda" style={{ maxWidth: '700px' }}>
        <div className="usuario-modal-barra-izquierda" style={{ backgroundColor: '#8b5cf6' }}></div>
        <div className="usuario-modal-main">
          <div className="usuario-modal-header" style={{ position: 'relative' }}>
            <h2>🔄 Gestión de Estado</h2>
            <button
              type="button"
              className="usuario-modal-close"
              onClick={onClose}
              disabled={loading}
              style={{ position: 'absolute', top: 24, right: 24 }}
            >
              ✕
            </button>
          </div>
          <div className="usuario-barra-horizontal-interna"></div>

          {/* Info de la suscripción */}
          <div style={{ padding: '16px 24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Plan</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#1f2937' }}>{suscripcion.plan?.nombre || 'N/A'}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Estado Actual</p>
                <span style={getEstadoStyle(estadoActual)}>{estadoActual}</span>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Comprobantes</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#1f2937' }}>
                  {suscripcion.comprobantes_usados || 0} / {suscripcion.cantidad_comprobantes}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              type="button"
              onClick={() => setActiveTab('cambiar')}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: activeTab === 'cambiar' ? '#fff' : '#f9fafb',
                border: 'none',
                borderBottom: activeTab === 'cambiar' ? '2px solid #8b5cf6' : '2px solid transparent',
                color: activeTab === 'cambiar' ? '#8b5cf6' : '#6b7280',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📝 Cambiar Estado
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('historial')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: activeTab === 'historial' ? '#fff' : '#f9fafb',
                  border: 'none',
                  borderBottom: activeTab === 'historial' ? '2px solid #8b5cf6' : '2px solid transparent',
                  color: activeTab === 'historial' ? '#8b5cf6' : '#6b7280',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📜 Historial ({historial.length})
              </button>
            )}
          </div>

          <div className="usuario-modal-body">
            {activeTab === 'cambiar' && (
              <>
                {loadingTransiciones ? (
                  <LoadingSpinner />
                ) : transicionesDisponibles.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '32px', 
                    backgroundColor: '#fef3c7', 
                    borderRadius: '8px',
                    border: '1px solid #f59e0b'
                  }}>
                    <span style={{ fontSize: '48px' }}>🔒</span>
                    <p style={{ margin: '16px 0 0', color: '#92400e', fontWeight: 500 }}>
                      No hay transiciones de estado disponibles para esta suscripción.
                    </p>
                    <p style={{ margin: '8px 0 0', color: '#b45309', fontSize: '14px' }}>
                      El estado "{estadoActual}" no permite cambios manuales con tu rol actual.
                    </p>
                  </div>
                ) : (
                  <div className="usuario-form-grid">
                    {/* Selector de estado destino */}
                    <div className="usuario-form-group full-width">
                      <label className="usuario-form-label">
                        <span className="icon">🎯</span>
                        Nuevo Estado
                        <span className="required">*</span>
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                        {transicionesDisponibles.map((estado) => (
                          <button
                            key={estado}
                            type="button"
                            onClick={() => setSelectedEstado(estado)}
                            disabled={loading}
                            style={{
                              ...getEstadoStyle(estado),
                              cursor: 'pointer',
                              opacity: selectedEstado === estado ? 1 : 0.6,
                              transform: selectedEstado === estado ? 'scale(1.05)' : 'scale(1)',
                              boxShadow: selectedEstado === estado ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {selectedEstado === estado && '✓ '}
                            {estado}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Motivo (opcional) */}
                    <div className="usuario-form-group full-width">
                      <label className="usuario-form-label">
                        <span className="icon">📝</span>
                        Motivo del Cambio (Opcional)
                      </label>
                      <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Describe el motivo del cambio de estado..."
                        rows={3}
                        className="usuario-form-input"
                        disabled={loading}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    {/* Descripción del estado seleccionado */}
                    {selectedEstado && (
                      <div className="full-width" style={{ 
                        backgroundColor: '#f0fdf4', 
                        padding: '12px', 
                        borderRadius: '8px',
                        border: '1px solid #22c55e'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
                          <strong>📋 Cambio:</strong> "{estadoActual}" → "{selectedEstado}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Botones */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  <button
                    type="button"
                    className="usuario-btn usuario-btn-secondary"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  {transicionesDisponibles.length > 0 && (
                    <button
                      type="button"
                      className="usuario-btn usuario-btn-primary"
                      onClick={handleCambiarEstado}
                      disabled={loading || !selectedEstado}
                      style={{ backgroundColor: '#8b5cf6' }}
                    >
                      {loading ? (
                        <>
                          <span style={{ marginRight: '8px' }}>⏳</span>
                          Cambiando...
                        </>
                      ) : (
                        <>
                          <span style={{ marginRight: '8px' }}>✅</span>
                          Confirmar Cambio
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}

            {activeTab === 'historial' && (
              <>
                {loadingHistorial ? (
                  <LoadingSpinner />
                ) : historial.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                    <span style={{ fontSize: '48px' }}>📭</span>
                    <p>No hay historial de cambios de estado registrado.</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {historial.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px',
                          borderBottom: index < historial.length - 1 ? '1px solid #e5e7eb' : 'none',
                          backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={getEstadoStyle(item.estado_anterior)}>{item.estado_anterior}</span>
                            <span style={{ color: '#6b7280' }}>→</span>
                            <span style={getEstadoStyle(item.estado_nuevo)}>{item.estado_nuevo}</span>
                          </div>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: item.tipo_transicion === 'Manual' ? '#dbeafe' : '#dcfce7',
                            color: item.tipo_transicion === 'Manual' ? '#1e40af' : '#166534',
                          }}>
                            {item.tipo_transicion === 'Manual' ? '👤 Manual' : '🤖 Automático'}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          <p style={{ margin: '4px 0' }}>
                            <strong>📅 Fecha:</strong> {formatearFecha(item.created_at)}
                          </p>
                          {item.motivo && (
                            <p style={{ margin: '4px 0' }}>
                              <strong>📝 Motivo:</strong> {item.motivo}
                            </p>
                          )}
                          {item.tipo_transicion === 'Manual' && item.user && (
                            <p style={{ margin: '4px 0' }}>
                              <strong>👤 Usuario:</strong> {item.user.nombres} {item.user.apellidos} ({item.user_role})
                            </p>
                          )}
                          {item.ip_address && (
                            <p style={{ margin: '4px 0' }}>
                              <strong>🌐 IP:</strong> {item.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuscripcionEstadoModal;
