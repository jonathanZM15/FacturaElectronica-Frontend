import React, { useEffect, useRef, useState } from 'react';
import { clientesService } from '../../../services/api';

interface Props {
  isOpen: boolean; onClose: () => void; onConfirm: (data: any) => Promise<void>;
  total: number; emisorId: number | string; busy: boolean;
}

export default function CobroModal({ isOpen, onClose, onConfirm, total, emisorId, busy }: Props) {
  const [identificacion, setIdentificacion] = useState('9999999999999');
  const [cliente, setCliente] = useState<any>({});
  const [formaPago, setFormaPago] = useState('01');
  const [efectivo, setEfectivo] = useState('');
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const buscar = async (id: string) => {
    const current = ++requestId.current;
    setSearching(true); setMessage(''); setCliente({});
    try {
      const res = await clientesService.buscar(emisorId, id);
      if (current === requestId.current) setCliente(res.data.data);
    } catch (error: any) {
      if (current !== requestId.current) return;
      if (error.response?.status !== 404) { setMessage('No se pudo consultar el cliente. Reintenta la búsqueda.'); return; }
      setCliente({ identificacion: id, tipo_identificacion: id === '9999999999999' ? 'CONSUMIDOR_FINAL' : (id.length === 13 ? 'RUC' : (id.length === 10 ? 'CEDULA' : 'PASAPORTE')), razon_social: id === '9999999999999' ? 'CONSUMIDOR FINAL' : '', direccion: '', email: '', telefono: '' });
      setMessage('Completa los datos del cliente. Se guardarán al confirmar la venta.');
    } finally { if (current === requestId.current) setSearching(false); }
  };
  useEffect(() => {
    if (isOpen) { setIdentificacion('9999999999999'); setEfectivo(''); buscar('9999999999999'); }
    return () => { requestId.current++; };
    // The dialog resets only when opened or the company changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, emisorId]);
  if (!isOpen) return null;
  const update = (field: string, value: string) => setCliente((c: any) => ({ ...c, [field]: value }));
  return <div className="v1-dialog-backdrop"><section className="v1-dialog" role="dialog" aria-modal="true" aria-labelledby="cobro-title">
    <h2 id="cobro-title">Cobrar venta</h2><p className="v1-total">Total ${total.toFixed(2)}</p>
    <form onSubmit={async e => {
      e.preventDefault();
      if (busy || searching || !cliente.identificacion) return;
      if (formaPago === '01' && (!efectivo || Number(efectivo) < total)) { setMessage('El efectivo recibido debe cubrir el total.'); return; }
      await onConfirm({ cliente, formaPago, efectivo: formaPago === '01' ? Number(efectivo) : undefined });
    }}>
      <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0 }}>
        <label>Identificación<input required value={identificacion} onChange={e => { requestId.current++; setIdentificacion(e.target.value); setCliente({}); }} /></label>
        <button type="button" disabled={searching || !identificacion} onClick={() => buscar(identificacion)}>Buscar cliente</button>
        {searching && <p>Buscando cliente…</p>}{message && <p role="status">{message}</p>}
        {cliente.identificacion && <>
          <label>Tipo de identificación<select value={cliente.tipo_identificacion || ''} onChange={e => update('tipo_identificacion', e.target.value)}>
            <option value="RUC">RUC</option><option value="CEDULA">Cédula</option><option value="PASAPORTE">Pasaporte</option><option value="CONSUMIDOR_FINAL">Consumidor final</option><option value="IDENTIFICACION_EXTERIOR">Identificación exterior</option>
          </select></label>
          <label>Razón social o nombres<input required maxLength={255} value={cliente.razon_social || ''} onChange={e => update('razon_social', e.target.value)} /></label>
          <label>Dirección<input required maxLength={500} value={cliente.direccion || ''} onChange={e => update('direccion', e.target.value)} /></label>
          <label>Correo del cliente<input required type="email" value={cliente.email || ''} onChange={e => update('email', e.target.value)} /></label>
          <label>Teléfono<input value={cliente.telefono || ''} onChange={e => update('telefono', e.target.value)} /></label>
        </>}
        <label>Forma de pago<select value={formaPago} onChange={e => setFormaPago(e.target.value)}><option value="01">Efectivo</option><option value="16">Tarjeta de débito</option><option value="19">Tarjeta de crédito</option><option value="20">Transferencia</option></select></label>
        {formaPago === '01' && <><label>Efectivo recibido<input type="number" required min={total} step="0.01" value={efectivo} onChange={e => setEfectivo(e.target.value)} /></label><p>Vuelto ${Math.max(0, Number(efectivo) - total).toFixed(2)}</p></>}
        <p>La firma se procesa con la configuración privada de la empresa.</p>
        <div className="v1-actions"><button type="button" className="v1-secondary" onClick={onClose}>Cancelar</button><button type="submit" disabled={searching || !cliente.identificacion}>{busy ? 'Confirmando…' : 'Confirmar venta'}</button></div>
      </fieldset>
    </form>
  </section></div>;
}
