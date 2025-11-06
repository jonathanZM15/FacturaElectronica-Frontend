import React from 'react';
import { emisoresApi } from '../services/emisoresApi';
import { Emisor } from '../types/emisor';
import { validateRucEcuador } from '../helpers/validateRuc';
import ConfirmDialog from './ConfirmDialog';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (e: Emisor) => void;
  // Optional props for edit mode
  editingId?: number | string | null;
  initialData?: Emisor | null;
  rucEditable?: boolean;
  onUpdated?: (e: Emisor) => void;
};

const initial: Emisor = {
  ruc: '',
  razon_social: '',
  nombre_comercial: '',
  direccion_matriz: '',
  regimen_tributario: 'GENERAL',
  obligado_contabilidad: 'NO',
  contribuyente_especial: 'NO',
  agente_retencion: 'NO',
  tipo_persona: 'NATURAL',
  codigo_artesano: '',
  correo_remitente: '',
  estado: 'ACTIVO',
  ambiente: 'PRODUCCION',
  tipo_emision: 'NORMAL',
};

const EmisorFormModal: React.FC<Props> = (props) => {
  const { open, onClose, onCreated, editingId, initialData, rucEditable, onUpdated } = props;
  const [v, setV] = React.useState<Emisor>(initial);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [localRucEditable, setLocalRucEditable] = React.useState<boolean>(true);
  const [rucError, setRucError] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [rucDuplicateError, setRucDuplicateError] = React.useState<string | null>(null);
  const [checkingRuc, setCheckingRuc] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setV(initialData ?? initial);
      setLogoFile(null);
      setEmailError(null);
      setLogoError(null);
      setLocalRucEditable(rucEditable ?? true);
      setRucDuplicateError(null);
      setFieldErrors({});
    }
  }, [open]);

  const onChange = (k: keyof Emisor, value: any) => {
    setV(prev => ({ ...prev, [k]: value }));
    // Clear field error when user starts typing
    setFieldErrors(prev => ({ ...prev, [k]: '' }));
  };

  // Validate required fields in real time
  React.useEffect(() => {
    // Solo validar campos obligatorios si NO estamos editando
    if (editingId) {
      setFieldErrors({});
      return;
    }

    const errors: Record<string, string> = {};
    
    if (!v.ruc?.trim()) errors.ruc = 'El RUC es obligatorio';
    if (!v.razon_social?.trim()) errors.razon_social = 'La Razón Social es obligatoria';
    if (!v.nombre_comercial?.trim()) errors.nombre_comercial = 'El Nombre Comercial es obligatorio';
    if (!v.direccion_matriz?.trim()) errors.direccion_matriz = 'La Dirección Matriz es obligatoria';
    if (!v.correo_remitente?.trim()) errors.correo_remitente = 'El Correo Remitente es obligatorio';
    
    setFieldErrors(errors);
  }, [v.ruc, v.razon_social, v.nombre_comercial, v.direccion_matriz, v.correo_remitente, editingId]);

  // Validate RUC in real time
  React.useEffect(() => {
    if (!v.ruc || !v.ruc.toString().trim()) { 
      setRucError(null); 
      setRucDuplicateError(null);
      return; 
    }
    if (!validateRucEcuador(v.ruc)) {
      setRucError('RUC no válido según reglas del SRI');
      setRucDuplicateError(null);
    } else {
      setRucError(null);
    }
  }, [v.ruc]);

  // Check RUC duplicate in real time (only for new emisores)
  React.useEffect(() => {
    if (editingId) return; // Don't check for duplicates when editing
    if (!v.ruc || !v.ruc.toString().trim()) {
      setRucDuplicateError(null);
      return;
    }
    if (rucError) return; // Don't check if RUC format is invalid

    const timer = setTimeout(async () => {
      setCheckingRuc(true);
      try {
        const res = await emisoresApi.checkRuc(v.ruc);
        const exists = res.data?.exists;
        if (exists) {
          setRucDuplicateError('Este RUC ya está registrado en el sistema');
        } else {
          setRucDuplicateError(null);
        }
      } catch (e) {
        console.error('Error checking RUC:', e);
        setRucDuplicateError(null);
      } finally {
        setCheckingRuc(false);
      }
    }, 600); // Debounce de 600ms

    return () => clearTimeout(timer);
  }, [v.ruc, rucError, editingId]);

  const validate = () => {
    // En modo edición, solo validar los campos que fueron modificados
    if (editingId) {
      // Validar RUC solo si tiene valor y si es editable
      if (localRucEditable && v.ruc && v.ruc.trim() && !validateRucEcuador(v.ruc)) {
        setRucError('RUC no válido según reglas del SRI');
        return false;
      }
      setRucError(null);
      
      // Validar correo solo si tiene valor
      if (v.correo_remitente && v.correo_remitente.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) {
        setEmailError('formato inválido de correo');
        return false;
      }
      setEmailError(null);
      
      // Validar logo solo si se seleccionó uno nuevo
      if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) {
        setLogoError('Formato no permitido. Use .jpg, .jpeg o .png');
        return false;
      }
      setLogoError(null);
      
      return true;
    }

    // En modo creación, validar todos los campos obligatorios
    if (!v.ruc.trim()) {
      alert('El RUC es obligatorio');
      return false;
    }
    if (!v.razon_social.trim()) {
      alert('La Razón Social es obligatoria');
      return false;
    }
    if (!v.nombre_comercial?.trim()) {
      alert('El Nombre Comercial es obligatorio');
      return false;
    }
    if (!v.direccion_matriz?.trim()) {
      alert('La Dirección Matriz es obligatoria');
      return false;
    }
    if (!v.correo_remitente?.trim()) {
      alert('El Correo Remitente es obligatorio');
      return false;
    }
    if (!logoFile) {
      alert('El Logo es obligatorio');
      return false;
    }
    if (!validateRucEcuador(v.ruc)) {
      setRucError('RUC no válido según reglas del SRI');
      return false;
    }
    setRucError(null);
    if (rucDuplicateError) {
      alert('Este RUC ya está registrado en el sistema');
      return false;
    }
    if (v.correo_remitente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) {
      setEmailError('formato inválido de correo');
      return false;
    }
    setEmailError(null);
    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) {
      setLogoError('Formato no permitido. Use .jpg, .jpeg o .png');
      return false;
    }
    setLogoError(null);
    return true;
  };

  // Pure validation used for enabling/disabling the submit button (no state side-effects)
  const isFormValid = () => {
    // En modo edición, el formulario es válido si no hay errores activos
    if (editingId) {
      // Si hay un error de RUC activo, deshabilitar
      if (rucError) return false;
      // Si hay un error de email activo, deshabilitar
      if (emailError) return false;
      // Si hay un error de logo activo, deshabilitar
      if (logoError) return false;
      // Si se está verificando el RUC, deshabilitar
      if (checkingRuc) return false;
      return true;
    }

    // En modo creación, validar todos los campos obligatorios
    if (!v.ruc || !v.ruc.trim()) return false;
    if (!v.razon_social || !v.razon_social.trim()) return false;
    if (!v.nombre_comercial || !v.nombre_comercial.trim()) return false;
    if (!v.direccion_matriz || !v.direccion_matriz.trim()) return false;
    if (!v.correo_remitente || !v.correo_remitente.trim()) return false;
    if (!logoFile) return false;
    if (v.correo_remitente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) return false;
    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return false;
    if (rucError) return false;
    if (rucDuplicateError) return false;
    if (checkingRuc) return false;
    return true;
  };

  const doSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let res;
      if (editingId) {
        res = await emisoresApi.update(editingId, { ...v, logoFile });
        const updated: Emisor = res.data?.data ?? res.data;
        onUpdated && onUpdated(updated);
      } else {
        res = await emisoresApi.create({ ...v, logoFile });
        const created: Emisor = res.data?.data ?? res.data;
        onCreated && onCreated(created);
      }
      onClose();
    } catch (e: any) {
      const apiMsg: string | undefined = e?.response?.data?.message || e?.message;
      const firstValidation = e?.response?.data?.errors && typeof e.response.data.errors === 'object'
        ? (Object.values(e.response.data.errors).flat()[0] as string)
        : undefined;
      const isPgDuplicate = typeof apiMsg === 'string' && (
        apiMsg.includes('SQLSTATE[23505]') ||
        apiMsg.toLowerCase().includes('duplicate key') ||
        apiMsg.includes('companies_pkey')
      );
      const friendly = isPgDuplicate
        ? 'Error interno al generar el ID del emisor (ID duplicado). Intenta nuevamente o contacta al administrador.'
        : undefined;
      alert(friendly || firstValidation || apiMsg || 'No se pudo registrar');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const submit = () => {
    if (editingId) {
      // ask for confirmation before saving changes
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  if (!open) return null;

  return (
    <div className="mf-backdrop" onClick={onClose}>
      <div className="mf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mf-header">
          <h2>{editingId ? 'Editar emisor' : 'Registro de nuevo emisor'}</h2>
        </div>

        <div className="mf-body scrollable">
          <section>
            <h3>Datos del RUC</h3>
              <label>RUC {!editingId && <span className="required">*</span>}
                  <input 
                    value={v.ruc} 
                    onChange={e => onChange('ruc', e.target.value)} 
                    disabled={!localRucEditable}
                    className={rucError || rucDuplicateError ? 'error-input' : ''}
                  />
                  {!localRucEditable && <small style={{color:'#666'}}>El RUC no puede ser modificado porque existen comprobantes autorizados.</small>}
                  {rucError && <span className="err">{rucError}</span>}
                  {!rucError && checkingRuc && <span className="info">Verificando RUC...</span>}
                  {!rucError && !checkingRuc && rucDuplicateError && <span className="err">{rucDuplicateError}</span>}
                  {!editingId && fieldErrors.ruc && !v.ruc && <span className="err">{fieldErrors.ruc}</span>}
              </label>
            <label>Razón Social {!editingId && <span className="required">*</span>}
              <input 
                value={v.razon_social} 
                onChange={e => onChange('razon_social', e.target.value)}
                className={!editingId && fieldErrors.razon_social && !v.razon_social ? 'error-input' : ''}
              />
              {!editingId && fieldErrors.razon_social && !v.razon_social && <span className="err">{fieldErrors.razon_social}</span>}
            </label>
            <label>Nombre comercial {!editingId && <span className="required">*</span>}
              <input 
                value={v.nombre_comercial || ''} 
                onChange={e => onChange('nombre_comercial', e.target.value)}
                className={!editingId && fieldErrors.nombre_comercial && !v.nombre_comercial ? 'error-input' : ''}
              />
              {!editingId && fieldErrors.nombre_comercial && !v.nombre_comercial && <span className="err">{fieldErrors.nombre_comercial}</span>}
            </label>
            <label>Dirección Matriz {!editingId && <span className="required">*</span>}
              <input 
                value={v.direccion_matriz || ''} 
                onChange={e => onChange('direccion_matriz', e.target.value)}
                className={!editingId && fieldErrors.direccion_matriz && !v.direccion_matriz ? 'error-input' : ''}
              />
              {!editingId && fieldErrors.direccion_matriz && !v.direccion_matriz && <span className="err">{fieldErrors.direccion_matriz}</span>}
            </label>
          </section>

          <section>
            <h3>Régimen Tributario</h3>
            <div className="row">
              {['GENERAL','RIMPE_POPULAR','RIMPE_EMPRENDEDOR','MICRO_EMPRESA'].map(opt => (
                <label key={opt}><input type="radio" checked={v.regimen_tributario===opt} onChange={() => onChange('regimen_tributario', opt as any)} /> {opt.replace('_',' ')}</label>
              ))}
            </div>

            <h3>Obligaciones</h3>
            <div className="row">
              <label><input type="checkbox" checked={v.obligado_contabilidad==='SI'} onChange={e=>onChange('obligado_contabilidad', e.target.checked?'SI':'NO')} /> Obligado a llevar contabilidad</label>
              <label><input type="checkbox" checked={v.contribuyente_especial==='SI'} onChange={e=>onChange('contribuyente_especial', e.target.checked?'SI':'NO')} /> Contribuyente Especial</label>
              <label><input type="checkbox" checked={v.agente_retencion==='SI'} onChange={e=>onChange('agente_retencion', e.target.checked?'SI':'NO')} /> Agente de retención</label>
            </div>

            <h3>Tipo de persona</h3>
            <div className="row">
              {['NATURAL','JURIDICA'].map(opt => (
                <label key={opt}><input type="radio" checked={v.tipo_persona===opt} onChange={()=>onChange('tipo_persona', opt as any)} /> {opt}</label>
              ))}
            </div>
            <label>Código Artesano
              <input 
                value={v.codigo_artesano || ''} 
                onChange={e => onChange('codigo_artesano', e.target.value)}
                placeholder="Opcional - Ej: PICHINCHA-17-1234-2024"
              />
            </label>
          </section>

          <section>
            <h3>Datos de configuración</h3>
            <label>Correo Remitente {!editingId && <span className="required">*</span>}
              <input 
                value={v.correo_remitente || ''} 
                onChange={e => onChange('correo_remitente', e.target.value)}
                className={emailError || (!editingId && fieldErrors.correo_remitente && !v.correo_remitente) ? 'error-input' : ''}
              />
              {emailError && <span className="err">{emailError}</span>}
              {!emailError && !editingId && fieldErrors.correo_remitente && !v.correo_remitente && <span className="err">{fieldErrors.correo_remitente}</span>}
            </label>
            <div className="row config-row">
              <label>Estado
                <input type="checkbox" checked={v.estado==='ACTIVO'} onChange={e => onChange('estado', e.target.checked?'ACTIVO':'INACTIVO')} />
              </label>

              <label>Ambiente
                <select value={v.ambiente} onChange={e => onChange('ambiente', e.target.value as any)}>
                  <option value="PRODUCCION">Producción</option>
                  <option value="PRUEBAS">Pruebas</option>
                </select>
              </label>

              <label>Tipo de Emisión
                <select value={v.tipo_emision} onChange={e => onChange('tipo_emision', e.target.value as any)}>
                  <option value="NORMAL">Normal</option>
                  <option value="INDISPONIBILIDAD">Indisponibilidad del SRI</option>
                </select>
              </label>
            </div>

            <label>Logo {!editingId && <span className="required">*</span>}
              <div className="file-wrapper">
                <button type="button" className="file-btn" onClick={() => fileInputRef.current?.click()}>Seleccionar archivo</button>
                <span className="file-name">{logoFile?.name || 'Ningún archivo seleccionado'}</span>
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" onChange={e => setLogoFile(e.target.files?.[0] || null)} style={{display:'none'}} />
              </div>
              {logoError && <span className="err">{logoError}</span>}
              {!editingId && !logoFile && <span className="err">El logo es obligatorio</span>}
            </label>
          </section>
        </div>

        <div className="mf-footer">
          <button onClick={onClose} disabled={loading}>Cancelar</button>
          <button onClick={submit} disabled={loading || !isFormValid()}>{editingId ? 'Guardar cambios' : 'Registrar'}</button>
        </div>

        {loading && (
          <div className="mf-loading-overlay" aria-hidden>
            <div className="mf-spinner" />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Guardar cambios"
        message="¿Desea guardar los cambios?"
        cancelText="CANCELAR"
        confirmText="CONFIRMAR"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => doSubmit()}
        modalStyle={{ width: 'min(520px, 86vw)' }}
      />

      <style>{`
        .mf-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:1000}
        .mf-modal{position:relative;width:min(820px,92vw);max-height:86vh;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}
        .mf-header{padding:18px 24px;border-bottom:1px solid #eceff4;text-align:center}
  .mf-header h2{margin:0;font-size:24px}
  /* Reducir padding para compactar el contenido dentro del modal */
  .mf-body{padding:12px 18px}
        .scrollable{overflow-y:auto;overflow-x:hidden;padding-bottom:8px}
  /* Secciones más compactas */
  section{margin-bottom:14px}
  section h3{margin:10px 0;font-size:15px;text-align:center;font-weight:700}
  /* Layout de label+input: etiqueta a la izquierda, asterisco en columna intermedia, control a la derecha.
     Usamos 3 columnas compactas para mantener el asterisco alineado y evitar que se separe del texto. */
  label{display:grid;grid-template-columns:140px 18px 1fr;align-items:center;gap:8px;margin:6px 0}
  /* Inputs centrados dentro de la columna derecha y limitados en ancho */
  input,select,textarea{padding:8px 12px;border:1px solid #d0d7e2;border-radius:8px;width:100%;max-width:100%;box-sizing:border-box}
  /* Los controles ocupan la tercera columna */
  label > input,label > select,label > textarea,label > .file-wrapper{grid-column:3}
  /* Asterisco de campo requerido ocupa la columna central */
  label > .required{grid-column:2;justify-self:center;margin:0}
        /* Layout de filas: centrar elementos y permitir wrap */
  /* Row ahora usa grid para distribuir opciones en columnas responsivas con mejor separación */
  .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;align-items:center;justify-items:start}
  /* Para los label que están dentro de .row (opciones radio/checkbox) con mejor presencia visual */
  .row > label{display:flex;flex-direction:row;align-items:center;gap:10px;margin:0;padding:12px 14px;text-align:left;border-radius:8px;transition:background-color 0.2s ease,box-shadow 0.2s ease;cursor:pointer;user-select:none}
  /* Efecto hover sutil para mejorar la interactividad */
  .row > label:hover{background-color:#f0f4ff;box-shadow:0 2px 8px rgba(30,58,138,0.08)}
  /* Inputs (radio/checkbox) más grandes y visibles */
  .row > label input{width:20px;height:20px;cursor:pointer;accent-color:#1e3a8a}
  .row label{flex:0 0 auto;text-align:left}
  /* Excepto los inputs de tipo texto dentro de .row (ej. Código Artesano) */
  .row > label input[type="text"]{width:100%;height:auto;cursor:text;padding:8px 12px;border:1px solid #d0d7e2;border-radius:8px;accent-color:auto}
  /* Estilo especial para el campo Código Artesano que aparece después del .row */
  section > label{margin-top:12px}
  section > label > input[type="text"]::placeholder{color:#94a3b8;font-style:italic}
  /* Config row: etiquetas a la izquierda y control a la derecha (horizontal y compacto) */
  /* Compactar y mejorar alineación del checkbox Estado */
  .config-row{grid-template-columns:repeat(3,1fr);gap:12px;align-items:center}
  .config-row > label{display:flex;align-items:center;gap:10px;padding:4px}
  .config-row > label > input[type="checkbox"]{transform:scale(1.06);margin-left:0}
  .config-row > label > select{min-width:140px;max-width:220px}
  .config-row > label > .file-wrapper{display:inline-flex}
  /* Mensajes y estados */
  /* Hacer que los mensajes dentro de un label ocupen todas las columnas y queden centrados */
  label > .err, label > .info { grid-column: 1 / -1; justify-self: center }
  .err{color:#c53030;font-size:12px;display:block;margin-top:6px;text-align:center}
  .info{color:#2563eb;font-size:12px;display:block;margin-top:6px;text-align:center}
        .required{color:#c53030;font-weight:bold;margin-left:4px}
        .error-input{border-color:#c53030 !important;background-color:#fff5f5}
        /* Footer */
  .mf-footer{display:flex;gap:12px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #eceff4}
        .mf-footer button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#1e3a8a;color:#fff}
        .mf-footer button:first-child{background:#fff;color:#0f172a;border-color:#cbd5e1}
        /* Loading overlay */
        .mf-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;border-radius:12px}
        .mf-spinner{width:48px;height:48px;border-radius:50%;border:6px solid rgba(0,0,0,0.08);border-top-color:#1e3a8a;animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
  /* File input personalizado */
  /* Alinear a la izquierda y truncar nombre de archivo si es muy largo */
  .file-wrapper{display:flex;gap:12px;align-items:center;justify-content:flex-start;flex-wrap:wrap;max-width:100%;margin:6px 0}
        .file-btn{padding:8px 12px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer}
    .file-name{font-size:0.95rem;color:#374151;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        @media (max-width:480px){
          .row{grid-template-columns:repeat(1,1fr)}
          input,select,textarea{max-width:100%}
          .mf-modal{width:calc(100vw - 32px)}
          /* En pantallas pequeñas, labels pasan a bloque para evitar columnas muy estrechas */
          label{grid-template-columns:1fr;align-items:flex-start}
          label > input,label > select,label > textarea,label > .file-wrapper{grid-column:1;width:100%}
          /* Mover el asterisco junto al label en móvil */
          label > .required{grid-column:1;justify-self:flex-start;margin-left:6px}
        }
      `}</style>
    </div>
  );
};

export default EmisorFormModal;
