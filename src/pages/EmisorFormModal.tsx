import React from 'react';
import { useUser } from '../contexts/userContext';
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
  const { user } = useUser();
  const [v, setV] = React.useState<Emisor>(initial);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [localRucEditable, setLocalRucEditable] = React.useState<boolean>(true);
  const [rucError, setRucError] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [rucDuplicateError, setRucDuplicateError] = React.useState<string | null>(null);
  const [checkingRuc, setCheckingRuc] = React.useState(false);
    const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      setV(initialData ?? initial);
      setLogoFile(null);
      setEmailError(null);
      setLogoError(null);
      setLocalRucEditable(rucEditable ?? true);
      setRucDuplicateError(null);
      setFieldErrors({});
      setCheckingRuc(false);
        setTouchedFields(new Set());
    }
  }, [open, initialData, rucEditable]);

  // Enhanced onChange: set value and clear field-specific errors live
  const onChange = (k: keyof Emisor, value: any) => {
    setV(prev => ({ ...prev, [k]: value }));
      // Mark field as touched
      setTouchedFields(prev => new Set(prev).add(k as string));
    const ks = k as string;
    setFieldErrors(prev => {
      if (!prev || !(ks in prev)) return prev;
      const copy = { ...prev };
      delete copy[ks];
      return copy;
    });
    if (ks === 'ruc') {
      setRucError(null);
      setRucDuplicateError(null);
    }
    if (ks === 'correo_remitente') setEmailError(null);
    if (ks === 'codigo_artesano') {
      // nothing else
    }
  };

    // Real-time validation for touched fields
    const validateFieldRealTime = (key: string) => {
      if (!touchedFields.has(key)) return null;
    
      const val = (v as any)[key];
    
      switch (key) {
        case 'ruc':
          if (!val || !val.toString().trim()) return 'Nro. RUC es obligatorio';
          if ((val.toString().replace(/\D/g,'')).length < 13) return 'El Nro. RUC debe tener al menos 13 dígitos';
          if (!validateRucEcuador(val)) return 'RUC no válido según reglas del SRI';
          if (rucDuplicateError) return rucDuplicateError;
          return null;
        case 'razon_social':
          if (!val || !val.toString().trim()) return 'Razón Social es obligatoria';
          return null;
        case 'direccion_matriz':
          if (!val || !val.toString().trim()) return 'Dirección Matriz es obligatoria';
          return null;
        case 'correo_remitente':
          if (!val || !val.toString().trim()) return null; // optional in the form
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Correo debe ser válido';
          return null;
        case 'regimen_tributario':
          if (!val) return 'Seleccione Régimen Tributario';
          return null;
        case 'obligado_contabilidad':
          if (val !== 'SI' && val !== 'NO') return 'Indique si está obligado a llevar contabilidad';
          return null;
        case 'contribuyente_especial':
          if (val !== 'SI' && val !== 'NO') return 'Indique si es contribuyente especial';
          return null;
        case 'agente_retencion':
          if (val !== 'SI' && val !== 'NO') return 'Indique si es agente de retención';
          return null;
        case 'tipo_persona':
          if (!val) return 'Seleccione Tipo de Persona';
          return null;
        case 'ambiente':
          if (!val) return 'Seleccione ambiente';
          return null;
        case 'tipo_emision':
          if (!val) return 'Seleccione tipo de emisión';
          return null;
        case 'logo':
          // logo is optional; when provided validate format and orientation
          if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return 'Formato no permitido. Use .jpg, .jpeg o .png';
          if (logoFile && (logoFile as any).__orientationInvalid) return 'El logo debe ser horizontal (ancho mayor que alto)';
          return null;
        default:
          return null;
      }
    };

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
    }, 600);

    return () => clearTimeout(timer);
  }, [v.ruc, rucError, editingId]);

  const validate = () => {
    // Basic required checks align with backend
    if (!v.ruc || !v.ruc.toString().trim()) { setRucError('Nro. RUC es obligatorio'); return false; }
    if ((v.ruc.toString().replace(/\D/g,'')).length < 13) { setRucError('El Nro. RUC debe tener al menos 13 dígitos'); return false; }
    if (!v.razon_social || !v.razon_social.toString().trim()) return false;
    if (!v.direccion_matriz || !v.direccion_matriz.toString().trim()) return false;

    // RUC format
    if (!validateRucEcuador(v.ruc)) { setRucError('RUC no válido según reglas del SRI'); return false; }
    if (rucDuplicateError) return false;

    // correo
    // Correo remitente is optional in the form (kept internally in DB)
    if (v.correo_remitente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) { setEmailError('Correo debe ser válido'); return false; }

    // ambiente / tipo emision
    if (!v.ambiente) return false;
    if (!v.tipo_emision) return false;

    // logo is optional; if provided, validate format and orientation
    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) { setLogoError('Formato no permitido. Use .jpg, .jpeg o .png'); return false; }
    if (logoFile && (logoFile as any).__orientationInvalid) { setLogoError('El logo debe ser horizontal (ancho mayor que alto)'); return false; }

    // clear transient errors
    setRucError(null);
    setEmailError(null);
    setLogoError(null);
    return true;
  };

  // Pure validation used for enabling/disabling the submit button (no state side-effects)
  const isFormValid = () => {
    if (!v.ruc || !v.ruc.toString().trim()) return false;
    if (!v.razon_social || !v.razon_social.toString().trim()) return false;
    if (!v.direccion_matriz || !v.direccion_matriz.toString().trim()) return false;
    // correo_remitente optional for form validity
    if (v.correo_remitente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) return false;
    if (!v.ambiente || !v.tipo_emision) return false;
    if (rucError || rucDuplicateError || checkingRuc) return false;
    if (!editingId && !logoFile) return false;
    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return false;
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
      // Build payload but omit correo_remitente when empty so backend uses DB default/null
      const payload: any = { ...v };
      // If correo_remitente is empty, prefer the authenticated user's email to satisfy backend 'required' validation.
      if (!payload.correo_remitente || (typeof payload.correo_remitente === 'string' && payload.correo_remitente.trim() === '')) {
        payload.correo_remitente = (user && (user as any).email) ? (user as any).email : 'no-reply@localhost';
      }

      if (editingId) {
        res = await emisoresApi.update(editingId, { ...payload, logoFile });
        const updated: Emisor = res.data?.data ?? res.data;
        onUpdated && onUpdated(updated);
      } else {
        res = await emisoresApi.create({ ...payload, logoFile });
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
    if (!v.ruc || !v.ruc.toString().trim()) e.ruc = 'Nro. RUC es obligatorio';
    else if ((v.ruc.toString().replace(/\D/g,'')).length < 13) e.ruc = 'El Nro. RUC debe tener al menos 13 dígitos';
    else if (!validateRucEcuador(v.ruc)) e.ruc = 'RUC no válido según reglas del SRI';
    if (rucDuplicateError) e.ruc = rucDuplicateError;
  if (!v.razon_social || !v.razon_social.toString().trim()) e.razon_social = 'Razón Social es obligatoria';
  if (!v.direccion_matriz || !v.direccion_matriz.toString().trim()) e.direccion_matriz = 'Dirección Matriz es obligatoria';
    if (!v.regimen_tributario) e.regimen_tributario = 'Seleccione Régimen Tributario';
    const yn = (x: any) => x === 'SI' || x === 'NO';
    if (!yn(v.obligado_contabilidad)) e.obligado_contabilidad = 'Indique si está obligado a llevar contabilidad';
    if (!yn(v.contribuyente_especial)) e.contribuyente_especial = 'Indique si es contribuyente especial';
    if (!yn(v.agente_retencion)) e.agente_retencion = 'Indique si es agente de retención';
  if (!v.tipo_persona) e.tipo_persona = 'Seleccione Tipo de Persona';
    // codigo_artesano is optional, no validation needed
    // correo_remitente is optional in form; validate only when present
    if (v.correo_remitente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo_remitente)) e.correo_remitente = 'Correo debe ser válido';
    if (!v.ambiente) e.ambiente = 'Seleccione ambiente';
    if (!v.tipo_emision) e.tipo_emision = 'Seleccione tipo de emisión';
    if (!editingId && !logoFile) e.logo = 'Logo obligatorio al registrar';
    setFieldErrors(e);
    return e;
  };

  // Helper: which fields are required (used to show asterisk)
  const requiredKeys = React.useMemo(() => new Set<string>([
    'ruc','razon_social','direccion_matriz','regimen_tributario','obligado_contabilidad','contribuyente_especial','agente_retencion','tipo_persona','estado','ambiente','tipo_emision','logo'
  ]), []);

  const isFieldValid = (key: string) => {
    const val = (v as any)[key];
    switch (key) {
      case 'ruc': return !!val && validateRucEcuador(val) && !rucDuplicateError;
      case 'nombre_comercial': return !!val && typeof val === 'string' && val.trim().length > 0;
      case 'razon_social': return !!val && typeof val === 'string' && val.trim().length > 0;
      case 'direccion_matriz': return !!val && typeof val === 'string' && val.trim().length > 0;
        case 'codigo_artesano': return true; // Optional field, always valid
      case 'correo_remitente': return !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); // optional: valid if empty or matches pattern
      case 'ambiente': return !!val;
      case 'tipo_emision': return !!val;
      case 'logo': return true; // optional
      default: return val !== null && val !== undefined && (typeof val !== 'string' || val.trim() !== '');
    }
  };

  const isMissing = (key: string) => requiredKeys.has(key) && !isFieldValid(key);

  if (!open) return null;

  return (
    <div className="mf-backdrop">
      <div className="mf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mf-header">
          <h2>{editingId ? 'Editar emisor' : 'Registro de nuevo emisor'}</h2>
        </div>

        <div className="mf-body scrollable">
          <section>
            <h3>Identificación</h3>
            {/* Grid: RUC on left, Estado toggle on right */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 24, alignItems: 'center', marginBottom: 12 }}>
              <label className="horizontal" style={{ margin: 0 }}>
                <span style={{display:'inline-flex', alignItems:'center', gap:6}}>Nro. RUC{requiredKeys.has('ruc') && <strong style={{color:'#b00020', marginLeft:6}}> *</strong>}</span>
                  <input
                    value={v.ruc}
                    onChange={e => onChange('ruc', e.target.value.replace(/\D/g, ''))}
                      onBlur={() => setTouchedFields(prev => new Set(prev).add('ruc'))}
                    disabled={!localRucEditable}
                      className={validateFieldRealTime('ruc') ? 'error-input' : ''}
                      maxLength={13}
                      inputMode="numeric"
                      pattern="\d*"
                  />
              </label>
              {/* Estado toggle on the right */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Estado</div>
                  <div style={{ fontSize: 12, marginTop: 2, color: v.estado === 'ACTIVO' ? '#059669' : '#64748b' }}>
                    {v.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={v.estado === 'ACTIVO'} onChange={e => onChange('estado', e.target.checked ? 'ACTIVO' : 'INACTIVO')} />
                  <span className="slider" />
                </label>
              </div>
            </div>
            {!localRucEditable && <small style={{color:'#666',marginLeft:'192px'}}>El RUC no puede ser modificado porque existen comprobantes autorizados.</small>}
            {validateFieldRealTime('ruc') && <span className="err" style={{marginLeft:'192px'}}>{validateFieldRealTime('ruc')}</span>}
            <label className="horizontal">{requiredKeys.has('razon_social') ? <><span style={{display:'inline-flex', alignItems:'center', gap:6}}>Razón Social<strong style={{color:'#b00020', marginLeft:6}}> *</strong></span></> : 'Razón Social'}
              <input
                value={v.razon_social}
                onChange={e => onChange('razon_social', e.target.value)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add('razon_social'))}
                  className={validateFieldRealTime('razon_social') ? 'error-input' : ''}
              />
            </label>
                {validateFieldRealTime('razon_social') && <span className="err" style={{marginLeft:'192px'}}>{validateFieldRealTime('razon_social')}</span>}
            <label className="horizontal"><span style={{display:'inline-flex', alignItems:'center', gap:6}}>Nombre comercial</span>
              <input 
                value={v.nombre_comercial || ''} 
                onChange={e => onChange('nombre_comercial', e.target.value)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add('nombre_comercial'))}
              />
            </label>
            <label className="horizontal">{requiredKeys.has('direccion_matriz') ? <><span style={{display:'inline-flex', alignItems:'center', gap:6}}>Dirección Matriz<strong style={{color:'#b00020', marginLeft:6}}> *</strong></span></> : 'Dirección Matriz'}
              <input
                value={v.direccion_matriz || ''}
                onChange={e => onChange('direccion_matriz', e.target.value)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add('direccion_matriz'))}
                  className={validateFieldRealTime('direccion_matriz') ? 'error-input' : ''}
              />
            </label>
                {validateFieldRealTime('direccion_matriz') && <span className="err" style={{marginLeft:'192px'}}>{validateFieldRealTime('direccion_matriz')}</span>}
          </section>

          <section>
            <h3>Régimen Tributario</h3>
            <div className="row">
              {['GENERAL','RIMPE_POPULAR','RIMPE_EMPRENDEDOR','MICRO_EMPRESA'].map(opt => (
                <label key={opt}><input type="radio" checked={v.regimen_tributario===opt} onChange={() => onChange('regimen_tributario', opt as any)} /> {opt.replace('_',' ')}</label>
              ))}
            </div>

            <h3 style={{marginTop: '24px'}}>Obligaciones</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '550px', margin: '0 auto'}}>
              {/* Obligado a llevar contabilidad */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 130px', alignItems: 'center', gap: '16px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px'}}>
                <span style={{fontWeight: 600, fontSize: '14px', textAlign: 'left'}}>Obligado A Llevar Contabilidad</span>
                <div style={{display: 'flex', gap: '24px', justifyContent: 'flex-end'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                    <input 
                      type="radio" 
                      name="obligado_contabilidad"
                      checked={v.obligado_contabilidad === 'SI'} 
                      onChange={() => onChange('obligado_contabilidad', 'SI')} 
                    /> 
                    Sí
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                    <input 
                      type="radio" 
                      name="obligado_contabilidad"
                      checked={v.obligado_contabilidad === 'NO'} 
                      onChange={() => onChange('obligado_contabilidad', 'NO')} 
                    /> 
                    No
                  </label>
                </div>
              </div>

              {/* Contribuyente Especial */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 130px', alignItems: 'center', gap: '16px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px'}}>
                <span style={{fontWeight: 600, fontSize: '14px', textAlign: 'left'}}>Contribuyente Especial</span>
                <div style={{display: 'flex', gap: '24px', justifyContent: 'flex-end'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                    <input 
                      type="radio" 
                      name="contribuyente_especial"
                      checked={v.contribuyente_especial === 'SI'} 
                      onChange={() => onChange('contribuyente_especial', 'SI')} 
                    /> 
                    Sí
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                    <input 
                      type="radio" 
                      name="contribuyente_especial"
                      checked={v.contribuyente_especial === 'NO'} 
                      onChange={() => onChange('contribuyente_especial', 'NO')} 
                    /> 
                    No
                  </label>
                </div>
              </div>

              {/* Agente de Retención */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 130px', alignItems: 'center', gap: '16px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px'}}>
                <span style={{fontWeight: 600, fontSize: '14px', textAlign: 'left'}}>Agente De Retención</span>
                <div style={{display: 'flex', gap: '24px', justifyContent: 'flex-end'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                    <input 
                      type="radio" 
                      name="agente_retencion"
                      checked={v.agente_retencion === 'SI'} 
                      onChange={() => onChange('agente_retencion', 'SI')} 
                    /> 
                    Sí
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                    <input 
                      type="radio" 
                      name="agente_retencion"
                      checked={v.agente_retencion === 'NO'} 
                      onChange={() => onChange('agente_retencion', 'NO')} 
                    /> 
                    No
                  </label>
                </div>
              </div>
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
            </div>
            <label className="horizontal" style={{maxWidth: '600px', margin: '12px auto'}}>Código Artesano
              <input 
                value={v.codigo_artesano || ''} 
                onChange={e => onChange('codigo_artesano', e.target.value)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add('codigo_artesano'))}
                placeholder="Opcional - Ej: PICHINCHA-17-1234-2024"
                className="artesano-input"
              />
            </label>
          </section>

          <section>
            <h3>Datos de configuración</h3>
            <div className="config-row">
              <label>
                Ambiente
                  <select 
                    value={v.ambiente} 
                    onChange={e => onChange('ambiente', e.target.value as any)} 
                    onBlur={() => setTouchedFields(prev => new Set(prev).add('ambiente'))}
                    className={validateFieldRealTime('ambiente') ? 'error-input' : ''}
                  >
                  <option value="PRODUCCION">Producción</option>
                  <option value="PRUEBAS">Pruebas</option>
                </select>
                  {validateFieldRealTime('ambiente') && <span className="err">{validateFieldRealTime('ambiente')}</span>}
              </label>

              <label>
                Tipo de Emisión
                  <select 
                    value={v.tipo_emision} 
                    onChange={e => onChange('tipo_emision', e.target.value as any)} 
                    onBlur={() => setTouchedFields(prev => new Set(prev).add('tipo_emision'))}
                    className={validateFieldRealTime('tipo_emision') ? 'error-input' : ''}
                  >
                  <option value="NORMAL">Normal</option>
                  <option value="INDISPONIBILIDAD">Indisponibilidad del SRI</option>
                </select>
                  {validateFieldRealTime('tipo_emision') && <span className="err">{validateFieldRealTime('tipo_emision')}</span>}
              </label>
            </div>
            {/* Messages area: ambiente and tipo de emision */}
            <div style={{marginTop:12, textAlign:'center'}}>
              {v.ambiente === 'PRODUCCION' && (
                <div className="ambiente-message">Los comprobantes tendrán validez legal y fiscal.</div>
              )}
              {v.ambiente === 'PRUEBAS' && (
                <div className="ambiente-message ambiente-test">Los comprobantes <strong style={{color:'#b00020'}}>NO</strong> tendrán validez fiscal ni legal.</div>
              )}
              <div className="tipo-message" style={{marginTop:8}}>
                {/* Placeholder for Tipo de Emisión explanatory messages per option. */}
                {v.tipo_emision === 'NORMAL' && <span>Información: (mensaje explicativo para 'Normal' pendiente).</span>}
                {v.tipo_emision === 'INDISPONIBILIDAD' && <span>Información: (mensaje explicativo para 'Indisponibilidad del SRI' pendiente).</span>}
              </div>
            </div>

            <label>Logo
              <div className="logo-container">
                <div className={`logo-display ${validateFieldRealTime('logo') ? 'error-input' : ''}`}>
                  <input 
                    type="text" 
                    readOnly 
                    value={logoFile?.name || ''} 
                    placeholder="Seleccione un archivo (JPG, JPEG o PNG)"
                  />
                </div>
                <input 
                  type="file" 
                  accept=".jpg,.jpeg,.png" 
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    // read and validate orientation (horizontal required)
                    if (!f) {
                      setLogoFile(null);
                      setLogoError(null);
                      setTouchedFields(prev => new Set(prev).add('logo'));
                      return;
                    }
                    if (!/\.jpe?g$|\.png$/i.test(f.name)) {
                      setLogoFile(f);
                      setLogoError('Formato no permitido. Use .jpg, .jpeg o .png');
                      setTouchedFields(prev => new Set(prev).add('logo'));
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const img = new Image();
                      img.onload = () => {
                        const invalid = img.width <= img.height;
                        (f as any).__orientationInvalid = invalid;
                        setLogoFile(f);
                        setLogoError(invalid ? 'El logo debe ser horizontal (ancho mayor que alto)' : null);
                        setTouchedFields(prev => new Set(prev).add('logo'));
                      };
                      img.onerror = () => {
                        // if we cannot determine dimensions, accept but warn via null
                        (f as any).__orientationInvalid = false;
                        setLogoFile(f);
                        setLogoError(null);
                        setTouchedFields(prev => new Set(prev).add('logo'));
                      };
                      img.src = ev.target?.result as string;
                    };
                    reader.readAsDataURL(f);
                  }} 
                />
              </div>
              {validateFieldRealTime('logo') && <span className="err">{validateFieldRealTime('logo')}</span>}
              <div className="logo-hint">Opcional. Preferiblemente horizontal (ancho &gt; alto), dimensiones compatibles con la barra superior.</div>
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
        /* Backdrop and modal shell */
        .mf-backdrop{position:fixed;inset:0;background:rgba(2,6,23,0.45);display:flex;align-items:center;justify-content:center;z-index:1000}
        .mf-modal{position:relative;width:min(820px,92vw);max-height:88vh;background:#fff;border-radius:12px;box-shadow:0 14px 40px rgba(2,6,23,0.18);display:flex;flex-direction:column;overflow:hidden}

        /* Header */
        .mf-header{padding:20px 24px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)}
        .mf-header h2{margin:0;font-size:22px;color:#1e293b;font-weight:700}

        /* Body (scrollable) */
        .mf-body{padding:24px;overflow:auto}
        .scrollable{overflow-y:auto;padding-right:8px}

        /* Sections */
        section{margin-bottom:24px;padding:20px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb}
        section h3{margin:0 0 16px;font-size:16px;text-align:center;color:#334155;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}

        /* Form fields - HORIZONTAL layout for RUC section */
        label.horizontal{display:grid;grid-template-columns:180px 1fr;gap:12px;align-items:center;
          margin:10px 0;font-weight:500;color:#475569}
        label.horizontal input,label.horizontal select{height:40px;padding:10px 12px;border:1px solid #cbd5e1;
          border-radius:8px;width:100%;box-sizing:border-box;font-size:14px;background:#fff;transition:all 0.2s ease}
        
        /* Form fields - VERTICAL layout (default) */
        label{display:flex;flex-direction:column;gap:8px;margin:12px 0;font-weight:500;color:#475569}
        input:not([type="radio"]):not([type="checkbox"]):not([type="file"]),select,textarea{
          height:40px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;width:100%;
          box-sizing:border-box;font-size:14px;background:#fff;transition:all 0.2s ease
        }
        input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):focus,select:focus,textarea:focus{
          outline:none;box-shadow:0 0 0 3px rgba(59,130,246,0.1);border-color:#3b82f6
        }

        /* Codigo Artesano - input más pequeño */
        .artesano-input{max-width:400px!important;background:linear-gradient(135deg, #fff 0%, #f8fafc 100%)!important;
          border:1px solid #cbd5e1!important;font-style:italic;color:#64748b}
        .artesano-input:focus{background:#fff!important}
        .logo-hint{font-size:13px;color:var(--color-muted,#6b7280);margin-top:8px}
        .ambiente-message{font-size:14px;color:var(--color-text);background:transparent;padding:6px 10px;border-radius:6px}
        .ambiente-message.ambiente-test{color:#1f2937}
        .tipo-message{font-size:13px;color:var(--color-muted,#6b7280)}

        /* Radio buttons - custom styled circles */
        input[type="radio"]{appearance:none;width:20px;height:20px;border:2px solid #cbd5e1;border-radius:50%;
          cursor:pointer;transition:all 0.2s ease;margin:0;position:relative;flex-shrink:0}
        input[type="radio"]:checked{border-color:#3b82f6;background:#3b82f6;
          box-shadow:0 0 0 2px #fff inset}
        input[type="radio"]:hover{border-color:#3b82f6}

        /* Checkbox styled as radio - custom circles */
        input[type="checkbox"].radio-style{appearance:none;width:20px;height:20px;border:2px solid #cbd5e1;
          border-radius:50%;cursor:pointer;transition:all 0.2s ease;margin:0;position:relative;flex-shrink:0}
        input[type="checkbox"].radio-style:checked{border-color:#3b82f6;background:#3b82f6;
          box-shadow:0 0 0 2px #fff inset}
        input[type="checkbox"].radio-style:hover{border-color:#3b82f6}

        /* Regular checkbox for Estado */
        input[type="checkbox"]:not(.radio-style){appearance:none;width:20px;height:20px;border:2px solid #cbd5e1;
          border-radius:4px;cursor:pointer;transition:all 0.2s ease;margin:0;position:relative;flex-shrink:0}
        input[type="checkbox"]:not(.radio-style):checked{border-color:#3b82f6;background:#3b82f6}
        input[type="checkbox"]:not(.radio-style):checked::after{content:'✓';color:#fff;position:absolute;
          top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;font-weight:bold}

        /* Radio / checkbox groups */
        .row{display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:center}
        .row label{display:flex;flex-direction:row;align-items:center;gap:8px;margin:4px 0;
          font-weight:500;font-size:13px;color:#64748b;text-transform:capitalize}

        /* Config row - CENTRADO Y MÁS JUNTO */
        .config-row{display:flex;gap:20px;justify-content:center;align-items:center;margin-top:12px;flex-wrap:wrap}
        .config-row label{font-size:13px;font-weight:600;color:#475569;display:flex;align-items:center;gap:10px}
        .config-row select{height:36px;font-size:13px;padding:6px 10px;min-width:140px}
        .config-row input[type="checkbox"]{width:18px;height:18px}

        /* Validation and misc */
        .err{color:#dc2626;margin-top:4px;font-size:12px;display:block}
        .required{color:#dc2626;margin-left:4px;font-weight:700}
        .req{color:#dc2626;margin-left:4px}
        .error-input{border-color:#dc2626!important;background:#fef2f2!important}

        /* Footer / actions */
        .mf-footer{display:flex;gap:12px;justify-content:flex-end;padding:16px 24px;border-top:1px solid #e5e7eb;background:#f8fafc}
        .mf-footer .btn{padding:11px 20px;border-radius:8px;border:1px solid transparent;cursor:pointer;
          font-weight:600;font-size:14px;transition:all 0.2s ease}
        .mf-footer .btn-secondary{background:#fff;color:#475569;border:1px solid #cbd5e1}
        .mf-footer .btn-secondary:hover{background:#f1f5f9;border-color:#94a3b8}
        .mf-footer .btn-primary{background:#3b82f6;color:#fff}
        .mf-footer .btn-primary:hover{background:#2563eb;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.3)}
        .mf-footer .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

        /* Loading overlay */
        .mf-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,0.7);display:flex;
          align-items:center;justify-content:center;border-radius:12px;backdrop-filter:blur(2px)}
        .mf-spinner{width:40px;height:40px;border-radius:50%;border:4px solid #e5e7eb;
          border-top-color:#3b82f6;animation:spin 0.8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* Logo input styling - MÁS PEQUEÑO Y CENTRADO */
        .logo-container{display:flex;flex-direction:column;gap:10px;max-width:500px;margin:0 auto}
        .logo-display{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;
          border:2px dashed #cbd5e1;border-radius:8px;transition:all 0.2s ease;height:36px}
        .logo-display:hover{border-color:#3b82f6;background:#f0f9ff}
        .logo-display input[type="text"]{border:none;background:transparent;padding:0;height:auto;flex:1;font-size:13px}
        .logo-display input[type="text"]:focus{box-shadow:none}
        input[type="file"]{padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;
          cursor:pointer;background:#fff;transition:all 0.2s ease;height:36px}
        input[type="file"]:hover{border-color:#3b82f6;background:#f0f9ff}
        input[type="file"]::file-selector-button{padding:5px 12px;border:1px solid #cbd5e1;
          border-radius:6px;background:#f8fafc;color:#475569;cursor:pointer;font-weight:500;font-size:12px;
          margin-right:10px;transition:all 0.2s ease}
        input[type="file"]::file-selector-button:hover{background:#3b82f6;color:#fff;border-color:#3b82f6}

        /* Responsive tweaks */
        @media (max-width:600px){
          .mf-modal{width:calc(100vw - 24px);border-radius:10px}
          .mf-body{padding:16px}
          section{padding:16px}
          label.horizontal{grid-template-columns:1fr;gap:6px}
          .row{flex-direction:column;align-items:flex-start;gap:12px}
          .config-row{flex-direction:column;align-items:stretch;gap:12px}
        }
      `}</style>
      <style>{`
        /* Toggle switch - MEJORADO (para Estado) */
        .switch{position:relative;display:inline-block;width:50px;height:26px}
        .switch input{opacity:0;width:0;height:0}
        .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#cbd5e1;
          transition:.3s;border-radius:999px}
        .slider:before{position:absolute;content:"";height:20px;width:20px;left:3px;top:3px;
          background:white;transition:.3s;border-radius:50%;box-shadow:0 2px 6px rgba(2,6,23,0.15)}
        .switch input:checked + .slider{background:#10b981}
        .switch input:checked + .slider:before{transform:translateX(24px)}
      `}</style>
    </div>
  );
};

export default EmisorFormModal;
