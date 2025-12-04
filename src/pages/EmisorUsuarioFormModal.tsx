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
  const [selectedPuntos, setSelectedPuntos] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

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

  // Filtrar puntos según establecimientos seleccionados
  const availablePuntos = React.useMemo(() => {
    if (selectedEstablecimientos.length === 0) return [];
    
    return puntosEmision.filter(p => {
      return selectedEstablecimientos.includes(p.establecimiento_id) ||
             selectedEstablecimientos.includes(Number(p.establecimiento_id)) ||
             selectedEstablecimientos.includes(String(p.establecimiento_id) as any);
    });
  }, [selectedEstablecimientos, puntosEmision]);

  // Si se cambian establecimientos, actualizar puntos seleccionados
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const validPuntos = selectedPuntos.filter(p => availablePuntos.some(ap => ap.id === p));
    if (validPuntos.length !== selectedPuntos.length) {
      setSelectedPuntos(validPuntos);
    }
  }, [availablePuntos]);

  React.useEffect(() => {
    if (open && initialData) {
      setCedula(initialData.cedula || '');
      setNombres(initialData.nombres || '');
      setApellidos(initialData.apellidos || '');
      setUsername(initialData.username || '');
      setEmail(initialData.email);
      setRole(initialData.role || 'gerente');
      setSelectedEstablecimientos([]);
      setSelectedPuntos([]);
    } else if (open) {
      // Reset form
      setCedula('');
      setNombres('');
      setApellidos('');
      setUsername('');
      setEmail('');
      setRole(getRolesPermitidos.length > 0 ? getRolesPermitidos[0] : 'gerente');
      setSelectedEstablecimientos([]);
      setSelectedPuntos([]);
    }
    setErrors({});
  }, [open, initialData, getRolesPermitidos]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!cedula.match(/^\d{10}$/)) {
      newErrors.cedula = 'Debe contener exactamente 10 dígitos';
    }
    if (!nombres.match(/^[\p{L}\s\-'áéíóúñÁÉÍÓÚÑ]+$/u) || nombres.length < 3) {
      newErrors.nombres = 'Solo letras, mínimo 3 caracteres';
    }
    if (!apellidos.match(/^[\p{L}\s\-'áéíóúñÁÉÍÓÚÑ]+$/u) || apellidos.length < 3) {
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

      // Aplicar reglas de asociación según el rol
      if (role === 'emisor') {
        // Emisor: no es obligatorio, se asocia automáticamente a todos
        payload.establecimientos_ids = [];
        payload.puntos_emision_ids = [];
      } else if (role === 'gerente' || role === 'cajero') {
        // Gerente y Cajero: establecimientos obligatorios
        payload.establecimientos_ids = selectedEstablecimientos.length > 0 ? selectedEstablecimientos : [];
        payload.puntos_emision_ids = selectedPuntos.length > 0 ? selectedPuntos : [];
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
      <div className="mf-modal" style={{ width: 'min(650px, 92vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#1a63d6' }}>
            {editingId ? 'Editar usuario' : 'Registrar nuevo usuario'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Cédula */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Cédula *
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
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.cedula ? '2px solid #ff6b6b' : '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {errors.cedula && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.cedula}</span>}
            </div>

            {/* Nombres */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Nombres *
              </label>
              <input
                type="text"
                value={nombres}
                onChange={(e) => {
                  setNombres(e.target.value);
                  if (errors.nombres) setErrors({ ...errors, nombres: '' });
                }}
                placeholder="Juan Carlos"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.nombres ? '2px solid #ff6b6b' : '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {errors.nombres && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.nombres}</span>}
            </div>

            {/* Apellidos */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Apellidos *
              </label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => {
                  setApellidos(e.target.value);
                  if (errors.apellidos) setErrors({ ...errors, apellidos: '' });
                }}
                placeholder="Pérez López"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.apellidos ? '2px solid #ff6b6b' : '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {errors.apellidos && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.apellidos}</span>}
            </div>

            {/* Username */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Nombre de usuario *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors({ ...errors, username: '' });
                }}
                placeholder="usuario1"
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.username ? '2px solid #ff6b6b' : '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {errors.username && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.username}</span>}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder="usuario@example.com"
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.email ? '2px solid #ff6b6b' : '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {errors.email && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.email}</span>}
            </div>

            {/* Rol */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>
                Rol *
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  // Limpiar establecimientos y puntos al cambiar de rol
                  if (e.target.value === 'emisor') {
                    setSelectedEstablecimientos([]);
                    setSelectedPuntos([]);
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
            <div style={{ 
              marginBottom: 16, 
              padding: 16, 
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              border: '2px solid #4caf50',
              borderRadius: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 24 }}>🔐</span>
                <strong style={{ color: '#2e7d32', fontSize: 15 }}>Contraseña Auto-Generada</strong>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#388e3c', lineHeight: 1.5 }}>
                ℹ️ El usuario recibirá un correo electrónico para <strong>verificar su cuenta</strong> y establecer su propia contraseña de forma segura.
              </p>
            </div>
          )}

          {/* Establecimientos - mostrar solo para gerente/cajero */}
          {(role === 'gerente' || role === 'cajero') && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
                Establecimientos * (Obligatorio para {role})
              </label>
              {establecimientos.length === 0 ? (
                <p style={{ fontSize: 14, color: '#999', margin: 0 }}>No hay establecimientos disponibles</p>
              ) : (
                <div style={{ border: errors.establecimientos ? '2px solid #ff6b6b' : '1px solid #ddd', borderRadius: 6, padding: 12, maxHeight: 180, overflowY: 'auto' }}>
                  {establecimientos.map(est => (
                    <label key={est.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedEstablecimientos.includes(est.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEstablecimientos([...selectedEstablecimientos, est.id]);
                          } else {
                            setSelectedEstablecimientos(selectedEstablecimientos.filter(id => id !== est.id));
                          }
                          if (errors.establecimientos) setErrors({ ...errors, establecimientos: '' });
                        }}
                        style={{ marginRight: 8, cursor: 'pointer' }}
                      />
                      <span>{est.codigo} - {est.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
              {errors.establecimientos && <span style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.establecimientos}</span>}
            </div>
          )}

          {/* Mensaje informativo para emisor */}
          {role === 'emisor' && (
            <div style={{ 
              marginBottom: 16, 
              padding: 12, 
              backgroundColor: '#e3f2fd', 
              borderLeft: '4px solid #1a63d6',
              borderRadius: 4
            }}>
              <p style={{ margin: 0, fontSize: 14, color: '#1565c0' }}>
                ℹ️ El rol <strong>Emisor</strong> se asocia automáticamente a todos los establecimientos de la empresa.
              </p>
            </div>
          )}

          {/* Puntos de Emisión - mostrar solo si hay establecimientos seleccionados */}
          {selectedEstablecimientos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
                Puntos de Emisión (Opcional)
              </label>
              {availablePuntos.length === 0 ? (
                <p style={{ fontSize: 14, color: '#999', margin: 0 }}>
                  No hay puntos de emisión disponibles para los establecimientos seleccionados
                </p>
              ) : (
                <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, maxHeight: 180, overflowY: 'auto' }}>
                  {availablePuntos.map(punto => (
                    <label key={punto.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedPuntos.includes(punto.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPuntos([...selectedPuntos, punto.id]);
                          } else {
                            setSelectedPuntos(selectedPuntos.filter(id => id !== punto.id));
                          }
                        }}
                        style={{ marginRight: 8, cursor: 'pointer' }}
                      />
                      <span>{punto.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: '#fff',
                color: '#333',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: 6,
                background: loading ? '#ccc' : '#1a63d6',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {loading ? (
                <LoadingSpinner inline size={18} message="Guardando…" />
              ) : (
                editingId ? 'Actualizar' : 'Crear'
              )}
            </button>
          </div>
        </form>
        <style>{`
          .mf-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
          }
          .mf-modal {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>
    </div>
  );
};

export default EmisorUsuarioFormModal;
