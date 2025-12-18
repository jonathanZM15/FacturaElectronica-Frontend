import React, { useState, useEffect } from 'react';
import { tiposRetencionApi, TipoRetencion, TipoRetencionEnum, TIPOS_RETENCION } from '../services/tiposRetencionApi';
import { useNotification } from '../contexts/NotificationContext';
import './TipoRetencionFormModal.css';

interface Props {
  tipoRetencion?: TipoRetencion;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  tipo_retencion: TipoRetencionEnum;
  codigo: string;
  nombre: string;
  porcentaje: string;
  password: string;
}

interface FormErrors {
  tipo_retencion?: string;
  codigo?: string;
  nombre?: string;
  porcentaje?: string;
  password?: string;
  general?: string;
}

const TipoRetencionFormModal: React.FC<Props> = ({ tipoRetencion, onClose, onSuccess }) => {
  const { show } = useNotification();
  const isEditing = !!tipoRetencion;

  const [formData, setFormData] = useState<FormData>({
    tipo_retencion: tipoRetencion?.tipo_retencion || 'IVA',
    codigo: tipoRetencion?.codigo || '',
    nombre: tipoRetencion?.nombre || '',
    porcentaje: tipoRetencion?.porcentaje?.toString() || '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [checkingCodigo, setCheckingCodigo] = useState(false);

  // Verificar código duplicado
  useEffect(() => {
    const checkCodigo = async () => {
      if (!formData.codigo || formData.codigo.length < 1) return;
      
      setCheckingCodigo(true);
      try {
        const result = await tiposRetencionApi.checkCodigo(
          formData.tipo_retencion,
          formData.codigo,
          tipoRetencion?.id
        );
        
        if (result.exists) {
          setErrors(prev => ({ ...prev, codigo: 'Este código ya existe para el tipo de retención seleccionado' }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors.codigo === 'Este código ya existe para el tipo de retención seleccionado') {
              delete newErrors.codigo;
            }
            return newErrors;
          });
        }
      } catch (error) {
        console.error('Error al verificar código:', error);
      } finally {
        setCheckingCodigo(false);
      }
    };

    const timer = setTimeout(checkCodigo, 500);
    return () => clearTimeout(timer);
  }, [formData.codigo, formData.tipo_retencion, tipoRetencion?.id]);

  const handleChange = (field: keyof FormData, value: string) => {
    // Validación en tiempo real para código (solo alfanumérico)
    if (field === 'codigo') {
      value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    
    // Validación para porcentaje (solo números y punto)
    if (field === 'porcentaje') {
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].slice(0, 2);
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.tipo_retencion) {
      newErrors.tipo_retencion = 'El tipo de retención es obligatorio';
    }

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es obligatorio';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.codigo)) {
      newErrors.codigo = 'El código solo puede contener letras y números';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.porcentaje) {
      newErrors.porcentaje = 'El porcentaje es obligatorio';
    } else {
      const porcentaje = parseFloat(formData.porcentaje);
      if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
        newErrors.porcentaje = 'El porcentaje debe estar entre 0 y 100';
      }
    }

    if (isEditing && !formData.password) {
      newErrors.password = 'La contraseña es obligatoria para confirmar los cambios';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        tipo_retencion: formData.tipo_retencion,
        codigo: formData.codigo.toUpperCase(),
        nombre: formData.nombre,
        porcentaje: parseFloat(formData.porcentaje),
      };

      if (isEditing && tipoRetencion?.id) {
        await tiposRetencionApi.update(tipoRetencion.id, {
          ...payload,
          password: formData.password,
        });
        show({ type: 'success', title: 'Éxito', message: 'Tipo de retención actualizado exitosamente' });
      } else {
        await tiposRetencionApi.create(payload);
        show({ type: 'success', title: 'Éxito', message: 'Tipo de retención registrado exitosamente' });
      }

      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const message = err.response?.data?.message || 'Error al guardar el tipo de retención';
      
      if (err.response?.data?.errors) {
        const apiErrors: FormErrors = {};
        Object.entries(err.response.data.errors).forEach(([key, value]) => {
          apiErrors[key as keyof FormErrors] = Array.isArray(value) ? value[0] : value;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ general: message });
      }
      
      show({ type: 'error', title: 'Error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="retencion-modal-overlay">
      <div className="retencion-modal-container">
        {/* Header */}
        <div className="retencion-modal-header">
          <div className="retencion-header-content">
            <div className="retencion-header-icon">
              {isEditing ? '✏️' : '📋'}
            </div>
            <div className="retencion-header-text">
              <h2>{isEditing ? 'Editar Tipo de Retención' : 'Nuevo Tipo de Retención'}</h2>
              <p>{isEditing ? 'Modifica los datos de la retención' : 'Configura un nuevo tipo de retención'}</p>
            </div>
          </div>
          <button className="retencion-modal-close" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="retencion-modal-form">
          <div className="retencion-modal-body">
            {errors.general && (
              <div className="retencion-error-general">
                <span>⚠️</span>
                {errors.general}
              </div>
            )}
            
            <div className="retencion-form-grid">
              {/* Tipo de Retención */}
              <div className="retencion-form-row single">
                <div className="retencion-form-group">
                  <label className="retencion-form-label">
                    <span className="icon">📋</span>
                    Tipo de Retención
                    <span className="required">*</span>
                  </label>
                  <select
                    value={formData.tipo_retencion}
                    onChange={(e) => handleChange('tipo_retencion', e.target.value)}
                    className={`retencion-form-select ${errors.tipo_retencion ? 'error' : ''}`}
                  >
                    {TIPOS_RETENCION.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo === 'IVA' && '🧾'} {tipo === 'RENTA' && '💰'} {tipo === 'ISD' && '🌍'} {tipo}
                      </option>
                    ))}
                  </select>
                  {errors.tipo_retencion && (
                    <span className="retencion-error-text">⚠️ {errors.tipo_retencion}</span>
                  )}
                </div>
              </div>

              {/* Separador */}
              <div className="retencion-section-divider">
                <span className="retencion-section-title">📝 Datos de la Retención</span>
              </div>

              {/* Código y Nombre */}
              <div className="retencion-form-row">
                <div className="retencion-form-group">
                  <label className="retencion-form-label">
                    <span className="icon">🔢</span>
                    Código
                    <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={formData.codigo}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    className={`retencion-form-input ${errors.codigo ? 'error' : ''}`}
                    placeholder="Ej: 303, 4580"
                  />
                  {errors.codigo && (
                    <span className="retencion-error-text">⚠️ {errors.codigo}</span>
                  )}
                  {checkingCodigo && (
                    <span className="retencion-hint-text">⏳ Verificando...</span>
                  )}
                  <span className="retencion-hint-text">Solo letras y números, sin espacios</span>
                </div>
                
                <div className="retencion-form-group">
                  <label className="retencion-form-label">
                    <span className="icon">🏷️</span>
                    Porcentaje
                    <span className="required">*</span>
                  </label>
                  <div className="retencion-input-addon-wrapper">
                    <input
                      type="text"
                      value={formData.porcentaje}
                      onChange={(e) => handleChange('porcentaje', e.target.value)}
                      className={`retencion-form-input ${errors.porcentaje ? 'error' : ''}`}
                      placeholder="Ej: 10.00"
                    />
                    <span className="retencion-input-addon">%</span>
                  </div>
                  {errors.porcentaje && (
                    <span className="retencion-error-text">⚠️ {errors.porcentaje}</span>
                  )}
                </div>
              </div>

              {/* Nombre (fila completa) */}
              <div className="retencion-form-row single">
                <div className="retencion-form-group">
                  <label className="retencion-form-label">
                    <span className="icon">📄</span>
                    Nombre
                    <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    className={`retencion-form-input ${errors.nombre ? 'error' : ''}`}
                    placeholder="Ej: Retención IVA 30%, Honorarios profesionales..."
                  />
                  {errors.nombre && (
                    <span className="retencion-error-text">⚠️ {errors.nombre}</span>
                  )}
                </div>
              </div>

              {/* Contraseña (solo en edición) */}
              {isEditing && (
                <>
                  <div className="retencion-section-divider">
                    <span className="retencion-section-title">🔐 Confirmación</span>
                  </div>
                  <div className="retencion-form-row single">
                    <div className="retencion-form-group">
                      <label className="retencion-form-label">
                        <span className="icon">🔑</span>
                        Contraseña de Confirmación
                        <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className={`retencion-form-input ${errors.password ? 'error' : ''}`}
                        placeholder="Ingresa tu contraseña para confirmar"
                      />
                      {errors.password && (
                        <span className="retencion-error-text">⚠️ {errors.password}</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Vista previa */}
              {formData.nombre && formData.porcentaje && (
                <div className="retencion-preview-section">
                  <label className="retencion-preview-label">
                    <span>👁️</span>
                    Vista Previa
                  </label>
                  <div className="retencion-preview-card">
                    <div className="retencion-preview-left">
                      <span className="retencion-preview-tipo">{formData.tipo_retencion}</span>
                      <span className="retencion-preview-nombre">{formData.nombre || 'Nombre'}</span>
                      {formData.codigo && (
                        <span className="retencion-preview-codigo">Código: {formData.codigo}</span>
                      )}
                    </div>
                    <div className="retencion-preview-right">
                      <span className="retencion-preview-valor">
                        {formData.porcentaje || '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="retencion-modal-footer">
            <button 
              type="button" 
              className="retencion-btn retencion-btn-secondary" 
              onClick={onClose} 
              disabled={loading}
            >
              <span>✕</span>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="retencion-btn retencion-btn-primary" 
              disabled={loading || checkingCodigo}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  Guardando...
                </>
              ) : (
                <>
                  <span>{isEditing ? '💾' : '✅'}</span>
                  {isEditing ? 'Actualizar' : 'Registrar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TipoRetencionFormModal;
