import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/maximofactura.png';
import whatsappIcon from '../assets/icon-whatsapp.jpeg';
import './cambiarPassword.css';
import LoadingSpinner from '../components/LoadingSpinner';
import { auth } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifyEmail: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') || '';
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { show } = useNotification();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setErrorMessage('Token de verificación no válido. Por favor, revisa el enlace que recibiste por correo.');
        setLoading(false);
        return;
      }

      try {
        const response = await auth.verifyEmail(token);
        
        if (response.status === 200) {
          setSuccess(true);
          show({ 
            title: '✅ Email Verificado', 
            message: 'Tu cuenta ha sido activada. Revisa tu correo para establecer tu contraseña.', 
            type: 'success' 
          }, 5000);
          
          // Redirigir al login después de 5 segundos
          setTimeout(() => {
            navigate('/login');
          }, 5000);
        }
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Error al verificar el email. El token puede haber expirado o ya fue usado.';
        setErrorMessage(message);
        show({ 
          title: '❌ Error', 
          message, 
          type: 'error' 
        }, 6000);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate, show]);

  return (
    <div className="update-password-container">
      <div className="update-password-card">
        <img src={logo} alt="Máximo Facturas" className="update-password-logo" />
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LoadingSpinner />
            <h2 style={{ color: '#0d6efd', marginTop: '24px', fontSize: '24px' }}>
              Verificando tu email...
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
              ¡Email Verificado Exitosamente!
            </h2>
            <div className="update-password-requirements">
              <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                <strong>Tu cuenta ha sido activada</strong>
              </p>
              <p style={{ marginBottom: '8px' }}>
                📧 Hemos enviado un correo electrónico a tu bandeja de entrada
              </p>
              <p style={{ marginBottom: '8px' }}>
                🔐 Sigue las instrucciones para establecer tu contraseña personalizada
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

        {!loading && errorMessage && (
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
              Error en la Verificación
            </h2>
            <div className="form-error" style={{ 
              maxWidth: '500px', 
              margin: '0 auto 24px',
              fontSize: '16px',
              padding: '16px'
            }}>
              {errorMessage}
            </div>
            <div className="update-password-requirements">
              <p style={{ marginBottom: '8px' }}>
                ℹ️ El enlace de verificación puede haber expirado (24 horas de validez)
              </p>
              <p style={{ marginBottom: '8px' }}>
                🔄 Contacta al administrador para solicitar un nuevo enlace
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

        <a 
          href="https://wa.me/593987654321" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="support-link"
        >
          <img src={whatsappIcon} alt="WhatsApp" style={{ width: 28, height: 28 }} />
          <span>Soporte</span>
        </a>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
