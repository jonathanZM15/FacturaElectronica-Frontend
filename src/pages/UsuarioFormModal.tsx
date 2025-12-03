import React from 'react';
import { User } from '../types/user';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { usuariosApi } from '../services/usuariosApi';
import './UsuarioFormModalModern.css';

interface Props {
  isOpen: boolean;
  initialData?: User | null;
  onClose: () => void;
  onSubmit: (data: User) => Promise<void>;
  isEditing: boolean;
}

// Mapping de roles permitidos según el rol del usuario actual
const getRolesPermitidos = (userRole: string): { value: string; label: string }[] => {
  const rolesMap: Record<string, { value: string; label: string }[]> = {
    administrador: [
      { value: 'administrador', label: '👨‍💼 Administrador' },
      { value: 'distribuidor', label: '📦 Distribuidor' },
      { value: 'emisor', label: '🏢 Emisor' },
      { value: 'gerente', label: '📊 Gerente' },
      { value: 'cajero', label: '💳 Cajero' }
    ],
    distribuidor: [
      { value: 'emisor', label: '🏢 Emisor' },
      { value: 'gerente', label: '📊 Gerente' },
      { value: 'cajero', label: '💳 Cajero' }
    ],
    emisor: [
      { value: 'gerente', label: '📊 Gerente' },
      { value: 'cajero', label: '💳 Cajero' }
    ],
    gerente: [
      { value: 'cajero', label: '💳 Cajero' }
    ],
    cajero: []
  };

  return rolesMap[userRole] || [];
};

// Transiciones de estado permitidas según el estado actual
const getEstadosPermitidos = (estadoActual: string): { value: string; label: string; tooltip: string }[] => {
  const transiciones: Record<string, { value: string; label: string; tooltip: string }[]> = {
    nuevo: [
      { value: 'nuevo', label: '🆕 Nuevo', tooltip: 'Usuario recién creado, pendiente de verificación de email' },
      { value: 'activo', label: '✅ Activo', tooltip: 'Verificar email manualmente y activar usuario' }
    ],
    activo: [
      { value: 'activo', label: '✅ Activo', tooltip: 'Usuario con acceso completo al sistema' },
      { value: 'suspendido', label: '⏸️ Suspendido', tooltip: 'Suspender temporalmente el acceso del usuario' },
      { value: 'pendiente_verificacion', label: '⏳ Pendiente Verificación', tooltip: 'Requiere nueva verificación de identidad' },
      { value: 'retirado', label: '👋 Retirado', tooltip: 'Usuario ya no forma parte de la organización' }
    ],
    pendiente_verificacion: [
      { value: 'pendiente_verificacion', label: '⏳ Pendiente Verificación', tooltip: 'Esperando verificación de identidad' },
      { value: 'activo', label: '✅ Activo', tooltip: 'Verificación completada, activar usuario' },
      { value: 'suspendido', label: '⏸️ Suspendido', tooltip: 'Suspender por problemas en verificación' }
    ],
    suspendido: [
      { value: 'suspendido', label: '⏸️ Suspendido', tooltip: 'Usuario temporalmente sin acceso' },
      { value: 'activo', label: '✅ Activo', tooltip: 'Reactivar acceso del usuario' },
      { value: 'retirado', label: '👋 Retirado', tooltip: 'Dar de baja permanente al usuario' }
    ],
    retirado: [
      { value: 'retirado', label: '👋 Retirado', tooltip: 'Usuario dado de baja' },
      { value: 'pendiente_verificacion', label: '⏳ Pendiente Verificación', tooltip: 'Reincorporar usuario (requiere nueva verificación)' }
    ]
  };

  return transiciones[estadoActual] || [
    { value: 'nuevo', label: '🆕 Nuevo', tooltip: 'Usuario recién creado' }
  ];
};

