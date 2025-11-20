import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import logo from '../assets/maximofactura.png';
import bgAsset from '../assets/factura-inicio.png';
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
    // left stays blue, right side uses orange tone
    backgroundImage: `linear-gradient(90deg, rgba(12,45,231,0.8), rgba(255,140,0,0.6)), url('${bgAsset}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación simple de email
    if (!email || !email.includes('@')) {
        setError('Por favor, ingrese un email válido.');
        return;
    }

    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(apiBase + '/api/password-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      // CASO 1: ÉXITO - Correo enviado
      if (response.ok) {
        show({ 
          title: 'Correo enviado', 
          message: `Se ha enviado un enlace de recuperación a ${email}. Por favor revisa tu bandeja de entrada y carpeta de spam. El enlace expirará en 60 minutos.`, 
          type: 'success' 
        }, 5000);
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
        return;
      }
      
      // CASO 2: THROTTLING - Usuario intentó muy rápido (< 60 segundos)
      if (response.status === 429) {
        // Procesar el mensaje para quitar decimales de los segundos
        // Ejemplo: "Por favor espera 54.222915 segundos" → "Por favor espera 54 segundos"
        let message = data.message;
        message = message.replace(/(\d+)\.\d+\s+segundos/g, '$1 segundos');
        
        show({ 
          title: 'Solicitud muy frecuente', 
          message: message, 
          type: 'info' 
        }, 5000);
        // NO llamar a setError() para evitar el mensaje rojo de fondo
        return;
      }
      
      // CASO 3: Email no encontrado
      if (response.status === 404) {
        show({ 
          title: 'Usuario no encontrado', 
          message: 'No existe una cuenta registrada con ese correo electrónico', 
          type: 'error' 
        }, 5000);
        setError('No existe una cuenta registrada con ese correo electrónico');
        return;
      }
      
      // CASO 4: Error del servidor
      if (response.status === 500) {
        show({ 
          title: 'Error del servidor', 
          message: 'Error al enviar el correo. Por favor intenta más tarde.', 
          type: 'error' 
        }, 5000);
        setError('Error al enviar el correo. Por favor intenta más tarde.');
        return;
      }
      
      // CASO 5: Otro error
      const errorMsg = data.message || 'No se pudo enviar el correo de recuperación';
      show({ 
        title: 'Error', 
        message: errorMsg, 
        type: 'error' 
      }, 5000);
      setError(errorMsg);
      
    } catch (error: any) {
      console.error('[PasswordRecovery] Error:', error);
      const errorMsg = 'Error de conexión con el servidor. Verifica que el backend esté en funcionamiento.';
      show({ 
        title: 'Error de conexión', 
        message: errorMsg, 
        type: 'error' 
      }, 5000);
      setError(errorMsg);
    }
  };  return (
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