import React, { useState, useEffect } from 'react';
import { 
  tiposImpuestoApi, 
  TipoImpuesto,
  TipoImpuestoEnum,
  TipoTarifaEnum,
  EstadoTipoImpuesto,
  TARIFA_POR_TIPO,
} from '../services/tiposImpuestoApi';
import { useNotification } from '../contexts/NotificationContext';
import './TipoImpuestoFormModal.css';

interface Props {
  tipoImpuesto?: TipoImpuesto;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  tipo_impuesto: TipoImpuestoEnum;
  tipo_tarifa: TipoTarifaEnum;
  codigo: string;
  nombre: string;
  valor_tarifa: string;
  estado: EstadoTipoImpuesto;
  password: string;
}

interface FormErrors {
  tipo_impuesto?: string;
  tipo_tarifa?: string;
  codigo?: string;
  nombre?: string;
  valor_tarifa?: string;
  estado?: string;
  password?: string;
  general?: string;
}

const TipoImpuestoFormModal: React.FC<Props> = ({ tipoImpuesto, onClose, onSuccess }) => {
  const { show } = useNotification();
  const isEditing = !!tipoImpuesto;
  
  const [formData, setFormData] = useState<FormData>({
    tipo_impuesto: tipoImpuesto?.tipo_impuesto || 'IVA',
    tipo_tarifa: tipoImpuesto?.tipo_tarifa || 'Porcentaje',
    codigo: tipoImpuesto?.codigo?.toString() || '',
    nombre: tipoImpuesto?.nombre || '',
    valor_tarifa: tipoImpuesto?.valor_tarifa?.toString() || '',
    estado: tipoImpuesto?.estado || 'Activo',
    password: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [tieneProductos, setTieneProductos] = useState(false);
  const [cantidadProductos, setCantidadProductos] = useState(0);
  const [showDesactivarWarning, setShowDesactivarWarning] = useState(false);
  
  // Cargar información adicional si está editando
  useEffect(() => {
    const loadTipoImpuestoDetails = async () => {
      try {
        const response = await tiposImpuestoApi.get(tipoImpuesto!.id!);
        setTieneProductos(response.data.data.tiene_productos || false);
        setCantidadProductos(response.data.data.cantidad_productos || 0);
      } catch (err) {
        console.error('Error al cargar detalles:', err);
      }
    };

    if (isEditing && tipoImpuesto?.id) {
      loadTipoImpuestoDetails();
    }
  }, [isEditing, tipoImpuesto]);

  // Obtener tarifas permitidas según el tipo de impuesto
  const getTarifasPermitidas = (tipo: TipoImpuestoEnum): TipoTarifaEnum[] => {
    return TARIFA_POR_TIPO[tipo] || [];
  };

  // Manejar cambio de tipo de impuesto
  const handleTipoImpuestoChange = (tipo: TipoImpuestoEnum) => {
    const tarifasPermitidas = getTarifasPermitidas(tipo);
    const nuevaTarifa = tarifasPermitidas[0]; // Primera tarifa permitida por defecto
    
    setFormData(prev => ({
      ...prev,
      tipo_impuesto: tipo,
      tipo_tarifa: nuevaTarifa,
    }));
    
    // Limpiar error de tarifa
    setErrors(prev => ({ ...prev, tipo_tarifa: undefined }));
  };

  // Validar campo individual
  const validateField = async (field: keyof FormData, value: string): Promise<string | undefined> => {
    switch (field) {
      case 'codigo':
        if (!value.trim()) return 'El código es obligatorio.';
        if (!/^\d+$/.test(value)) return 'El código debe ser un número entero positivo.';
        if (parseInt(value) < 1) return 'El código debe ser un número positivo.';
        // Verificar duplicado
        try {
          const response = await tiposImpuestoApi.checkCodigo(parseInt(value), tipoImpuesto?.id);
          if (response.data.exists) return 'Ya existe un tipo de impuesto con este código.';
        } catch (e) {}
        break;
        
      case 'nombre':
        if (!value.trim()) return 'El nombre es obligatorio.';
        if (value.length > 100) return 'El nombre no puede exceder 100 caracteres.';
        // Verificar duplicado
        try {
          const response = await tiposImpuestoApi.checkNombre(value, tipoImpuesto?.id);
          if (response.data.exists) return 'Ya existe un tipo de impuesto con este nombre.';
        } catch (e) {}
        break;
        
      case 'valor_tarifa':
        if (!value.trim()) return 'El valor de la tarifa es obligatorio.';
        const num = parseFloat(value);
        if (isNaN(num)) return 'El valor de la tarifa debe ser numérico.';
        if (num < 0) return 'El valor de la tarifa debe ser positivo.';
        break;
        
      case 'password':
        if (isEditing && !value.trim()) return 'La contraseña es obligatoria para confirmar los cambios.';
        break;
    }
    return undefined;
  };

  // Manejar cambio de campo con validación en tiempo real
  const handleChange = async (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validación en tiempo real (con debounce para campos que verifican duplicados)
    const error = await validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
    
    // Mostrar advertencia si se desactiva y tiene productos
    if (field === 'estado' && value === 'Desactivado' && tieneProductos) {
      setShowDesactivarWarning(true);
    } else if (field === 'estado') {
      setShowDesactivarWarning(false);
    }
  };

  // Validar todo el formulario
  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};
    
    // Validar tipo de impuesto
    if (!formData.tipo_impuesto) {
      newErrors.tipo_impuesto = 'El tipo de impuesto es obligatorio.';
    }
    
    // Validar tipo de tarifa
    if (!formData.tipo_tarifa) {
      newErrors.tipo_tarifa = 'El tipo de tarifa es obligatorio.';
    } else {
      const tarifasPermitidas = getTarifasPermitidas(formData.tipo_impuesto);
      if (!tarifasPermitidas.includes(formData.tipo_tarifa)) {
        newErrors.tipo_tarifa = `Tipo de tarifa no válido para ${formData.tipo_impuesto}.`;
      }
    }
    
    // Validar código
    const codigoError = await validateField('codigo', formData.codigo);
    if (codigoError) newErrors.codigo = codigoError;
    
    // Validar nombre
    const nombreError = await validateField('nombre', formData.nombre);
    if (nombreError) newErrors.nombre = nombreError;
    
    // Validar valor tarifa
    const valorTarifaError = await validateField('valor_tarifa', formData.valor_tarifa);
    if (valorTarifaError) newErrors.valor_tarifa = valorTarifaError;
    
    // Validar contraseña (solo en edición)
    if (isEditing) {
      const passwordError = await validateField('password', formData.password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;
    
    setLoading(true);
    
    try {
      const dataToSend = {
        tipo_impuesto: formData.tipo_impuesto,
        tipo_tarifa: formData.tipo_tarifa,
        codigo: parseInt(formData.codigo),
        nombre: formData.nombre.trim(),
        valor_tarifa: parseFloat(formData.valor_tarifa),
        estado: formData.estado,
        password: formData.password,
      };
      
      if (isEditing) {
        await tiposImpuestoApi.update(tipoImpuesto!.id!, dataToSend);
        show({ title: 'Éxito', message: '✅ Tipo de impuesto actualizado exitosamente.', type: 'success' });
      } else {
        await tiposImpuestoApi.create(dataToSend);
        show({ title: 'Éxito', message: '✅ Tipo de impuesto registrado exitosamente.', type: 'success' });
      }
      
      onSuccess();
      
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al guardar tipo de impuesto';
      const fieldErrors = err?.response?.data?.errors;
      
      if (fieldErrors) {
        const newErrors: FormErrors = {};
        Object.keys(fieldErrors).forEach((key) => {
          newErrors[key as keyof FormErrors] = fieldErrors[key][0];
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: msg });
      }
      
      show({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Verificar si un campo está deshabilitado
  const isFieldDisabled = (field: string): boolean => {
    if (!isEditing) return false;
    if (field === 'estado') return false; // Estado siempre editable
    return tieneProductos; // Si tiene productos, los demás campos están bloqueados
  };

  return (
    <div className="impuesto-modal-overlay">
      <div className="impuesto-modal-container">
        {/* Header */}
        <div className="impuesto-modal-header">
          <div className="impuesto-header-content">
            <div className="impuesto-header-icon">
              {isEditing ? '✏️' : '📊'}
            </div>
            <div className="impuesto-header-text">
              <h2>{isEditing ? 'Editar Tipo de Impuesto' : 'Nuevo Tipo de Impuesto'}</h2>
              <p>{isEditing ? 'Modifica los datos del impuesto' : 'Configura un nuevo tipo de impuesto'}</p>
            </div>
          </div>
          <button className="impuesto-modal-close" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="impuesto-modal-form">
          <div className="impuesto-modal-body">
            {errors.general && (
              <div className="impuesto-error-general">
                <span>⚠️</span>
                {errors.general}
              </div>
            )}
            
            {isEditing && tieneProductos && (
              <div className="impuesto-warning-box">
                <span className="impuesto-warning-icon">⚠️</span>
                <div className="impuesto-warning-text">
                  <strong>Atención</strong>
                  Este tipo de impuesto está asociado a {cantidadProductos} producto(s). 
                  Solo puede modificar el estado.
                </div>
              </div>
            )}
            
            {showDesactivarWarning && (
              <div className="impuesto-warning-box danger">
                <span className="impuesto-warning-icon">🚨</span>
                <div className="impuesto-warning-text">
                  <strong>Advertencia importante</strong>
                  Al desactivar este impuesto, se eliminará la asociación con {cantidadProductos} productos.
                </div>
              </div>
            )}
            
            <div className="impuesto-form-grid">
              {/* Tipo de Impuesto y Tipo de Tarifa */}
              <div className="impuesto-form-row">
                <div className="impuesto-form-group">
                  <label className="impuesto-form-label">
                    <span className="icon">📋</span>
                    Tipo de Impuesto
                    <span className="required">*</span>
                  </label>
                  <select
                    value={formData.tipo_impuesto}
                    onChange={(e) => handleTipoImpuestoChange(e.target.value as TipoImpuestoEnum)}
                    disabled={isFieldDisabled('tipo_impuesto')}
                    className={`impuesto-form-select ${errors.tipo_impuesto ? 'error' : ''}`}
                  >
                    <option value="IVA">🧾 IVA</option>
                    <option value="ICE">🍺 ICE</option>
                    <option value="IRBPNR">🚗 IRBPNR</option>
                  </select>
                  {errors.tipo_impuesto && (
                    <span className="impuesto-error-text">⚠️ {errors.tipo_impuesto}</span>
                  )}
                </div>
                
                <div className="impuesto-form-group">
                  <label className="impuesto-form-label">
                    <span className="icon">📊</span>
                    Tipo de Tarifa
                    <span className="required">*</span>
                  </label>
                  <select
                    value={formData.tipo_tarifa}
                    onChange={(e) => handleChange('tipo_tarifa', e.target.value)}
                    disabled={isFieldDisabled('tipo_tarifa') || getTarifasPermitidas(formData.tipo_impuesto).length === 1}
                    className={`impuesto-form-select ${errors.tipo_tarifa ? 'error' : ''}`}
                  >
                    {getTarifasPermitidas(formData.tipo_impuesto).map((tarifa) => (
                      <option key={tarifa} value={tarifa}>
                        {tarifa === 'Porcentaje' ? '📈 Porcentaje' : '💵 Valor Fijo'}
                      </option>
                    ))}
                  </select>
                  {errors.tipo_tarifa && (
                    <span className="impuesto-error-text">⚠️ {errors.tipo_tarifa}</span>
                  )}
                  {getTarifasPermitidas(formData.tipo_impuesto).length === 1 && (
                    <span className="impuesto-hint-text">🔒 Bloqueado según el tipo de impuesto</span>
                  )}
                </div>
              </div>

              {/* Separador */}
              <div className="impuesto-section-divider">
                <span className="impuesto-section-title">📝 Datos del Impuesto</span>
              </div>

              {/* Código y Nombre */}
              <div className="impuesto-form-row">
                <div className="impuesto-form-group">
                  <label className="impuesto-form-label">
                    <span className="icon">🔢</span>
                    Código
                    <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.codigo}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    disabled={isFieldDisabled('codigo')}
                    className={`impuesto-form-input ${errors.codigo ? 'error' : ''}`}
                    placeholder="Ej: 4"
                  />
                  {errors.codigo && (
                    <span className="impuesto-error-text">⚠️ {errors.codigo}</span>
                  )}
                </div>
                
                <div className="impuesto-form-group">
                  <label className="impuesto-form-label">
                    <span className="icon">🏷️</span>
                    Nombre
                    <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    disabled={isFieldDisabled('nombre')}
                    className={`impuesto-form-input ${errors.nombre ? 'error' : ''}`}
                    placeholder="Ej: IVA 15%"
                  />
                  {errors.nombre && (
                    <span className="impuesto-error-text">⚠️ {errors.nombre}</span>
                  )}
                </div>
              </div>

              {/* Valor de Tarifa y Estado */}
              <div className="impuesto-form-row">
                <div className="impuesto-form-group">
                  <label className="impuesto-form-label">
                    <span className="icon">💰</span>
                    Valor de Tarifa
                    <span className="required">*</span>
                  </label>
                  <div className="impuesto-input-addon-wrapper">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.valor_tarifa}
                      onChange={(e) => handleChange('valor_tarifa', e.target.value)}
                      disabled={isFieldDisabled('valor_tarifa')}
                      className={`impuesto-form-input ${errors.valor_tarifa ? 'error' : ''}`}
                      placeholder="Ej: 15.00"
                    />
                    <span className="impuesto-input-addon">
                      {formData.tipo_tarifa === 'Porcentaje' ? '%' : '$'}
                    </span>
                  </div>
                  {errors.valor_tarifa && (
                    <span className="impuesto-error-text">⚠️ {errors.valor_tarifa}</span>
                  )}
                </div>
                
                <div className="impuesto-form-group">
                  <label className="impuesto-form-label">
                    <span className="icon">✅</span>
                    Estado
                    <span className="required">*</span>
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => handleChange('estado', e.target.value)}
                    className={`impuesto-form-select ${errors.estado ? 'error' : ''}`}
                  >
                    <option value="Activo">✅ Activo</option>
                    <option value="Desactivado">⏸️ Desactivado</option>
                  </select>
                  {errors.estado && (
                    <span className="impuesto-error-text">⚠️ {errors.estado}</span>
                  )}
                </div>
              </div>

              {/* Contraseña (solo en edición) */}
              {isEditing && (
                <>
                  <div className="impuesto-section-divider">
                    <span className="impuesto-section-title">🔐 Confirmación</span>
                  </div>
                  <div className="impuesto-form-row single">
                    <div className="impuesto-form-group">
                      <label className="impuesto-form-label">
                        <span className="icon">🔑</span>
                        Contraseña de Confirmación
                        <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className={`impuesto-form-input ${errors.password ? 'error' : ''}`}
                        placeholder="Ingresa tu contraseña para confirmar"
                      />
                      {errors.password && (
                        <span className="impuesto-error-text">⚠️ {errors.password}</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Vista previa */}
              {formData.nombre && formData.valor_tarifa && (
                <div className="impuesto-preview-section">
                  <label className="impuesto-preview-label">
                    <span>👁️</span>
                    Vista Previa
                  </label>
                  <div className="impuesto-preview-card">
                    <div className="impuesto-preview-left">
                      <span className="impuesto-preview-tipo">{formData.tipo_impuesto}</span>
                      <span className="impuesto-preview-nombre">{formData.nombre || 'Nombre'}</span>
                    </div>
                    <div className="impuesto-preview-right">
                      <span className="impuesto-preview-valor">
                        {formData.valor_tarifa || '0'}
                        {formData.tipo_tarifa === 'Porcentaje' ? '%' : '$'}
                      </span>
                      <span className="impuesto-preview-tarifa">{formData.tipo_tarifa}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="impuesto-modal-footer">
            <button 
              type="button" 
              className="impuesto-btn impuesto-btn-secondary" 
              onClick={onClose} 
              disabled={loading}
            >
              <span>✕</span>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="impuesto-btn impuesto-btn-primary" 
              disabled={loading}
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

export default TipoImpuestoFormModal;
