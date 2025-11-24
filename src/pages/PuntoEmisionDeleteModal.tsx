import React, { useState } from 'react';
import { PuntoEmision } from '../types/puntoEmision';
import { puntosEmisionApi } from '../services/puntosEmisionApi';

interface PuntoEmisionDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  punto: PuntoEmision | null;
  companyId?: number;
  establecimientoId?: number;
  onError: (message: string) => void;
  onSuccess_notification: (message: string) => void;
}

const PuntoEmisionDeleteModal: React.FC<PuntoEmisionDeleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  punto,
  companyId,
  establecimientoId,
  onError,
  onSuccess_notification
}) => {
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
      // Llamar a la API para eliminar con validación de contraseña
      await puntosEmisionApi.delete(
        companyId || 0,
        establecimientoId || 0,
        punto?.id || 0,
        password
      );

      setLoading(false);
      onSuccess_notification('Punto de emisión eliminado correctamente');
      onClose();
      resetModal();
      onSuccess();
    } catch (error: any) {
      setLoading(false);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Error al eliminar el punto de emisión';
      
      if (error?.response?.status === 401 || errorMessage.includes('contraseña') || errorMessage.includes('password')) {
        setPasswordError('Contraseña incorrecta');
      } else {
        onError(errorMessage);
        onClose();
        resetModal();
      }
    }
  };

  const resetModal = () => {
    setStep('confirmation');
    setPassword('');
    setPasswordError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="delete-modal-backdrop"
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 1002,
          width: 'min(450px, 90vw)',
          maxWidth: '500px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            borderBottom: '1px solid #fecaca'
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '24px' }}>⚠️</span>
            {step === 'confirmation' ? 'Confirmar eliminación' : 'Verificar contraseña'}
          </h3>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {step === 'confirmation' ? (
            <>
              <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
                Está a punto de eliminar el punto de emisión <strong style={{ color: '#1f2937' }}>"{punto?.nombre}"</strong> (Código: <strong>{punto?.codigo}</strong>).
              </p>
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#92400e',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}
              >
                ⚠️ Esta acción <strong>no se puede deshacer</strong>. Todos los datos asociados al punto de emisión serán eliminados permanentemente del sistema.
              </div>
              <p style={{ margin: '16px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                Para continuar, haz clic en "Eliminar". Se te solicitará que ingreses tu contraseña como medida de seguridad.
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#374151' }}>
                Por seguridad, debes confirmar tu identidad ingresando tu contraseña de administrador.
              </p>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Ingresa tu contraseña"
                  autoFocus
                  style={{
                    padding: '10px 12px',
                    border: passwordError ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: passwordError ? '#fef2f2' : '#fff',
                    transition: 'all 0.2s ease'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleDelete();
                    }
                  }}
                />
                {passwordError && (
                  <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
                    {passwordError}
                  </span>
                )}
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            borderRadius: '0 0 12px 12px'
          }}
        >
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.borderColor = '#94a3b8';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Cancelar
          </button>

          {step === 'confirmation' ? (
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(220, 38, 38, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Continuar con eliminación
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(220, 38, 38, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? 'Eliminando...' : 'Eliminar definitivamente'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default PuntoEmisionDeleteModal;
