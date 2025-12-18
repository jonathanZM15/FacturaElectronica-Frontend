import React from 'react';
import { Plan, planesApi } from '../services/planesApi';
import { useNotification } from '../contexts/NotificationContext';
import './PlanFormModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan?: Plan | null;
}

const PERIODOS = ['Mensual', 'Trimestral', 'Semestral', 'Anual', 'Bianual', 'Trianual'];
const ESTADOS = ['Activo', 'Desactivado'];

const PlanFormModal: React.FC<Props> = ({ open, onClose, onSuccess, plan }) => {
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState({
    nombre: '',
    cantidad_comprobantes: 100,
    precio: 0,
    periodo: 'Mensual' as Plan['periodo'],
    observacion: '',
    color_fondo: '#808080',
    color_texto: '#000000',
    estado: 'Activo' as Plan['estado'],
    comprobantes_minimos: 5,
    dias_minimos: 5,
  });

  // Cargar datos del plan si se está editando
  React.useEffect(() => {
    if (plan) {
      setFormData({
        nombre: plan.nombre,
        cantidad_comprobantes: plan.cantidad_comprobantes,
        precio: plan.precio,
        periodo: plan.periodo,
        observacion: plan.observacion || '',
        color_fondo: plan.color_fondo,
        color_texto: plan.color_texto,
        estado: plan.estado,
        comprobantes_minimos: plan.comprobantes_minimos,
        dias_minimos: plan.dias_minimos,
      });
    } else {
      setFormData({
        nombre: '',
        cantidad_comprobantes: 100,
        precio: 0,
        periodo: 'Mensual',
        observacion: '',
        color_fondo: '#808080',
        color_texto: '#000000',
        estado: 'Activo',
        comprobantes_minimos: 5,
        dias_minimos: 5,
      });
    }
    setErrors({});
  }, [plan, open]);

  // Validación individual para cada campo en tiempo real
  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'nombre':
        if (!value.trim()) {
          return 'El nombre es obligatorio';
        }
        if (value.length < 3) {
          return 'El nombre debe tener al menos 3 caracteres';
        }
        if (value.length > 255) {
          return 'El nombre no puede exceder 255 caracteres';
        }
        return '';

      case 'cantidad_comprobantes':
        if (!Number.isInteger(Number(value)) || Number(value) < 1) {
          return 'La cantidad de comprobantes debe ser un número entero positivo (≥1)';
        }
        return '';

      case 'precio':
        const precio = parseFloat(value);
        if (isNaN(precio)) {
          return 'El precio debe ser un número válido';
        }
        if (precio < 0.01) {
          return 'El precio debe ser mayor a 0 (valores positivos)';
        }
        if (!/^\d+(\.\d{1,2})?$/.test(String(precio))) {
          return 'El precio debe ser un decimal válido con hasta 2 dígitos (ej: 99.99)';
        }
        return '';

      case 'color_fondo':
      case 'color_texto':
        if (!value) {
          return name === 'color_fondo' ? 'El color de fondo es obligatorio' : 'El color de texto es obligatorio';
        }
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return `El color debe estar en formato hexadecimal válido (ej: #808080)`;
        }
        return '';

      case 'comprobantes_minimos':
        if (!Number.isInteger(Number(value)) || Number(value) < 1) {
          return 'Los comprobantes mínimos deben ser un número entero positivo (≥1)';
        }
        return '';

      case 'dias_minimos':
        if (!Number.isInteger(Number(value)) || Number(value) < 1) {
          return 'Los días mínimos deben ser un número entero positivo (≥1)';
        }
        return '';

      default:
        return '';
    }
  };

  // Validación completa del formulario (al hacer submit)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nombre (requerido)
    const nombreError = validateField('nombre', formData.nombre);
    if (nombreError) newErrors.nombre = nombreError;

    // Validar cantidad de comprobantes
    const cantidadError = validateField('cantidad_comprobantes', formData.cantidad_comprobantes);
    if (cantidadError) newErrors.cantidad_comprobantes = cantidadError;

    // Validar precio
    const precioError = validateField('precio', formData.precio);
    if (precioError) newErrors.precio = precioError;

    // Validar colores
    const colorFondoError = validateField('color_fondo', formData.color_fondo);
    if (colorFondoError) newErrors.color_fondo = colorFondoError;

    const colorTextoError = validateField('color_texto', formData.color_texto);
    if (colorTextoError) newErrors.color_texto = colorTextoError;

    // Validar comprobantes mínimos
    const comprobantesMinError = validateField('comprobantes_minimos', formData.comprobantes_minimos);
    if (comprobantesMinError) newErrors.comprobantes_minimos = comprobantesMinError;

    // Validar días mínimos
    const diasMinError = validateField('dias_minimos', formData.dias_minimos);
    if (diasMinError) newErrors.dias_minimos = diasMinError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      show({ 
        title: '⚠️ Error de Validación', 
        message: 'Por favor corrige los errores en el formulario',
        type: 'error' 
      });
      return;
    }

    try {
      setLoading(true);

      if (plan?.id) {
        // Actualizar plan existente
        await planesApi.update(plan.id, formData);
        show({ 
          title: '✅ Plan actualizado exitosamente', 
          message: 'El plan ha sido actualizado correctamente',
          type: 'success' 
        });
      } else {
        // Crear nuevo plan
        await planesApi.create(formData);
        show({ 
          title: '✅ Plan registrado exitosamente',
          message: 'El plan ha sido guardado en la base de datos',
          type: 'success' 
        });
      }

      // Esperar un poco para que el usuario vea el mensaje
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: any) {
      // Manejo mejorado de errores específicos
      let errorMessage = 'Error al guardar el plan';
      const fieldErrors: Record<string, string> = {};
      
      // Si viene del backend con validaciones por campo
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        
        // Mapear errores a los campos
        Object.keys(errors).forEach(field => {
          if (errors[field] && errors[field][0]) {
            fieldErrors[field] = errors[field][0];
            
            // Si es error de nombre duplicado
            if (field === 'nombre' && errors[field][0].toLowerCase().includes('ya')) {
              fieldErrors[field] = 'Ya existe un plan con este nombre';
            }
          }
        });
        
        setErrors(fieldErrors);
        
        // Mensaje general
        const firstError = Object.keys(errors)[0];
        if (firstError && errors[firstError][0]) {
          errorMessage = errors[firstError][0];
        }
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
        
        // Manejo especial para nombre duplicado
        if (errorMessage.toLowerCase().includes('ya existe')) {
          errorMessage = '❌ Ya existe un plan con este nombre.';
          setErrors({ nombre: 'Ya existe un plan con este nombre' });
        }
      }
      
      show({ 
        title: '❌ Error',
        message: errorMessage,
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Actualizar el estado del formulario
    if (name === 'cantidad_comprobantes' || name === 'comprobantes_minimos' || name === 'dias_minimos') {
      const intValue = parseInt(value) || 0;
      // Prevenir números negativos
      const finalValue = intValue < 0 ? 0 : intValue;
      setFormData(prev => ({ ...prev, [name]: finalValue }));
      
      // Validación en tiempo real
      const error = validateField(name, finalValue);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    } else if (name === 'precio') {
      const floatValue = parseFloat(value) || 0;
      // Prevenir números negativos
      const finalValue = floatValue < 0 ? 0 : floatValue;
      setFormData(prev => ({ ...prev, [name]: finalValue }));
      
      // Validación en tiempo real
      const error = validateField(name, finalValue);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    } else {
      // Para campos de texto y selects
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Validación en tiempo real
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  if (!open) return null;

  // Formatear precio para preview
  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(precio);
  };

  return (
    <div className="plan-modal-overlay">
      <div className="plan-modal-container">
        {/* Header */}
        <div className="plan-modal-header">
          <div className="plan-modal-header-content">
            <div className="plan-modal-icon">
              {plan ? '✏️' : '📋'}
            </div>
            <div className="plan-modal-title-group">
              <h2 className="plan-modal-title">
                {plan ? 'Editar Plan' : 'Crear Nuevo Plan'}
              </h2>
              <p className="plan-modal-subtitle">
                {plan ? 'Modifica los detalles del plan existente' : 'Configura un nuevo plan de facturación'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="plan-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="plan-modal-form">
          <div className="plan-modal-body">
            <div className="plan-form-grid">
              
              {/* Nombre del Plan */}
              <div className="plan-form-group full-width">
                <label className="plan-form-label">
                  <span className="icon">📝</span>
                  Nombre del Plan
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Plan Básico, Plan Profesional, Plan Enterprise"
                  className={`plan-form-input ${errors.nombre ? 'error' : ''}`}
                  disabled={loading}
                  autoComplete="off"
                />
                {errors.nombre && (
                  <span className="plan-error-text">
                    <span className="icon">⚠️</span>
                    {errors.nombre}
                  </span>
                )}
              </div>

              {/* Separador - Configuración de comprobantes */}
              <div className="plan-section-divider">
                <span className="plan-section-title">💼 Configuración del Plan</span>
              </div>

              {/* Cantidad de Comprobantes */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">📦</span>
                  Cantidad de Comprobantes
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="cantidad_comprobantes"
                  value={formData.cantidad_comprobantes}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  className={`plan-form-input ${errors.cantidad_comprobantes ? 'error' : ''}`}
                  disabled={loading}
                  placeholder="Ej: 100"
                />
                {errors.cantidad_comprobantes && (
                  <span className="plan-error-text">
                    <span className="icon">⚠️</span>
                    {errors.cantidad_comprobantes}
                  </span>
                )}
              </div>

              {/* Precio */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">💵</span>
                  Precio (USD)
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio || ''}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  className={`plan-form-input ${errors.precio ? 'error' : ''}`}
                  disabled={loading}
                  placeholder="Ej: 29.99"
                />
                {errors.precio && (
                  <span className="plan-error-text">
                    <span className="icon">⚠️</span>
                    {errors.precio}
                  </span>
                )}
              </div>

              {/* Período */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">📅</span>
                  Período de Facturación
                  <span className="required">*</span>
                </label>
                <select
                  name="periodo"
                  value={formData.periodo}
                  onChange={handleChange}
                  className="plan-form-select"
                  disabled={loading}
                >
                  {PERIODOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">✅</span>
                  Estado del Plan
                  <span className="required">*</span>
                </label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="plan-form-select"
                  disabled={loading}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e === 'Activo' ? '✅ Activo' : '⏸️ Desactivado'}</option>
                  ))}
                </select>
              </div>

              {/* Separador - Límites */}
              <div className="plan-section-divider">
                <span className="plan-section-title">📊 Límites Mínimos</span>
              </div>

              {/* Comprobantes Mínimos */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">📉</span>
                  Comprobantes Mínimos
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="comprobantes_minimos"
                  value={formData.comprobantes_minimos}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  className={`plan-form-input ${errors.comprobantes_minimos ? 'error' : ''}`}
                  disabled={loading}
                  placeholder="Ej: 5"
                />
                {errors.comprobantes_minimos && (
                  <span className="plan-error-text">
                    <span className="icon">⚠️</span>
                    {errors.comprobantes_minimos}
                  </span>
                )}
              </div>

              {/* Días Mínimos */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">⏱️</span>
                  Días Mínimos
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="dias_minimos"
                  value={formData.dias_minimos}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  className={`plan-form-input ${errors.dias_minimos ? 'error' : ''}`}
                  disabled={loading}
                  placeholder="Ej: 30"
                />
                {errors.dias_minimos && (
                  <span className="plan-error-text">
                    <span className="icon">⚠️</span>
                    {errors.dias_minimos}
                  </span>
                )}
              </div>

              {/* Separador - Personalización */}
              <div className="plan-section-divider">
                <span className="plan-section-title">🎨 Personalización Visual</span>
              </div>

              {/* Color de Fondo */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">🎨</span>
                  Color de Fondo
                  <span className="required">*</span>
                </label>
                <div className="plan-color-picker-group">
                  <input
                    type="color"
                    name="color_fondo"
                    value={formData.color_fondo}
                    onChange={handleChange}
                    className="plan-color-picker"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={formData.color_fondo.toUpperCase()}
                    onChange={handleChange}
                    name="color_fondo"
                    className={`plan-form-input ${errors.color_fondo ? 'error' : ''}`}
                    placeholder="#808080"
                    maxLength={7}
                    disabled={loading}
                  />
                </div>
                {errors.color_fondo && (
                  <span className="plan-error-text">
                    <span className="icon">⚠️</span>
                    {errors.color_fondo}
                  </span>
                )}
              </div>

              {/* Color de Texto */}
              <div className="plan-form-group">
                <label className="plan-form-label">
                  <span className="icon">✍️</span>
                  Color de Texto
                  <span className="required">*</span>
                </label>
                <div className="plan-color-picker-group">
                  <input
                    type="color"
                    name="color_texto"
                    value={formData.color_texto}
                    onChange={handleChange}
                    className="plan-color-picker"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={formData.color_texto.toUpperCase()}
                    onChange={handleChange}
                    name="color_texto"
                    className={`plan-form-input ${errors.color_texto ? 'error' : ''}`}
                    placeholder="#000000"
                    maxLength={7}
                    disabled={loading}
                  />
                </div>
                {errors.color_texto && (
                  <span className="plan-error-text">
                    <span className="icon">⚠️</span>
                    {errors.color_texto}
                  </span>
                )}
              </div>

              {/* Preview del Plan */}
              <div className="plan-preview-section">
                <label className="plan-preview-label">
                  <span className="icon">👁️</span>
                  Vista Previa del Plan
                </label>
                <div 
                  className="plan-preview-card"
                  style={{ 
                    backgroundColor: formData.color_fondo, 
                    color: formData.color_texto 
                  }}
                >
                  <span className="plan-preview-name">
                    {formData.nombre || 'Nombre del Plan'}
                  </span>
                  <span className="plan-preview-price">
                    {formatPrecio(formData.precio || 0)} / {formData.periodo}
                  </span>
                </div>
              </div>

              {/* Observación */}
              <div className="plan-form-group full-width">
                <label className="plan-form-label">
                  <span className="icon">💬</span>
                  Observaciones (Opcional)
                </label>
                <textarea
                  name="observacion"
                  value={formData.observacion}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Añade notas o detalles adicionales sobre este plan..."
                  className="plan-form-textarea"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="plan-modal-footer">
            <button
              type="button"
              className="plan-btn plan-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              <span>✕</span>
              Cancelar
            </button>
            <button
              type="submit"
              className="plan-btn plan-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  {plan ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <span>{plan ? '💾' : '✅'}</span>
                  {plan ? 'Guardar Cambios' : 'Crear Plan'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanFormModal;
