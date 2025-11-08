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
  const [loading, setLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [localRucEditable, setLocalRucEditable] = React.useState<boolean>(true);
  const [rucError, setRucError] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  // Which fields are required for the form. We show '*' for these from the start.
  const requiredKeys = React.useMemo(() => new Set<string>([
    'ruc','razon_social','direccion_matriz','regimen_tributario','obligado_contabilidad','contribuyente_especial','agente_retencion','tipo_persona','codigo_artesano','correo_remitente','estado','ambiente','tipo_emision','logo'
  ]), []);
  // returns true when a required field is currently missing/invalid so the '*' should show
  const isFieldValid = (key: string) => {
    const val = (v as any)[key];
    if (key === 'logo') {
      if (editingId) return true; // logo optional on edit
      return !!logoFile;
    }
    if (key === 'obligado_contabilidad' || key === 'contribuyente_especial' || key === 'agente_retencion') {
      return val === 'SI' || val === 'NO';
    }
    if (key === 'correo_remitente') {
      return !!val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }
    if (key === 'ruc') {
      return !!val && validateRucEcuador(val);
    }
    if (key === 'codigo_artesano' || key === 'razon_social' || key === 'direccion_matriz') {
      return !!val && typeof val === 'string' && val.trim().length > 0;
    }
    if (key === 'regimen_tributario' || key === 'tipo_persona' || key === 'ambiente' || key === 'tipo_emision' || key === 'estado') {
      return !!val;
    }
    // default: consider present
    return val !== null && val !== undefined && (typeof val !== 'string' || val.trim() !== '');
  };

  const isMissing = (key: string) => requiredKeys.has(key) && !isFieldValid(key);

  // Enhanced onChange that clears per-field errors live
  const onChange = (k: keyof Emisor, value: any) => {
    setV(prev => ({ ...prev, [k]: value }));
    const ks = k as string;
    setFieldErrors(prev => {
      if (!prev) return prev;
      if (!(ks in prev)) return prev;
      const copy = { ...prev } as Record<string,string>;
      delete copy[ks];
      return copy;
    });
    if (ks === 'ruc') setRucError(null);
    if (ks === 'correo_remitente') setEmailError(null);
    if (ks === 'logo') setLogoError(null);
  };

  React.useEffect(() => {
    if (open) {
      setV(initialData ?? initial);
      setLogoFile(null);
      setEmailError(null);
      setLogoError(null);
      setLocalRucEditable(rucEditable ?? true);
    }
  }, [open, initialData, rucEditable]);

  // Validate RUC in real time
  React.useEffect(() => {
    if (!v.ruc || !v.ruc.toString().trim()) { setRucError(null); return; }
    if (!validateRucEcuador(v.ruc)) setRucError('RUC no válido según reglas del SRI');
    else setRucError(null);
  }, [v.ruc]);

  const validate = () => {
    // Required core fields
    if (!v.ruc || !v.ruc.toString().trim()) { setRucError('RUC es obligatorio'); return false; }
    if (!v.razon_social || !v.razon_social.trim()) { return false; }
    if (!v.direccion_matriz || !v.direccion_matriz.trim()) { return false; }

    // RUC validation
    if (!validateRucEcuador(v.ruc)) {
      setRucError('RUC no válido según reglas del SRI');
      return false;
    }
    setRucError(null);

    // Regimen tributario
    if (!v.regimen_tributario) return false;

    // Obligaciones (must be 'SI' or 'NO')
    const yn = (x: any) => x === 'SI' || x === 'NO';
    if (!yn(v.obligado_contabilidad) || !yn(v.contribuyente_especial) || !yn(v.agente_retencion)) return false;

    // Tipo persona and codigo_artesano required
    if (!v.tipo_persona || (v.tipo_persona !== 'NATURAL' && v.tipo_persona !== 'JURIDICA')) return false;
    if (!v.codigo_artesano || !v.codigo_artesano.toString().trim()) return false;

    // Correo remitente required and validated
    if (!v.correo_remitente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) {
      setEmailError('Correo remitente obligatorio y debe tener formato válido');
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
    if (!v.ruc || !v.ruc.toString().trim()) return false;
    if (!v.razon_social || !v.razon_social.toString().trim()) return false;
    if (!v.direccion_matriz || !v.direccion_matriz.toString().trim()) return false;
    if (!v.codigo_artesano || !v.codigo_artesano.toString().trim()) return false;
    if (!v.correo_remitente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) return false;
    if (!v.regimen_tributario) return false;
    if (rucError) return false;
    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return false;
    if (!editingId && !logoFile) return false;
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
              <label>RUC{isMissing('ruc') && <span className="req">*</span>}
                  <input className={fieldErrors.ruc ? 'invalid' : ''} value={v.ruc} onChange={e => onChange('ruc', e.target.value)} disabled={!localRucEditable} />
                  {!localRucEditable && <small style={{color:'#666'}}>El RUC no puede ser modificado porque existen comprobantes autorizados.</small>}
                  {(rucError || fieldErrors.ruc) && <span className="err">{fieldErrors.ruc ?? rucError}</span>}
              </label>
            <label>Razón Social{isMissing('razon_social') && <span className="req">*</span>}
              <input className={fieldErrors.razon_social ? 'invalid' : ''} value={v.razon_social} onChange={e => onChange('razon_social', e.target.value)} />
              {fieldErrors.razon_social && <span className="err">{fieldErrors.razon_social}</span>}
            </label>
            <label>Nombre comercial
              <input value={v.nombre_comercial || ''} onChange={e => onChange('nombre_comercial', e.target.value)} />
            </label>
            <label>Dirección Matriz{isMissing('direccion_matriz') && <span className="req">*</span>}
              <input className={fieldErrors.direccion_matriz ? 'invalid' : ''} value={v.direccion_matriz || ''} onChange={e => onChange('direccion_matriz', e.target.value)} />
              {fieldErrors.direccion_matriz && <span className="err">{fieldErrors.direccion_matriz}</span>}
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
              <label style={{marginLeft:12}}>Código Artesano{isMissing('codigo_artesano') && <span className="req">*</span>}
                <input className={fieldErrors.codigo_artesano ? 'invalid' : ''} value={v.codigo_artesano || ''} onChange={e => onChange('codigo_artesano', e.target.value)} />
                {fieldErrors.codigo_artesano && <span className="err">{fieldErrors.codigo_artesano}</span>}
              </label>
              {fieldErrors.tipo_persona && <span className="err">{fieldErrors.tipo_persona}</span>}
            </div>
          </section>

          <section>
            <h3>Datos de configuración</h3>
            <label>Correo Remitente{isMissing('correo_remitente') && <span className="req">*</span>}
              <input className={fieldErrors.correo_remitente ? 'invalid' : ''} value={v.correo_remitente || ''} onChange={e => onChange('correo_remitente', e.target.value)} />
              {(emailError || fieldErrors.correo_remitente) && <span className="err">{fieldErrors.correo_remitente ?? emailError}</span>}
            </label>
            <div className="row">
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
              <input type="text" readOnly value={logoFile?.name || ''} placeholder="logo.jpg" className={fieldErrors.logo ? 'invalid' : ''} />
              <input type="file" accept=".jpg,.jpeg,.png" onChange={e => {
                const f = e.target.files?.[0] || null;
                setLogoFile(f);
                setFieldErrors(prev => {
                  if (!prev) return prev;
                  const copy = { ...prev } as Record<string,string>;
                  delete copy.logo;
                  return copy;
                });
                setLogoError(null);
              }} />
              {(logoError || fieldErrors.logo) && <span className="err">{fieldErrors.logo ?? logoError}</span>}
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
        input.invalid, select.invalid{border-color:#c53030;box-shadow:0 0 0 4px rgba(197,48,48,0.06)}
        .row{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
        .err{color:#c53030;margin-left:8px;font-size:12px}
        .mf-footer{display:flex;gap:12px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #eceff4}
        .mf-footer .btn{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,opacity .12s}
        .mf-footer .btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .mf-footer .btn:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 8px 24px rgba(15,23,42,0.12)}
        .mf-footer .btn:active:not(:disabled){transform:translateY(0) scale(.985)}
        .mf-footer .btn-primary{background:#1e3a8a;color:#fff;border-color:#16307a}
        .mf-footer .btn-secondary{background:#fff;color:#0f172a;border-color:#cbd5e1}
        .mf-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;border-radius:12px}
        .mf-spinner{width:48px;height:48px;border-radius:50%;border:6px solid rgba(0,0,0,0.08);border-top-color:#1e3a8a;animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
};

export default EmisorFormModal;
