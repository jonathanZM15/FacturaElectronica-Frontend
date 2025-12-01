import React from 'react';
import { User } from '../types/user';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';

interface Props {
  isOpen: boolean;
  initialData?: User | null;
  onClose: () => void;
  onSubmit: (data: User & { password_confirmation?: string }) => Promise<void>;
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

const UsuarioFormModal: React.FC<Props> = ({ isOpen, initialData, onClose, onSubmit, isEditing }) => {
  const { user: currentUser } = useUser();
  const [cedula, setCedula] = React.useState<string>('');
  const [nombres, setNombres] = React.useState<string>('');
  const [apellidos, setApellidos] = React.useState<string>('');
  const [username, setUsername] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [passwordConfirmation, setPasswordConfirmation] = React.useState<string>('');
  const [role, setRole] = React.useState<string>('administrador');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [estado, setEstado] = React.useState<string>('nuevo');

  // Memoizar rolesPermitidos para evitar recálculos infinitos
  const rolesPermitidos = React.useMemo(() => {
    return currentUser && currentUser.role ? getRolesPermitidos(currentUser.role) : [];
  }, [currentUser?.role]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) return;

    if (isEditing && initialData) {
      setCedula(initialData.cedula || '');
      setNombres(initialData.nombres || '');
      setApellidos(initialData.apellidos || '');
      setUsername(initialData.username || '');
      setEmail(initialData.email || '');
      setPassword('');
      setPasswordConfirmation('');
      setRole(initialData.role || 'administrador');
      setEstado(initialData.estado || (initialData.email === 'admin@factura.local' ? 'activo' : 'nuevo'));
    } else {
      setCedula('');
      setNombres('');
      setApellidos('');
      setUsername('');
      setEmail('');
      setPassword('');
      setPasswordConfirmation('');
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
    if (errors.cedula) {
      setErrors({ ...errors, cedula: '' });
    }
  };

  const handleNombresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNombres(value);
    if (errors.nombres) {
      setErrors({ ...errors, nombres: '' });
    }
  };

  const handleApellidosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApellidos(value);
    if (errors.apellidos) {
      setErrors({ ...errors, apellidos: '' });
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (errors.username) {
      setErrors({ ...errors, username: '' });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors({ ...errors, email: '' });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors({ ...errors, password: '' });
    }
  };

