import React, { useState, useEffect, useCallback } from 'react';
import { suscripcionesApi, PlanActivo, SuscripcionFormData, Suscripcion, CamposEditablesResponse } from '../services/suscripcionesApi';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './UsuarioFormModalModern.css';

interface Props {
  open: boolean;
  emisorId: number;
  suscripcion?: Suscripcion | null; // Para modo edición
  onClose: () => void;
  onSuccess: () => void;
}

const FORMAS_PAGO = ['Efectivo', 'Transferencia', 'Otro'];
const ESTADOS_SUSCRIPCION_MANUALES = ['Vigente', 'Suspendido'];
const ESTADOS_TRANSACCION = ['Pendiente', 'Confirmada'];
const ESTADOS_COMISION = ['Sin comision', 'Pendiente', 'Pagada'];

const SuscripcionFormModal: React.FC<Props> = ({ open, emisorId, suscripcion, onClose, onSuccess }) => {
  const { show } = useNotification();
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [loadingCampos, setLoadingCampos] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [planesActivos, setPlanesActivos] = useState<PlanActivo[]>([]);
  
  // Campos editables según permisos
  const [camposEditables, setCamposEditables] = useState<string[]>([]);
  const [camposInfo, setCamposInfo] = useState<CamposEditablesResponse | null>(null);

  const isAdmin = currentUser?.role === 'administrador';
  const isEditMode = !!suscripcion?.id;

  // Fecha máxima permitida (30 días adelante)
  const hoy = new Date();
  const fechaMaxima = new Date();
  fechaMaxima.setDate(hoy.getDate() + 30);

  const [formData, setFormData] = useState<{
    plan_id: number | '';
    fecha_inicio: string;
    fecha_fin: string;
    monto: number;
    cantidad_comprobantes: number;
    estado_suscripcion: string;
    forma_pago: string;
    estado_transaccion: string;
    estado_comision: string;
    monto_comision: number;
    comprobante_pago: File | null;
    factura: File | null;
    comprobante_comision: File | null;
  }>({
    plan_id: '',
    fecha_inicio: hoy.toISOString().split('T')[0],
    fecha_fin: '',
    monto: 0,
    cantidad_comprobantes: 0,
    estado_suscripcion: isAdmin ? 'Vigente' : 'Pendiente',
    forma_pago: 'Efectivo',
    estado_transaccion: isAdmin ? 'Confirmada' : 'Pendiente',
    estado_comision: 'Sin comision',
    monto_comision: 0,
    comprobante_pago: null,
    factura: null,
    comprobante_comision: null,
  });

  // Plan seleccionado
  const [selectedPlan, setSelectedPlan] = useState<PlanActivo | null>(null);

  // Inicializar datos del formulario cuando cambia la suscripción
  useEffect(() => {
    if (suscripcion) {
      setFormData({
        plan_id: suscripcion.plan_id || '',
        fecha_inicio: suscripcion.fecha_inicio?.split('T')[0] || hoy.toISOString().split('T')[0],
        fecha_fin: suscripcion.fecha_fin?.split('T')[0] || '',
        monto: suscripcion.monto || 0,
        cantidad_comprobantes: suscripcion.cantidad_comprobantes || 0,
        estado_suscripcion: suscripcion.estado_suscripcion || (isAdmin ? 'Vigente' : 'Pendiente'),
        forma_pago: suscripcion.forma_pago || 'Efectivo',
        estado_transaccion: suscripcion.estado_transaccion || (isAdmin ? 'Confirmada' : 'Pendiente'),
        estado_comision: suscripcion.estado_comision || 'Sin comision',
        monto_comision: suscripcion.monto_comision || 0,
        comprobante_pago: null,
        factura: null,
        comprobante_comision: null,
      });
    } else {
      // Reset para modo creación
      setFormData({
        plan_id: '',
        fecha_inicio: hoy.toISOString().split('T')[0],
        fecha_fin: '',
        monto: 0,
        cantidad_comprobantes: 0,
        estado_suscripcion: isAdmin ? 'Vigente' : 'Pendiente',
        forma_pago: 'Efectivo',
        estado_transaccion: isAdmin ? 'Confirmada' : 'Pendiente',
        estado_comision: 'Sin comision',
        monto_comision: 0,
        comprobante_pago: null,
        factura: null,
        comprobante_comision: null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suscripcion, isAdmin]);

  // Cargar planes activos
  useEffect(() => {
    const loadPlanes = async () => {
      try {
        setLoadingPlanes(true);
        const response = await suscripcionesApi.getPlanesActivos();
        setPlanesActivos(response.data.data || []);
        
        // Si es edición, encontrar el plan actual
        if (suscripcion?.plan_id) {
          const plan = response.data.data?.find((p: PlanActivo) => p.id === suscripcion.plan_id);
          if (plan) setSelectedPlan(plan);
        }
      } catch (err: any) {
        show({ title: 'Error', message: 'Error al cargar planes activos', type: 'error' });
      } finally {
        setLoadingPlanes(false);
      }
    };

    if (open) {
      loadPlanes();
    }
  }, [open, show, suscripcion?.plan_id]);

  // Cargar campos editables en modo edición
  const loadCamposEditables = useCallback(async () => {
    if (!isEditMode || !suscripcion?.id) {
      // En modo creación, todos los campos son editables según rol
      if (isAdmin) {
        setCamposEditables([
          'plan_id', 'fecha_inicio', 'fecha_fin', 'monto', 'cantidad_comprobantes',
          'estado_suscripcion', 'forma_pago', 'estado_transaccion',
          'comprobante_pago', 'factura', 'estado_comision', 'monto_comision', 'comprobante_comision'
        ]);
      } else {
        setCamposEditables([
          'plan_id', 'fecha_inicio', 'fecha_fin', 'monto', 'cantidad_comprobantes',
          'forma_pago', 'comprobante_pago', 'factura'
        ]);
      }
      return;
    }

    try {
      setLoadingCampos(true);
      const response = await suscripcionesApi.getCamposEditables(emisorId, suscripcion.id);
      setCamposEditables(response.data.data.campos_editables || []);
      setCamposInfo(response.data.data);
    } catch (err: any) {
      show({ 
        title: 'Error', 
        message: 'Error al cargar permisos de edición', 
        type: 'error' 
      });
      // En caso de error, deshabilitar todo
      setCamposEditables([]);
    } finally {
      setLoadingCampos(false);
    }
  }, [isEditMode, suscripcion?.id, emisorId, isAdmin, show]);

  useEffect(() => {
    if (open) {
      loadCamposEditables();
    }
  }, [open, loadCamposEditables]);

  // Helper para verificar si un campo es editable
  const isFieldEditable = (field: string): boolean => {
    if (!isEditMode) {
      // En modo creación
      if (isAdmin) return true;
      // Distribuidor no puede editar ciertos campos en creación
      const camposNoDistribuidor = ['estado_suscripcion', 'estado_transaccion', 'estado_comision', 'monto_comision', 'comprobante_comision'];
      return !camposNoDistribuidor.includes(field);
    }
    return camposEditables.includes(field);
  };

  // Calcular fecha de fin cuando cambia el plan o la fecha de inicio
  const calcularFechaFin = async (planId: number, fechaInicio: string) => {
    try {
      const response = await suscripcionesApi.calcularFechaFin(planId, fechaInicio);
      return response.data.data.fecha_fin;
    } catch (err) {
      return '';
    }
  };

  // Manejar cambio de plan
  const handlePlanChange = async (planId: number) => {
    const plan = planesActivos.find(p => p.id === planId);
    setSelectedPlan(plan || null);

    if (plan) {
      const fechaFin = await calcularFechaFin(planId, formData.fecha_inicio);
      setFormData(prev => ({
        ...prev,
        plan_id: planId,
        monto: plan.precio,
        cantidad_comprobantes: plan.cantidad_comprobantes,
        fecha_fin: fechaFin,
      }));
    }
  };

  // Manejar cambio de fecha de inicio
  const handleFechaInicioChange = async (fecha: string) => {
    setFormData(prev => ({ ...prev, fecha_inicio: fecha }));

    if (formData.plan_id) {
      const fechaFin = await calcularFechaFin(formData.plan_id as number, fecha);
      setFormData(prev => ({ ...prev, fecha_fin: fechaFin }));
    }

    // Validar rango (solo para creación)
    if (!isEditMode) {
      const fechaIngresada = new Date(fecha);
      if (fechaIngresada > fechaMaxima) {
        setErrors(prev => ({ ...prev, fecha_inicio: 'Fecha de inicio fuera del rango permitido.' }));
      } else {
        setErrors(prev => ({ ...prev, fecha_inicio: '' }));
      }
    }
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plan_id && isFieldEditable('plan_id')) {
      newErrors.plan_id = 'El plan es obligatorio';
    }
    if (!formData.fecha_inicio && isFieldEditable('fecha_inicio')) {
      newErrors.fecha_inicio = 'La fecha de inicio es obligatoria';
    }
    if (!formData.fecha_fin && isFieldEditable('fecha_fin')) {
      newErrors.fecha_fin = 'La fecha de fin es obligatoria';
    }
    if (formData.monto <= 0 && isFieldEditable('monto')) {
      newErrors.monto = 'El monto debe ser mayor a 0';
    }
    if (formData.cantidad_comprobantes < 1 && isFieldEditable('cantidad_comprobantes')) {
      newErrors.cantidad_comprobantes = 'La cantidad de comprobantes debe ser al menos 1';
    }
    
    // En edición, cantidad_comprobantes solo puede aumentar
    if (isEditMode && suscripcion && isFieldEditable('cantidad_comprobantes')) {
      if (formData.cantidad_comprobantes < suscripcion.cantidad_comprobantes) {
        newErrors.cantidad_comprobantes = `La cantidad no puede ser menor a ${suscripcion.cantidad_comprobantes} (actual)`;
      }
    } else if (!isEditMode && selectedPlan && formData.cantidad_comprobantes < selectedPlan.cantidad_comprobantes) {
      newErrors.cantidad_comprobantes = `La cantidad no puede ser menor a la del plan (${selectedPlan.cantidad_comprobantes})`;
    }
    
    if (!formData.forma_pago && isFieldEditable('forma_pago')) {
      newErrors.forma_pago = 'La forma de pago es obligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      show({ title: '⚠️ Error de Validación', message: 'Por favor corrige los errores en el formulario', type: 'error' });
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && suscripcion?.id) {
        // Modo edición - solo enviar campos editables que han cambiado
        const updateData: Partial<SuscripcionFormData> = {};
        
        if (isFieldEditable('plan_id') && formData.plan_id !== suscripcion.plan_id) {
          updateData.plan_id = formData.plan_id as number;
        }
        if (isFieldEditable('fecha_inicio') && formData.fecha_inicio !== suscripcion.fecha_inicio?.split('T')[0]) {
          updateData.fecha_inicio = formData.fecha_inicio;
        }
        if (isFieldEditable('fecha_fin') && formData.fecha_fin !== suscripcion.fecha_fin?.split('T')[0]) {
          updateData.fecha_fin = formData.fecha_fin;
        }
        if (isFieldEditable('monto') && formData.monto !== suscripcion.monto) {
          updateData.monto = formData.monto;
        }
        if (isFieldEditable('cantidad_comprobantes') && formData.cantidad_comprobantes !== suscripcion.cantidad_comprobantes) {
          updateData.cantidad_comprobantes = formData.cantidad_comprobantes;
        }
        if (isFieldEditable('estado_suscripcion') && formData.estado_suscripcion !== suscripcion.estado_suscripcion) {
          updateData.estado_suscripcion = formData.estado_suscripcion;
        }
        if (isFieldEditable('forma_pago') && formData.forma_pago !== suscripcion.forma_pago) {
          updateData.forma_pago = formData.forma_pago;
        }
        if (isFieldEditable('estado_transaccion') && formData.estado_transaccion !== suscripcion.estado_transaccion) {
          updateData.estado_transaccion = formData.estado_transaccion;
        }
        if (isFieldEditable('estado_comision') && formData.estado_comision !== suscripcion.estado_comision) {
          updateData.estado_comision = formData.estado_comision;
        }
        if (isFieldEditable('monto_comision') && formData.monto_comision !== suscripcion.monto_comision) {
          updateData.monto_comision = formData.monto_comision;
        }
        
        // Archivos
        if (isFieldEditable('comprobante_pago') && formData.comprobante_pago) {
          updateData.comprobante_pago = formData.comprobante_pago;
        }
        if (isFieldEditable('factura') && formData.factura) {
          updateData.factura = formData.factura;
        }
        if (isFieldEditable('comprobante_comision') && formData.comprobante_comision) {
          updateData.comprobante_comision = formData.comprobante_comision;
        }

        // Verificar que hay algo que actualizar
        if (Object.keys(updateData).length === 0) {
          show({ 
            title: 'ℹ️ Sin cambios', 
            message: 'No se detectaron cambios en los datos.', 
            type: 'info' 
          });
          return;
        }

        await suscripcionesApi.update(emisorId, suscripcion.id, updateData);
        show({ 
          title: '✅ Suscripción actualizada exitosamente', 
          message: 'Los cambios han sido guardados', 
          type: 'success' 
        });

        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        // Modo creación
        const data: SuscripcionFormData = {
          emisor_id: emisorId,
          plan_id: formData.plan_id as number,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin,
          monto: formData.monto,
          cantidad_comprobantes: formData.cantidad_comprobantes,
          forma_pago: formData.forma_pago,
        };

        // Solo admin puede establecer estado de suscripción y transacción
        if (isAdmin) {
          data.estado_suscripcion = formData.estado_suscripcion;
          data.estado_transaccion = formData.estado_transaccion;
        }

        // Archivos opcionales
        if (formData.comprobante_pago) {
          data.comprobante_pago = formData.comprobante_pago;
        }
        if (formData.factura) {
          data.factura = formData.factura;
        }

        await suscripcionesApi.create(emisorId, data);
        show({ title: '✅ Suscripción creada exitosamente.', message: 'La suscripción ha sido registrada', type: 'success' });

        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (err: any) {
      let errorMessage = isEditMode ? 'Error al actualizar la suscripción.' : 'Error al registrar la suscripción.';
      const fieldErrors: Record<string, string> = {};

      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach(field => {
          if (errors[field] && errors[field][0]) {
            fieldErrors[field] = errors[field][0];
          }
        });
        setErrors(fieldErrors);
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError) && firstError[0]) {
          errorMessage = firstError[0];
        }
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      show({ title: '❌ Error', message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'comprobante_pago' | 'factura' | 'comprobante_comision') => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  if (!open) return null;

  return (
    <div className="usuario-modal-overlay">
      <div className="usuario-modal-content usuario-modal-content-barra-izquierda" style={{ maxWidth: '750px' }}>
        <div className="usuario-modal-barra-izquierda" style={{ backgroundColor: isEditMode ? '#3b82f6' : '#10b981' }}></div>
        <div className="usuario-modal-main">
          <div className="usuario-modal-header" style={{ position: 'relative' }}>
            <h2>{isEditMode ? '✏️ Editar Suscripción' : '📋 Nueva Suscripción'}</h2>
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
          <div className="usuario-barra-horizontal-interna"></div>

          {/* Información de permisos en modo edición */}
          {isEditMode && camposInfo && (
            <div style={{ 
              backgroundColor: camposInfo.transaccion_confirmada ? '#fef3c7' : '#dbeafe', 
              padding: '12px', 
              margin: '0 24px',
              borderRadius: '8px', 
              marginTop: '16px',
              border: camposInfo.transaccion_confirmada ? '1px solid #f59e0b' : '1px solid #3b82f6'
            }}>
              <p style={{ margin: 0, color: camposInfo.transaccion_confirmada ? '#92400e' : '#1e40af', fontSize: '14px' }}>
                <strong>ℹ️ Estado:</strong> {suscripcion?.estado_suscripcion}
                {camposInfo.transaccion_confirmada && (
                  <span style={{ marginLeft: '8px' }}>| <strong>Transacción Confirmada</strong> - Algunos campos están bloqueados.</span>
                )}
                {camposInfo.tiene_comprobantes_emitidos && (
                  <span style={{ marginLeft: '8px' }}>| <strong>Tiene comprobantes emitidos</strong> - Plan y fechas no editables.</span>
                )}
              </p>
            </div>
          )}

          {loadingPlanes || loadingCampos ? (
            <LoadingSpinner />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="usuario-modal-body">
                <div className="usuario-form-grid">

                  {/* Plan */}
                  <div className="usuario-form-group full-width">
                    <label className="usuario-form-label">
                      <span className="icon">📊</span>
                      Plan
                      {isFieldEditable('plan_id') && <span className="required">*</span>}
                    </label>
                    <select
                      value={formData.plan_id}
                      onChange={(e) => handlePlanChange(Number(e.target.value))}
                      className={errors.plan_id ? 'usuario-form-select error' : 'usuario-form-select'}
                      disabled={loading || !isFieldEditable('plan_id')}
                    >
                      <option value="">Seleccione un plan</option>
                      {planesActivos.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.label}
                        </option>
                      ))}
                    </select>
                    {errors.plan_id && (
                      <span className="usuario-error-text">
                        <span className="icon">⚠️</span>
                        {errors.plan_id}
                      </span>
                    )}
                    {!isFieldEditable('plan_id') && isEditMode && (
                      <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                    )}
                  </div>

                  {/* Fecha de inicio */}
                  <div className="usuario-form-group">
                    <label className="usuario-form-label">
                      <span className="icon">📅</span>
                      Fecha de Inicio
                      {isFieldEditable('fecha_inicio') && <span className="required">*</span>}
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => handleFechaInicioChange(e.target.value)}
                      min={!isEditMode ? hoy.toISOString().split('T')[0] : undefined}
                      max={!isEditMode ? fechaMaxima.toISOString().split('T')[0] : undefined}
                      className={errors.fecha_inicio ? 'usuario-form-input error' : 'usuario-form-input'}
                      disabled={loading || !isFieldEditable('fecha_inicio')}
                    />
                    {errors.fecha_inicio && (
                      <span className="usuario-error-text">
                        <span className="icon">⚠️</span>
                        {errors.fecha_inicio}
                      </span>
                    )}
                    {!isEditMode && <small style={{ color: '#666' }}>Máximo 30 días adelante</small>}
                    {!isFieldEditable('fecha_inicio') && isEditMode && (
                      <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                    )}
                  </div>

                  {/* Fecha de fin */}
                  <div className="usuario-form-group">
                    <label className="usuario-form-label">
                      <span className="icon">📅</span>
                      Fecha de Fin
                      {isFieldEditable('fecha_fin') && <span className="required">*</span>}
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))}
                      min={formData.fecha_inicio}
                      className={errors.fecha_fin ? 'usuario-form-input error' : 'usuario-form-input'}
                      disabled={loading || !isFieldEditable('fecha_fin')}
                    />
                    {errors.fecha_fin && (
                      <span className="usuario-error-text">
                        <span className="icon">⚠️</span>
                        {errors.fecha_fin}
                      </span>
                    )}
                    {isFieldEditable('fecha_fin') && <small style={{ color: '#666' }}>Calculada automáticamente, editable</small>}
                    {!isFieldEditable('fecha_fin') && isEditMode && (
                      <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="usuario-form-group">
                    <label className="usuario-form-label">
                      <span className="icon">💰</span>
                      Monto (USD)
                      {isFieldEditable('monto') && <span className="required">*</span>}
                    </label>
                    <input
                      type="number"
                      value={formData.monto}
                      onChange={(e) => setFormData(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.01"
                      className={errors.monto ? 'usuario-form-input error' : 'usuario-form-input'}
                      disabled={loading || !isFieldEditable('monto')}
                    />
                    {errors.monto && (
                      <span className="usuario-error-text">
                        <span className="icon">⚠️</span>
                        {errors.monto}
                      </span>
                    )}
                    {!isFieldEditable('monto') && isEditMode && (
                      <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                    )}
                  </div>

                  {/* Cantidad de comprobantes */}
                  <div className="usuario-form-group">
                    <label className="usuario-form-label">
                      <span className="icon">📄</span>
                      Cantidad de Comprobantes
                      {isFieldEditable('cantidad_comprobantes') && <span className="required">*</span>}
                    </label>
                    <input
                      type="number"
                      value={formData.cantidad_comprobantes}
                      onChange={(e) => setFormData(prev => ({ ...prev, cantidad_comprobantes: parseInt(e.target.value) || 0 }))}
                      min={isEditMode && suscripcion ? suscripcion.cantidad_comprobantes : (selectedPlan?.cantidad_comprobantes || 1)}
                      className={errors.cantidad_comprobantes ? 'usuario-form-input error' : 'usuario-form-input'}
                      disabled={loading || !isFieldEditable('cantidad_comprobantes')}
                    />
                    {errors.cantidad_comprobantes && (
                      <span className="usuario-error-text">
                        <span className="icon">⚠️</span>
                        {errors.cantidad_comprobantes}
                      </span>
                    )}
                    {isFieldEditable('cantidad_comprobantes') && (
                      <small style={{ color: '#666' }}>
                        {isEditMode && suscripcion 
                          ? `Mínimo actual: ${suscripcion.cantidad_comprobantes}. Solo puede aumentarse.`
                          : selectedPlan 
                            ? `Mínimo del plan: ${selectedPlan.cantidad_comprobantes}. Puede aumentarse.`
                            : ''
                        }
                      </small>
                    )}
                    {!isFieldEditable('cantidad_comprobantes') && isEditMode && (
                      <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                    )}
                  </div>

                  {/* Estado de suscripción - Solo Admin en edición */}
                  {(isAdmin || (isEditMode && !isFieldEditable('estado_suscripcion'))) && (
                    <div className="usuario-form-group">
                      <label className="usuario-form-label">
                        <span className="icon">✅</span>
                        Estado de Suscripción
                        {isFieldEditable('estado_suscripcion') && <span className="required">*</span>}
                      </label>
                      {isFieldEditable('estado_suscripcion') ? (
                        <select
                          value={formData.estado_suscripcion}
                          onChange={(e) => setFormData(prev => ({ ...prev, estado_suscripcion: e.target.value }))}
                          className="usuario-form-select"
                          disabled={loading}
                        >
                          {ESTADOS_SUSCRIPCION_MANUALES.map((estado) => (
                            <option key={estado} value={estado}>{estado}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.estado_suscripcion}
                          className="usuario-form-input"
                          disabled={true}
                          style={{ backgroundColor: '#f3f4f6' }}
                        />
                      )}
                      {!isFieldEditable('estado_suscripcion') && isEditMode && (
                        <small style={{ color: '#6b7280' }}>Solo lectura</small>
                      )}
                    </div>
                  )}

                  {/* Forma de pago */}
                  <div className="usuario-form-group">
                    <label className="usuario-form-label">
                      <span className="icon">💳</span>
                      Forma de Pago
                      {isFieldEditable('forma_pago') && <span className="required">*</span>}
                    </label>
                    <select
                      value={formData.forma_pago}
                      onChange={(e) => setFormData(prev => ({ ...prev, forma_pago: e.target.value }))}
                      className={errors.forma_pago ? 'usuario-form-select error' : 'usuario-form-select'}
                      disabled={loading || !isFieldEditable('forma_pago')}
                    >
                      {FORMAS_PAGO.map((forma) => (
                        <option key={forma} value={forma}>{forma}</option>
                      ))}
                    </select>
                    {errors.forma_pago && (
                      <span className="usuario-error-text">
                        <span className="icon">⚠️</span>
                        {errors.forma_pago}
                      </span>
                    )}
                    {!isFieldEditable('forma_pago') && isEditMode && (
                      <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                    )}
                  </div>

                  {/* Estado de transacción - Solo Admin */}
                  {(isAdmin || (isEditMode && !isFieldEditable('estado_transaccion'))) && (
                    <div className="usuario-form-group">
                      <label className="usuario-form-label">
                        <span className="icon">📝</span>
                        Estado de Transacción
                      </label>
                      {isFieldEditable('estado_transaccion') ? (
                        <select
                          value={formData.estado_transaccion}
                          onChange={(e) => setFormData(prev => ({ ...prev, estado_transaccion: e.target.value }))}
                          className="usuario-form-select"
                          disabled={loading}
                        >
                          {ESTADOS_TRANSACCION.map((estado) => (
                            <option key={estado} value={estado}>{estado}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.estado_transaccion}
                          className="usuario-form-input"
                          disabled={true}
                          style={{ backgroundColor: '#f3f4f6' }}
                        />
                      )}
                      {!isFieldEditable('estado_transaccion') && isEditMode && (
                        <small style={{ color: '#6b7280' }}>Solo lectura</small>
                      )}
                    </div>
                  )}

                  {/* Comprobante de pago */}
                  <div className="usuario-form-group">
                    <label className="usuario-form-label">
                      <span className="icon">🖼️</span>
                      Comprobante de Pago {isEditMode && suscripcion?.comprobante_pago ? '(Reemplazar)' : '(Opcional)'}
                    </label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'comprobante_pago')}
                      className="usuario-form-input"
                      disabled={loading || !isFieldEditable('comprobante_pago')}
                    />
                    <small style={{ color: '#666' }}>JPG, JPEG o PNG (máx. 5MB)</small>
                    {isEditMode && suscripcion?.comprobante_pago && (
                      <small style={{ color: '#10b981' }}>✓ Ya tiene archivo cargado</small>
                    )}
                  </div>

                  {/* Factura */}
                  <div className="usuario-form-group">
                    <label className="usuario-form-label">
                      <span className="icon">📑</span>
                      Factura {isEditMode && suscripcion?.factura ? '(Reemplazar)' : '(Opcional)'}
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, 'factura')}
                      className="usuario-form-input"
                      disabled={loading || !isFieldEditable('factura')}
                    />
                    <small style={{ color: '#666' }}>PDF (máx. 10MB)</small>
                    {isEditMode && suscripcion?.factura && (
                      <small style={{ color: '#10b981' }}>✓ Ya tiene archivo cargado</small>
                    )}
                  </div>

                  {/* === SECCIÓN DE COMISIÓN (Solo Admin en edición) === */}
                  {isAdmin && isEditMode && (
                    <>
                      <div className="full-width" style={{ borderTop: '2px solid #e5e7eb', margin: '16px 0', paddingTop: '16px' }}>
                        <h3 style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>💼 Gestión de Comisión</h3>
                      </div>

                      {/* Estado de comisión */}
                      <div className="usuario-form-group">
                        <label className="usuario-form-label">
                          <span className="icon">📊</span>
                          Estado de Comisión
                        </label>
                        <select
                          value={formData.estado_comision}
                          onChange={(e) => setFormData(prev => ({ ...prev, estado_comision: e.target.value }))}
                          className="usuario-form-select"
                          disabled={loading || !isFieldEditable('estado_comision')}
                        >
                          {ESTADOS_COMISION.map((estado) => (
                            <option key={estado} value={estado}>{estado}</option>
                          ))}
                        </select>
                        {!isFieldEditable('estado_comision') && (
                          <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                        )}
                      </div>

                      {/* Monto de comisión */}
                      <div className="usuario-form-group">
                        <label className="usuario-form-label">
                          <span className="icon">💵</span>
                          Monto de Comisión (USD)
                        </label>
                        <input
                          type="number"
                          value={formData.monto_comision}
                          onChange={(e) => setFormData(prev => ({ ...prev, monto_comision: parseFloat(e.target.value) || 0 }))}
                          min="0"
                          step="0.01"
                          className="usuario-form-input"
                          disabled={loading || !isFieldEditable('monto_comision')}
                        />
                        {!isFieldEditable('monto_comision') && (
                          <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                        )}
                      </div>

                      {/* Comprobante de comisión */}
                      <div className="usuario-form-group full-width">
                        <label className="usuario-form-label">
                          <span className="icon">🧾</span>
                          Comprobante de Comisión {suscripcion?.comprobante_comision ? '(Reemplazar)' : '(Opcional)'}
                        </label>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange(e, 'comprobante_comision')}
                          className="usuario-form-input"
                          disabled={loading || !isFieldEditable('comprobante_comision')}
                        />
                        <small style={{ color: '#666' }}>JPG, JPEG, PNG o PDF (máx. 5MB)</small>
                        {suscripcion?.comprobante_comision && (
                          <small style={{ color: '#10b981' }}>✓ Ya tiene archivo cargado</small>
                        )}
                        {!isFieldEditable('comprobante_comision') && (
                          <small style={{ color: '#dc2626' }}>🔒 Campo bloqueado</small>
                        )}
                      </div>
                    </>
                  )}

                  {/* Info de comisión solo lectura para distribuidor en edición */}
                  {!isAdmin && isEditMode && suscripcion?.estado_comision && (
                    <>
                      <div className="full-width" style={{ borderTop: '2px solid #e5e7eb', margin: '16px 0', paddingTop: '16px' }}>
                        <h3 style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>💼 Información de Comisión (Solo Lectura)</h3>
                      </div>

                      <div className="usuario-form-group">
                        <label className="usuario-form-label">
                          <span className="icon">📊</span>
                          Estado de Comisión
                        </label>
                        <input
                          type="text"
                          value={suscripcion.estado_comision || '-'}
                          className="usuario-form-input"
                          disabled={true}
                          style={{ backgroundColor: '#f3f4f6' }}
                        />
                      </div>

                      <div className="usuario-form-group">
                        <label className="usuario-form-label">
                          <span className="icon">💵</span>
                          Monto de Comisión
                        </label>
                        <input
                          type="text"
                          value={suscripcion.monto_comision ? `$${suscripcion.monto_comision.toFixed(2)}` : '-'}
                          className="usuario-form-input"
                          disabled={true}
                          style={{ backgroundColor: '#f3f4f6' }}
                        />
                      </div>
                    </>
                  )}

                </div>

                {/* Información para distribuidor */}
                {!isAdmin && !isEditMode && (
                  <div style={{ 
                    backgroundColor: '#fef3c7', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginTop: '16px',
                    border: '1px solid #f59e0b'
                  }}>
                    <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                      <strong>ℹ️ Nota:</strong> Las suscripciones creadas por distribuidores se registran en estado <strong>Pendiente</strong> y requieren aprobación de un administrador.
                    </p>
                  </div>
                )}

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
                    disabled={loading || (isEditMode && camposEditables.length === 0)}
                  >
                    {loading ? (
                      <>
                        <span style={{ marginRight: '8px' }}>⏳</span>
                        {isEditMode ? 'Guardando...' : 'Registrando...'}
                      </>
                    ) : (
                      <>
                        <span style={{ marginRight: '8px' }}>{isEditMode ? '💾' : '✅'}</span>
                        {isEditMode ? 'Guardar Cambios' : 'Registrar Suscripción'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuscripcionFormModal;
