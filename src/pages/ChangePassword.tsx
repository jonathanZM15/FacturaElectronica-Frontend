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

// Regex: al menos una minúscula, una mayúscula, un dígito y un carácter especial, mínimo 8
const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const ChangePassword: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') || '';
  
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const { show } = useNotification();

  useEffect(() => {
    if (!token) {
      setErrors({ general: 'Token de verificación no válido. Por favor, revisa el enlace que recibiste por correo.' });
    }
  }, [token]);

  useEffect(() => {
    setErrors({});
  }, [password, passwordConfirmation]);

  const validate = () => {
    const errs: Record<string, string> = {};
    
    if (!password) {
      errs.password = 'La contraseña es requerida.';
    } else if (!passwordRules.test(password)) {
      errs.password = 'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.';
    }
    
    if (!passwordConfirmation) {
      errs.password_confirmation = 'Debes confirmar la contraseña.';
    } else if (password !== passwordConfirmation) {
      errs.password_confirmation = 'Las contraseñas no coinciden.';
    }
    
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      show({ 
        title: '❌ Error', 
        message: 'Token no válido', 
        type: 'error' 
      }, 5000);
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    
    try {
      const response = await auth.changeInitialPassword(token, password, passwordConfirmation);
      
      if (response.status === 200) {
        show({ 
          title: '✅ Contraseña Establecida', 
          message: 'Ya puedes iniciar sesión con tu nueva contraseña', 
          type: 'success' 
        }, 5000);
        
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al establecer la contraseña. El token puede haber expirado o ya fue usado.';
      setErrors({ general: message });
      show({ 
        title: '❌ Error', 
        message, 
        type: 'error' 
      }, 6000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-password-container">
      <div className="update-password-card">
        <img src={logo} alt="Máximo Facturas" className="update-password-logo" />
        
        <h2 style={{ 
          color: '#0d6efd', 
          marginBottom: '8px', 
          fontSize: '28px',
          fontWeight: 700
        }}>
          Establece tu Contraseña
        </h2>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '24px', 
          fontSize: '16px' 
        }}>
          Crea una contraseña segura para tu cuenta
        </p>

        <div className="update-password-requirements" style={{
          background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e0e7ff',
          marginBottom: '28px'
        }}>
          <p style={{ 
            fontWeight: 700, 
            marginBottom: '20px', 
            color: '#0d6efd',
            fontSize: '17px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '22px' }}>📋</span>
            Requisitos de la contraseña:
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            <div style={{ 
              padding: '12px 16px', 
              background: 'white',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(13, 110, 253, 0.1)',
              fontSize: '14px',
              color: '#333',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ 
                color: '#0d6efd', 
                fontSize: '20px', 
                fontWeight: 'bold',
                minWidth: '20px',
                textAlign: 'center'
              }}>✓</span>
              <span>Mínimo 8 caracteres</span>
            </div>
            <div style={{ 
              padding: '12px 16px', 
              background: 'white',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(13, 110, 253, 0.1)',
              fontSize: '14px',
              color: '#333',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ 
                color: '#0d6efd', 
                fontSize: '20px', 
                fontWeight: 'bold',
                minWidth: '20px',
                textAlign: 'center'
              }}>✓</span>
              <span>Una letra mayúscula (A-Z)</span>
            </div>
            <div style={{ 
              padding: '12px 16px', 
              background: 'white',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(13, 110, 253, 0.1)',
              fontSize: '14px',
              color: '#333',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ 
                color: '#0d6efd', 
                fontSize: '20px', 
                fontWeight: 'bold',
                minWidth: '20px',
                textAlign: 'center'
              }}>✓</span>
              <span>Una letra minúscula (a-z)</span>
            </div>
            <div style={{ 
              padding: '12px 16px', 
              background: 'white',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(13, 110, 253, 0.1)',
              fontSize: '14px',
              color: '#333',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ 
                color: '#0d6efd', 
                fontSize: '20px', 
                fontWeight: 'bold',
                minWidth: '20px',
                textAlign: 'center'
              }}>✓</span>
              <span>Un número (0-9)</span>
            </div>
            <div style={{ 
              padding: '12px 16px', 
              background: 'white',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(13, 110, 253, 0.1)',
              fontSize: '14px',
              color: '#333',
              gridColumn: 'span 2',
              maxWidth: '400px',
              margin: '0 auto',
              width: '100%',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ 
                color: '#0d6efd', 
                fontSize: '20px', 
                fontWeight: 'bold',
                minWidth: '20px',
                textAlign: 'center'
              }}>✓</span>
              <span>Un carácter especial (!@#$%^&*)</span>
            </div>
          </div>
        </div>

        {errors.general && (
          <div className="form-error" style={{ marginBottom: '20px' }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="update-password-form">
          <div className="password-field">
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                className="password-input"
                placeholder="Nueva Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !token}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || !token}
                aria-label="Mostrar/Ocultar contraseña"
              >
                {showPassword ? '🐵' : '🙈'}
              </button>
            </div>
            {errors.password && (
              <div className="field-error">{errors.password}</div>
            )}
          </div>

          <div className="password-field">
            <div className="input-group">
              <input
                type={showPasswordConfirmation ? 'text' : 'password'}
                className="password-input"
                placeholder="Confirmar Contraseña"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                disabled={loading || !token}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                disabled={loading || !token}
                aria-label="Mostrar/Ocultar confirmación"
              >
                {showPasswordConfirmation ? '🐵' : '🙈'}
              </button>
            </div>
            {errors.password_confirmation && (
              <div className="field-error">{errors.password_confirmation}</div>
            )}
          </div>

          <div className="form-actions">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <button 
                type="submit" 
                className="update-button"
                disabled={!token}
              >
                🔐 Establecer Contraseña
              </button>
            )}
          </div>
        </form>

        <div style={{ 
          marginTop: '32px',
          marginBottom: '48px',
          padding: '18px 20px', 
          background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.08) 100%)',
          borderLeft: '4px solid #ffc107',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <span>
              <strong style={{ color: '#f59e0b' }}>Consejo de seguridad:</strong> Usa una contraseña única que no hayas usado en otros sitios.
            </span>
          </p>
        </div>

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
    </div>
  );
};

export default ChangePassword;
