import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/maximofactura.png';
import './cambiarPassword.css';
import LoadingSpinner from '../../components/LoadingSpinner';
import { auth } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ConfirmEmailChange: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') || '';
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { show } = useNotification();
  
  // Ref para evitar llamadas duplicadas (React Strict Mode ejecuta useEffect dos veces)
  const confirmationAttempted = useRef(false);

  useEffect(() => {
    const confirmEmailChange = async () => {
      // Evitar llamadas duplicadas
      if (confirmationAttempted.current) {
        return;
      }
      confirmationAttempted.current = true;

      if (!token) {
        setErrorMessage('Token de confirmación no válido. Por favor, revisa el enlace que recibiste por correo.');
        setLoading(false);
        return;
      }

      try {
        const response = await auth.confirmEmailChange(token);
        
        if (response.status === 200) {
          setSuccess(true);
          show({ 
            title: '✅ Email Confirmado', 
            message: 'Tu nuevo correo electrónico ha sido confirmado exitosamente.', 
            type: 'success' 
          }, 5000);
          
          // Redirigir al login después de 5 segundos
          setTimeout(() => {
            navigate('/login');
          }, 5000);
        }
      } catch (error: any) {
        const statusCode = error?.response?.status;
        const errorCode = error?.response?.data?.code;
        const message = error?.response?.data?.message || 'Error al confirmar el cambio de email.';
        
        // Si el token ya fue usado (409 Conflict)
        if (statusCode === 409 || errorCode === 'TOKEN_ALREADY_USED') {
          setAlreadyUsed(true);
          // No mostrar notificación de error, solo la pantalla informativa
        } else {
          setErrorMessage(message);
          show({ 
            title: '❌ Error', 
            message, 
            type: 'error' 
          }, 6000);
        }
      } finally {
        setLoading(false);
      }
    };

    confirmEmailChange();
  }, [token, navigate, show]);

  return (
    <div className="update-password-container">
      <div className="update-password-card">
        <img src={logo} alt="Máximo Facturas" className="update-password-logo" />
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LoadingSpinner />
            <h2 style={{ color: '#0d6efd', marginTop: '24px', fontSize: '24px' }}>
              Confirmando tu nuevo correo...
            </h2>
            <p style={{ color: '#666', marginTop: '12px', fontSize: '16px' }}>
              Por favor espera un momento
            </p>
          </div>
        )}

        {!loading && success && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '24px',
              animation: 'bounce 1s ease-in-out'
            }}>
              ✅
            </div>
            <h2 style={{ 
              color: '#0d6efd', 
              marginBottom: '16px', 
              fontSize: '28px',
              fontWeight: 700
            }}>
              ¡Cambio de Email Confirmado!
            </h2>
            <div className="update-password-requirements">
              <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                <strong>Tu correo electrónico ha sido actualizado</strong>
              </p>
              <p style={{ marginBottom: '8px' }}>
                📧 Tu nueva dirección de correo ya está activa en tu cuenta
              </p>
              <p style={{ marginBottom: '8px' }}>
                🔐 Usa esta dirección para iniciar sesión en el futuro
              </p>
              <p style={{ marginTop: '20px', color: '#0d6efd', fontWeight: 600 }}>
                Serás redirigido al login en unos segundos...
              </p>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="update-button"
              style={{ marginTop: '24px' }}
            >
              Ir al Login Ahora
            </button>
          </div>
        )}

        {!loading && alreadyUsed && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '24px'
            }}>
              ⚠️
            </div>
            <h2 style={{ 
              color: '#fd7e14', 
              marginBottom: '16px', 
              fontSize: '28px',
              fontWeight: 700
            }}>
              Enlace Ya Utilizado
            </h2>
            <div className="update-password-requirements" style={{ 
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '500px',
              margin: '0 auto 24px'
            }}>
              <p style={{ marginBottom: '12px', fontSize: '16px', color: '#856404' }}>
                <strong>Este enlace de confirmación ya fue utilizado anteriormente</strong>
              </p>
              <p style={{ marginBottom: '8px', color: '#856404' }}>
                ✅ El cambio de correo ya fue confirmado exitosamente
              </p>
              <p style={{ marginBottom: '8px', color: '#856404' }}>
                📧 Tu nueva dirección de correo ya está activa
              </p>
              <p style={{ marginBottom: '8px', color: '#856404' }}>
                🔐 Cada enlace de confirmación solo puede usarse una vez
              </p>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="update-button"
              style={{ marginTop: '24px' }}
            >
              Ir al Login
            </button>
          </div>
        )}

        {!loading && !success && !alreadyUsed && errorMessage && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '24px'
            }}>
              ❌
            </div>
            <h2 style={{ 
              color: '#dc3545', 
              marginBottom: '16px', 
              fontSize: '28px',
              fontWeight: 700
            }}>
              Error en la Confirmación
            </h2>
            <div className="update-password-requirements" style={{ 
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '500px',
              margin: '0 auto 24px'
            }}>
              <p style={{ marginBottom: '12px', fontSize: '16px', color: '#721c24' }}>
                <strong>{errorMessage}</strong>
              </p>
              <p style={{ marginBottom: '0', color: '#721c24' }}>
                💡 Si los problemas persisten, contacta a soporte técnico
              </p>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="update-button"
              style={{ marginTop: '24px' }}
            >
              Volver al Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmailChange;
