import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import { usuariosEmisorApi } from '../services/usuariosEmisorApi';
import { User } from '../types/user';
import './UsuarioFormModal.css';
import LoadingSpinner from '../components/LoadingSpinner';

interface EmisorUsuarioFormModalProps {
  open: boolean;
  onClose: () => void;
  emiId: string | number;
  editingId?: string | number | null;
  initialData?: User | null;
  establecimientos: Array<{ id: number; nombre: string; codigo: string }>;
  puntosEmision: Array<{ id: number; nombre: string; establecimiento_id: number }>;
  onCreated?: (usuario: User) => void;
  onUpdated?: (usuario: User) => void;
}

const EmisorUsuarioFormModal: React.FC<EmisorUsuarioFormModalProps> = ({
  open,
  onClose,
  emiId,
  editingId,
  initialData,
  establecimientos,
  puntosEmision,
  onCreated,
  onUpdated
}) => {
  const { show } = useNotification();
  const { user: currentUser } = useUser();
  
  const [cedula, setCedula] = React.useState('');
  const [nombres, setNombres] = React.useState('');
  const [apellidos, setApellidos] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<string>('gerente');
  const [selectedEstablecimientos, setSelectedEstablecimientos] = React.useState<number[]>([]);
  const [selectedPuntosPorEstablecimiento, setSelectedPuntosPorEstablecimiento] = React.useState<Record<number, number | null>>({});
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [checkingEmail, setCheckingEmail] = React.useState(false);
  const [checkingUsername, setCheckingUsername] = React.useState(false);
  const [resendingEmail, setResendingEmail] = React.useState(false);
  const [estado, setEstado] = React.useState<string>('nuevo');
  const isEditing = React.useMemo(() => Boolean(editingId), [editingId]);

  // Obtener roles permitidos según el rol del usuario actual
  const getRolesPermitidos = React.useMemo(() => {
    if (!currentUser) return [];
    const rol = currentUser.role;
    
    const rolesMap: Record<string, string[]> = {
      administrador: ['emisor', 'gerente', 'cajero'],
      distribuidor: ['emisor', 'gerente', 'cajero'],
      emisor: ['gerente', 'cajero'],
      gerente: ['cajero'],
      cajero: []
    };
    
    return rolesMap[rol] || [];
  }, [currentUser]);

  const activeEstablecimientos = React.useMemo(() => {
    if (role === 'emisor') {
      return establecimientos.map(est => est.id);
    }
    return selectedEstablecimientos;
  }, [role, establecimientos, selectedEstablecimientos]);

  React.useEffect(() => {
    setSelectedPuntosPorEstablecimiento((prev) => {
      const next: Record<number, number | null> = {};
      let changed = false;

      activeEstablecimientos.forEach((estId) => {
        const prevValue = Object.prototype.hasOwnProperty.call(prev, estId) ? prev[estId] : null;
        const isValid = prevValue && puntosEmision.some(
          (p) => p.id === prevValue && Number(p.establecimiento_id) === Number(estId)
        ) ? prevValue : null;
        next[estId] = isValid;
        if (!changed && isValid !== prevValue) {
          changed = true;
        }
      });

      if (!changed) {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) {
          changed = true;
        } else {
          for (const key of prevKeys) {
            if (!Object.prototype.hasOwnProperty.call(next, Number(key))) {
              changed = true;
              break;
            }
          }
        }
      }

      return changed ? next : prev;
    });
  }, [activeEstablecimientos, puntosEmision]);

  const handlePuntoSelection = React.useCallback((estId: number, value: string) => {
    setSelectedPuntosPorEstablecimiento((prev) => ({
      ...prev,
      [estId]: value ? Number(value) : null
    }));
  }, []);

  const getPuntosForEstablecimiento = React.useCallback((estId: number) => {
    return puntosEmision.filter((p) => Number(p.establecimiento_id) === Number(estId));
  }, [puntosEmision]);

  React.useEffect(() => {
    if (open && initialData) {
      setCedula(initialData.cedula || '');
      setNombres(initialData.nombres || '');
      setApellidos(initialData.apellidos || '');
      setUsername(initialData.username || '');
      setEmail(initialData.email);
      setRole(initialData.role || 'gerente');
      setEstado(initialData.estado || 'nuevo');
      setSelectedEstablecimientos([]);
      setSelectedPuntosPorEstablecimiento({});
    } else if (open) {
      // Reset form
      setCedula('');
      setNombres('');
      setApellidos('');
      setUsername('');
      setEmail('');
      setRole(getRolesPermitidos.length > 0 ? getRolesPermitidos[0] : 'gerente');
      setEstado('nuevo');
      setSelectedEstablecimientos([]);
      setSelectedPuntosPorEstablecimiento({});
    }
    setErrors({});
  }, [open, initialData, getRolesPermitidos]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!cedula.match(/^\d{10}$/)) {
      newErrors.cedula = 'Debe contener exactamente 10 dígitos';
    }
    if (!nombres.match(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s\-'`]+$/) || nombres.length < 3) {
      newErrors.nombres = 'Solo letras, mínimo 3 caracteres';
    }
    if (!apellidos.match(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s\-'`]+$/) || apellidos.length < 3) {
      newErrors.apellidos = 'Solo letras, mínimo 3 caracteres';
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Email inválido';
    }
    if (username.length < 3) {
      newErrors.username = 'Mínimo 3 caracteres';
    }

    // Validar restricciones de asociación por rol
    if (role === 'emisor') {
      // Emisor: establecimientos opcionales
    } else if (role === 'gerente' || role === 'cajero') {
      // Gerente y Cajero: establecimientos obligatorios
      if (selectedEstablecimientos.length === 0) {
        newErrors.establecimientos = 'Debe seleccionar al menos un establecimiento';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);

    let error = '';
    if (value.length > 0 && value.length < 3) {
      error = 'El nombre de usuario debe tener al menos 3 caracteres';
    }
    setErrors((prev) => ({ ...prev, username: error }));

    // Verificar disponibilidad si tiene al menos 3 caracteres
    if (value.length >= 3 && (!isEditing || value !== initialData?.username)) {
      const timer = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          await usuariosEmisorApi.checkUsername(value);
          setErrors((prev) => ({ ...prev, username: '❌ Este nombre de usuario ya existe' }));
        } catch (err: any) {
          if (err?.response?.status === 404) {
            setErrors((prev) => ({ ...prev, username: '' }));
          } else {
            show({ title: 'Error', message: 'No se pudo verificar el nombre de usuario', type: 'error' });
          }
        } finally {
          setCheckingUsername(false);
        }
      }, 500);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    let error = '';
    if (value.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.includes('@')) {
        error = 'El correo debe contener @';
      } else if (!emailRegex.test(value)) {
        error = 'Email inválido. Use formato: usuario@dominio.com';
      }
    }
    setErrors((prev) => ({ ...prev, email: error }));

    // Verificar disponibilidad si tiene formato correcto
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value.length > 0 && emailRegex.test(value) && (!isEditing || value !== initialData?.email)) {
      const timer = setTimeout(async () => {
        setCheckingEmail(true);
        try {
          await usuariosEmisorApi.checkEmail(value);
          setErrors((prev) => ({ ...prev, email: '❌ Este correo ya está registrado' }));
        } catch (err: any) {
          if (err?.response?.status === 404) {
            setErrors((prev) => ({ ...prev, email: '' }));
          } else {
            show({ title: 'Error', message: 'No se pudo verificar el correo', type: 'error' });
          }
        } finally {
          setCheckingEmail(false);
        }
      }, 500);
    }
  };

  const handleResendEmail = async () => {
    if (!editingId) return;

    setResendingEmail(true);
    try {
      let nuevoEstado = estado;
      if (estado === 'retirado' || estado === 'suspendido') {
        nuevoEstado = 'pendiente_verificacion';
      }

      const response = await usuariosEmisorApi.resendVerificationEmail(emiId, editingId, nuevoEstado);
      
      if (nuevoEstado !== estado) {
        setEstado(nuevoEstado);
      }

      const mensajes: Record<string, { title: string; message: string }> = {
        nuevo: {
          title: '✉️ Correo Reenviado',
          message: `Correo de verificación enviado a ${email}. El usuario debe verificar su cuenta para activarla.`
        },
        retirado: {
          title: '🔄 Proceso de Reactivación Iniciado',
          message: `Correo de reactivación enviado a ${email}. Estado cambiado a Pendiente Verificación.`
        },
        suspendido: {
          title: '🔄 Proceso de Reactivación Iniciado',
          message: `Correo de reactivación enviado a ${email}. Estado cambiado a Pendiente Verificación.`
        }
      };

      const notif = mensajes[estado] || { 
        title: '✅ Correo Enviado', 
        message: response.data?.message || 'Correo enviado exitosamente' 
      };

      show({ title: notif.title, message: notif.message, type: 'success' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al reenviar el correo';
      show({ title: '❌ Error', message: errorMsg, type: 'error' });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Preparar payload según el rol
      let payload: any = {
        cedula,
        nombres,
        apellidos,
        username,
        email,
        role, // Usar 'role' en lugar de 'rol'
        estado: 'activo'
      };

      const puntosAsignados = activeEstablecimientos
        .map((estId) => selectedPuntosPorEstablecimiento[estId] ?? null)
        .filter((p): p is number => Boolean(p));

      // Aplicar reglas de asociación según el rol
      if (role === 'emisor') {
        // Emisor: no es obligatorio, se asocia automáticamente a todos, pero se permiten puntos por establecimiento
        payload.establecimientos_ids = [];
        payload.puntos_emision_ids = puntosAsignados;
      } else if (role === 'gerente' || role === 'cajero') {
        // Gerente y Cajero: establecimientos obligatorios
        payload.establecimientos_ids = selectedEstablecimientos.length > 0 ? selectedEstablecimientos : [];
        payload.puntos_emision_ids = puntosAsignados;
      }

      if (!editingId) {
        // No enviar contraseña - se genera automáticamente en el backend
        const res = await usuariosEmisorApi.create(emiId, payload);
        show({ 
          title: '✅ Usuario creado', 
          message: `Se ha enviado un correo a ${email} para verificar la cuenta y establecer su contraseña`, 
          type: 'success' 
        });
        onCreated?.(res.data?.data);
      } else {
        const res = await usuariosEmisorApi.update(emiId, editingId, payload);
        show({ title: 'Éxito', message: 'Usuario actualizado correctamente', type: 'success' });
        onUpdated?.(res.data?.data);
      }

      onClose();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] || 'Error al guardar usuario';
      show({ title: 'Error', message: errMsg, type: 'error' });
      console.error('Error:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mf-modal-overlay" role="dialog" aria-modal="true">
      <div className="mf-modal">
        <div className="modal-header">
          <h2>
            {editingId ? 'Editar usuario' : 'Registrar nuevo usuario'}
          </h2>
          <button
            onClick={onClose}
            className="modal-close-btn"
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="usuario-form-grid">
            {/* Cédula */}
            <div className={`usuario-form-group ${errors.cedula ? 'error' : ''}`}>
              <label>
                Cédula <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCedula(v);
                  if (errors.cedula) setErrors({ ...errors, cedula: '' });
                }}
                placeholder="1234567890"
                maxLength={10}
              />
              {errors.cedula && <span className="usuario-form-error">{errors.cedula}</span>}
            </div>

            {/* Nombres */}
            <div className={`usuario-form-group ${errors.nombres ? 'error' : ''}`}>
              <label>
                Nombres <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                value={nombres}
                onChange={(e) => {
                  setNombres(e.target.value);
                  if (errors.nombres) setErrors({ ...errors, nombres: '' });
                }}
                placeholder="Juan Carlos"
              />
              {errors.nombres && <span className="usuario-form-error">{errors.nombres}</span>}
            </div>

            {/* Apellidos */}
            <div className={`usuario-form-group ${errors.apellidos ? 'error' : ''}`}>
              <label>
                Apellidos <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => {
                  setApellidos(e.target.value);
                  if (errors.apellidos) setErrors({ ...errors, apellidos: '' });
                }}
                placeholder="Pérez López"
              />
              {errors.apellidos && <span className="usuario-form-error">{errors.apellidos}</span>}
            </div>

            {/* Username */}
            <div className={`usuario-form-group ${errors.username ? 'error' : ''}`}>
              <label>
                Nombre de usuario <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="usuario1"
                autoComplete="off"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.username ? '2px solid #ff6b6b' : '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {checkingUsername ? (
                <span style={{ color: '#1a63d6', fontSize: 12, marginTop: 4, display: 'block' }}>⏳ Verificando disponibilidad...</span>
              ) : (
                errors.username && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.username}</span>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Email <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="usuario@dominio.com"
                autoComplete="off"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.email ? '2px solid #ff6b6b' : '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {checkingEmail ? (
                <span style={{ color: '#1a63d6', fontSize: 12, marginTop: 4, display: 'block' }}>⏳ Verificando disponibilidad...</span>
              ) : (
                errors.email && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.email}</span>
              )}
            </div>

            {/* Rol */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Rol <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  // Limpiar establecimientos y puntos al cambiar de rol
                  if (e.target.value === 'emisor') {
                    setSelectedEstablecimientos([]);
                    setSelectedPuntosPorEstablecimiento({});
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              >
                {getRolesPermitidos.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contraseña Auto-Generada - Solo en creación */}
          {!editingId && (
            <div className="info-box success">
              <span className="info-box-icon">🔐</span>
              <div className="info-box-content">
                <p className="info-box-title">Contraseña Auto-Generada</p>
                <p className="info-box-text">
                  ℹ️ El usuario recibirá un correo electrónico para <strong>verificar su cuenta</strong> y establecer su propia contraseña de forma segura.
                </p>
              </div>
            </div>
          )}

          {/* Establecimientos - mostrar solo para gerente/cajero */}
          {(role === 'gerente' || role === 'cajero') && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                padding: '16px 20px',
                borderRadius: '12px 12px 0 0',
                borderBottom: '3px solid #f59e0b',
                marginBottom: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>🏢</span>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: 16, 
                      fontWeight: 700, 
                      color: '#78350f',
                      letterSpacing: '-0.02em'
                    }}>
                      Establecimientos <span style={{ color: '#dc2626' }}>*</span>
                    </h3>
                    <p style={{ 
                      fontSize: 13, 
                      color: '#92400e', 
                      margin: '4px 0 0',
                      fontWeight: 500
                    }}>
                      Obligatorio para {role} - Selecciona los establecimientos asignados
                    </p>
                  </div>
                </div>
              </div>
              
              {establecimientos.length === 0 ? (
                <div style={{ 
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  padding: '20px'
                }}>
                  <div style={{ 
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px dashed #fbbf24',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <p style={{ fontSize: 14, color: '#92400e', margin: 0, fontWeight: 600 }}>
                      No hay establecimientos disponibles para asignar. Debe crear establecimientos primero.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  background: '#ffffff',
                  border: errors.establecimientos ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  padding: '20px',
                  maxHeight: 240,
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {establecimientos.map((est, index) => (
                      <label 
                        key={est.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: selectedEstablecimientos.includes(est.id) 
                            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                            : 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)',
                          border: selectedEstablecimientos.includes(est.id)
                            ? '2px solid #f59e0b'
                            : '2px solid #e2e8f0',
                          borderRadius: 10,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedEstablecimientos.includes(est.id)) {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedEstablecimientos.includes(est.id)) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)';
                          }
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '4px',
                          height: '100%',
                          background: selectedEstablecimientos.includes(est.id)
                            ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                            : 'transparent'
                        }}></div>
                        
                        <input
                          type="checkbox"
                          checked={selectedEstablecimientos.includes(est.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEstablecimientos(prev => [...prev, est.id]);
                            } else {
                              setSelectedEstablecimientos(prev => prev.filter(id => id !== est.id));
                              setSelectedPuntosPorEstablecimiento(prev => {
                                if (!(est.id in prev)) return prev;
                                const { [est.id]: _removed, ...rest } = prev;
                                return rest;
                              });
                            }
                            if (errors.establecimientos) setErrors({ ...errors, establecimientos: '' });
                          }}
                          style={{ 
                            marginRight: 12, 
                            cursor: 'pointer',
                            width: 18,
                            height: 18,
                            accentColor: '#f59e0b'
                          }}
                        />
                        
                        <div style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%',
                          background: selectedEstablecimientos.includes(est.id)
                            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                            : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          fontSize: 14,
                          fontWeight: 700,
                          color: selectedEstablecimientos.includes(est.id) ? '#ffffff' : '#64748b',
                          flexShrink: 0
                        }}>
                          {selectedEstablecimientos.includes(est.id) ? '✓' : String(index + 1).padStart(2, '0')}
                        </div>
                        
                        <span style={{ 
                          fontWeight: 600, 
                          color: selectedEstablecimientos.includes(est.id) ? '#78350f' : '#475569',
                          fontSize: 14
                        }}>
                          {est.codigo} - {est.nombre}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.establecimientos && (
                <div style={{ 
                  marginTop: 8,
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{ fontSize: 16 }}>❌</span>
                  <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                    {errors.establecimientos}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Info box para rol emisor */}
          {role === 'emisor' && (
            <div className="info-box info">
              <span className="info-box-icon">ℹ️</span>
              <div className="info-box-content">
                <p className="info-box-text">
                  El rol <strong>Emisor</strong> se asocia automáticamente a todos los establecimientos de la empresa. Define abajo el punto de emisión que usará en cada uno.
                </p>
              </div>
            </div>
          )}

          {/* Puntos de Emisión - uno por establecimiento */}
          {activeEstablecimientos.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '16px 20px',
                borderRadius: '12px 12px 0 0',
                borderBottom: '3px solid #6366f1',
                marginBottom: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>📍</span>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: 16, 
                      fontWeight: 700, 
                      color: '#1e293b',
                      letterSpacing: '-0.02em'
                    }}>
                      {role === 'emisor'
                        ? 'Puntos de emisión por establecimiento'
                        : 'Puntos de emisión'}
                    </h3>
                    <p style={{ 
                      fontSize: 13, 
                      color: '#64748b', 
                      margin: '4px 0 0',
                      fontWeight: 500
                    }}>
                      Selecciona como máximo un punto de emisión para cada establecimiento asignado
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                padding: '20px',
                display: 'flex', 
                flexDirection: 'column', 
                gap: 14
              }}>
                {activeEstablecimientos.map((estId, index) => {
                  const estInfo = establecimientos.find((est) => est.id === estId);
                  const puntosDisponibles = getPuntosForEstablecimiento(estId);
                  const selectedPuntoId = selectedPuntosPorEstablecimiento[estId];

                  return (
                    <div
                      key={estId}
                      style={{
                        background: 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '16px 18px',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: `linear-gradient(180deg, ${
                          index % 3 === 0 ? '#6366f1' : index % 3 === 1 ? '#8b5cf6' : '#ec4899'
                        }, ${
                          index % 3 === 0 ? '#4f46e5' : index % 3 === 1 ? '#7c3aed' : '#db2777'
                        })`
                      }}></div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        marginBottom: 12,
                        paddingLeft: 12
                      }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${
                            index % 3 === 0 ? '#dbeafe' : index % 3 === 1 ? '#f3e8ff' : '#fce7f3'
                          }, ${
                            index % 3 === 0 ? '#bfdbfe' : index % 3 === 1 ? '#e9d5ff' : '#fbcfe8'
                          })`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          fontWeight: 700,
                          color: index % 3 === 0 ? '#1e40af' : index % 3 === 1 ? '#6b21a8' : '#be185d',
                          flexShrink: 0
                        }}>
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: 700, 
                            color: '#1e293b',
                            fontSize: 15,
                            letterSpacing: '-0.01em'
                          }}>
                            {estInfo ? `${estInfo.codigo} - ${estInfo.nombre}` : `Establecimiento #${estId}`}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ paddingLeft: 12 }}>
                        {puntosDisponibles.length === 0 ? (
                          <div style={{ 
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            border: '2px dashed #fbbf24',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10
                          }}>
                            <span style={{ fontSize: 20 }}>⚠️</span>
                            <p style={{ fontSize: 13, color: '#92400e', margin: 0, fontWeight: 600 }}>
                              No hay puntos de emisión disponibles para este establecimiento
                            </p>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <select
                              value={selectedPuntoId != null ? String(selectedPuntoId) : ''}
                              onChange={(e) => handlePuntoSelection(estId, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '2px solid #cbd5e1',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#334155',
                                background: '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = index % 3 === 0 ? '#6366f1' : index % 3 === 1 ? '#8b5cf6' : '#ec4899';
                                e.target.style.boxShadow = `0 0 0 3px ${
                                  index % 3 === 0 ? 'rgba(99, 102, 241, 0.1)' : 
                                  index % 3 === 1 ? 'rgba(139, 92, 246, 0.1)' : 
                                  'rgba(236, 72, 153, 0.1)'
                                }`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#cbd5e1';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              <option value="">🔘 Sin punto asignado</option>
                              {puntosDisponibles.map((punto) => (
                                <option key={punto.id} value={String(punto.id)}>
                                  ✓ {punto.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="usuario-form-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || resendingEmail}
              className="btn-cancel"
            >
              Cancelar
            </button>
            
            {/* Botón Reenviar Correo */}
            {editingId && ['nuevo', 'suspendido', 'retirado'].includes(estado) && (
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={loading || resendingEmail}
                className="btn-resend-email"
                title={
                  estado === 'nuevo' 
                    ? 'Reenviar correo de verificación inicial'
                    : 'Enviar correo de reactivación (cambiará a Pendiente Verificación)'
                }
              >
                {resendingEmail ? (
                  <LoadingSpinner inline size={18} message="Enviando…" />
                ) : (
                  <>📧 Reenviar Correo</>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={loading || resendingEmail || Object.values(errors).some(e => e && e.length > 0)}
              className="btn-submit"
            >
              {loading ? (
                <LoadingSpinner inline size={18} message="Guardando…" />
              ) : (
                editingId ? 'Actualizar' : 'Crear'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmisorUsuarioFormModal;
