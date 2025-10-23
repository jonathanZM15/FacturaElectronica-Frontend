import React, { useState } from 'react';
import logo from '../assets/maximofactura.png';
import whatsappIcon from '../assets/icon-whatsapp.jpeg';
import './cambiarPassword.css';

interface UpdatePasswordProps {
  onSubmit?: (newPassword: string) => Promise<void>;
  onCancel?: () => void;
}

/**
 * Componente para actualización de contraseña.
 * Incluye validación de coincidencia entre campos y requisitos mínimos.
 * 
 * @param onSubmit - Callback opcional para manejar el envío del formulario
 * @param onCancel - Callback opcional para manejar cancelación
 */
const CambiarPassword: React.FC<UpdatePasswordProps> = ({ onSubmit, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validación de requisitos de contraseña
  const validatePassword = (pass: string): boolean => {
    const hasMinLength = pass.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    
    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(password)) {
      // La validación fallida se maneja en la UI con el mensaje existente
      return;
    }
    if (password !== confirmPassword) {
      // La validación de coincidencia se maneja en la UI
      return;
    }
    
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(password);
      }
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

        <form onSubmit={handleSubmit} className="update-password-form">
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
                {showPassword ? "👁" : "👁"}
              </button>
            </div>
            <label className="password-label">Contraseña</label>
          </div>

          <div className="password-field">
            <div className="input-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="password-input"
                placeholder="Vuelva a ingresar la nueva contraseña"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? "👁" : "👁"}
              </button>
            </div>
            <label className="password-label">Confirmación de contraseña:</label>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="update-button"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'Actualizando...' : 'ACTUALIZAR'}
            </button>
          </div>
        </form>

        <a 
          href="https://wa.me/tunumero"
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