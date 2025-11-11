import React from 'react';
import { establecimientosApi } from '../services/establecimientosApi';
import { Establecimiento } from '../types/establecimiento';
import ConfirmDialog from './ConfirmDialog';

type Props = {
  open: boolean;
  onClose: () => void;
  companyId: number | string;
  onCreated?: (e: Establecimiento) => void;
  editingEst?: Establecimiento | null;
  codigoEditable?: boolean;
  onUpdated?: (e: Establecimiento) => void;
};

const initial: Establecimiento = {
  codigo: '',
  estado: 'ABIERTO',
  nombre: '',
  nombre_comercial: '',
  direccion: '',
  correo: '',
  telefono: '',
};

const EstablishmentFormModal: React.FC<Props> = ({ open, onClose, companyId, onCreated, editingEst, codigoEditable, onUpdated }) => {
  const [v, setV] = React.useState<Establecimiento>(initial);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string,string>>({});
  const [touched, setTouched] = React.useState<Set<string>>(new Set());
  const [checkingCode, setCheckingCode] = React.useState(false);
  const [codeDuplicateError, setCodeDuplicateError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [localCodigoEditable, setLocalCodigoEditable] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (open) {
      if (editingEst) {
        setV({ ...initial, ...editingEst });
        setLocalCodigoEditable(codigoEditable ?? true);
      } else {
        setV(initial);
        setLocalCodigoEditable(true);
      }
      setLogoFile(null);
      setFieldErrors({});
      setCodeDuplicateError(null);
    }
  }, [open, editingEst, codigoEditable]);

  const onChange = (k: keyof Establecimiento, value: any) => {
    setV(prev => ({ ...prev, [k]: value }));
    const ks = k as string;
    setFieldErrors(prev => { 
      if (!prev || !(ks in prev)) return prev;
      const copy = { ...prev }; 
      delete copy[ks]; 
      return copy; 
    });
    if (k === 'codigo') setCodeDuplicateError(null);
  };

  const markTouched = (k: keyof Establecimiento) => {
    setTouched(prev => {
      const n = new Set(prev);
      n.add(k as string);
      return n;
    });
  };

  // Check code uniqueness (debounce) - solo si estamos creando o si el código cambió
  React.useEffect(() => {
    if (!v.codigo || !v.codigo.trim()) {
      setCodeDuplicateError(null);
      return;
    }
    
    // Si estamos editando y el código no cambió, no verificar
    if (editingEst && v.codigo === editingEst.codigo) {
      setCodeDuplicateError(null);
      return;
    }

    const t = setTimeout(async () => {
      setCheckingCode(true);
      try {
        const res = await establecimientosApi.checkCode(companyId, v.codigo);
        if (res.data?.exists) setCodeDuplicateError('Código ya registrado para este emisor');
        else setCodeDuplicateError(null);
      } catch (e) {
        setCodeDuplicateError(null);
      } finally { setCheckingCode(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [v.codigo, companyId, editingEst]);

  const isMissing = (key: string) => {
    switch (key) {
      case 'codigo': return !(v.codigo && v.codigo.trim());
      case 'nombre': return !(v.nombre && v.nombre.trim());
      case 'direccion': return !(v.direccion && v.direccion.trim());
      default: return false;
    }
  };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!v.codigo || !v.codigo.trim()) e.codigo = 'Código es obligatorio';
    if (!v.nombre || !v.nombre.trim()) e.nombre = 'Nombre es obligatorio';
    if (!v.direccion || !v.direccion.trim()) e.direccion = 'Dirección es obligatoria';
    if (v.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)) e.correo = 'Correo inválido';
    if (codeDuplicateError) e.codigo = codeDuplicateError;
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const isFormValid = () => {
    if (!v.codigo || !v.codigo.trim()) return false;
    if (!v.nombre || !v.nombre.trim()) return false;
    if (!v.direccion || !v.direccion.trim()) return false;
    if (v.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)) return false;
    if (codeDuplicateError || checkingCode) return false;
    if (logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return false;
    return true;
  };

  const doSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (editingEst && editingEst.id) {
        const res = await establecimientosApi.update(companyId, editingEst.id, { ...v, logoFile });
        const updated: Establecimiento = res.data?.data ?? res.data;
        onUpdated && onUpdated(updated);
      } else {
        const res = await establecimientosApi.create(companyId, { ...v, logoFile });
        const created: Establecimiento = res.data?.data ?? res.data;
        onCreated && onCreated(created);
      }
      onClose();
    } catch (err: any) {
      const apiMsg = err?.response?.data;
      if (apiMsg?.errors) setFieldErrors(Object.fromEntries(Object.entries(apiMsg.errors).map(([k,v])=>[k, (v as string[])[0]])));
      else alert(apiMsg?.message || 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const submit = () => {
    if (!validate()) return;
    if (editingEst) {
      // Pedir confirmación al editar
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const requiredKeys = React.useMemo(() => new Set<string>([
    'codigo','nombre','direccion','estado'
  ]), []);

  if (!open) return null;

  return (
    <div className="mf-backdrop">
      <div className="mf-modal" style={{ width: 'min(720px, 92vw)' }}>
        <div className="mf-header">
          <h2>{editingEst ? 'Editar establecimiento' : 'Registro de nuevo establecimiento'}</h2>
        </div>

        <div className="mf-body scrollable">
          {/* Top row: compact Código on left, Estado switch on right */}
          <div className="top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: 6 }}>Código {requiredKeys.has('codigo') && <span className="required">*</span>}</label>
              <input 
                className={(touched.has('codigo') && (isMissing('codigo') || !!fieldErrors.codigo)) ? 'error-input codigo-input' : 'codigo-input'} 
                value={v.codigo || ''}
                onBlur={()=>markTouched('codigo')}
                onChange={e=>onChange('codigo', e.target.value)}
                disabled={!!(editingEst && !localCodigoEditable)}
              />
              {editingEst && !localCodigoEditable && <small style={{color:'#666'}}>El código no puede ser modificado porque existen comprobantes autorizados.</small>}
              {checkingCode && <small>Verificando código…</small>}
              {touched.has('codigo') && fieldErrors.codigo && <span className="err">{fieldErrors.codigo}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right', marginRight: 6 }}>
                <div style={{ fontWeight: 700 }}>Estado</div>
                <div style={{ fontSize: 12, marginTop: 4, color: v.estado === 'ABIERTO' ? '#059669' : '#6b7280' }}>{v.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}</div>
              </div>
              <label className="switch" style={{ marginTop: 6 }}>
                <input type="checkbox" checked={v.estado === 'ABIERTO'} onChange={(e)=>onChange('estado', e.target.checked ? 'ABIERTO' : 'CERRADO')} />
                <span className="slider" />
              </label>
            </div>
          </div>

          <label>Nombre {requiredKeys.has('nombre') && <span className="required">*</span>}
            <input value={v.nombre || ''} onBlur={()=>markTouched('nombre')} onChange={e=>onChange('nombre', e.target.value)} className={touched.has('nombre') && isMissing('nombre') ? 'error-input' : ''} />
            {touched.has('nombre') && fieldErrors.nombre && <span className="err">{fieldErrors.nombre}</span>}
          </label>

          <label>Nombre Comercial
            <input value={v.nombre_comercial || ''} onChange={e=>onChange('nombre_comercial', e.target.value)} />
          </label>

          <label>Dirección {requiredKeys.has('direccion') && <span className="required">*</span>}
            <input value={v.direccion || ''} onBlur={()=>markTouched('direccion')} onChange={e=>onChange('direccion', e.target.value)} className={touched.has('direccion') && isMissing('direccion') ? 'error-input' : ''} />
            {touched.has('direccion') && fieldErrors.direccion && <span className="err">{fieldErrors.direccion}</span>}
          </label>

          <label>Correo
            <input value={v.correo || ''} onBlur={()=>markTouched('correo')} onChange={e=>onChange('correo', e.target.value)} className={touched.has('correo') && fieldErrors.correo ? 'error-input' : ''} />
            {touched.has('correo') && fieldErrors.correo && <span className="err">{fieldErrors.correo}</span>}
          </label>

          <label>Número de teléfono
            <input value={v.telefono || ''} onChange={e=>onChange('telefono', e.target.value)} />
          </label>

          <label>Logo
            <input type="text" readOnly value={logoFile?.name || ''} placeholder="logo.jpg" />
            <input type="file" accept=".jpg,.jpeg,.png" onChange={e=>setLogoFile(e.target.files?.[0] || null)} />
          </label>

          <label>Actividades economicas
            <textarea value={v.actividades_economicas || ''} onChange={e=>onChange('actividades_economicas', e.target.value)} />
          </label>

          <div className="row">
            <label>Fecha inicio de actividades
              <input type="date" value={v.fecha_inicio_actividades||''} onChange={e=>onChange('fecha_inicio_actividades', e.target.value)} />
            </label>
            <label>Fecha reinicio de actividades
              <input type="date" value={v.fecha_reinicio_actividades||''} onChange={e=>onChange('fecha_reinicio_actividades', e.target.value)} />
            </label>
            <label>Fecha cierre de establecimiento
              <input type="date" value={v.fecha_cierre_establecimiento||''} onChange={e=>onChange('fecha_cierre_establecimiento', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="mf-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>CANCELAR</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !isFormValid()}>{editingEst ? 'GUARDAR' : 'REGISTRAR'}</button>
        </div>

        {loading && (
          <div className="mf-loading-overlay" aria-hidden>
            <div className="mf-spinner" />
          </div>
        )}

        <style>{`
          .mf-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:1000}
          .mf-modal{position:relative;width:min(720px,92vw);max-height:86vh;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
          .mf-header{padding:16px 20px;border-bottom:1px solid #eceff4}
          .mf-body{padding:16px 20px}
          .scrollable{overflow-y:auto}
          label{display:block;margin:8px 0}
          input,select,textarea{padding:8px 10px;border:1px solid #d0d7e2;border-radius:6px;width:100%;max-width:100%}
          .row{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
          .err{color:#c53030;margin-left:8px;font-size:12px}
          .required{color:#c53030;margin-left:6px;font-weight:600}
          .error-input{border-color:#c53030;background:#fff6f6}
          /* compact codigo input */
          .codigo-input{ width:160px; padding:8px 10px }

          /* toggle switch */
          .switch { position: relative; display: inline-block; width:44px; height:24px }
          .switch input{ opacity:0; width:0; height:0 }
          .slider{ position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#e5e7eb; transition:.2s; border-radius:999px }
          .slider:before{ position:absolute; content:""; height:18px; width:18px; left:3px; top:3px; background:white; transition:.2s; border-radius:50%; box-shadow:0 2px 6px rgba(2,6,23,0.2) }
          .switch input:checked + .slider{ background:#34d399 }
          .switch input:checked + .slider:before{ transform: translateX(20px) }
          .mf-footer{display:flex;gap:12px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #eceff4}
          .mf-footer button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#1e3a8a;color:#fff;transition:all .12s ease;cursor:pointer}
          .mf-footer button:first-child{background:#fff;color:#0f172a;border-color:#cbd5e1}
          .mf-footer button:hover{transform:translateY(-3px);box-shadow:0 6px 14px rgba(16,24,40,0.08)}
          .mf-footer button:active{transform:translateY(-1px);opacity:.95}
          .mf-footer button.btn-primary:hover{background:#15306b}
          .mf-footer button.btn-primary:active{background:#122a5f}
          .mf-footer button.btn-secondary:hover{background:#f3f4f6}
          .mf-footer button.btn-secondary:active{background:#e6e9ef}
          .mf-footer button:disabled{opacity:0.6;cursor:not-allowed;transform:none}
          .mf-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;border-radius:12px}
          .mf-spinner{width:48px;height:48px;border-radius:50%;border:6px solid rgba(0,0,0,0.08);border-top-color:#1e3a8a;animation:spin 1s linear infinite}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Guardar cambios"
        message="¿Desea guardar los cambios del establecimiento?"
        cancelText="CANCELAR"
        confirmText="CONFIRMAR"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => doSubmit()}
        modalStyle={{ width: 'min(520px, 86vw)' }}
      />
    </div>
  );
};

export default EstablishmentFormModal;
