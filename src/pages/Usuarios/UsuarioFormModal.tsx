import React from 'react';
import { User } from '../../types/user';
import { useUser } from '../../contexts/userContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { usuariosApi } from '../../services/usuariosApi';
import { validateCedulaEcuatoriana, validateEmail, validateUsername, validateNombre } from '../../helpers/validations';
import './UsuarioFormModalModern.css';

interface Props {
  isOpen: boolean;
  initialData?: User | null;
  onClose: () => void;
  onSubmit: (data: User) => Promise<void>;
  isEditing: boolean;
  restrictRolesToAdminDistributor?: boolean;
}

const normalizeRole = (role: unknown): string => String(role ?? '').trim().toLowerCase();
const normalizeEstado = (estado: unknown): string => String(estado ?? '').trim().toLowerCase();

// Mapping de roles permitidos según el rol del usuario actual
// Cuando se crea un nuevo usuario, solo se permiten Administrador y Distribuidor
type RoleOption = { value: string; label: string };
type EstadoOption = { value: string; label: string; tooltip: string };

const getRolesPermitidos = (userRole: string, isCreating: boolean = false): RoleOption[] => {
  if (isCreating) {
    return [
      { value: 'administrador', label: '👨‍💼 Administrador' },
      { value: 'distribuidor', label: '📦 Distribuidor' },
    ];
  }

  const rolesMap: Record<string, RoleOption[]> = {
    administrador: [
      { value: 'administrador', label: '👨‍💼 Administrador' },
      { value: 'distribuidor', label: '📦 Distribuidor' },
      { value: 'emisor', label: '🏢 Emisor' },
      { value: 'gerente', label: '📊 Gerente' },
      { value: 'cajero', label: '💳 Cajero' },
    ],
    distribuidor: [
      { value: 'emisor', label: '🏢 Emisor' },
      { value: 'gerente', label: '📊 Gerente' },
      { value: 'cajero', label: '💳 Cajero' },
    ],
    emisor: [
      { value: 'gerente', label: '📊 Gerente' },
      { value: 'cajero', label: '💳 Cajero' },
    ],
    gerente: [{ value: 'cajero', label: '💳 Cajero' }],
    cajero: [],
  };

  return rolesMap[userRole] || [];
};

// Transiciones MANUALES permitidas (panel administrativo)
// Nota: algunas transiciones son automáticas por verificación de correo y no deben forzarse desde el panel.
const getEstadosPermitidos = (estadoActual: string): EstadoOption[] => {
  const transiciones: Record<string, EstadoOption[]> = {
    nuevo: [
      {
        value: 'nuevo',
        label: '🆕 Nuevo',
        tooltip: 'Usuario recién creado, pendiente de verificación de email. Sin acceso al sistema.',
      },
    ],
    activo: [
      {
        value: 'activo',
        label: '✅ Activo',
        tooltip: 'Usuario con acceso completo al sistema',
      },
      {
        value: 'suspendido',
        label: '⏸️ Suspendido',
        tooltip: 'Suspender temporalmente el acceso del usuario',
      },
      {
        value: 'retirado',
        label: '👋 Retirado',
        tooltip: 'Usuario ya no forma parte de la organización',
      },
    ],
    pendiente_verificacion: [
      {
        value: 'pendiente_verificacion',
        label: '⏳ Pendiente Verificación',
        tooltip: 'Requiere ingresar su contraseña y verificar el nuevo correo. Sin acceso al sistema.',
      },
      {
        value: 'suspendido',
        label: '⏸️ Suspendido',
        tooltip:
          'Bloqueo temporal durante el proceso de verificación (invalida la reactivación hasta nueva verificación).',
      },
    ],
    suspendido: [
      {
        value: 'suspendido',
        label: '⏸️ Suspendido',
        tooltip: 'Usuario bloqueado temporalmente',
      },
      {
        value: 'activo',
        label: '✅ Activo',
        tooltip: 'Reactivación por autorización administrativa',
      },
      {
        value: 'retirado',
        label: '👋 Retirado',
        tooltip: 'Baja definitiva mientras el usuario se encuentra suspendido',
      },
    ],
    retirado: [
      {
        value: 'retirado',
        label: '👋 Retirado',
        tooltip:
          'Baja definitiva. Solo reactivable mediante verificación de correo solicitada por el usuario que lo creó.',
      },
    ],
  };

  return transiciones[normalizeEstado(estadoActual)] || [
    {
      value: 'nuevo',
      label: '🆕 Nuevo',
      tooltip: 'Usuario recién creado',
    },
  ];
};

