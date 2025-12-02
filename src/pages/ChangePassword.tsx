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

        <div className="update-password-requirements">
          <p style={{ fontWeight: 600, marginBottom: '12px', color: '#0d6efd' }}>
            📋 Requisitos de la contraseña:
          </p>
          <ul style={{ 
            textAlign: 'left', 
            paddingLeft: '24px', 
            marginTop: '8px',
            lineHeight: '1.8'
          }}>
            <li>Mínimo 8 caracteres</li>
            <li>Al menos una letra mayúscula (A-Z)</li>
            <li>Al menos una letra minúscula (a-z)</li>
            <li>Al menos un número (0-9)</li>
            <li>Al menos un carácter especial (!@#$%^&*)</li>
          </ul>
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
                {showPassword ? '👁️' : '👁️‍🗨️'}
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
                {showPasswordConfirmation ? '👁️' : '👁️‍🗨️'}
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
          padding: '16px', 
          background: 'rgba(13, 110, 253, 0.05)',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <p style={{ margin: 0 }}>
            💡 <strong>Consejo de seguridad:</strong> Usa una contraseña única que no hayas usado en otros sitios.
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
