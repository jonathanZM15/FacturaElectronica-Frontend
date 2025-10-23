import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import logo from '../assets/maximofactura.png';
import bgAsset from '../assets/factura-inicio.jpg';
import whatsappIcon from '../assets/icon-whatsapp.jpeg';
import './PasswordRecovery.css';

const PasswordRecovery: React.FC = () => {
 const [email, setEmail] = useState('');
 const [error, setError] = useState('');
 const { show } = useNotification();
 const navigate = useNavigate();

 // Efecto para limpiar el mensaje de error después de 4 segundos
 useEffect(() => {
  let timeoutId: NodeJS.Timeout;
   if (error) {
   timeoutId = setTimeout(() => {
  setError('');
     }, 4000); 
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [error]);

  const bgStyle: React.CSSProperties = {
      backgroundImage: `linear-gradient(90deg, rgba(12, 45, 231, 0.8), rgba(63,8,143,0.55)), url('${bgAsset}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación simple de email (puedes mejorar esto)
    if (!email || !email.includes('@')) {
        setError('Por favor, ingrese un email válido.');
        return;
    }

        try {
            const res = await api.post('/api/password-recovery', { email });
                    if (res.status === 200) {
                        show({ title: 'Contraseña actualizada', message: 'Se actualizó contraseña de usuario exitosamente, inicie sesión', type: 'success' });
                        navigate('/');
                    }
        } catch (err: any) {
                    if (err.response && err.response.status === 404) {
                        show({ title: 'Usuario inválido', message: 'El email no se encuentra registrado.', type: 'error' });
                    } else if (err.response && err.response.data && err.response.data.errors) {
                        show({ title: 'Error', message: Object.values(err.response.data.errors).join(', '), type: 'error' });
                    } else {
                        show({ title: 'Error de red', message: 'Ocurrió un error de red. Intente de nuevo.', type: 'error' });
                    }
        }
  };

  return (
    <div className="auth-bg" style={bgStyle}>
      <div className="auth-card">
        <img src={logo} alt="Máximo Facturas Logo" className="auth-logo" />
        
        {/* Usamos una clase de título que podemos alinear con CSS */}
        <h2 className="recovery-title">Recuperar contraseña</h2> 
        
        <form className="auth-form" onSubmit={handleSubmit}>
            {/* 💡 Envolver en field-stack para el diseño */}
            <div className="field-stack">
                <div className="auth-input-wrapper">
                    <input
                        type="email"
                        // Usamos la misma clase de estilo que el login
                        className={`auth-input ${error ? 'input-error' : ''}`}
                        placeholder="Ingrese el correo asociado a su cuenta"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                        }}
                        autoComplete="email"
                    />
                </div>
                {/* 💡 Label debajo del input */}
                <label className="field-label">Email:</label>
                {/* Mostrar error de validación bajo el campo */}
                {error && <p className="validation-error">⚠️ {error}</p>} 
            </div>


            {/* 💡 Botones */}
            <div className="buttons-container-recovery"> 
            <button 
                type="button" 
                className="cancel-button"
                onClick={() => navigate('/')}
            >
                CANCELAR
            </button>
            <button type="submit" className="submit-button">
                ENVIAR
            </button>
            </div>
        </form>
        
        {/* 💡 Soporte se saca del formulario y se posiciona de forma absoluta */}
        <div className="support-footer-recovery">
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

      {/* 💡 El mensaje de error flotante ya está bien y se mantiene */}
      {error && (
        <div className="floating-error-container">
          <div className="error-content">
            <div className="error-title">Error de validación</div>
            <div className="error-description">{error}</div>
          </div>
          <div className="error-icon" onClick={() => setError('')}>✕</div>
        </div>
      )}
    </div>
  );
};

export default PasswordRecovery;