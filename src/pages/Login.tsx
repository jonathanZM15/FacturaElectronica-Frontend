import React, { useState } from 'react';
import logo from '../assets/maximofactura.png';
import { useNavigate } from 'react-router-dom';
import bgAsset from '../assets/factura-inicio.jpg';
import './auth.css';
import { AuthCredentials } from '../types/interfaces';
import Notification from '../components/Notification/Notification';
import whatsappIcon from '../assets/icon-whatsapp.jpeg';

// Constantes de límites
const USERNAME_MAX_LENGTH = 40;
const PASSWORD_MAX_LENGTH = 30; 

const Login: React.FC = () => {
  const [creds, setCreds] = useState<AuthCredentials>({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [notif, setNotif] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  
  const [userError, setUserError] = useState<string | null>(null); 
  const [passError, setPassError] = useState<string | null>(null);

  const fakeAuth = async (c: AuthCredentials) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    
    if (c.username === 'admin' && c.password === 'Admin123!') {
      setNotif({ title: 'Inicio de sesión', message: 'Bienvenido de vuelta', type: 'success' });
      navigate('/Navbar');
    } else {
      setNotif({ title: 'Credenciales Incorrectas', message: 'Verifique por favor su usuario o contraseña. Reintente iniciar sesión', type: 'error' });
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
    backgroundImage: `linear-gradient(90deg, rgba(12, 45, 231, 0.8), rgba(63,8,143,0.55)), url('${finalUrl}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className="auth-bg" style={bgStyle}>
      <div className="auth-card">
        <img src={logo} alt="logo" className="auth-logo" />

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
                <span className="eye-icon">{showPass ? '👁️' : '👁️‍🗨️'}</span> 
              </button>
            </div>
            {/* 💡 Label "Contraseña:" debajo del input */}
            <label className="field-label">Contraseña:</label>
            {passError && <p className="validation-error">⚠️ {passError}</p>}
          </div>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'INICIAR SESIÓN'}
          </button>

          {/* 💡 Nuevo contenedor para el pie de página que se manejará con CSS */}
          <div className="auth-links-footer">
            <a href="https://wa.me/tunumero" target="_blank" rel="noopener noreferrer" className="support-link">
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