const UsuarioFormModal: React.FC<Props> = ({ isOpen, initialData, onClose, onSubmit, isEditing }) => {
  const { user: currentUser } = useUser();
  const [cedula, setCedula] = React.useState<string>('');
  const [nombres, setNombres] = React.useState<string>('');
  const [apellidos, setApellidos] = React.useState<string>('');
  const [username, setUsername] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [role, setRole] = React.useState<string>('administrador');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [estado, setEstado] = React.useState<string>('nuevo');
  const [checkingUsername, setCheckingUsername] = React.useState<boolean>(false);
  const [checkingCedula, setCheckingCedula] = React.useState<boolean>(false);
  const [checkingEmail, setCheckingEmail] = React.useState<boolean>(false);

  // Memoizar rolesPermitidos para evitar recálculos infinitos
  const rolesPermitidos = React.useMemo(() => {
    return currentUser && currentUser.role ? getRolesPermitidos(currentUser.role) : [];
  }, [currentUser?.role]);

  // Memoizar estadosPermitidos basados en el estado actual del usuario
  const estadosPermitidos = React.useMemo(() => {
    return getEstadosPermitidos(estado);
  }, [estado]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) return;

    if (isEditing && initialData) {
      setCedula(initialData.cedula || '');
      setNombres(initialData.nombres || '');
      setApellidos(initialData.apellidos || '');
      setUsername(initialData.username || '');
      setEmail(initialData.email || '');
      setRole(initialData.role || 'administrador');
      setEstado(initialData.estado || (initialData.email === 'admin@factura.local' ? 'activo' : 'nuevo'));
    } else {
      setCedula('');
      setNombres('');
      setApellidos('');
      setUsername('');
      setEmail('');
      const userRole = currentUser?.role;
      const defaultRoles = userRole ? getRolesPermitidos(userRole) : [];
      setRole(defaultRoles.length > 0 ? defaultRoles[0].value : 'administrador');
      setEstado('nuevo');
    }
    setErrors({});
  }, [isOpen, isEditing, initialData, currentUser?.role]);

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCedula(value);
    
    let error = '';
    if (value.length !== 10 && value.length > 0) {
      error = 'La cédula debe tener exactamente 10 dígitos';
    }
    
    setErrors(prev => ({ ...prev, cedula: error }));
    
    // Verificar disponibilidad si tiene 10 dígitos
    if (value.length === 10 && !isEditing) {
      setCheckingCedula(true);
      const timer = setTimeout(async () => {
        try {
          await usuariosApi.checkCedula(value);
          setErrors(prev => ({ ...prev, cedula: '❌ Esta cédula ya está registrada' }));
        } catch (err: any) {
          // Si da error 404, significa que no existe, es válida
          if (err?.response?.status === 404) {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.cedula;
              return newErrors;
            });
          }
        } finally {
          setCheckingCedula(false);
        }
      }, 500);
    }
  };

  const handleNombresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Solo permitir letras, espacios, guiones y apóstrofes
    value = value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]/g, '');
    setNombres(value);
    
    // Validación en tiempo real
    let error = '';
    if (value.length > 0 && value.length < 3) {
      error = 'El nombre debe tener al menos 3 caracteres';
    } else if (value.length > 0 && !/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]+$/.test(value)) {
      error = 'Solo se permiten caracteres alfabéticos';
    }
    
    setErrors({ ...errors, nombres: error });
  };

  const handleApellidosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Solo permitir letras, espacios, guiones y apóstrofes
    value = value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]/g, '');
    setApellidos(value);
    
    // Validación en tiempo real
    let error = '';
    if (value.length > 0 && value.length < 3) {
      error = 'El apellido debe tener al menos 3 caracteres';
    } else if (value.length > 0 && !/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]+$/.test(value)) {
      error = 'Solo se permiten caracteres alfabéticos';
    }
    
    setErrors({ ...errors, apellidos: error });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    
    let error = '';
    if (value.length > 0 && value.length < 3) {
      error = 'El nombre de usuario debe tener al menos 3 caracteres';
    }
    
    setErrors(prev => ({ ...prev, username: error }));
    
    // Verificar disponibilidad si tiene al menos 3 caracteres
    if (value.length >= 3 && !isEditing) {
      setCheckingUsername(true);
      const timer = setTimeout(async () => {
        try {
          await usuariosApi.checkUsername(value);
          setErrors(prev => ({ ...prev, username: '❌ Este nombre de usuario ya existe' }));
        } catch (err: any) {
          // Si da error 404, significa que no existe, es válido
          if (err?.response?.status === 404) {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.username;
              return newErrors;
            });
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
    
    // Validación en tiempo real
    let error = '';
    if (value.length > 0) {
      // Verificar que tenga formato de email
      if (!value.includes('@')) {
        error = 'El correo debe contener @';
      } else if (!value.includes('gmail.com') && !value.includes('factura.local')) {
        error = 'El correo debe terminar en @gmail.com o @factura.local';
      } else if (!/^[^\s@]+@(gmail\.com|factura\.local)$/.test(value)) {
        error = 'Email inválido. Use formato: usuario@gmail.com o usuario@factura.local';
      }
    }
    
    setErrors(prev => ({ ...prev, email: error }));
    
    // Verificar disponibilidad si tiene formato correcto
    if (value.length > 0 && /^[^\s@]+@(gmail\.com|factura\.local)$/.test(value) && !isEditing) {
      setCheckingEmail(true);
      const timer = setTimeout(async () => {
        try {
          await usuariosApi.checkEmail(value);
          setErrors(prev => ({ ...prev, email: '❌ Este correo ya está registrado' }));
        } catch (err: any) {
          // Si da error 404, significa que no existe, es válido
          if (err?.response?.status === 404) {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.email;
              return newErrors;
            });
          }
        } finally {
          setCheckingEmail(false);
        }
      }, 500);
    }
  };



  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRole(value);
    if (errors.role) {
      setErrors({ ...errors, role: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    // Estado: obligatorio en edición y creación; admin@factura.local debe ser 'activo'
    const editingAdmin = isEditing && initialData?.email === 'admin@factura.local';
    const estadosValidos = ['nuevo','activo','pendiente_verificacion','suspendido','retirado'];
    if (!estado || !estadosValidos.includes(estado)) {
      newErrors.estado = 'Estado inválido';
    }
    if (editingAdmin && estado !== 'activo') {
      newErrors.estado = 'El admin debe estar siempre Activo';
    }

    // Cédula: obligatoria, exactamente 10 dígitos
    if (!cedula || cedula.length !== 10) {
      newErrors.cedula = 'La cédula debe tener exactamente 10 dígitos';
    }

    // Nombres: obligatorios, solo caracteres alfabéticos
    if (!nombres || nombres.trim().length < 3) {
      newErrors.nombres = 'El nombre debe tener al menos 3 caracteres';
    }
    if (!/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]+$/.test(nombres)) {
      newErrors.nombres = 'Solo se permiten caracteres alfabéticos';
    }

    // Apellidos: obligatorios, solo caracteres alfabéticos
    if (!apellidos || apellidos.trim().length < 3) {
      newErrors.apellidos = 'El apellido debe tener al menos 3 caracteres';
    }
    if (!/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]+$/.test(apellidos)) {
      newErrors.apellidos = 'Solo se permiten caracteres alfabéticos';
    }

    // Username: obligatorio
    if (!username || username.trim().length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    // Email: validación básica y debe ser gmail.com o factura.local
    if (!email || !/^[^\s@]+@(gmail\.com|factura\.local)$/.test(email)) {
      newErrors.email = 'Email inválido. Use formato: usuario@gmail.com o usuario@factura.local';
    }

    // Rol - Validar que está en los roles permitidos
    const rolesValidos = rolesPermitidos.map((r) => r.value);
    if (!role || !rolesValidos.includes(role)) {
      newErrors.role = 'Rol inválido o no permitido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const estadoFinal = isEditing ? estado : 'nuevo';
      const dataToSubmit: User = {
        cedula,
        nombres,
        apellidos,
        username,
        email,
        role: role as User['role'],
        estado: estadoFinal as User['estado'],
      };

      await onSubmit(dataToSubmit);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="usuario-modal-overlay">
      <div className="usuario-modal-content usuario-modal-content-barra-izquierda">
        <div className="usuario-modal-barra-izquierda"></div>
        <div className="usuario-modal-main">
          <div className="usuario-modal-header" style={{position: 'relative'}}>
            <h2>{isEditing ? '✏️ Editar Usuario' : '➕ Crear Nuevo Usuario'}</h2>
            <button
              type="button"
              className="usuario-modal-close"
              onClick={onClose}
              disabled={loading}
              style={{position: 'absolute', top: 24, right: 24}}
            >
              ✕
            </button>
          </div>
          {/* Barra horizontal decorativa dentro del recuadro blanco */}
          <div className="usuario-barra-horizontal-interna"></div>

          <form onSubmit={handleSubmit}>
          <div className="usuario-modal-body">
            <div className="usuario-form-grid">
              
              {/* Cédula - Columna 1 */}
              <div className="usuario-form-group">
                <label htmlFor="modal-cedula" className="usuario-form-label">
                  <span className="icon">🆔</span>
                  Número de Cédula
                  <span className="required">*</span>
                </label>
                <input
                  id="modal-cedula"
                  type="text"
                  value={cedula}
                  onChange={handleCedulaChange}
                  placeholder="0123456789"
                  maxLength={10}
                  className={errors.cedula ? 'usuario-form-input error' : 'usuario-form-input'}
                  disabled={loading}
                  autoComplete="off"
                />
                {errors.cedula && (
                  <span className="usuario-error-text">
                    <span className="icon">⚠️</span>
                    {errors.cedula}
                  </span>
                )}
              </div>

              {/* Email - Columna 2 */}
              <div className="usuario-form-group">
                <label htmlFor="modal-email" className="usuario-form-label">
                  <span className="icon">📧</span>
                  Email
                  <span className="required">*</span>
                </label>
                <input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="usuario@example.com"
                  className={errors.email ? 'usuario-form-input error' : 'usuario-form-input'}
                  disabled={loading}
                  autoComplete="off"
                />
                {errors.email && (
                  <span className="usuario-error-text">
                    <span className="icon">⚠️</span>
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Nombres - Columna 1 */}
              <div className="usuario-form-group">
                <label htmlFor="modal-nombres" className="usuario-form-label">
                  <span className="icon">👤</span>
                  Nombres
                  <span className="required">*</span>
                </label>
                <input
                  id="modal-nombres"
                  type="text"
                  value={nombres}
                  onChange={handleNombresChange}
                  placeholder="Ingrese sus nombres"
                  className={errors.nombres ? 'usuario-form-input error' : 'usuario-form-input'}
                  disabled={loading}
                  autoComplete="off"
                />
                {errors.nombres && (
                  <span className="usuario-error-text">
                    <span className="icon">⚠️</span>
                    {errors.nombres}
                  </span>
                )}
              </div>

              {/* Apellidos - Columna 2 */}
              <div className="usuario-form-group">
                <label htmlFor="modal-apellidos" className="usuario-form-label">
                  <span className="icon">👥</span>
                  Apellidos
                  <span className="required">*</span>
                </label>
                <input
                  id="modal-apellidos"
                  type="text"
                  value={apellidos}
                  onChange={handleApellidosChange}
                  placeholder="Ingrese sus apellidos"
                  className={errors.apellidos ? 'usuario-form-input error' : 'usuario-form-input'}
                  disabled={loading}
                  autoComplete="off"
                />
                {errors.apellidos && (
                  <span className="usuario-error-text">
                    <span className="icon">⚠️</span>
                    {errors.apellidos}
                  </span>
                )}
              </div>

              {/* Username - Columna 1 */}
              <div className="usuario-form-group">
                <label htmlFor="modal-username" className="usuario-form-label">
                  <span className="icon">@</span>
                  Nombre de Usuario
                  <span className="required">*</span>
                </label>
                <input
                  id="modal-username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="nombre_usuario"
                  className={errors.username ? 'usuario-form-input error' : 'usuario-form-input'}
                  disabled={loading}
                  autoComplete="off"
                />
                {errors.username && (
                  <span className="usuario-error-text">
                    <span className="icon">⚠️</span>
                    {errors.username}
                  </span>
                )}
              </div>

              {/* Rol - Columna 2 */}
              <div className="usuario-form-group">
                <label htmlFor="modal-role" className="usuario-form-label">
                  <span className="icon">🎭</span>
                  Rol
                  <span className="required">*</span>
                </label>
                {rolesPermitidos.length > 0 ? (
                  <select
                    id="modal-role"
                    value={role}
                    onChange={handleRoleChange}
                    className={errors.role ? 'usuario-form-select error' : 'usuario-form-select'}
                    disabled={loading}
                  >
                    {rolesPermitidos.map((rol) => (
                      <option key={rol.value} value={rol.value}>
                        {rol.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="usuario-no-permissions">
                    <span className="icon">⚠️</span>
                    No tienes permisos para crear usuarios
                  </div>
                )}
                {errors.role && (
                  <span className="usuario-error-text">
                    <span className="icon">⚠️</span>
                    {errors.role}
                  </span>
                )}
              </div>

              {/* Estado - Solo en Edición - Ancho Completo */}
              {isEditing && (
                <div className="usuario-form-group full-width">
                  <label htmlFor="modal-estado" className="usuario-form-label">
                    <span className="icon">🔄</span>
                    Estado del Usuario
                    <span className="required">*</span>
                  </label>
                  {initialData?.email === 'admin@factura.local' ? (
                    <div className="usuario-estado-locked">
                      <span className="icon">🔒</span>
                      <strong>✅ Activo</strong>
                      <span className="help-text">El administrador principal siempre debe estar activo</span>
                    </div>
                  ) : (
                    <>
                      <select
                        id="modal-estado"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        className={errors.estado ? 'usuario-form-select error' : 'usuario-form-select'}
                        disabled={loading}
                      >
                        {estadosPermitidos.map((est) => (
                          <option key={est.value} value={est.value} title={est.tooltip}>
                            {est.label}
                          </option>
                        ))}
                      </select>
                      <span className="usuario-help-text">
                        <span className="icon">ℹ️</span>
                        {estadosPermitidos.find(e => e.value === estado)?.tooltip || 'Selecciona un estado'}
                      </span>
                    </>
                  )}
                  {errors.estado && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.estado}
                    </span>
                  )}
                </div>
              )}

              {/* Contraseña Auto-Generada - Ancho Completo */}
              {!isEditing && (
                <div className="usuario-form-group full-width">
                  <label className="usuario-form-label">
                    <span className="icon">🔐</span>
                    Contraseña
                    <span className="required">*</span>
                  </label>
                  <div className="usuario-password-auto">
                    <span className="icon">🔐</span>
                    Generada automáticamente
                  </div>
                  <span className="usuario-help-text">
                    <span className="icon">ℹ️</span>
                    El usuario recibirá un correo para verificar su cuenta y establecer su propia contraseña.
                  </span>
                </div>
              )}

            </div>
          </div>

          <div className="usuario-modal-footer">
            <button 
              type="button" 
              className="usuario-btn usuario-btn-cancel" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="usuario-btn usuario-btn-submit" 
              disabled={
                loading || 
                rolesPermitidos.length === 0 || 
                checkingUsername || 
                checkingCedula || 
                checkingEmail ||
                Object.values(errors).some(err => err && err.length > 0) ||
                !cedula ||
                !nombres ||
                !apellidos ||
                !username ||
                !email
              }
              title={
                Object.values(errors).some(err => err && err.length > 0)
                  ? 'Por favor corrige los errores antes de continuar'
                  : checkingUsername || checkingCedula || checkingEmail
                  ? 'Verificando disponibilidad...'
                  : ''
              }
            >
              {loading ? (
                <>
                  <LoadingSpinner inline size={18} message="" />
                  Guardando...
                </>
              ) : (
                <>
                  {isEditing ? '💾 Actualizar' : '✨ Registrar'}
                </>
              )}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UsuarioFormModal;
