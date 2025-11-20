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
  const [logoOption, setLogoOption] = React.useState<'custom' | 'default' | 'none'>('none');
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
      setLogoOption('none');
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
    // Si eligió logo personalizado, debe subir un archivo
    if (logoOption === 'custom' && !logoFile) e.logo = 'Debes subir un archivo para logo personalizado';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const isFormValid = () => {
    if (!v.codigo || !v.codigo.trim()) return false;
    if (!v.nombre || !v.nombre.trim()) return false;
    if (!v.direccion || !v.direccion.trim()) return false;
    if (v.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)) return false;
    if (codeDuplicateError || checkingCode) return false;
    // Si eligió logo personalizado, debe haber archivo
    if (logoOption === 'custom' && !logoFile) return false;
    // Validar formato del archivo si hay uno
    if (logoOption === 'custom' && logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return false;
    return true;
  };

  const doSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let finalLogoFile = logoFile;

      // Si eligió logo por defecto, cargarlo y optimizarlo
      if (logoOption === 'default') {
        try {
          const response = await fetch('/maximofactura.png');
          const blob = await response.blob();
          
          // Optimizar la imagen (redimensionar y comprimir)
          const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Redimensionar si es muy grande
              const maxWidth = 800;
              let width = img.width;
              let height = img.height;
              
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              
              canvas.toBlob(
                (optimizedBlob) => {
                  if (optimizedBlob) resolve(optimizedBlob);
                  else reject(new Error('No se pudo optimizar'));
                },
                'image/jpeg',
                0.8 // 80% calidad
              );
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
          });

          finalLogoFile = new File([optimizedBlob], 'maximofactura.png', { type: 'image/jpeg' });
        } catch (err) {
          console.error('Error cargando logo por defecto:', err);
          alert('No se pudo cargar el logo por defecto');
          setLoading(false);
          return;
        }
      }

      // Si eligió 'none', finalLogoFile queda null
      if (logoOption === 'none') {
        finalLogoFile = null;
      }

      if (editingEst && editingEst.id) {
        const res = await establecimientosApi.update(companyId, editingEst.id, { ...v, logoFile: finalLogoFile });
        const updated: Establecimiento = res.data?.data ?? res.data;
        onUpdated && onUpdated(updated);
      } else {
        const res = await establecimientosApi.create(companyId, { ...v, logoFile: finalLogoFile });
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
      <div className="mf-modal" style={{ width: 'min(780px, 92vw)' }}>
        <div className="mf-header">
          <h2>{editingEst ? 'Editar establecimiento' : 'Registro de nuevo establecimiento'}</h2>
        </div>

        <div className="mf-body scrollable">
          <section>
            {/* Top row: Código y Estado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              <label className="horizontal" style={{ flex: 1, maxWidth: '450px', margin: 0 }}>Código
                <input 
                  className={(touched.has('codigo') && (isMissing('codigo') || !!fieldErrors.codigo)) ? 'error-input' : ''} 
                  value={v.codigo || ''}
                  onBlur={()=>markTouched('codigo')}
                  onChange={e=>onChange('codigo', e.target.value)}
                  disabled={!!(editingEst && !localCodigoEditable)}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Estado</div>
                  <div style={{ fontSize: 12, marginTop: 2, color: v.estado === 'ABIERTO' ? '#059669' : '#64748b' }}>
                    {v.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
                  </div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={v.estado === 'ABIERTO'} onChange={(e)=>onChange('estado', e.target.checked ? 'ABIERTO' : 'CERRADO')} />
                  <span className="slider" />
                </label>
              </div>
            </div>

            {editingEst && !localCodigoEditable && <small style={{color:'#64748b', marginLeft: '192px', display: 'block', marginTop: -8}}>El código no puede ser modificado porque existen comprobantes autorizados.</small>}
            {checkingCode && <small style={{marginLeft: '192px', display: 'block', marginTop: -8}}>Verificando código…</small>}
            {touched.has('codigo') && fieldErrors.codigo && <span className="err" style={{marginLeft: '192px', display: 'block', marginTop: -8}}>{fieldErrors.codigo}</span>}

            <label className="horizontal">Nombre
              <input value={v.nombre || ''} onBlur={()=>markTouched('nombre')} onChange={e=>onChange('nombre', e.target.value)} className={touched.has('nombre') && isMissing('nombre') ? 'error-input' : ''} />
            </label>
            {touched.has('nombre') && fieldErrors.nombre && <span className="err" style={{marginLeft: '192px'}}>{fieldErrors.nombre}</span>}

            <label className="horizontal">Nombre Comercial
              <input value={v.nombre_comercial || ''} onChange={e=>onChange('nombre_comercial', e.target.value)} />
            </label>

            <label className="horizontal">Dirección
              <input value={v.direccion || ''} onBlur={()=>markTouched('direccion')} onChange={e=>onChange('direccion', e.target.value)} className={touched.has('direccion') && isMissing('direccion') ? 'error-input' : ''} />
            </label>
            {touched.has('direccion') && fieldErrors.direccion && <span className="err" style={{marginLeft: '192px'}}>{fieldErrors.direccion}</span>}

            <label className="horizontal">Correo
              <input value={v.correo || ''} onBlur={()=>markTouched('correo')} onChange={e=>onChange('correo', e.target.value)} className={touched.has('correo') && fieldErrors.correo ? 'error-input' : ''} />
            </label>
            {touched.has('correo') && fieldErrors.correo && <span className="err" style={{marginLeft: '192px'}}>{fieldErrors.correo}</span>}

            <label className="horizontal">Número de teléfono
              <input value={v.telefono || ''} onChange={e=>onChange('telefono', e.target.value)} />
            </label>

            <label className="horizontal" style={{marginTop: 24}}>
              <span style={{fontWeight: 600, fontSize: '14px', color: '#374151'}}>Logo</span>
              <select 
                value={logoOption} 
                onChange={(e) => {
                  setLogoOption(e.target.value as 'custom' | 'default' | 'none');
                  setLogoFile(null);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '14px',
                  color: '#374151',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <option value="none">🚫 Sin logo</option>
                <option value="default">🏢 Logo por defecto (Máximo Facturas)</option>
                <option value="custom">📁 Logo personalizado</option>
              </select>
            </label>

              {/* Área de carga de archivo (solo visible cuando logoOption === 'custom') */}
              {logoOption === 'custom' && (
                <>
                  <div style={{
                    position: 'relative',
                    border: '2px dashed #c7d2fe',
                    borderRadius: '10px',
                    padding: '20px 16px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #faf5ff 0%, #f3f4f6 100%)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#7c3aed';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#c7d2fe';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #faf5ff 0%, #f3f4f6 100%)';
                  }}
                  >
                    {!logoFile ? (
                      <>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          color: '#fff',
                          boxShadow: '0 3px 8px rgba(124, 58, 237, 0.3)'
                        }}>
                          📁
                        </div>
                        <div style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>
                          Click para seleccionar archivo
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          color: '#fff',
                          boxShadow: '0 3px 8px rgba(16, 185, 129, 0.3)'
                        }}>
                          ✓
                        </div>
                        <div style={{fontSize: '13px', fontWeight: 700, color: '#059669'}}>
                          {logoFile.name}
                        </div>
                        <div style={{fontSize: '11px', color: '#7c3aed', fontWeight: 600}}>
                          Click para cambiar
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                      onChange={e=>setLogoFile(e.target.files?.[0] || null)} 
                    />
                  </div>

                  <div style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    📎 JPG, JPEG, PNG • 📐 Horizontal (ancho &gt; alto)
                  </div>
                </>
              )}

            <label style={{ marginTop: 16 }}>Actividades economicas
              <textarea value={v.actividades_economicas || ''} onChange={e=>onChange('actividades_economicas', e.target.value)} rows={3} />
            </label>

            <div className="date-row">
              <label>
                <span>Fecha inicio de actividades</span>
                <input type="date" value={v.fecha_inicio_actividades||''} onChange={e=>onChange('fecha_inicio_actividades', e.target.value)} />
              </label>
              <label>
                <span>Fecha reinicio de actividades</span>
                <input type="date" value={v.fecha_reinicio_actividades||''} onChange={e=>onChange('fecha_reinicio_actividades', e.target.value)} />
              </label>
            </div>

            <label className="horizontal" style={{ maxWidth: '500px', margin: '12px auto' }}>Fecha cierre de establecimiento
              <input type="date" value={v.fecha_cierre_establecimiento||''} onChange={e=>onChange('fecha_cierre_establecimiento', e.target.value)} />
            </label>
          </section>
        </div>

        <div className="mf-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !isFormValid()}>{editingEst ? 'Guardar' : 'Registrar'}</button>
        </div>

        {loading && (
          <div className="mf-loading-overlay" aria-hidden>
            <div className="mf-spinner" />
          </div>
        )}

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
          
          /* Form fields - VERTICAL layout (default) */
          label{display:flex;flex-direction:column;gap:8px;margin:12px 0;font-weight:500;color:#475569}
          label span{font-weight:500;color:#475569}
          input:not([type="radio"]):not([type="checkbox"]):not([type="file"]),select,textarea{
            height:40px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;width:100%;
            box-sizing:border-box;font-size:14px;background:#fff;transition:all 0.2s ease
          }
          textarea{height:auto;min-height:70px;resize:vertical}
          input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):focus,select:focus,textarea:focus{
            outline:none;box-shadow:0 0 0 3px rgba(59,130,246,0.1);border-color:#3b82f6
          }

          /* Date row - 2 columns */
          .date-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}

          /* Logo input styling - CENTRADO Y MÁS PEQUEÑO */
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

          /* Toggle switch - MEJORADO */
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
          .required{color:#dc2626;margin-left:4px;font-weight:700}
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

          /* Responsive tweaks */
          @media (max-width:600px){
            .mf-modal{width:calc(100vw - 24px);border-radius:10px}
            .mf-body{padding:16px}
            section{padding:16px}
            label.horizontal{grid-template-columns:1fr;gap:6px}
            .date-row{grid-template-columns:1fr}
          }
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