const UsuarioFormModal: React.FC<Props> = ({
  isOpen,
  initialData,
  onClose,
  onSubmit,
  isEditing,
  restrictRolesToAdminDistributor = false,
}) => {
  const { user: currentUser } = useUser();
  const { show } = useNotification();
  const [cedula, setCedula] = React.useState<string>('');
  const [nombres, setNombres] = React.useState<string>('');
  const [apellidos, setApellidos] = React.useState<string>('');
  const [username, setUsername] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [role, setRole] = React.useState<string>('administrador');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [estado, setEstado] = React.useState<string>('nuevo');
  const [estadoBase, setEstadoBase] = React.useState<string>('nuevo');
  const [checkingUsername, setCheckingUsername] = React.useState<boolean>(false);
  const [checkingCedula, setCheckingCedula] = React.useState<boolean>(false);
  const [checkingEmail, setCheckingEmail] = React.useState<boolean>(false);
  const [resendingEmail, setResendingEmail] = React.useState<boolean>(false);

  // Memoizar rolesPermitidos para evitar recálculos infinitos
  const rolesPermitidos = React.useMemo(() => {
    if (!currentUser?.role) return [];

    if (restrictRolesToAdminDistributor) {
      return getRolesPermitidos('administrador', true);
    }

    return getRolesPermitidos(normalizeRole(currentUser.role), !isEditing);
  }, [currentUser?.role, isEditing, restrictRolesToAdminDistributor]);

  // En edición, las opciones de estado no deben "desaparecer" cuando el usuario cambia el select,
  // para permitir re-seleccionar mientras el formulario permanece abierto.
  const baseEstadoForOptions = React.useMemo(() => {
    return normalizeEstado(estadoBase) || normalizeEstado(estado) || 'nuevo';
  }, [estadoBase, estado]);

  const estadosPermitidos = React.useMemo(() => {
    const options = getEstadosPermitidos(baseEstadoForOptions);
    const hasCurrent = options.some((o) => o.value === baseEstadoForOptions);
    if (hasCurrent) return options;

    const tooltips: Record<string, { label: string; tooltip: string }> = {
      pendiente_verificacion: {
        label: '⏳ Pendiente Verificación',
        tooltip: 'Requiere ingresar su contraseña y verificar el nuevo correo. Sin acceso al sistema.',
      },
      nuevo: {
        label: '🆕 Nuevo',
        tooltip: 'Usuario recién creado, pendiente de verificación de email',
      },
      activo: {
        label: '✅ Activo',
        tooltip: 'Usuario con acceso completo al sistema',
      },
      suspendido: {
        label: '⏸️ Suspendido',
        tooltip: 'Suspender temporalmente el acceso del usuario',
      },
      retirado: {
        label: '👋 Retirado',
        tooltip: 'Usuario ya no forma parte de la organización',
      },
    };

    const current = tooltips[baseEstadoForOptions];
    if (!current) return options;
    return [{ value: baseEstadoForOptions, label: current.label, tooltip: current.tooltip }, ...options];
  }, [baseEstadoForOptions]);

  const estadoInfoMessage = React.useMemo(() => {
    const selected = normalizeEstado(estado);
    if (selected === 'activo') return 'El usuario tendrá acceso al sistema con normalidad.';
    if (selected === 'suspendido') return 'El usuario no podrá acceder al sistema hasta que sea reactivado.';
    if (selected === 'retirado') {
      return 'El usuario será dado de baja y no tendrá acceso al sistema. Solo podrá reactivarse mediante una nueva verificación de correo, solicitada por el usuario que lo creó.';
    }
    return estadosPermitidos.find((e) => e.value === selected)?.tooltip || 'Selecciona un estado';
  }, [estado, estadosPermitidos]);

  const shouldShowResendButton = React.useMemo(() => {
    if (!isEditing || !initialData) return false;

    const selected = normalizeEstado(estado);
    const initial = normalizeEstado(initialData.estado);

    const currentUserId = String(currentUser?.id ?? '');
    const creatorId = String(initialData.created_by_id ?? '');
    const isCreator = !!currentUserId && !!creatorId && currentUserId === creatorId;

    // Regla: si estaba Activo y se cambia a Retirado, NO debe mostrarse el botón.
    if (initial === 'activo' && selected === 'retirado') return false;

    // Regla: si el usuario está Retirado, solo el creador puede reenviar correo.
    if (initial === 'retirado' && selected === 'retirado' && !isCreator) return false;

    // Reglas adicionales:
    // - Suspendido → Activo no requiere reenvío
    // - Suspendido → Retirado no requiere reenvío
    // Para evitar confusión, no mostramos el botón cuando el estado seleccionado es 'suspendido'
    // ni cuando se está marcando como 'retirado' desde otro estado (solo aplica si YA está retirado).
    if (selected === 'suspendido') return false;
    if (selected === 'retirado' && initial !== 'retirado') return false;

    return ['nuevo', 'retirado'].includes(selected);
  }, [isEditing, initialData, estado, currentUser?.id]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) return;

    if (isEditing && initialData) {
      setCedula(initialData.cedula || '');
      setNombres(initialData.nombres || '');
      setApellidos(initialData.apellidos || '');
      setUsername(initialData.username || '');
      setEmail(initialData.email || '');
      const initialRole = normalizeRole(initialData.role) || 'administrador';
      if (restrictRolesToAdminDistributor && initialRole !== 'administrador' && initialRole !== 'distribuidor') {
        setRole('administrador');
      } else {
        setRole(initialRole);
      }
      const initialEstado = normalizeEstado(initialData.estado) || (initialData.email === 'admin@factura.local' ? 'activo' : 'nuevo');
      setEstado(initialEstado);
      setEstadoBase(initialEstado);
    } else {
      setCedula('');
      setNombres('');
      setApellidos('');
      setUsername('');
      setEmail('');
      const userRole = normalizeRole(currentUser?.role);
      const defaultRoles = restrictRolesToAdminDistributor
        ? getRolesPermitidos('administrador', true)
        : (userRole ? getRolesPermitidos(userRole, true) : []);
      setRole(defaultRoles.length > 0 ? defaultRoles[0].value : 'administrador');
      setEstado('nuevo');
      setEstadoBase('nuevo');
    }
    setErrors({});
  }, [isOpen, isEditing, initialData, currentUser?.role, restrictRolesToAdminDistributor]);

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCedula(value);
    
    // Validar formato de cédula ecuatoriana
    const validation = validateCedulaEcuatoriana(value);
    let error = validation.valid ? '' : (validation.error || '');
    
    setErrors(prev => ({ ...prev, cedula: error }));
    
    // Verificar disponibilidad si tiene 10 dígitos y es válida
    if (value.length === 10 && !error && !isEditing) {
      setCheckingCedula(true);
      setTimeout(async () => {
        try {
          const res = await usuariosApi.checkCedula(value);
          const available = res?.data?.available ?? !res?.data?.exists;
          if (!available) {
            setErrors(prev => ({ ...prev, cedula: '❌ Esta cédula ya está registrada en el sistema' }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.cedula;
              return newErrors;
            });
          }
        } catch (err: any) {
          // Si hay error de red/servidor, no bloquear el formulario con un falso positivo
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
    
    // Validación usando helper
    const validation = validateNombre(value, 'nombres');
    const error = validation.valid ? '' : (validation.error || '');
    
    setErrors({ ...errors, nombres: error });
  };

  const handleApellidosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Solo permitir letras, espacios, guiones y apóstrofes
    value = value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]/g, '');
    setApellidos(value);
    
    // Validación usando helper
    const validation = validateNombre(value, 'apellidos');
    const error = validation.valid ? '' : (validation.error || '');
    
    setErrors({ ...errors, apellidos: error });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    
    // Validación usando helper
    const validation = validateUsername(value);
    const error = validation.valid ? '' : (validation.error || '');
    
    setErrors(prev => ({ ...prev, username: error }));
    
    // Verificar disponibilidad si es válido y tiene al menos 3 caracteres
    if (value.trim().length >= 3 && !error && !isEditing) {
      setCheckingUsername(true);
      setTimeout(async () => {
        try {
          const res = await usuariosApi.checkUsername(value);
          const available = res?.data?.available ?? !res?.data?.exists;
          if (!available) {
            setErrors(prev => ({ ...prev, username: '❌ Este nombre de usuario ya está registrado. Por favor elige otro.' }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.username;
              return newErrors;
            });
          }
        } catch (err: any) {
          // Error de red/servidor: no marcar como ocupado
        } finally {
          setCheckingUsername(false);
        }
      }, 500);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Validación usando helper
    const validation = validateEmail(value);
    const error = validation.valid ? '' : (validation.error || '');
    
    setErrors(prev => ({ ...prev, email: error }));
    
    // Verificar disponibilidad si es válido y no está editando
    if (validation.valid && !isEditing) {
      setCheckingEmail(true);
      setTimeout(async () => {
        try {
          const res = await usuariosApi.checkEmail(value);
          const available = res?.data?.available ?? !res?.data?.exists;
          if (!available) {
            setErrors(prev => ({ ...prev, email: '❌ Este correo electrónico ya está registrado en el sistema. Por favor usa otro.' }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.email;
              return newErrors;
            });
          }
        } catch (err: any) {
          // Error de red/servidor: no marcar como ocupado
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

    // Email: validación de formato estándar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      newErrors.email = 'Email inválido. Use formato: usuario@dominio.com';
    }

    // Rol - Validar que está en los roles permitidos
    const rolesValidos = rolesPermitidos.map((r) => r.value);
    if (!role || !rolesValidos.includes(role)) {
      newErrors.role = 'Rol inválido o no permitido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResendEmail = async () => {
    if (!initialData?.id) return;

    setResendingEmail(true);
    try {
      // Determinar el nuevo estado según el estado actual
      let nuevoEstado = estado;
      if (estado === 'retirado' || estado === 'suspendido') {
        nuevoEstado = 'pendiente_verificacion';
      }
      // Si es 'nuevo', se mantiene como 'nuevo'

      const response = await usuariosApi.resendVerificationEmail(initialData.id, nuevoEstado);
      
      // Actualizar estado local si cambió
      if (nuevoEstado !== estado) {
        setEstado(nuevoEstado);
        setEstadoBase(nuevoEstado);
      }

      const mensajes: Record<string, { title: string; message: string }> = {
        nuevo: {
          title: '✉️ Correo Reenviado',
          message: `Correo de verificación enviado a ${initialData.email}. El usuario debe verificar su cuenta para activarla.`
        },
        retirado: {
          title: '🔄 Proceso de Reactivación Iniciado',
          message: `Correo de reactivación enviado a ${initialData.email}. Estado cambiado a Pendiente Verificación. El usuario debe verificar su correo para reactivar su cuenta.`
        },
        suspendido: {
          title: '🔄 Proceso de Reactivación Iniciado',
          message: `Correo de reactivación enviado a ${initialData.email}. Estado cambiado a Pendiente Verificación. El usuario debe verificar su correo para reactivar su cuenta.`
        }
      };

      const notif = mensajes[estado] || { 
        title: '✅ Correo Enviado', 
        message: response.data?.message || 'Correo enviado exitosamente' 
      };

      show({ 
        title: notif.title, 
        message: notif.message, 
        type: 'success' 
      });

    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al reenviar el correo';
      show({ 
        title: '❌ Error', 
        message: errorMsg, 
        type: 'error' 
      });
    } finally {
      setResendingEmail(false);
    }
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
                  disabled={loading || (isEditing && estado !== 'nuevo')}
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
                  disabled={loading || (isEditing && estado !== 'nuevo')}
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
                  disabled={loading || (isEditing && estado !== 'nuevo')}
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
                  disabled={loading || (isEditing && estado !== 'nuevo')}
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
                  disabled={loading || (isEditing && estado !== 'nuevo')}
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

              {/* Estado - Edición (interactivo mientras el modal está abierto) */}
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
                  ) : (normalizeEstado(initialData?.estado) === 'retirado' && normalizeEstado(estado) === 'retirado') ? (
                    <div className="usuario-estado-locked">
                      <span className="icon">ℹ️</span>
                      <strong>
                        👋 Retirado
                      </strong>
                      <span className="help-text">
                        El usuario será dado de baja y no tendrá acceso al sistema. Solo podrá reactivarse mediante una nueva verificación de correo, solicitada por el usuario que lo creó.
                      </span>
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
                        {estadoInfoMessage}
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
              disabled={loading || resendingEmail}
            >
              Cancelar
            </button>
            
            {/* Botón Reenviar Correo - Solo visible en edición para estados específicos */}
            {shouldShowResendButton && (
              <button 
                type="button"
                className="usuario-btn usuario-btn-resend"
                onClick={handleResendEmail}
                disabled={loading || resendingEmail}
                title={
                  estado === 'nuevo' 
                    ? 'Reenviar correo de verificación inicial'
                    : 'Enviar correo de reactivación (cambiará a Pendiente Verificación)'
                }
              >
                {resendingEmail ? (
                  <>
                    <LoadingSpinner inline size={18} message="" />
                    Enviando...
                  </>
                ) : (
                  <>
                    📧 Reenviar Correo
                  </>
                )}
              </button>
            )}

            <button 
              type="submit" 
              className="usuario-btn usuario-btn-submit" 
              disabled={
                loading || 
                resendingEmail ||
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
