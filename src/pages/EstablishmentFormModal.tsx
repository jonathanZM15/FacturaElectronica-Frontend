import React from 'react';
import { establecimientosApi } from '../services/establecimientosApi';
import { Establecimiento } from '../types/establecimiento';

type Props = {
  open: boolean;
  onClose: () => void;
  companyId: number | string;
  onCreated?: (e: Establecimiento) => void;
  editingEst?: Establecimiento | null;
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

const EstablishmentFormModal: React.FC<Props> = ({ open, onClose, companyId, onCreated, editingEst, onUpdated }) => {
  const [v, setV] = React.useState<Establecimiento>(initial);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string,string>>({});
  const [checkingCode, setCheckingCode] = React.useState(false);
  const [codeDuplicateError, setCodeDuplicateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (editingEst) {
        setV({ ...initial, ...editingEst });
      } else {
        setV(initial);
      }
      setLogoFile(null);
      setFieldErrors({});
      setCodeDuplicateError(null);
    }
  }, [open, editingEst]);

  const onChange = (k: keyof Establecimiento, value: any) => {
    setV(prev => ({ ...prev, [k]: value }));
    setFieldErrors(prev => { const copy = { ...prev }; delete copy[k as string]; return copy; });
    if (k === 'codigo') setCodeDuplicateError(null);
  };

  // check code uniqueness (debounce)
  React.useEffect(() => {
    if (!v.codigo || !v.codigo.trim()) return;
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
  }, [v.codigo, companyId]);

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

  const submit = async () => {
    if (!validate()) return;
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
    }
  };

  if (!open) return null;

  return (
    <div className="mf-backdrop" onClick={onClose}>
      <div className="mf-modal" onClick={(e)=>e.stopPropagation()} style={{ width: 'min(720px, 92vw)' }}>
  <div className="mf-header"><h2>{editingEst ? 'Editar establecimiento' : 'Registro de nuevo establecimiento'}</h2></div>
        <div className="mf-body scrollable">
          {/* Top row: compact Código on left, Estado switch on right */}
          <div className="top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: 6 }}>Código {isMissing('codigo') && <span className="required">*</span>}</label>
              <input className={isMissing('codigo') || !!fieldErrors.codigo ? 'error-input codigo-input' : 'codigo-input'} value={v.codigo || ''} onChange={e=>onChange('codigo', e.target.value)} />
              {checkingCode && <small>Verificando código…</small>}
              {fieldErrors.codigo && <span className="err">{fieldErrors.codigo}</span>}
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

          <label>Nombre {isMissing('nombre') && <span className="required">*</span>}
            <input value={v.nombre || ''} onChange={e=>onChange('nombre', e.target.value)} className={isMissing('nombre') ? 'error-input' : ''} />
            {fieldErrors.nombre && <span className="err">{fieldErrors.nombre}</span>}
          </label>

          <label>Nombre Comercial
            <input value={v.nombre_comercial || ''} onChange={e=>onChange('nombre_comercial', e.target.value)} />
          </label>

          <label>Dirección {isMissing('direccion') && <span className="required">*</span>}
            <input value={v.direccion || ''} onChange={e=>onChange('direccion', e.target.value)} className={isMissing('direccion') ? 'error-input' : ''} />
            {fieldErrors.direccion && <span className="err">{fieldErrors.direccion}</span>}
          </label>

          <label>Correo
            <input value={v.correo || ''} onChange={e=>onChange('correo', e.target.value)} className={fieldErrors.correo ? 'error-input' : ''} />
            {fieldErrors.correo && <span className="err">{fieldErrors.correo}</span>}
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
          <button className="btn btn-secondary" onClick={onClose}>CANCELAR</button>
          <button className="btn btn-primary" onClick={submit}>{editingEst ? 'GUARDAR' : 'REGISTRAR'}</button>
        </div>

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
          .mf-footer button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#1e3a8a;color:#fff;transition:all .12s ease}
          .mf-footer button:first-child{background:#fff;color:#0f172a;border-color:#cbd5e1}
          .mf-footer button:hover{transform:translateY(-3px);box-shadow:0 6px 14px rgba(16,24,40,0.08)}
        `}</style>
      </div>
    </div>
  );
};

export default EstablishmentFormModal;
