import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/userContext';
import { usuariosEmisorApi } from '../../services/usuariosEmisorApi';
import { User } from '../../types/user';
import { validateCedulaEcuatoriana, validateEmail, validateUsername, validateNombre } from '../../helpers/validations';
import '../Usuarios/UsuarioFormModal.css';
import LoadingSpinner from '../../components/LoadingSpinner';

interface EmisorUsuarioFormModalProps {
  open: boolean;
  onClose: () => void;
  emiId: string | number;
  editingId?: string | number | null;
  initialData?: User | null;
  establecimientos: Array<{ id: number; nombre: string; codigo: string; estado?: string | null }>;
  puntosEmision: Array<{ id: number; nombre: string; establecimiento_id: number; codigo?: string | null; estado?: string | null; estado_disponibilidad?: string | null }>;
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
  const [checkingCedula, setCheckingCedula] = React.useState(false);
  const [checkingEmail, setCheckingEmail] = React.useState(false);
  const [checkingUsername, setCheckingUsername] = React.useState(false);
  const [resendingEmail, setResendingEmail] = React.useState(false);
  const [estado, setEstado] = React.useState<string>('nuevo');
  const isEditing = React.useMemo(() => Boolean(editingId), [editingId]);
  const identityLocked = React.useMemo(() => {
    if (!isEditing) return false;
    return Boolean(initialData?.email_verified_at) || initialData?.estado === 'activo';
  }, [initialData?.email_verified_at, initialData?.estado, isEditing]);

  const normalizeIdArray = React.useCallback((value: any): number[] => {
    if (Array.isArray(value)) {
      return value
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));
    }

