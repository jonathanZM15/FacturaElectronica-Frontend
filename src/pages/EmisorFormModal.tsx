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

  const onChange = (k: keyof Emisor, value: any) => setV(prev => ({ ...prev, [k]: value }));

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
    if (!v.ruc.trim() || !v.razon_social.trim()) return false;
    if (!validateRucEcuador(v.ruc)) {
      setRucError('RUC no válido según reglas del SRI');
      return false;
    }
    setRucError(null);
    if (v.correo_remitente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) {
      setEmailError('formato inválido de correo');
      return false;
    }
    setEmailError(null);

    // ambiente and tipo_emision should be present
    if (!v.ambiente) return false;
    if (!v.tipo_emision) return false;

    // logo: required on create, optional on edit
    if (!editingId) {
      if (!logoFile) { setLogoError('Logo obligatorio al registrar un emisor'); return false; }
    }

    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) {
      setLogoError('Formato no permitido. Use .jpg, .jpeg o .png');
      return false;
    }
    setLogoError(null);
    return true;
  };

  // Pure validation used for enabling/disabling the submit button (no state side-effects)
  const isFormValid = () => {
    if (!v.ruc || !v.ruc.trim()) return false;
    if (!v.razon_social || !v.razon_social.trim()) return false;
    if (v.correo_remitente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) return false;
    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return false;
    if (rucError) return false;
    return true;
  };

  const doSubmit = async () => {
    if (!validate()) {
      // populate per-field errors to help user
      markFieldErrors();
      return;
    }
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
    // mark that we attempted submit to show inline errors (fieldErrors will be populated)
    if (!validate()) {
      markFieldErrors();
      return;
    }

    if (editingId) {
      // ask for confirmation before saving changes
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const markFieldErrors = () => {
    const e: Record<string,string> = {};
    if (!v.ruc || !v.ruc.toString().trim()) e.ruc = 'RUC es obligatorio';
    else if (!validateRucEcuador(v.ruc)) e.ruc = 'RUC no válido según reglas del SRI';
    if (!v.razon_social || !v.razon_social.toString().trim()) e.razon_social = 'Razón Social es obligatoria';
    if (!v.direccion_matriz || !v.direccion_matriz.toString().trim()) e.direccion_matriz = 'Dirección Matriz es obligatoria';
    if (!v.regimen_tributario) e.regimen_tributario = 'Seleccione Régimen Tributario';
    const yn = (x: any) => x === 'SI' || x === 'NO';
    if (!yn(v.obligado_contabilidad)) e.obligado_contabilidad = 'Indique si está obligado a llevar contabilidad';
    if (!yn(v.contribuyente_especial)) e.contribuyente_especial = 'Indique si es contribuyente especial';
    if (!yn(v.agente_retencion)) e.agente_retencion = 'Indique si es agente de retención';
    if (!v.tipo_persona) e.tipo_persona = 'Seleccione Tipo de Persona';
    if (!v.codigo_artesano || !v.codigo_artesano.toString().trim()) e.codigo_artesano = 'Código Artesano es obligatorio';
    if (!v.correo_remitente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) e.correo_remitente = 'Correo remitente obligatorio y debe ser válido';
    if (!v.ambiente) e.ambiente = 'Seleccione ambiente';
    if (!v.tipo_emision) e.tipo_emision = 'Seleccione tipo de emisión';
    if (!editingId && !logoFile) e.logo = 'Logo obligatorio al registrar';
    setFieldErrors(e);
    return e;
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
              <label>RUC
                  <input value={v.ruc} onChange={e => onChange('ruc', e.target.value)} disabled={!localRucEditable} />
                  {!localRucEditable && <small style={{color:'#666'}}>El RUC no puede ser modificado porque existen comprobantes autorizados.</small>}
                  {rucError && <span className="err">{rucError}</span>}
              </label>
            <label>Razón Social
              <input value={v.razon_social} onChange={e => onChange('razon_social', e.target.value)} />
            </label>
            <label>Nombre comercial {!editingId && <span className="required">*</span>}
              <input 
                value={v.nombre_comercial || ''} 
                onChange={e => onChange('nombre_comercial', e.target.value)}
                className={!editingId && fieldErrors.nombre_comercial && !v.nombre_comercial ? 'error-input' : ''}
              />
              {!editingId && fieldErrors.nombre_comercial && !v.nombre_comercial && <span className="err">{fieldErrors.nombre_comercial}</span>}
            </label>
            <label>Dirección Matriz
              <input value={v.direccion_matriz || ''} onChange={e => onChange('direccion_matriz', e.target.value)} />
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
              <label><input type="checkbox" checked={v.obligado_contabilidad==='SI'} onChange={e=>onChange('obligado_contabilidad', e.target.checked?'SI':'NO')} /> Obligado a llevar contabilidad{isMissing('obligado_contabilidad') && <span className="req">*</span>}</label>
              <label><input type="checkbox" checked={v.contribuyente_especial==='SI'} onChange={e=>onChange('contribuyente_especial', e.target.checked?'SI':'NO')} /> Contribuyente Especial{isMissing('contribuyente_especial') && <span className="req">*</span>}</label>
              <label><input type="checkbox" checked={v.agente_retencion==='SI'} onChange={e=>onChange('agente_retencion', e.target.checked?'SI':'NO')} /> Agente de retención{isMissing('agente_retencion') && <span className="req">*</span>}</label>
            </div>
            <div>
              {(fieldErrors.obligado_contabilidad || fieldErrors.contribuyente_especial || fieldErrors.agente_retencion) && (
                <span className="err">{fieldErrors.obligado_contabilidad || fieldErrors.contribuyente_especial || fieldErrors.agente_retencion}</span>
              )}
            </div>

            <h3>Tipo de persona</h3>
            <div className="row">
              {['NATURAL','JURIDICA'].map(opt => (
                <label key={opt}><input type="radio" checked={v.tipo_persona===opt} onChange={()=>onChange('tipo_persona', opt as any)} /> {opt}</label>
              ))}
              <label style={{marginLeft:12}}>Código Artesano
                <input value={v.codigo_artesano || ''} onChange={e => onChange('codigo_artesano', e.target.value)} />
              </label>
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
            <label>Correo Remitente
              <input value={v.correo_remitente || ''} onChange={e => onChange('correo_remitente', e.target.value)} />
              {emailError && <span className="err">{emailError}</span>}
            </label>
            <div className="row config-row">
              <label>Estado
                <input type="checkbox" checked={v.estado==='ACTIVO'} onChange={e => onChange('estado', e.target.checked?'ACTIVO':'INACTIVO')} />
              </label>

              <label>Ambiente{isMissing('ambiente') && <span className="req">*</span>}
                <select value={v.ambiente} onChange={e => onChange('ambiente', e.target.value as any)}>
                  <option value="PRODUCCION">Producción</option>
                  <option value="PRUEBAS">Pruebas</option>
                </select>
              </label>

              <label>Tipo de Emisión{isMissing('tipo_emision') && <span className="req">*</span>}
                <select value={v.tipo_emision} onChange={e => onChange('tipo_emision', e.target.value as any)}>
                  <option value="NORMAL">Normal</option>
                  <option value="INDISPONIBILIDAD">Indisponibilidad del SRI</option>
                </select>
                {fieldErrors.tipo_emision && <span className="err">{fieldErrors.tipo_emision}</span>}
              </label>
            </div>

            <label>Logo
              <input type="text" readOnly value={logoFile?.name || ''} placeholder="logo.jpg" />
              <input type="file" accept=".jpg,.jpeg,.png" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
              {logoError && <span className="err">{logoError}</span>}
            </label>
          </section>
        </div>

        <div className="mf-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>{'Cancelar'}</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !isFormValid()}>{editingId ? 'Guardar cambios' : 'Registrar'}</button>
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
  .mf-modal{position:relative;width:min(880px,92vw);max-height:86vh;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
        .mf-header{padding:16px 20px;border-bottom:1px solid #eceff4}
        .mf-body{padding:16px 20px}
        .scrollable{overflow-y:auto}
        section{margin-bottom:18px}
        section h3{margin:10px 0;font-size:16px}
        label{display:block;margin:8px 0}
        input,select{padding:8px 10px;border:1px solid #d0d7e2;border-radius:6px;width:100%;max-width:100%}
        .row{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
        .err{color:#c53030;margin-left:8px;font-size:12px}
        .mf-footer{display:flex;gap:12px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #eceff4}
        .mf-footer button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#1e3a8a;color:#fff}
        .mf-footer button:first-child{background:#fff;color:#0f172a;border-color:#cbd5e1}
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
