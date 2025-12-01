import React, { useState, useEffect } from 'react';
import logo from '../assets/maximofactura.png';
import whatsappIcon from '../assets/icon-whatsapp.jpeg';
import './cambiarPassword.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { auth } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

type Props = {
  onSubmit?: (newPassword: string) => Promise<void>;
};

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Regex: al menos una minúscula, una mayúscula, un dígito y un carácter especial, mínimo 8
const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const CambiarPassword: React.FC<Props> = ({ onSubmit }) => {
  const query = useQuery();
  const navigate = useNavigate();

  const token = query.get('token') || '';
  const email = query.get('email') || '';
  const [emailState, setEmailState] = useState(email);
  // aceptar token solo (sin email) para mayor compatibilidad con enlaces que solo incluyan token
  const hasToken = Boolean(token);
  const { user, logout } = useUser();
  const isAuthenticated = Boolean(user);
  // modulos de uso: modo público (link con token) o modo autenticado (usuario logueado)
  const publicMode = hasToken;
  const authedMode = !hasToken && isAuthenticated;

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});
  // Estados de visibilidad independientes por campo
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const { show } = useNotification();

  useEffect(() => {
    setMessage(null);
    setErrors({});
  }, [password, passwordConfirmation]);

  const validate = () => {
    const errs: Record<string,string> = {};
    if (!passwordRules.test(password)) {
      errs.password = 'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.';
    }
    if (password !== passwordConfirmation) {
      errs.password_confirmation = 'Las contraseñas no coinciden.';
    }
    return errs;
  };

  const handleSubmitPublic = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    // el backend valida token + email, así que pedimos email si no viene en la query
    if (!emailState) {
      setErrors({ general: 'Por favor ingrese el correo asociado a su cuenta.' });
      return;
    }
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setLoading(true);
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
      const url = apiBase + '/api/password-reset';
      console.log('[CambiarPassword] Enviando POST a:', url);
      console.log('[CambiarPassword] Datos:', { email: emailState, token, password: '***', password_confirmation: '***' });
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: emailState,
          token,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      
      console.log('[CambiarPassword] Respuesta status:', res.status);

      // Manejo robusto: si la respuesta no es JSON (por ejemplo HTML de error), leer texto
      const contentType = res.headers.get('content-type') || '';
      let json: any = null;
      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        json = { message: text.substring(0, 1000) };
        console.debug('[CambiarPassword] response text (non-json):', text.substring(0, 2000));
      }

      if (res.ok) {
        setMessage('Contraseña actualizada correctamente. Serás redirigido al login.');
        // mostrar notificación bonita en esquina inferior derecha
        try { show({ title: 'Contraseña actualizada', message: 'Se redirigirá al login', type: 'success' }, 3000); } catch {}
        setTimeout(() => navigate('/'), 2000);
      } else {
        const msg = json?.message || 'Error al restablecer contraseña';
        setErrors({ general: msg });
        try { show({ title: 'Error', message: String(msg), type: 'error' }, 5000); } catch {}
      }
    } catch (err: any) {
      const msg = err?.message || 'Error de red';
      setErrors({ general: msg });
      try { show({ title: 'Error de red', message: String(msg), type: 'error' }, 5000); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAuthed = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    // Si se pasó onSubmit (via wrapper en App) usarlo, si no, usar auth directamente
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(password);
      } else {
        // flujo cuando el componente se usa en ruta protegida pero sin prop onSubmit
        if (!currentPassword) {
          setErrors({ general: 'Por favor ingrese su contraseña actual.' });
          setLoading(false);
          return;
        }
        // llamar al endpoint autenticado
        await auth.cambiarPassword(currentPassword, password);
        // forzar logout para que el usuario vuelva a iniciar sesión
        await logout();
      }
      setMessage('Contraseña actualizada correctamente. Serás redirigido al login.');
      try { show({ title: 'Contraseña actualizada', message: 'Se redirigirá al login', type: 'success' }, 3000); } catch {}
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al cambiar contraseña';
      setErrors({ general: msg });
      try { show({ title: 'Error', message: String(msg), type: 'error' }, 5000); } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-password-container">
      <div className="update-password-card">
        <img src={logo} alt="Máximo Facturas" className="update-password-logo" />
        
        <p className="update-password-requirements">
          La contraseña debe tener un mínimo de 8 caracteres,
          incluyendo al menos una letra mayúscula, una letra
          minúscula, un número y un caracter especial.
        </p>

        <form onSubmit={publicMode ? handleSubmitPublic : handleSubmitAuthed} className="update-password-form">
          {/* Si es modo público y no tenemos email en la query, pedir email al usuario */}
          {publicMode && !emailState && (
            <div className="password-field">
              <div className="input-group">
                <input
                  type="email"
                  value={emailState}
                  onChange={(e) => setEmailState(e.target.value)}
                  className="password-input"
                  placeholder="Ingrese el correo asociado a su cuenta"
                />
              </div>
              <label className="password-label">Email</label>
            </div>
          )}
          <div className="password-field">
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="password-input"
                placeholder="Ingrese la nueva contraseña"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "🙉" : "🙈"}
              </button>
            </div>
            <label className="password-label">Contraseña:</label>
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <div className="password-field">
            <div className="input-group">
              <input
                type={showPasswordConfirmation ? "text" : "password"}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="password-input"
                placeholder="Vuelva a ingresar la nueva contraseña"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                aria-label={showPasswordConfirmation ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPasswordConfirmation ? "🙉" : "🙈"}
              </button>
            </div>
            <label className="password-label">Confirmación de contraseña:</label>
            {errors.password_confirmation && <div className="field-error">{errors.password_confirmation}</div>}
          </div>

          {/* Si estamos en modo autenticado mostrar campo de contraseña actual */}
          {authedMode && (
            <div className="password-field">
              <div className="input-group">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="password-input"
                    placeholder="Contraseña actual"
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                  >
                    {showCurrentPassword ? '🙉' : '🙈'}
                  </button>
                </div>
              <label className="password-label">Contraseña actual</label>
            </div>
          )}

          {errors.general && <div className="form-error">{errors.general}</div>}
          {message && <div className="form-success">{message}</div>}

          <div className="form-actions">
            <button 
              type="submit" 
              className="update-button"
              disabled={loading || !password || !passwordConfirmation}
            >
              {loading ? (
                <LoadingSpinner inline size={18} message="Procesando…" />
              ) : (
                publicMode ? 'Actualizar contraseña' : 'ACTUALIZAR'
              )}
            </button>
          </div>
        </form>

        <a 
          href="https://wa.me/message/72PVPYUWIIPOG1"
          target="_blank"
          rel="noopener noreferrer"
          className="support-link"
        >
          Soporte
          <img src={whatsappIcon} alt="WhatsApp" className="whatsapp-icon" />
        </a>
      </div>
    </div>
  );
};

export default CambiarPassword;