    if (typeof value === 'string') {
      let parsed: any = value;
      for (let i = 0; i < 2; i++) {
        if (typeof parsed !== 'string') break;
        try {
          parsed = JSON.parse(parsed);
        } catch {
          break;
        }
      }
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));
      }
    }

    return [];
  }, []);

  const assignedPuntoIds = React.useMemo(() => {
    if (!isEditing || !initialData) return new Set<number>();

    const idsFromField = normalizeIdArray((initialData as any).puntos_emision_ids);
    const idsFromObjects = Array.isArray((initialData as any).puntos_emision)
      ? (initialData as any).puntos_emision
          .map((p: any) => Number(p?.id))
          .filter((n: number) => Number.isFinite(n))
      : [];

    return new Set<number>([...idsFromField, ...idsFromObjects]);
  }, [initialData, isEditing, normalizeIdArray]);

  const cedulaCheckTimeoutRef = React.useRef<number | null>(null);
  const cedulaCheckSeqRef = React.useRef(0);
  const initFormKeyRef = React.useRef<string | null>(null);

  const getEstadoEstablecimiento = React.useCallback((est: { estado?: string | null }) => {
    // Si el backend no envía estado, asumimos ABIERTO para no dejar la UI vacía.
    return (est.estado ?? 'ABIERTO').toString().trim().toUpperCase();
  }, []);

  const compareCodigoDesc = React.useCallback((aCodigoRaw?: string | null, bCodigoRaw?: string | null) => {
    const aCodigo = (aCodigoRaw ?? '').toString();
    const bCodigo = (bCodigoRaw ?? '').toString();
    return bCodigo.localeCompare(aCodigo, undefined, { numeric: true, sensitivity: 'base' });
  }, []);

  const normalizeUpper = React.useCallback((value?: string | null) => {
    return (value ?? '').toString().trim().toUpperCase();
  }, []);

  const getPuntoOperatividad = React.useCallback((punto: any) => {
    // Distintos endpoints pueden devolver nombres distintos.
    return normalizeUpper(punto?.estado ?? punto?.estado_operatividad ?? punto?.estadoOperatividad);
  }, [normalizeUpper]);

  const getPuntoDisponibilidad = React.useCallback((punto: any) => {
    // Si viene vacío/undefined, el resto de la UI lo trata como "Libre".
    const raw = punto?.estado_disponibilidad ?? punto?.estadoDisponibilidad ?? punto?.disponibilidad;
    const normalized = normalizeUpper(raw);
    return normalized || 'LIBRE';
  }, [normalizeUpper]);

  const isPuntoActivoYLibre = React.useCallback((punto: any) => {
    return getPuntoOperatividad(punto) === 'ACTIVO' && getPuntoDisponibilidad(punto) === 'LIBRE';
  }, [getPuntoOperatividad, getPuntoDisponibilidad]);

  const isPuntoSelectableForThisForm = React.useCallback((punto: any) => {
    // En asignación normal: solo Activo + Libre
    // En edición: también debe mostrarse (y mantenerse) el punto ya asociado al usuario,
    // aunque su disponibilidad no sea 'LIBRE' (por estar ocupado por esa asociación).
    if (isPuntoActivoYLibre(punto)) return true;
    if (isEditing && assignedPuntoIds.has(Number(punto?.id))) return true;
    return false;
  }, [assignedPuntoIds, isEditing, isPuntoActivoYLibre]);

  const availableEstablecimientos = React.useMemo(() => {
    // Requisito: al registrar y en edición, solo mostrar establecimientos ABIERTO.
    let base = establecimientos.filter((e) => getEstadoEstablecimiento(e) === 'ABIERTO');

    // HU: si el usuario logeado es GERENTE, solo puede asociar usuarios a sus establecimientos.
    if (currentUser?.role === 'gerente') {
      let idsVal = currentUser.establecimientos_ids;
      if (typeof idsVal === 'string') {
        try {
          idsVal = JSON.parse(idsVal);
        } catch (e) {
          idsVal = [];
        }
      }
      const ids = Array.isArray(idsVal)
        ? idsVal.map((v) => Number(v)).filter((n) => Number.isFinite(n))
        : [];
      const allowed = new Set(ids);
      base = base.filter((e) => allowed.has(Number(e.id)));
    }

    return base.slice().sort((a, b) => compareCodigoDesc(a.codigo, b.codigo));
  }, [establecimientos, getEstadoEstablecimiento, compareCodigoDesc, currentUser?.role, currentUser?.establecimientos_ids]);

  const availableEstablecimientosIds = React.useMemo(() => {
    return availableEstablecimientos.map((e) => e.id);
  }, [availableEstablecimientos]);

  React.useEffect(() => {
    if (!open) return;

    const allowed = new Set(availableEstablecimientosIds);

    setSelectedEstablecimientos((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      if (next.length === prev.length) return prev;
      return next;
    });

    setSelectedPuntosPorEstablecimiento((prev) => {
      let changed = false;
      const next: Record<number, number | null> = { ...prev };
      for (const key of Object.keys(next)) {
        const estId = Number(key);
        if (!allowed.has(estId)) {
          delete next[estId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [open, availableEstablecimientosIds]);

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
      return availableEstablecimientos.map(est => est.id);
    }
    const allowed = new Set(availableEstablecimientosIds);
    return selectedEstablecimientos.filter((id) => allowed.has(id));
  }, [role, availableEstablecimientos, availableEstablecimientosIds, selectedEstablecimientos]);

  React.useEffect(() => {
    setSelectedPuntosPorEstablecimiento((prev) => {
      const next: Record<number, number | null> = {};
      let changed = false;

      activeEstablecimientos.forEach((estId) => {
        const prevValue = Object.prototype.hasOwnProperty.call(prev, estId) ? prev[estId] : null;
        const isValid = prevValue && puntosEmision.some((p) => {
          if (p.id !== prevValue) return false;
          if (Number(p.establecimiento_id) !== Number(estId)) return false;
          return isPuntoSelectableForThisForm(p);
        })
          ? prevValue
          : null;
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
  }, [activeEstablecimientos, puntosEmision, isPuntoSelectableForThisForm]);

  const handlePuntoSelection = React.useCallback((estId: number, value: string) => {
    setSelectedPuntosPorEstablecimiento((prev) => ({
      ...prev,
      [estId]: value ? Number(value) : null
    }));
  }, []);

  // HU: No se puede seleccionar establecimientos y puntos de emisor para el rol CAJERO creado por usuario de rol GERENTE
  const disabledEmision = currentUser?.role === 'gerente' && role === 'cajero';

  const getPuntosForEstablecimiento = React.useCallback((estId: number) => {
    return puntosEmision
      .filter((p) => Number(p.establecimiento_id) === Number(estId))
      .filter((p) => isPuntoSelectableForThisForm(p))
      .slice()
      .sort((a, b) => compareCodigoDesc(a.codigo, b.codigo));
  }, [puntosEmision, isPuntoSelectableForThisForm, compareCodigoDesc]);

  React.useEffect(() => {
    if (!open) {
      initFormKeyRef.current = null;
      return;
    }

    // Clave de inicialización para no pisar lo que el usuario escribe
    const initKey = editingId ? `edit:${editingId}` : 'create';

    // En edición, esperar a que llegue initialData
    if (editingId && !initialData) return;

    // Si ya inicializamos este modo/usuario, no volver a resetear
    if (initFormKeyRef.current === initKey) return;
    initFormKeyRef.current = initKey;

    if (open && initialData) {
      setCedula(initialData.cedula || '');
      setNombres(initialData.nombres || '');
      setApellidos(initialData.apellidos || '');
      setUsername(initialData.username || '');
      setEmail(initialData.email || '');
      setRole(initialData.role || 'gerente');
      setEstado(initialData.estado || 'nuevo');

      const allowedEsts = new Set(availableEstablecimientosIds.map((id) => Number(id)));

      const estIdsFromField = normalizeIdArray((initialData as any).establecimientos_ids);
      const estIdsFromObjects = Array.isArray((initialData as any).establecimientos)
        ? (initialData as any).establecimientos
            .map((e: any) => Number(e?.id))
            .filter((n: number) => Number.isFinite(n))
        : [];
      const estIdsFromPuntos = Array.isArray((initialData as any).puntos_emision)
        ? (initialData as any).puntos_emision
            .map((p: any) => Number(p?.establecimiento_id))
            .filter((n: number) => Number.isFinite(n))
        : [];

      const mergedEstIds = Array.from(
        new Set([...estIdsFromField, ...estIdsFromObjects, ...estIdsFromPuntos])
      )
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && allowedEsts.has(id));

      setSelectedEstablecimientos(mergedEstIds);

      const nextMap: Record<number, number | null> = {};
      // Preferir objetos (traen establecimiento_id)
      if (Array.isArray((initialData as any).puntos_emision) && (initialData as any).puntos_emision.length > 0) {
        (initialData as any).puntos_emision.forEach((p: any) => {
          const estId = Number(p?.establecimiento_id);
          const puntoId = Number(p?.id);
          if (!Number.isFinite(estId) || !Number.isFinite(puntoId)) return;
          if (!allowedEsts.has(estId)) return;
          if (nextMap[estId] != null) return;
          nextMap[estId] = puntoId;
        });
      } else {
        // Fallback: ids + lookup por catálogo de puntos
        const puntoIds = normalizeIdArray((initialData as any).puntos_emision_ids);
        puntoIds.forEach((pid) => {
          const found = puntosEmision.find((p) => Number(p.id) === Number(pid));
          if (!found) return;
          const estId = Number(found.establecimiento_id);
          if (!Number.isFinite(estId) || !allowedEsts.has(estId)) return;
          if (nextMap[estId] != null) return;
          nextMap[estId] = Number(pid);
        });
      }

      setSelectedPuntosPorEstablecimiento(nextMap);
    } else {
      // Reset form (solo al abrir)
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
  }, [open, editingId, initialData, getRolesPermitidos, availableEstablecimientosIds, normalizeIdArray, puntosEmision]);

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
      // Emisor: se asocia automáticamente a todos los establecimientos disponibles.
      if (availableEstablecimientosIds.length === 0) {
        newErrors.establecimientos = 'No hay establecimientos disponibles (ABIERTO) para asignar al Emisor.';
      }
    } else if (role === 'gerente' || role === 'cajero') {
      // Gerente y Cajero: establecimientos y puntos NO obligatorios
      // Ya no forzamos seleccionar establishment
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const puntosSeleccionados = React.useMemo(() => {
    return activeEstablecimientos
      .map((estId) => selectedPuntosPorEstablecimiento[estId] ?? null)
      .filter((p): p is number => Boolean(p));
  }, [activeEstablecimientos, selectedPuntosPorEstablecimiento]);

  const canSubmit = React.useMemo(() => {
    if (loading || resendingEmail || checkingCedula || checkingEmail || checkingUsername) return false;

    const cedulaV = validateCedulaEcuatoriana(cedula.trim());
    const nombresV = validateNombre(nombres.trim(), 'nombres');
    const apellidosV = validateNombre(apellidos.trim(), 'apellidos');
    const emailV = validateEmail(email.trim());
    const usernameV = validateUsername(username.trim());

    const establecimientosOk =
      role === 'emisor'
        ? availableEstablecimientosIds.length > 0
        : true; // Gerentes y Cajeros no están obligados a seleccionar establecimientos

    const hasAnyInlineErrors = Object.values(errors).some((e) => e && e.length > 0);

    return (
      cedulaV.valid &&
      nombresV.valid &&
      apellidosV.valid &&
      emailV.valid &&
      usernameV.valid &&
      Boolean(role) &&
      establecimientosOk &&
      !hasAnyInlineErrors
    );
  }, [
    apellidos,
    cedula,
    checkingCedula,
    checkingEmail,
    checkingUsername,
    email,
    errors,
    loading,
    nombres,
    resendingEmail,
    role,
    selectedEstablecimientos.length,
    availableEstablecimientosIds.length,
    username
  ]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Almacenar en minúsculas y sin espacios inmediatamente
    let value = e.target.value.toLowerCase().replace(/\s/g, '');
    setUsername(value);

    // Validación usando helper
    const validation = validateUsername(value);
    const error = validation.valid ? '' : (validation.error || '');
    setErrors((prev) => ({ ...prev, username: error }));

    // Verificar disponibilidad si es válido y tiene al menos 3 caracteres
    if (value.trim().length >= 3 && !error && (!isEditing || value !== initialData?.username)) {
      setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const res = await usuariosEmisorApi.checkUsername(value, editingId || undefined);
          const available = res?.data?.available ?? !res?.data?.exists;
          if (!available) {
            setErrors((prev) => ({ ...prev, username: '❌ Este nombre de usuario ya está registrado. Por favor elige otro.' }));
          } else {
            setErrors((prev) => ({ ...prev, username: '' }));
          }
        } catch (err: any) {
          show({ title: 'Error', message: 'No se pudo verificar el nombre de usuario', type: 'error' });
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
    setErrors((prev) => ({ ...prev, email: error }));

    // Verificar disponibilidad si es válido y no está editando
    if (validation.valid && (!isEditing || value !== initialData?.email)) {
      setTimeout(async () => {
        setCheckingEmail(true);
        try {
          const res = await usuariosEmisorApi.checkEmail(value, editingId || undefined);
          const available = res?.data?.available ?? !res?.data?.exists;
          if (!available) {
            setErrors((prev) => ({ ...prev, email: '❌ Este correo electrónico ya está registrado en el sistema. Por favor usa otro.' }));
          } else {
            setErrors((prev) => ({ ...prev, email: '' }));
          }
        } catch (err: any) {
          show({ title: 'Error', message: 'No se pudo verificar el correo', type: 'error' });
        } finally {
          setCheckingEmail(false);
        }
      }, 500);
    }
  };

  // Handlers de validación
  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCedula(value);
    
    const validation = validateCedulaEcuatoriana(value);
    const error = validation.valid ? '' : (validation.error || '');
    setErrors((prev) => ({ ...prev, cedula: error }));
  };

  const handleNombresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]/g, '');
    setNombres(value);
    
    const validation = validateNombre(value, 'nombres');
    const error = validation.valid ? '' : (validation.error || '');
    setErrors((prev) => ({ ...prev, nombres: error }));
  };

  const handleApellidosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]/g, '');
    setApellidos(value);
    
    const validation = validateNombre(value, 'apellidos');
    const error = validation.valid ? '' : (validation.error || '');
    setErrors((prev) => ({ ...prev, apellidos: error }));
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
        role // Usar 'role' en lugar de 'rol'
      };

      // Aplicar reglas de asociación según el rol
      if (role === 'emisor') {
        // Emisor: se asocia automáticamente a todos los establecimientos disponibles
        payload.establecimientos_ids = availableEstablecimientosIds;
        if (puntosSeleccionados.length > 0) {
          payload.puntos_emision_ids = puntosSeleccionados;
        }
      } else if (role === 'gerente' || role === 'cajero') {
        // Gerente y Cajero: establecimientos y puntos ya NO obligatorios
        payload.establecimientos_ids = selectedEstablecimientos.length > 0 ? selectedEstablecimientos : [];
        if (isEditing || puntosSeleccionados.length > 0) {
          payload.puntos_emision_ids = puntosSeleccionados;
        }
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
                onChange={handleCedulaChange}
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
                onChange={handleNombresChange}
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
                onChange={handleApellidosChange}
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
                disabled={loading || identityLocked}
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
                disabled={loading || identityLocked}
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
                      Establecimientos (Opcional)
                    </h3>
                    <p style={{ 
                      fontSize: 13, 
                      color: '#92400e', 
                      margin: '4px 0 0',
                      fontWeight: 500
                    }}>
                      Opcional para {role} - Selecciona los establecimientos asignados
                    </p>
                  </div>
                </div>
              </div>
              
              {availableEstablecimientos.length === 0 ? (
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
                      No hay establecimientos en estado <strong>ABIERTO</strong> disponibles para asignar.
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
                    {availableEstablecimientos.map((est, index) => (
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
                          cursor: disabledEmision ? 'not-allowed' : 'pointer',
                          opacity: disabledEmision ? 0.6 : 1,
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
                          disabled={disabledEmision}
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
                            cursor: disabledEmision ? 'not-allowed' : 'pointer',
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

                        {disabledEmision && (
                          <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>
                            Restringido (CAJERO creado por GERENTE)
                          </div>
                        )}
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

              {/* Mensaje cuando no se ha seleccionado ningún establecimiento */}
              {(role === 'gerente' || role === 'cajero') && selectedEstablecimientos.length === 0 && (
                <div style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #fbbf24',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <span style={{ fontSize: 13, color: '#92400e', fontWeight: 700 }}>
                    No se ha seleccionado ningún establecimiento.
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
          {activeEstablecimientos.length > 0 ? (
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
                      Seleccione únicamente un punto de emisión por cada establecimiento asignado
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
                {errors.puntos_emision_ids && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '1px solid #ef4444',
                    borderRadius: 10,
                    color: '#991b1b',
                    fontSize: 13,
                    fontWeight: 700
                  }}>
                    {errors.puntos_emision_ids}
                  </div>
                )}

                {(role === 'emisor' || role === 'gerente' || role === 'cajero') && puntosSeleccionados.length === 0 && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '1px solid #fbbf24',
                    borderRadius: 10,
                    color: '#92400e',
                    fontSize: 13,
                    fontWeight: 700
                  }}>
                    ℹ️ Si no se selecciona un punto de emisión, el usuario no tendrá un punto de emisión asignado.
                  </div>
                )}
                {activeEstablecimientos.map((estId, index) => {
                  const estInfo = availableEstablecimientos.find((est) => est.id === estId);
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
                              No existen puntos de emisión disponibles (activos y libres) para este establecimiento
                            </p>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <select
                              value={selectedPuntoId != null ? String(selectedPuntoId) : ''}
                              onChange={(e) => handlePuntoSelection(estId, e.target.value)}
                              disabled={disabledEmision}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '2px solid #cbd5e1',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#334155',
                                background: disabledEmision ? '#f1f5f9' : '#ffffff',
                                cursor: disabledEmision ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                outline: 'none',
                                opacity: disabledEmision ? 0.7 : 1
                                
                              }}
                              onFocus={(e) => {
                                if(disabledEmision) return;
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
                                  {punto.codigo ? `${punto.codigo} – ${punto.nombre}` : punto.nombre}
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
          ) : (
            // Placeholder cuando aún no hay establecimientos seleccionados
            (role === 'gerente' || role === 'cajero') && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #fbbf24',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <span style={{ fontSize: 18 }}>ℹ️</span>
                  <span style={{ fontSize: 13, color: '#92400e', fontWeight: 700 }}>
                    Selecciona al menos un establecimiento para poder asignar puntos de emisión.
                  </span>
                </div>
              </div>
            )
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
                  <LoadingSpinner inline size={18} />
                ) : (
                  <>📧 Reenviar Correo</>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-submit"
            >
              {loading ? (
                <LoadingSpinner inline size={18} />
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
