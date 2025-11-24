import React, { useEffect, useState } from 'react';
import { PuntoEmision } from '../types/puntoEmision';

interface PuntoEmisionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (puntoEmision: PuntoEmision) => void;
  initialData?: PuntoEmision | null;
  companyId?: number;
  establecimientoId?: number;
  existingPuntos?: PuntoEmision[];
}

const PuntoEmisionFormModal: React.FC<PuntoEmisionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  companyId,
  establecimientoId,
  existingPuntos = []
}) => {
  const [formData, setFormData] = useState<PuntoEmision>({
    codigo: '',
    estado: 'ACTIVO',
    nombre: '',
    secuencial_factura: 1,
    secuencial_liquidacion_compra: 1,
    secuencial_nota_credito: 1,
    secuencial_nota_debito: 1,
    secuencial_guia_remision: 1,
    secuencial_retencion: 1,
    secuencial_proforma: 1,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [codeDuplicateError, setCodeDuplicateError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          codigo: '',
          estado: 'ACTIVO',
          nombre: '',
          secuencial_factura: 1,
          secuencial_liquidacion_compra: 1,
          secuencial_nota_credito: 1,
          secuencial_nota_debito: 1,
          secuencial_guia_remision: 1,
          secuencial_retencion: 1,
          secuencial_proforma: 1,
        });
      }
      setErrors({});
      setTouched(new Set());
      setCodeDuplicateError(null);
    }
  }, [isOpen, initialData]);

  // Validación en tiempo real del código - verificar si es único
  useEffect(() => {
    if (!formData.codigo || !formData.codigo.trim()) {
      setCodeDuplicateError(null);
      return;
    }

    // Si estamos editando y el código no cambió, no verificar
    if (initialData && formData.codigo === initialData.codigo) {
      setCodeDuplicateError(null);
      return;
    }

    const t = setTimeout(() => {
      setCheckingCode(true);
      // Verificar si el código ya existe en los puntos existentes
      const exists = existingPuntos.some(p => 
        p.codigo === formData.codigo && 
        (!initialData || p.id !== initialData.id)
      );
      
      if (exists) {
        setCodeDuplicateError('Este código ya existe en otro punto de emisión del mismo establecimiento');
      } else {
        setCodeDuplicateError(null);
      }
      setCheckingCode(false);
    }, 500);

    return () => clearTimeout(t);
  }, [formData.codigo, existingPuntos, initialData]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'text' && name === 'codigo') {
      // Solo números, máximo 3 dígitos
      if (/^\d*$/.test(value) && value.length <= 3) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (/secuencial/.test(name)) {
      // Solo números para campos secuenciales
      if (/^\d*$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : 0 }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Limpiar error del campo cuando el usuario empieza a editar
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const onCodigoBlur = () => {
    const newTouched = new Set(touched);
    newTouched.add('codigo');
    setTouched(newTouched);

    if (formData.codigo) {
      // Aplicar padding de ceros: 1 -> 001
      const paddedCodigo = formData.codigo.padStart(3, '0');
      setFormData(prev => ({ ...prev, codigo: paddedCodigo }));
    }
  };

  const markTouched = (field: string) => {
    const newTouched = new Set(touched);
    newTouched.add(field);
    setTouched(newTouched);
  };

  const isMissing = (key: string) => {
    switch (key) {
      case 'codigo': return !(formData.codigo && formData.codigo.trim());
      case 'nombre': return !(formData.nombre && formData.nombre.trim());
      default: return false;
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    // Validar código
    if (!formData.codigo.trim()) {
      newErrors.codigo = 'Código es obligatorio';
    } else if (!/^\d{3}$/.test(formData.codigo)) {
      newErrors.codigo = 'Código debe tener exactamente 3 dígitos';
    }

    // Validar nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'Nombre es obligatorio';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres';
    }

    // Validar secuenciales
    if (formData.secuencial_factura < 1) {
      newErrors.secuencial_factura = 'Debe ser mayor a 0';
    } else if (formData.secuencial_factura > 999999) {
      newErrors.secuencial_factura = 'No puede exceder 999999';
    }
    
    if (formData.secuencial_liquidacion_compra < 1) {
      newErrors.secuencial_liquidacion_compra = 'Debe ser mayor a 0';
    } else if (formData.secuencial_liquidacion_compra > 999999) {
      newErrors.secuencial_liquidacion_compra = 'No puede exceder 999999';
    }
    
    if (formData.secuencial_nota_credito < 1) {
      newErrors.secuencial_nota_credito = 'Debe ser mayor a 0';
    } else if (formData.secuencial_nota_credito > 999999) {
      newErrors.secuencial_nota_credito = 'No puede exceder 999999';
    }
    
    if (formData.secuencial_nota_debito < 1) {
      newErrors.secuencial_nota_debito = 'Debe ser mayor a 0';
    } else if (formData.secuencial_nota_debito > 999999) {
      newErrors.secuencial_nota_debito = 'No puede exceder 999999';
    }
    
    if (formData.secuencial_guia_remision < 1) {
      newErrors.secuencial_guia_remision = 'Debe ser mayor a 0';
    } else if (formData.secuencial_guia_remision > 999999) {
      newErrors.secuencial_guia_remision = 'No puede exceder 999999';
    }
    
    if (formData.secuencial_retencion < 1) {
      newErrors.secuencial_retencion = 'Debe ser mayor a 0';
    } else if (formData.secuencial_retencion > 999999) {
      newErrors.secuencial_retencion = 'No puede exceder 999999';
    }
    
    if (formData.secuencial_proforma < 1) {
      newErrors.secuencial_proforma = 'Debe ser mayor a 0';
    } else if (formData.secuencial_proforma > 999999) {
      newErrors.secuencial_proforma = 'No puede exceder 999999';
    }

    // Validar código único
    if (codeDuplicateError) {
      newErrors.codigo = codeDuplicateError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    return (
      !checkingCode &&
      !codeDuplicateError &&
      formData.codigo.trim().length === 3 &&
      formData.nombre.trim().length >= 2 &&
      formData.nombre.trim().length <= 100 &&
      formData.secuencial_factura >= 1 &&
      formData.secuencial_factura <= 999999 &&
      formData.secuencial_liquidacion_compra >= 1 &&
      formData.secuencial_liquidacion_compra <= 999999 &&
      formData.secuencial_nota_credito >= 1 &&
      formData.secuencial_nota_credito <= 999999 &&
      formData.secuencial_nota_debito >= 1 &&
      formData.secuencial_nota_debito <= 999999 &&
      formData.secuencial_guia_remision >= 1 &&
      formData.secuencial_guia_remision <= 999999 &&
      formData.secuencial_retencion >= 1 &&
      formData.secuencial_retencion <= 999999 &&
      formData.secuencial_proforma >= 1 &&
      formData.secuencial_proforma <= 999999
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        company_id: companyId,
        establecimiento_id: establecimientoId,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mf-backdrop">
      <div className="mf-modal" style={{ width: 'min(780px, 92vw)' }}>
        <div className="mf-header">
          <h2>{initialData ? 'Editar punto de emisión' : 'Registrar nuevo punto de emisión'}</h2>
        </div>

        <div className="mf-body scrollable">
          <section>
            {/* Top row: Código y Estado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              <div style={{ flex: 1, maxWidth: '450px' }}>
                <label className="horizontal" style={{ margin: 0 }}>
                  <span>Código <span style={{color:'#dc2626'}}>*</span></span>
                  <input 
                    className={(touched.has('codigo') && (isMissing('codigo') || !!errors.codigo || codeDuplicateError)) ? 'error-input' : ''} 
                    type="text"
                    value={formData.codigo || ''}
                    onBlur={onCodigoBlur}
                    onChange={onChange}
                    onFocus={() => markTouched('codigo')}
                    name="codigo"
                    placeholder="Ej: 001"
                  />
                </label>
                {checkingCode && (
                  <span className="err" style={{marginLeft: '208px', display: 'block', marginTop: 4, color: '#7c3aed', fontWeight: 500}}>
                    Verificando código...
                  </span>
                )}
                {touched.has('codigo') && (errors.codigo || codeDuplicateError) && !checkingCode && (
                  <span className="err" style={{marginLeft: '208px', display: 'block', marginTop: 4}}>
                    {errors.codigo || codeDuplicateError}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Estado <span style={{color:'#dc2626'}}>*</span></div>
                  <div style={{ fontSize: 12, marginTop: 2, color: formData.estado === 'ACTIVO' ? '#059669' : '#64748b' }}>
                    {formData.estado === 'ACTIVO' ? 'Activo' : 'Desactivado'}
                  </div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={formData.estado === 'ACTIVO'} 
                    onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.checked ? 'ACTIVO' : 'DESACTIVADO' }))}
                  />
                  <span className="slider" />
                </label>
              </div>
            </div>

            <label className="horizontal">
              <span>Nombre <span style={{color:'#dc2626'}}>*</span></span>
              <div style={{position: 'relative', width: '100%'}}>
                <input 
                  type="text"
                  name="nombre"
                  value={formData.nombre || ''}
                  onBlur={() => markTouched('nombre')}
                  onChange={onChange}
                  onFocus={() => markTouched('nombre')}
                  className={touched.has('nombre') && (isMissing('nombre') || errors.nombre) ? 'error-input' : ''}
                  placeholder="Nombre del punto de emisión"
                />
                <span style={{position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9ca3af'}}>
                  {formData.nombre?.length || 0}/100
                </span>
              </div>
            </label>
            {touched.has('nombre') && (errors.nombre || isMissing('nombre')) && <span className="err" style={{marginLeft: '212px'}}>{errors.nombre || 'Campo requerido'}</span>}

            <label className="horizontal">
              <span>Secuencial Facturas <span style={{color:'#dc2626'}}>*</span></span>
              <input 
                type="text"
                name="secuencial_factura"
                value={formData.secuencial_factura}
                onBlur={() => markTouched('secuencial_factura')}
                onChange={onChange}
                className={touched.has('secuencial_factura') && errors.secuencial_factura ? 'error-input' : ''}
                placeholder="1"
              />
            </label>
            {touched.has('secuencial_factura') && errors.secuencial_factura && <span className="err" style={{marginLeft: '192px'}}>{errors.secuencial_factura}</span>}

            <label className="horizontal">
              <span>Secuencial Liquidaciones Compra <span style={{color:'#dc2626'}}>*</span></span>
              <input 
                type="text"
                name="secuencial_liquidacion_compra"
                value={formData.secuencial_liquidacion_compra}
                onBlur={() => markTouched('secuencial_liquidacion_compra')}
                onChange={onChange}
                className={touched.has('secuencial_liquidacion_compra') && errors.secuencial_liquidacion_compra ? 'error-input' : ''}
                placeholder="1"
              />
            </label>
            {touched.has('secuencial_liquidacion_compra') && errors.secuencial_liquidacion_compra && <span className="err" style={{marginLeft: '192px'}}>{errors.secuencial_liquidacion_compra}</span>}

            <label className="horizontal">
              <span>Secuencial Notas Crédito <span style={{color:'#dc2626'}}>*</span></span>
              <input 
                type="text"
                name="secuencial_nota_credito"
                value={formData.secuencial_nota_credito}
                onBlur={() => markTouched('secuencial_nota_credito')}
                onChange={onChange}
                className={touched.has('secuencial_nota_credito') && errors.secuencial_nota_credito ? 'error-input' : ''}
                placeholder="1"
              />
            </label>
            {touched.has('secuencial_nota_credito') && errors.secuencial_nota_credito && <span className="err" style={{marginLeft: '192px'}}>{errors.secuencial_nota_credito}</span>}

            <label className="horizontal">
              <span>Secuencial Notas Débito <span style={{color:'#dc2626'}}>*</span></span>
              <input 
                type="text"
                name="secuencial_nota_debito"
                value={formData.secuencial_nota_debito}
                onBlur={() => markTouched('secuencial_nota_debito')}
                onChange={onChange}
                className={touched.has('secuencial_nota_debito') && errors.secuencial_nota_debito ? 'error-input' : ''}
                placeholder="1"
              />
            </label>
            {touched.has('secuencial_nota_debito') && errors.secuencial_nota_debito && <span className="err" style={{marginLeft: '192px'}}>{errors.secuencial_nota_debito}</span>}

            <label className="horizontal">
              <span>Secuencial Guías Remisión <span style={{color:'#dc2626'}}>*</span></span>
              <input 
                type="text"
                name="secuencial_guia_remision"
                value={formData.secuencial_guia_remision}
                onBlur={() => markTouched('secuencial_guia_remision')}
                onChange={onChange}
                className={touched.has('secuencial_guia_remision') && errors.secuencial_guia_remision ? 'error-input' : ''}
                placeholder="1"
              />
            </label>
            {touched.has('secuencial_guia_remision') && errors.secuencial_guia_remision && <span className="err" style={{marginLeft: '192px'}}>{errors.secuencial_guia_remision}</span>}

            <label className="horizontal">
              <span>Secuencial Retenciones <span style={{color:'#dc2626'}}>*</span></span>
              <input 
                type="text"
                name="secuencial_retencion"
                value={formData.secuencial_retencion}
                onBlur={() => markTouched('secuencial_retencion')}
                onChange={onChange}
                className={touched.has('secuencial_retencion') && errors.secuencial_retencion ? 'error-input' : ''}
                placeholder="1"
              />
            </label>
            {touched.has('secuencial_retencion') && errors.secuencial_retencion && <span className="err" style={{marginLeft: '192px'}}>{errors.secuencial_retencion}</span>}

            <label className="horizontal">
              <span>Secuencial Proformas <span style={{color:'#dc2626'}}>*</span></span>
              <input 
                type="text"
                name="secuencial_proforma"
                value={formData.secuencial_proforma}
                onBlur={() => markTouched('secuencial_proforma')}
                onChange={onChange}
                className={touched.has('secuencial_proforma') && errors.secuencial_proforma ? 'error-input' : ''}
                placeholder="1"
              />
            </label>
            {touched.has('secuencial_proforma') && errors.secuencial_proforma && <span className="err" style={{marginLeft: '192px'}}>{errors.secuencial_proforma}</span>}
          </section>
        </div>

        <div className="mf-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid()}
            className="btn btn-primary"
            style={{
              backgroundColor: isFormValid() ? '#3b82f6' : '#d1d5db',
              color: 'white',
              cursor: isFormValid() ? 'pointer' : 'not-allowed',
              opacity: isFormValid() ? 1 : 0.6,
            }}
          >
            {initialData ? 'Actualizar' : 'Registrar'}
          </button>
        </div>

        <style>{`
          /* Backdrop and modal shell */
          .mf-backdrop{position:fixed;inset:0;background:rgba(2,6,23,0.45);display:flex;align-items:center;justify-content:center;z-index:1000}
          .mf-modal{position:relative;width:min(780px,92vw);max-height:88vh;background:#fff;border-radius:12px;box-shadow:0 14px 40px rgba(2,6,23,0.18);display:flex;flex-direction:column;overflow:hidden}

          /* Header */
          .mf-header{padding:20px 24px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)}
          .mf-header h2{margin:0;font-size:22px;color:#1e293b;font-weight:700}

          /* Body (scrollable) */
          .mf-body{padding:24px;overflow:auto}
          .scrollable{overflow-y:auto;padding-right:8px}

          /* Sections */
          section{padding:20px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb}

          /* Form fields - HORIZONTAL layout */
          label.horizontal{display:grid;grid-template-columns:200px 1fr;gap:12px;align-items:center;
            margin:10px 0;font-weight:500;color:#475569}
          label.horizontal input,label.horizontal select{height:40px;padding:10px 12px;border:1px solid #cbd5e1;
            border-radius:8px;width:100%;box-sizing:border-box;font-size:14px;background:#fff;transition:all 0.2s ease}
          
          /* Focus states */
          label.horizontal input:focus,label.horizontal select:focus{
            outline:none;box-shadow:0 0 0 3px rgba(59,130,246,0.1);border-color:#3b82f6
          }

          /* Toggle switch */
          .switch{position:relative;display:inline-block;width:50px;height:26px}
          .switch input{opacity:0;width:0;height:0}
          .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#cbd5e1;
            transition:.3s;border-radius:999px}
          .slider:before{position:absolute;content:"";height:20px;width:20px;left:3px;top:3px;
            background:white;transition:.3s;border-radius:50%;box-shadow:0 2px 6px rgba(2,6,23,0.15)}
          .switch input:checked + .slider{background:#10b981}
          .switch input:checked + .slider:before{transform:translateX(24px)}

          /* Validation and misc */
          .err{color:#dc2626;margin-top:4px;font-size:12px;display:block}
          .error-input{border-color:#dc2626!important;background:#fef2f2!important}

          /* Footer / actions */
          .mf-footer{display:flex;gap:12px;justify-content:flex-end;padding:16px 24px;border-top:1px solid #e5e7eb;background:#f8fafc}
          .btn{padding:11px 20px;border-radius:8px;border:1px solid transparent;cursor:pointer;
            font-weight:600;font-size:14px;transition:all 0.2s ease}
          .btn-secondary{background:#fff;color:#475569;border:1px solid #cbd5e1}
          .btn-secondary:hover{background:#f1f5f9;border-color:#94a3b8}
          .btn-primary{background:#3b82f6;color:#fff}
          .btn-primary:hover{background:#2563eb;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.3)}
          .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

          /* Responsive tweaks */
          @media (max-width:600px){
            .mf-modal{width:calc(100vw - 24px);border-radius:10px}
            .mf-body{padding:16px}
            section{padding:16px}
            label.horizontal{grid-template-columns:1fr;gap:6px}
          }
        `}</style>
      </div>
    </div>
  );
};

export default PuntoEmisionFormModal;
