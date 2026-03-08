import React, { useState } from 'react';
import logo from '../../assets/maximofactura.png';
import api from '../../services/api';
import bgAsset from '../../assets/factura-inicio.png';
import './auth.css';
import { AuthCredentials } from '../../types/interfaces';
import { useUser } from '../../contexts/userContext';
import { useNotification } from '../../contexts/NotificationContext';
import whatsappIcon from '../../assets/icon-whatsapp.jpeg';
import LoadingSpinner from '../../components/LoadingSpinner';

// Constantes de límites
const USERNAME_MAX_LENGTH = 40;
const PASSWORD_MAX_LENGTH = 30; 

const Login: React.FC = () => {
  const [creds, setCreds] = useState<AuthCredentials>({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useUser();
  const { show } = useNotification();

  // navigate provided by context after login
  
  const [userError, setUserError] = useState<string | null>(null); 
  const [passError, setPassError] = useState<string | null>(null);

  const fakeAuth = async (c: AuthCredentials) => {
    setLoading(true);
    try {
      await login(c.username, c.password);
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const serverMessage = err?.response?.data?.message;
      
      // Si el servidor envió un mensaje específico (cuenta bloqueada, estado inactivo, etc.)
      if (statusCode === 403 && serverMessage) {
        // Cuenta bloqueada o estado no activo
        show({ 
          title: '⚠️ Acceso Denegado', 
          message: serverMessage, 
          type: 'warning' 
        }, 8000);
      } else if (serverMessage) {
        // Otro mensaje del servidor
        show({ 
          title: 'Credenciales Incorrectas', 
          message: serverMessage, 
          type: 'error' 
        });
      } else {
        // Mensaje genérico
        show({ 
          title: 'Credenciales Incorrectas', 
          message: 'Verifique por favor su usuario o contraseña. Reintente iniciar sesión', 
          type: 'error' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null); 
    setPassError(null);

    const { username, password } = creds;
    let hasError = false;

    // ... (Lógica de validación sin cambios) ...

    if (username.trim() === '') {
      setUserError('El campo Usuario no puede estar vacío.');
      hasError = true;
    } else if (username.length > USERNAME_MAX_LENGTH) {
      setUserError(`El usuario no puede exceder los ${USERNAME_MAX_LENGTH} caracteres.`);
      hasError = true;
    }

    if (password.trim() === '') {
      setPassError('El campo Contraseña no puede estar vacío.');
      hasError = true;
    } else if (password.length > PASSWORD_MAX_LENGTH) {
      setPassError(`La contraseña no puede exceder los ${PASSWORD_MAX_LENGTH} caracteres.`);
      hasError = true;
    }

    if (hasError) {
      return; 
    }

    fakeAuth(creds);
  };

  const finalUrl = bgAsset;

  const bgStyle: React.CSSProperties = {
    // left stays blue, right side changed to an orange tone
    backgroundImage: `linear-gradient(90deg, rgba(255,140,0,0.6), rgba(12,45,231,0.8)), url('${finalUrl}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  // The login screen must always show the static brand image.
  // We intentionally do NOT fetch the company logo here so it won't change when users upload a navbar logo.
  // Use the imported `logo` variable above (maximofactura.png).

  return (
    <div className="auth-bg" style={bgStyle}>
      <div className="auth-card">
  <img src={logo} alt="logo" className="auth-logo" />

        <h2 className="auth-title">Iniciar sesión</h2>

        <form className="auth-form" onSubmit={onSubmit}>
          {/* CAMPO EMAIL O USUARIO */}
          <div className="field-stack">
            <div className="auth-input-wrapper">
              <input
                className={`auth-input ${userError ? 'input-error' : ''}`}
                // 💡 Texto de placeholder igual al de la imagen
                placeholder="Ingrese su email o usuario" 
                value={creds.username}
                maxLength={USERNAME_MAX_LENGTH}
                onChange={(e) => {
                  setCreds({ ...creds, username: e.target.value });
                  if (userError) setUserError(null); 
                }}
              />
            </div>
            {/* 💡 Label "Email o usuario:" debajo del input */}
            <label className="field-label">Email o usuario:</label> 
            {userError && <p className="validation-error">⚠️ {userError}</p>}
          </div>

          {/* CAMPO CONTRASEÑA */}
          <div className="field-stack">
            <div className="auth-input-wrapper">
              <input
                className={`auth-input ${passError ? 'input-error' : ''}`}
                type={showPass ? 'text' : 'password'}
                // 💡 Placeholder como en la imagen deseada
                placeholder="******" 
                value={creds.password}
                maxLength={PASSWORD_MAX_LENGTH}
                onChange={(e) => {
                  setCreds({ ...creds, password: e.target.value });
                  if (passError) setPassError(null);
                }}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)} aria-label="toggle">
                {/* 💡 El ícono de ojo/ojo tachado es más limpio */}
                <span className="eye-icon">{showPass ? '🙉' : '🙈'}</span> 
              </button>
            </div>
            {/* 💡 Label "Contraseña:" debajo del input */}
            <label className="field-label">Contraseña:</label>
            {passError && <p className="validation-error">⚠️ {passError}</p>}
          </div>

          {/* Buttons row: primary action */}
          <div className="buttons-row">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? (
                <LoadingSpinner
                  inline
                  size={20}
                />
              ) : (
                'INICIAR SESIÓN'
              )}
            </button>
          </div>

          {/* Nuevo contenedor para el pie de página */}
          <div className="auth-links-footer">
            <a href="https://wa.me/message/72PVPYUWIIPOG1" target="_blank" rel="noopener noreferrer" className="support-link">
              Soporte <img src={whatsappIcon} alt="WhatsApp" className="whatsapp-icon" />
            </a>
            <a className="forgot" href="/PasswordRecovery">Olvidé mi contraseña</a>
          </div>
        </form>
      </div>
      {/* ... (Notificación) ... */}
    </div>
  );
};

export default Login;