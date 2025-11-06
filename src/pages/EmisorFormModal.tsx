import React from 'react';
import { emisoresApi } from '../services/emisoresApi';
import { Emisor } from '../types/emisor';
import { validateRucEcuador } from '../helpers/validateRuc';

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

  React.useEffect(() => {
    if (open) {
      setV(initialData ?? initial);
      setLogoFile(null);
      setEmailError(null);
      setLogoError(null);
      setLocalRucEditable(rucEditable ?? true);
    }
  }, [open]);

  const onChange = (k: keyof Emisor, value: any) => setV(prev => ({ ...prev, [k]: value }));

  // Validate RUC in real time
  React.useEffect(() => {
    if (!v.ruc || !v.ruc.toString().trim()) { setRucError(null); return; }
    if (!validateRucEcuador(v.ruc)) setRucError('RUC no válido según reglas del SRI');
    else setRucError(null);
  }, [v.ruc]);

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

  const submit = async () => {
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
    }
  };

  if (!open) return null;

  return (
    <div className="mf-backdrop" onClick={onClose}>
      <div className="mf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mf-header">
          <h2>Registro de nuevo emisor</h2>
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
            <label>Nombre comercial
              <input value={v.nombre_comercial || ''} onChange={e => onChange('nombre_comercial', e.target.value)} />
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
              <label><input type="checkbox" checked={v.obligado_contabilidad==='SI'} onChange={e=>onChange('obligado_contabilidad', e.target.checked?'SI':'NO')} /> Obligado a llevar contabilidad</label>
              <label><input type="checkbox" checked={v.contribuyente_especial==='SI'} onChange={e=>onChange('contribuyente_especial', e.target.checked?'SI':'NO')} /> Contribuyente Especial</label>
              <label><input type="checkbox" checked={v.agente_retencion==='SI'} onChange={e=>onChange('agente_retencion', e.target.checked?'SI':'NO')} /> Agente de retención</label>
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
          </section>

          <section>
            <h3>Datos de configuración</h3>
            <label>Correo Remitente
              <input value={v.correo_remitente || ''} onChange={e => onChange('correo_remitente', e.target.value)} />
              {emailError && <span className="err">{emailError}</span>}
            </label>
            <div className="row">
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

            <label>Logo
              <input type="text" readOnly value={logoFile?.name || ''} placeholder="logo.jpg" />
              <input type="file" accept=".jpg,.jpeg,.png" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
              {logoError && <span className="err">{logoError}</span>}
            </label>
          </section>
        </div>

        <div className="mf-footer">
          <button onClick={onClose} disabled={loading}>Cancelar</button>
          <button onClick={submit} disabled={loading || !isFormValid()}>{props.editingId ? 'Guardar cambios' : 'Registrar'}</button>
        </div>
      </div>

      <style>{`
        .mf-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:1000}
        .mf-modal{width:min(880px,92vw);max-height:86vh;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
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
      `}</style>
    </div>
  );
};

export default EmisorFormModal;