  const handlePasswordConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordConfirmation(value);
    if (errors.password_confirmation) {
      setErrors({ ...errors, password_confirmation: '' });
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

    // Email: validación básica
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    // Password (solo si es creación o si se está editando y se ingresa contraseña)
    if (!isEditing || password) {
      if (!password || password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      } else if (!/[A-Z]/.test(password)) {
        newErrors.password = 'La contraseña debe contener una mayúscula';
      } else if (!/[a-z]/.test(password)) {
        newErrors.password = 'La contraseña debe contener una minúscula';
      } else if (!/\d/.test(password)) {
        newErrors.password = 'La contraseña debe contener un número';
      } else if (!/[@$!%*?&]/.test(password)) {
        newErrors.password = 'La contraseña debe contener un carácter especial (@$!%*?&)';
      }

      if (password !== passwordConfirmation) {
        newErrors.password_confirmation = 'Las contraseñas no coinciden';
      }
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
      const dataToSubmit: User & { password_confirmation?: string } = {
        cedula,
        nombres,
        apellidos,
        username,
        email,
        role: role as User['role'],
        estado: estadoFinal as User['estado'],
      };

      // Solo incluir password si es creación o si se cambió
      if (!isEditing) {
        dataToSubmit.password = password;
        dataToSubmit.password_confirmation = passwordConfirmation;
      } else if (password) {
        dataToSubmit.password = password;
        dataToSubmit.password_confirmation = passwordConfirmation;
      }

      await onSubmit(dataToSubmit);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
          <button 
            type="button"
            className="close-btn" 
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="modal-cedula">Número de Cédula *</label>
            <input
              id="modal-cedula"
              type="text"
              value={cedula}
              onChange={handleCedulaChange}
              placeholder="0123456789"
              maxLength={10}
              className={errors.cedula ? 'form-input error' : 'form-input'}
              disabled={loading}
              autoComplete="off"
            />
            {errors.cedula && <span className="error-text">{errors.cedula}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-nombres">Nombres *</label>
            <input
              id="modal-nombres"
              type="text"
              value={nombres}
              onChange={handleNombresChange}
              placeholder="Ingrese sus nombres"
              className={errors.nombres ? 'form-input error' : 'form-input'}
              disabled={loading}
              autoComplete="off"
            />
            {errors.nombres && <span className="error-text">{errors.nombres}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-apellidos">Apellidos *</label>
            <input
              id="modal-apellidos"
              type="text"
              value={apellidos}
              onChange={handleApellidosChange}
              placeholder="Ingrese sus apellidos"
              className={errors.apellidos ? 'form-input error' : 'form-input'}
              disabled={loading}
              autoComplete="off"
            />
            {errors.apellidos && <span className="error-text">{errors.apellidos}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-username">Nombre de Usuario *</label>
            <input
              id="modal-username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="nombre_usuario"
              className={errors.username ? 'form-input error' : 'form-input'}
              disabled={loading}
              autoComplete="off"
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-email">Email *</label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="usuario@example.com"
              className={errors.email ? 'form-input error' : 'form-input'}
              disabled={loading}
              autoComplete="off"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-password">
              {isEditing ? 'Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'} *
            </label>
            <input
              id="modal-password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial"
              className={errors.password ? 'form-input error' : 'form-input'}
              disabled={loading}
              autoComplete="new-password"
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
            <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
              Debe contener: mayúscula, minúscula, número y carácter especial (@$!%*?&)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="modal-password-confirm">
              {isEditing ? 'Confirmar Contraseña (dejar en blanco para no cambiar)' : 'Confirmar Contraseña'} *
            </label>
            <input
              id="modal-password-confirm"
              type="password"
              value={passwordConfirmation}
              onChange={handlePasswordConfirmChange}
              placeholder="Repite tu contraseña"
              className={errors.password_confirmation ? 'form-input error' : 'form-input'}
              disabled={loading}
              autoComplete="new-password"
            />
            {errors.password_confirmation && <span className="error-text">{errors.password_confirmation}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-role">Rol *</label>
            {rolesPermitidos.length > 0 ? (
              <select
                id="modal-role"
                value={role}
                onChange={handleRoleChange}
                className={errors.role ? 'form-input error' : 'form-input'}
                disabled={loading}
              >
                {rolesPermitidos.map((rol) => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="form-input" style={{ backgroundColor: '#f5f5f5', color: '#999' }}>
                No tienes permisos para crear usuarios
              </div>
            )}
            {errors.role && <span className="error-text">{errors.role}</span>}
          </div>

            {isEditing ? (
              <div className="form-group">
                <label htmlFor="modal-estado">Estado *</label>
                <select
                  id="modal-estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className={errors.estado ? 'form-input error' : 'form-input'}
                  disabled={loading || (isEditing && initialData?.email === 'admin@factura.local')}
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="activo">Activo</option>
                  <option value="pendiente_verificacion">Pendiente de verificación</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="retirado">Retirado</option>
                </select>
                {errors.estado && <span className="error-text">{errors.estado}</span>}
                {isEditing && initialData?.email === 'admin@factura.local' && (
                  <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                    El usuario admin@factura.local permanece siempre Activo.
                  </small>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label>Estado asignado automáticamente *</label>
                <div className="form-input" style={{ backgroundColor: '#f5f5f5', color: '#333' }}>
                  Nuevo
                </div>
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Los usuarios nuevos inician con estado "Nuevo" y podrán cambiarlo posteriormente desde la edición.
                </small>
              </div>
            )}

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || rolesPermitidos.length === 0}
            >
              {loading ? (
                <LoadingSpinner inline size={18} message="Guardando…" />
              ) : (
                isEditing ? 'Actualizar' : 'Registrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuarioFormModal;
