import React from 'react';
import { establecimientosApi } from '../../services/establecimientosApi';
import { Establecimiento } from '../../types/establecimiento';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

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
  const [logoChangeEnabled, setLogoChangeEnabled] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string,string>>({});
  const [touched, setTouched] = React.useState<Set<string>>(new Set());
  const [checkingCode, setCheckingCode] = React.useState(false);
  const [codeDuplicateError, setCodeDuplicateError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [localCodigoEditable, setLocalCodigoEditable] = React.useState<boolean>(true);

  const hasExistingLogo = React.useMemo(() => {
    if (!editingEst) return false;
    const anyEst = editingEst as any;
    return !!(anyEst?.logo_url || anyEst?.logo || editingEst.logo_path);
  }, [editingEst]);

  const canEditLogo = !editingEst || !hasExistingLogo || logoChangeEnabled;

  const applyLogoChangeEnabled = React.useCallback((checked: boolean) => {
    setLogoChangeEnabled(checked);
    setLogoFile(null);
    setLogoOption(checked ? 'custom' : 'none');
    setFieldErrors((prev) => {
      const next = { ...(prev || {}) };
      delete next.logo;
      return next;
    });
  }, []);

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
      // Si el establecimiento ya tiene logo, NO permitir cambios hasta que el usuario lo habilite.
      // Evita que al editar un campo de texto se borre el logo por defecto.
      const editingHasLogo = !!(
        editingEst && ((editingEst as any)?.logo_url || (editingEst as any)?.logo || editingEst.logo_path)
      );
      setLogoChangeEnabled(!editingHasLogo);
      setFieldErrors({});
      setTouched(new Set());
      setCodeDuplicateError(null);
    }
  }, [open, editingEst, codigoEditable]);

  const todayIsoDate = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const getMinTodayDateError = React.useCallback((raw: string | undefined | null): string | undefined => {
    const datePart = String(raw ?? '').trim().slice(0, 10);
    if (!datePart) return undefined; // opcional
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return undefined;
    if (datePart < todayIsoDate) return 'La fecha debe ser igual o posterior a hoy';
    return undefined;
  }, [todayIsoDate]);

  const getCorreoError = (correoValue: string | undefined | null): string | undefined => {
    const value = (correoValue ?? '').trim();
    if (!value) return undefined; // opcional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'El formato del correo es inválido';
    return undefined;
  };

  const onChange = (k: keyof Establecimiento, value: any) => {
    // Special handling for codigo: only numbers, max 3 digits
    if (k === 'codigo') {
      value = value.replace(/[^0-9]/g, '').slice(0, 3);
    }
    // Special handling for telefono: only numbers, max 10
    if (k === 'telefono') {
      value = value.replace(/[^0-9]/g, '').slice(0, 10);
    }

    // Para campos con validación de formato, marcar como tocado al primer cambio
    if (k === 'correo' || k === 'fecha_inicio_actividades' || k === 'fecha_reinicio_actividades' || k === 'fecha_cierre_establecimiento') {
      setTouched(prev => {
        const key = k as string;
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    }

    setV(prev => ({ ...prev, [k]: value }));
    const ks = k as string;

    // Mantener errores del campo en sincronía (especialmente útil si el botón está deshabilitado)
    setFieldErrors(prev => {
      const next = { ...(prev || {}) };
      // Por defecto, al escribir se limpia el error del campo
      if (ks in next) delete next[ks];

      // Validación inmediata en campos con formato
      if (k === 'correo') {
        const correoErr = getCorreoError(value);
        if (correoErr) next.correo = correoErr;
        else if ('correo' in next) delete next.correo;
      }

      if (k === 'fecha_inicio_actividades' || k === 'fecha_reinicio_actividades' || k === 'fecha_cierre_establecimiento') {
        const dateErr = getMinTodayDateError(value);
        if (dateErr) next[ks] = dateErr;
        else if (ks in next) delete next[ks];
      }

      return next;
    });
    if (k === 'codigo') setCodeDuplicateError(null);
  };

  const onCodigoBlur = () => {
    markTouched('codigo');
    // Auto-pad with zeros when leaving the field
    if (v.codigo && v.codigo.length > 0 && v.codigo.length < 3) {
      setV(prev => ({ ...prev, codigo: prev.codigo!.padStart(3, '0') }));
    }
  };

  const markTouched = (k: keyof Establecimiento | 'logo') => {
    setTouched(prev => {
      const n = new Set(prev);
      n.add(k as string);
      return n;
    });
  };

  const touchAll = () => {
    setTouched(prev => {
      const n = new Set(prev);
      (
        [
          'codigo',
          'estado',
          'nombre',
          'nombre_comercial',
          'direccion',
          'correo',
          'telefono',
          'actividades_economicas',
          'fecha_inicio_actividades',
          'fecha_reinicio_actividades',
          'fecha_cierre_establecimiento',
          'logo'
        ] as const
      ).forEach(k => n.add(k));
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
    else if (v.codigo.length !== 3) e.codigo = 'Código debe tener 3 dígitos';
    else if (v.codigo === '000') e.codigo = 'El código no puede ser "000"';
    if (!v.nombre || !v.nombre.trim()) e.nombre = 'Nombre es obligatorio';
    if (!v.direccion || !v.direccion.trim()) e.direccion = 'Dirección es obligatoria';
    if (!v.estado) e.estado = 'Estado es obligatorio';
    const correoErr = getCorreoError(v.correo);
    if (correoErr) e.correo = correoErr;
    if (v.telefono && !/^\d+$/.test(v.telefono)) e.telefono = 'Teléfono debe contener solo números';
    if (v.telefono && v.telefono.length > 10) e.telefono = 'Teléfono máximo 10 dígitos';
    if (codeDuplicateError) e.codigo = codeDuplicateError;

    const inicioErr = getMinTodayDateError(v.fecha_inicio_actividades);
    if (inicioErr) e.fecha_inicio_actividades = inicioErr;
    const reinicioErr = getMinTodayDateError(v.fecha_reinicio_actividades);
    if (reinicioErr) e.fecha_reinicio_actividades = reinicioErr;
    const cierreErr = getMinTodayDateError(v.fecha_cierre_establecimiento);
    if (cierreErr) e.fecha_cierre_establecimiento = cierreErr;

    // Si habilitó el cambio de logo y eligió logo propio, debe subir un archivo
    if (canEditLogo) {
      if (logoOption === 'custom' && !logoFile) e.logo = 'Debes subir un archivo para logo propio';
      if (logoOption === 'custom' && logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) e.logo = 'El logo debe ser JPG, JPEG o PNG';
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const isFormValid = () => {
    if (!v.codigo || !v.codigo.trim() || v.codigo.length !== 3 || v.codigo === '000') return false;
    if (!v.nombre || !v.nombre.trim()) return false;
    if (!v.direccion || !v.direccion.trim()) return false;
    if (!v.estado) return false;
    if (getCorreoError(v.correo)) return false;
    if (v.telefono && (!/^\d+$/.test(v.telefono) || v.telefono.length > 10)) return false;
    if (codeDuplicateError || checkingCode) return false;
    if (getMinTodayDateError(v.fecha_inicio_actividades)) return false;
    if (getMinTodayDateError(v.fecha_reinicio_actividades)) return false;
    if (getMinTodayDateError(v.fecha_cierre_establecimiento)) return false;
    if (canEditLogo) {
      // Si eligió logo propio, debe haber archivo
      if (logoOption === 'custom' && !logoFile) return false;
      // Validar formato del archivo si hay uno
      if (logoOption === 'custom' && logoFile && !/\.jpe?g$|\.png$/i.test(logoFile.name)) return false;
    }
    return true;
  };

  const doSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let finalLogoFile: File | null = null;

      // Solo aplicar cambios de logo si el usuario lo habilitó (cuando ya existía uno)
      // o si estamos creando / editando un establecimiento sin logo previo.
      const shouldApplyLogoChange = canEditLogo;

      let removeLogoFlag = false;

      if (shouldApplyLogoChange) {
        // Determinar qué logo usar según la opción seleccionada
        if (logoOption === 'custom') {
          // Usar el archivo que subió el usuario
          finalLogoFile = logoFile;
        } else if (logoOption === 'default') {
          // Cargar y optimizar el logo del sistema
          try {
            const response = await fetch('/maximofactura.png');
            const blob = await response.blob();
            
            // Optimizar la imagen (redimensionar y comprimir) manteniendo PNG para transparencia
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
                
                // Fondo transparente para PNG
                if (ctx) {
                  ctx.clearRect(0, 0, width, height);
                  ctx.drawImage(img, 0, 0, width, height);
                }
                
                canvas.toBlob(
                  (optimizedBlob) => {
                    if (optimizedBlob) resolve(optimizedBlob);
                    else reject(new Error('No se pudo optimizar'));
                  },
                  'image/png', // PNG mantiene transparencia
                  0.9 // 90% calidad para PNG
                );
              };
              img.onerror = reject;
              img.src = URL.createObjectURL(blob);
            });

            finalLogoFile = new File([optimizedBlob], 'maximofactura.png', { type: 'image/png' });
          } catch (err) {
            console.error('Error cargando logo del sistema:', err);
            alert('No se pudo cargar el logo del sistema');
            setLoading(false);
            return;
          }
        } else if (logoOption === 'none') {
          // Sin logo
          finalLogoFile = null;
          removeLogoFlag = true;
        }
      }

      if (editingEst && editingEst.id) {
        const payload: any = { ...v };
        if (shouldApplyLogoChange) {
          if (finalLogoFile) payload.logoFile = finalLogoFile;
          if (removeLogoFlag) payload.remove_logo = true;
        }
        const res = await establecimientosApi.update(companyId, editingEst.id, payload);
        const updated: Establecimiento = res.data?.data ?? res.data;
        onUpdated && onUpdated(updated);
      } else {
        const payload: any = { ...v };
        if (finalLogoFile) payload.logoFile = finalLogoFile;
        if (removeLogoFlag) payload.remove_logo = true;
        const res = await establecimientosApi.create(companyId, payload);
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
    // Si el usuario no salió del input, el error no se mostrará sin marcar campos como tocados.
    // Además, cuando el botón esté deshabilitado por formato inválido, esto permite que el error se muestre tras intentar enviar.
    touchAll();
    if (!validate()) return;
    if (editingEst) {
      // Pedir confirmación al editar
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

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
              <label className="horizontal" style={{ flex: 1, maxWidth: '450px', margin: 0 }}>
                <span>Código <span style={{color:'#dc2626'}}>*</span></span>
                <input 
                  className={(touched.has('codigo') && (isMissing('codigo') || !!fieldErrors.codigo)) ? 'error-input' : ''} 
                  value={v.codigo || ''}
                  onBlur={onCodigoBlur}
                  onChange={e=>onChange('codigo', e.target.value)}
                  disabled={!!(editingEst && !localCodigoEditable)}
                  placeholder="Ej: 001"
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Estado <span style={{color:'#dc2626'}}>*</span></div>
                  <div style={{ fontSize: 12, marginTop: 2, color: v.estado === 'ABIERTO' ? '#059669' : '#64748b' }}>
                    {v.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
                  </div>
                  {touched.has('estado') && fieldErrors.estado && <span className="err" style={{fontSize: 11, marginTop: 2}}>{fieldErrors.estado}</span>}
                </div>
                <label className="switch">
                  <input type="checkbox" checked={v.estado === 'ABIERTO'} onChange={(e)=>onChange('estado', e.target.checked ? 'ABIERTO' : 'CERRADO')} onBlur={()=>markTouched('estado')} />
                  <span className="slider" />
                </label>
              </div>
            </div>

            {editingEst && !localCodigoEditable && <small style={{color:'#64748b', marginLeft: '192px', display: 'block', marginTop: -8}}>El código no puede ser modificado porque existen comprobantes autorizados.</small>}
            {checkingCode && <small style={{marginLeft: '192px', display: 'block', marginTop: -8}}>Verificando código…</small>}
            {v.codigo === '000' && touched.has('codigo') && <span className="err" style={{marginLeft: '192px', display: 'block', marginTop: -8}}>El código no puede ser "000"</span>}
            {codeDuplicateError && <span className="err" style={{marginLeft: '192px', display: 'block', marginTop: -8}}>{codeDuplicateError}</span>}
            {touched.has('codigo') && fieldErrors.codigo && !codeDuplicateError && <span className="err" style={{marginLeft: '192px', display: 'block', marginTop: -8}}>{fieldErrors.codigo}</span>}
            {touched.has('codigo') && isMissing('codigo') && !fieldErrors.codigo && !codeDuplicateError && (
              <span className="err" style={{marginLeft: '192px', display: 'block', marginTop: -8}}>Código es obligatorio</span>
            )}

            <label className="horizontal">
              <span>Nombre <span style={{color:'#dc2626'}}>*</span></span>
              <input value={v.nombre || ''} onBlur={()=>markTouched('nombre')} onChange={e=>onChange('nombre', e.target.value)} className={touched.has('nombre') && isMissing('nombre') ? 'error-input' : ''} />
            </label>
            {touched.has('nombre') && (fieldErrors.nombre || isMissing('nombre')) && (
              <span className="err" style={{marginLeft: '192px'}}>{fieldErrors.nombre || 'Nombre es obligatorio'}</span>
            )}

            <label className="horizontal">Nombre Comercial
              <input value={v.nombre_comercial || ''} onBlur={()=>markTouched('nombre_comercial')} onChange={e=>onChange('nombre_comercial', e.target.value)} />
            </label>
            {touched.has('nombre_comercial') && fieldErrors.nombre_comercial && <span className="err" style={{marginLeft: '192px'}}>{fieldErrors.nombre_comercial}</span>}
            <small style={{marginLeft: '192px', display: 'block', marginTop: 2, color: '#64748b'}}>Se mostrará en los comprobantes</small>

            <label className="horizontal">
              <span>Dirección <span style={{color:'#dc2626'}}>*</span></span>
              <input value={v.direccion || ''} onBlur={()=>markTouched('direccion')} onChange={e=>onChange('direccion', e.target.value)} className={touched.has('direccion') && isMissing('direccion') ? 'error-input' : ''} />
            </label>
            {touched.has('direccion') && (fieldErrors.direccion || isMissing('direccion')) && (
              <span className="err" style={{marginLeft: '192px'}}>{fieldErrors.direccion || 'Dirección es obligatoria'}</span>
            )}
            <small style={{marginLeft: '192px', display: 'block', marginTop: 2, color: '#64748b'}}>Se mostrará en los comprobantes</small>

            <label className="horizontal">Correo
              <input
                value={v.correo || ''}
                onBlur={() => {
                  markTouched('correo');
                  const correoErr = getCorreoError(v.correo);
                  setFieldErrors(prev => {
                    const next = { ...(prev || {}) };
                    if (correoErr) next.correo = correoErr;
                    else if ('correo' in next) delete next.correo;
                    return next;
                  });
                }}
                onChange={e=>onChange('correo', e.target.value)}
                className={((v.correo ?? '').trim().length > 0 && !!getCorreoError(v.correo)) || (!!fieldErrors.correo && touched.has('correo')) ? 'error-input' : ''}
              />
            </label>
            {((v.correo ?? '').trim().length > 0 && getCorreoError(v.correo)) && (
              <span className="err" style={{marginLeft: '192px'}}>{getCorreoError(v.correo)}</span>
            )}
            <small style={{marginLeft: '192px', display: 'block', marginTop: 2, color: '#64748b'}}>Se mostrará en los comprobantes</small>

            <label className="horizontal">Número de teléfono
              <input value={v.telefono || ''} onBlur={()=>markTouched('telefono')} onChange={e=>onChange('telefono', e.target.value)} className={touched.has('telefono') && fieldErrors.telefono ? 'error-input' : ''} placeholder="0123456789" />
            </label>
            {touched.has('telefono') && fieldErrors.telefono && <span className="err" style={{marginLeft: '192px'}}>{fieldErrors.telefono}</span>}
            <small style={{marginLeft: '192px', display: 'block', marginTop: 2, color: '#64748b'}}>Se mostrará en los comprobantes • Máximo 10 dígitos</small>

            <div className="mf-horizontal" style={{marginTop: 24, alignItems: 'flex-start'}}>
              <span style={{fontWeight: 600, fontSize: '14px', color: '#374151'}}>Logo</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {editingEst && hasExistingLogo && (
                  <div className="mf-logo-gate">
                    <div className="mf-logo-gate__title">Existe un logo cargado</div>
                    <div className="mf-logo-gate__note">
                      {logoChangeEnabled
                        ? 'Cambio habilitado. Selecciona una opción de logo.'
                        : 'Se mantendrá el logo actual. Habilita el cambio solo si deseas modificarlo o eliminarlo.'}
                    </div>

                    <label className={`mf-logo-gate__toggle ${logoChangeEnabled ? 'is-enabled' : ''}`}>
                      <input
                        type="checkbox"
                        className="mf-checkbox"
                        checked={logoChangeEnabled}
                        onChange={(e) => applyLogoChangeEnabled(e.target.checked)}
                      />
                      <div className="mf-logo-gate__toggleText">
                        <div className="mf-logo-gate__toggleTitle">Habilitar cambio de logo</div>
                        <div className="mf-logo-gate__toggleDesc">
                          {logoChangeEnabled
                            ? 'Ahora podrás elegir: Logo propio, Logo del sistema o Sin logo.'
                            : 'Por seguridad, esta acción no se aplica si no la habilitas.'}
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {canEditLogo && (
                  <>
                    <select 
                      value={logoOption} 
                      onChange={(e) => {
                        const nextOption = e.target.value as 'custom' | 'default' | 'none';
                        setLogoOption(nextOption);
                        setLogoFile(null);
                        // Marcar y sincronizar error para que el usuario sepa qué falta
                        markTouched('logo');
                        setFieldErrors(prev => {
                          const next = { ...(prev || {}) };
                          delete next.logo;
                          if (nextOption === 'custom') next.logo = 'Debes subir un archivo para logo propio';
                          return next;
                        });
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
                      <option value="custom">Logo propio</option>
                      <option value="default">Logo del sistema</option>
                      <option value="none">Sin logo</option>
                    </select>

                    {logoOption === 'custom' && fieldErrors.logo && (
                      <span className="err" style={{display: 'block', marginTop: 6, marginBottom: 6}}>{fieldErrors.logo}</span>
                    )}

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
                    marginTop: '10px'
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
                      onChange={e=>{
                        const f = e.target.files?.[0] || null;
                        setLogoFile(f);
                        markTouched('logo');
                        setFieldErrors(prev => {
                          const next = { ...(prev || {}) };
                          delete next.logo;
                          if (!f) next.logo = 'Debes subir un archivo para logo propio';
                          else if (!/\.jpe?g$|\.png$/i.test(f.name)) next.logo = 'El logo debe ser JPG, JPEG o PNG';
                          return next;
                        });
                      }} 
                    />
                  </div>

                  <div style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    📎 JPG, JPEG, PNG
                  </div>
                </>
                    )}
                  </>
                )}
              </div>
            </div>
            <small style={{marginLeft: '192px', display: 'block', marginTop: 2, color: '#64748b'}}>Se mostrará en los comprobantes</small>

            <label style={{ marginTop: 16 }}>Actividades economicas
              <textarea value={v.actividades_economicas || ''} onChange={e=>onChange('actividades_economicas', e.target.value)} rows={3} />
            </label>

            <div className="date-row">
              <label>
                <span>Fecha inicio de actividades</span>
                <input
                  type="date"
                  min={todayIsoDate}
                  value={v.fecha_inicio_actividades||''}
                  onBlur={()=>markTouched('fecha_inicio_actividades')}
                  onChange={e=>onChange('fecha_inicio_actividades', e.target.value)}
                  className={touched.has('fecha_inicio_actividades') && fieldErrors.fecha_inicio_actividades ? 'error-input' : ''}
                />
                {touched.has('fecha_inicio_actividades') && fieldErrors.fecha_inicio_actividades && (
                  <span className="err">{fieldErrors.fecha_inicio_actividades}</span>
                )}
              </label>
              <label>
                <span>Fecha reinicio de actividades</span>
                <input
                  type="date"
                  min={todayIsoDate}
                  value={v.fecha_reinicio_actividades||''}
                  onBlur={()=>markTouched('fecha_reinicio_actividades')}
                  onChange={e=>onChange('fecha_reinicio_actividades', e.target.value)}
                  className={touched.has('fecha_reinicio_actividades') && fieldErrors.fecha_reinicio_actividades ? 'error-input' : ''}
                />
                {touched.has('fecha_reinicio_actividades') && fieldErrors.fecha_reinicio_actividades && (
                  <span className="err">{fieldErrors.fecha_reinicio_actividades}</span>
                )}
              </label>
            </div>

            <label className="horizontal" style={{ maxWidth: '500px', margin: '12px auto' }}>Fecha cierre de establecimiento
              <input
                type="date"
                min={todayIsoDate}
                value={v.fecha_cierre_establecimiento||''}
                onBlur={()=>markTouched('fecha_cierre_establecimiento')}
                onChange={e=>onChange('fecha_cierre_establecimiento', e.target.value)}
                className={touched.has('fecha_cierre_establecimiento') && fieldErrors.fecha_cierre_establecimiento ? 'error-input' : ''}
              />
            </label>
            {touched.has('fecha_cierre_establecimiento') && fieldErrors.fecha_cierre_establecimiento && (
              <span className="err" style={{ maxWidth: '500px', margin: '-6px auto 0', display: 'block' }}>{fieldErrors.fecha_cierre_establecimiento}</span>
            )}
          </section>
        </div>

        <div className="mf-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !isFormValid()}>{editingEst ? 'Guardar' : 'Registrar'}</button>
        </div>

        {loading && (
          <div className="mf-loading-overlay" aria-hidden>
            <LoadingSpinner />
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
          label.horizontal input:not([type="radio"]):not([type="checkbox"]):not([type="file"]),label.horizontal select{height:40px;padding:10px 12px;border:1px solid #cbd5e1;
            border-radius:8px;width:100%;box-sizing:border-box;font-size:14px;background:#fff;transition:all 0.2s ease}

          /* Layout horizontal sin semántica de label (para Logo) */
          .mf-horizontal{display:grid;grid-template-columns:200px 1fr;gap:12px;align-items:center;
            margin:10px 0;font-weight:500;color:#475569}
          
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

          /* Logo gate (edición) */
          .mf-logo-gate{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px}
          .mf-logo-gate__title{font-size:13px;font-weight:800;color:#059669}
          .mf-logo-gate__note{font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;line-height:1.35}
          .mf-logo-gate__toggle{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#f8fafc;cursor:pointer;user-select:none;transition:all 0.2s ease}
          .mf-logo-gate__toggle:hover{border-color:#cbd5e1;background:#f1f5f9}
          .mf-logo-gate__toggle.is-enabled{border-color:#3b82f6;background:#f0f9ff}
          .mf-logo-gate__toggle:focus-within{outline:none;box-shadow:0 0 0 3px rgba(59,130,246,0.14)}
          .mf-checkbox{width:18px;height:18px;margin-top:2px;accent-color:#3b82f6}
          .mf-logo-gate__toggleText{display:flex;flex-direction:column;gap:2px}
          .mf-logo-gate__toggleTitle{font-size:13px;color:#374151;font-weight:800;line-height:1.2}
          .mf-logo-gate__toggleDesc{font-size:12px;color:#64748b;line-height:1.3}

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

          /* Responsive tweaks */
          @media (max-width:600px){
            .mf-modal{width:calc(100vw - 24px);border-radius:10px}
            .mf-body{padding:16px}
            section{padding:16px}
            label.horizontal,.mf-horizontal{grid-template-columns:1fr;gap:6px}
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
