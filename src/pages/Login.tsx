import React, { useState } from 'react';
import logo from '../assets/maximofactura.png';
import bgAsset from '../assets/factura-inicio.jpg';
import './auth.css';
import { AuthCredentials } from '../types/interfaces';
import Notification from '../components/Notification/Notification';

const Login: React.FC = () => {
  const [creds, setCreds] = useState<AuthCredentials>({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [notif, setNotif] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fakeAuth = async (c: AuthCredentials) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
  // regla simple: usuario 'admin' pass 'Admin123!'
  if (c.username === 'admin' && c.password === 'Admin123!') {
      setNotif({ title: 'Inicio de sesión', message: 'Bienvenido de vuelta', type: 'success' });
    } else {
      setNotif({ title: 'Credenciales Incorrectas', message: 'Verifique por favor su usuario o contraseña. Reintente iniciar sesión', type: 'error' });
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fakeAuth(creds);
  };

  // use bundled background image (from src/assets)
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
          <div className="field-stack">
            <div className="auth-input-wrapper">
              <input
                className="auth-input"
                placeholder="Ingrese su usuario"
                value={creds.username}
                onChange={(e) => setCreds({ ...creds, username: e.target.value })}
              />
            </div>
            <label className="field-label">Usuario:</label>
          </div>

          <div className="field-stack">
            <div className="auth-input-wrapper">
              <input
                className="auth-input"
                type={showPass ? 'text' : 'password'}
                placeholder="******"
                value={creds.password}
                onChange={(e) => setCreds({ ...creds, password: e.target.value })}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)} aria-label="toggle">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            <label className="field-label">Contraseña:</label>
          </div>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'INICIAR SESIÓN'}
          </button>

          <div className="auth-links">
            <a className="support" href="/support">Soporte</a>
            <a className="forgot" href="/forgot">Olvidé mi contraseña</a>
          </div>
        </form>
      </div>

      {notif && (
        <Notification
          title={notif.title}
          message={notif.message}
          type={notif.type}
          onClose={() => setNotif(null)}
        />
      )}
    </div>
  );
};

export default Login;
