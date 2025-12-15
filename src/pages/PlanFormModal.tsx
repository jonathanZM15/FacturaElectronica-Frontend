import React from 'react';
import { Plan, planesApi } from '../services/planesApi';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './UsuarioFormModalModern.css';

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
          title: '✅ Éxito', 
          message: 'Plan actualizado correctamente',
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
      
      // Si viene del backend con validaciones
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstError = Object.keys(errors)[0];
        if (firstError && errors[firstError][0]) {
          errorMessage = errors[firstError][0];
        }
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
        
        // Manejo especial para nombre duplicado
        if (errorMessage.toLowerCase().includes('ya existe')) {
          errorMessage = '❌ Ya existe un plan con este nombre.';
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

  return (
    <div className="usuario-modal-overlay">
      <div className="usuario-modal-content usuario-modal-content-barra-izquierda">
        <div className="usuario-modal-barra-izquierda"></div>
        <div className="usuario-modal-main">
          <div className="usuario-modal-header" style={{ position: 'relative' }}>
            <h2>{plan ? '✏️ Editar Plan' : '📊 Crear Nuevo Plan'}</h2>
            <button
              type="button"
              className="usuario-modal-close"
              onClick={onClose}
              disabled={loading}
              style={{ position: 'absolute', top: 24, right: 24 }}
            >
              ✕
            </button>
          </div>
          {/* Barra horizontal decorativa dentro del recuadro blanco */}
          <div className="usuario-barra-horizontal-interna"></div>

          <form onSubmit={handleSubmit}>
            <div className="usuario-modal-body">
              <div className="usuario-form-grid">
                
                {/* Nombre del Plan - Ancho Completo */}
                <div className="usuario-form-group full-width">
                  <label htmlFor="plan-nombre" className="usuario-form-label">
                    <span className="icon">📝</span>
                    Nombre del Plan
                    <span className="required">*</span>
                  </label>
                  <input
                    id="plan-nombre"
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Plan Básico, Plan Profesional"
                    className={errors.nombre ? 'usuario-form-input error' : 'usuario-form-input'}
                    disabled={loading}
                    autoComplete="off"
                  />
                  {errors.nombre && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.nombre}
                    </span>
                  )}
                </div>

                {/* Cantidad de Comprobantes - Columna 1 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-cantidad" className="usuario-form-label">
                    <span className="icon">📄</span>
                    Cantidad de Comprobantes
                    <span className="required">*</span>
                  </label>
                  <input
                    id="plan-cantidad"
                    type="number"
                    name="cantidad_comprobantes"
                    value={formData.cantidad_comprobantes}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    className={errors.cantidad_comprobantes ? 'usuario-form-input error' : 'usuario-form-input'}
                    disabled={loading}
                    placeholder="Ej: 100 (solo números positivos)"
                  />
                  {errors.cantidad_comprobantes && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.cantidad_comprobantes}
                    </span>
                  )}
                </div>

                {/* Precio - Columna 2 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-precio" className="usuario-form-label">
                    <span className="icon">💰</span>
                    Precio (USD)
                    <span className="required">*</span>
                  </label>
                  <input
                    id="plan-precio"
                    type="number"
                    name="precio"
                    value={formData.precio || ''}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    className={errors.precio ? 'usuario-form-input error' : 'usuario-form-input'}
                    disabled={loading}
                    placeholder="Ej: 25.99 (>0, máx 2 decimales)"
                  />
                  {errors.precio && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.precio}
                    </span>
                  )}
                </div>

                {/* Período - Columna 1 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-periodo" className="usuario-form-label">
                    <span className="icon">📅</span>
                    Período
                    <span className="required">*</span>
                  </label>
                  <select
                    id="plan-periodo"
                    name="periodo"
                    value={formData.periodo}
                    onChange={handleChange}
                    className="usuario-form-select"
                    disabled={loading}
                  >
                    {PERIODOS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Estado - Columna 2 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-estado" className="usuario-form-label">
                    <span className="icon">✅</span>
                    Estado
                    <span className="required">*</span>
                  </label>
                  <select
                    id="plan-estado"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className="usuario-form-select"
                    disabled={loading}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>

                {/* Comprobantes Mínimos - Columna 1 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-comp-min" className="usuario-form-label">
                    <span className="icon">📋</span>
                    Comprobantes Mínimos
                    <span className="required">*</span>
                  </label>
                  <input
                    id="plan-comp-min"
                    type="number"
                    name="comprobantes_minimos"
                    value={formData.comprobantes_minimos}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    className={errors.comprobantes_minimos ? 'usuario-form-input error' : 'usuario-form-input'}
                    disabled={loading}
                    placeholder="Ej: 5 (solo números positivos)"
                  />
                  {errors.comprobantes_minimos && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.comprobantes_minimos}
                    </span>
                  )}
                </div>

                {/* Días Mínimos - Columna 2 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-dias-min" className="usuario-form-label">
                    <span className="icon">⏰</span>
                    Días Mínimos
                    <span className="required">*</span>
                  </label>
                  <input
                    id="plan-dias-min"
                    type="number"
                    name="dias_minimos"
                    value={formData.dias_minimos}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    className={errors.dias_minimos ? 'usuario-form-input error' : 'usuario-form-input'}
                    disabled={loading}
                    placeholder="Ej: 5 (solo números positivos)"
                  />
                  {errors.dias_minimos && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.dias_minimos}
                    </span>
                  )}
                </div>

                {/* Color de Fondo - Columna 1 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-color-fondo" className="usuario-form-label">
                    <span className="icon">🎨</span>
                    Color de Fondo
                    <span className="required">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      id="plan-color-fondo"
                      name="color_fondo"
                      value={formData.color_fondo}
                      onChange={handleChange}
                      style={{ 
                        width: '50px', 
                        height: '40px', 
                        cursor: 'pointer', 
                        borderRadius: '4px', 
                        border: 'none',
                        padding: 0
                      }}
                      disabled={loading}
                      title="Selector visual de color"
                    />
                    <input
                      type="text"
                      value={formData.color_fondo.toUpperCase()}
                      onChange={handleChange}
                      name="color_fondo"
                      className={errors.color_fondo ? 'usuario-form-input error' : 'usuario-form-input'}
                      placeholder="#000000"
                      maxLength={7}
                      style={{ flex: 1 }}
                      disabled={loading}
                      title="Formato: #RRGGBB (ej: #808080)"
                    />
                  </div>
                  {errors.color_fondo && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.color_fondo}
                    </span>
                  )}
                </div>

                {/* Color de Texto - Columna 2 */}
                <div className="usuario-form-group">
                  <label htmlFor="plan-color-texto" className="usuario-form-label">
                    <span className="icon">🎨</span>
                    Color de Texto
                    <span className="required">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      id="plan-color-texto"
                      name="color_texto"
                      value={formData.color_texto}
                      onChange={handleChange}
                      style={{ 
                        width: '50px', 
                        height: '40px', 
                        cursor: 'pointer', 
                        borderRadius: '4px', 
                        border: 'none',
                        padding: 0
                      }}
                      disabled={loading}
                      title="Selector visual de color"
                    />
                    <input
                      type="text"
                      value={formData.color_texto.toUpperCase()}
                      onChange={handleChange}
                      name="color_texto"
                      className={errors.color_texto ? 'usuario-form-input error' : 'usuario-form-input'}
                      placeholder="#000000"
                      maxLength={7}
                      style={{ flex: 1 }}
                      disabled={loading}
                      title="Formato: #RRGGBB (ej: #000000)"
                    />
                  </div>
                  {errors.color_texto && (
                    <span className="usuario-error-text">
                      <span className="icon">⚠️</span>
                      {errors.color_texto}
                    </span>
                  )}
                </div>

                {/* Observación - Ancho Completo */}
                <div className="usuario-form-group full-width">
                  <label htmlFor="plan-observacion" className="usuario-form-label">
                    <span className="icon">📝</span>
                    Observación (Opcional)
                  </label>
                  <textarea
                    id="plan-observacion"
                    name="observacion"
                    value={formData.observacion}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Añade notas o detalles adicionales sobre este plan"
                    className="usuario-form-input"
                    disabled={loading}
                    style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <button
                  type="button"
                  className="usuario-btn usuario-btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="usuario-btn usuario-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span style={{ marginRight: '8px' }}>⏳</span>
                      {plan ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      <span style={{ marginRight: '8px' }}>{plan ? '✏️' : '✅'}</span>
                      {plan ? 'Actualizar Plan' : 'Crear Plan'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlanFormModal;
