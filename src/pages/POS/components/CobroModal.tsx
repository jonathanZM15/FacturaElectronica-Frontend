import React, { useEffect, useRef, useState } from 'react';
import { clientesService } from '../../../services/api';
import { validateClientIdentification } from '../../../helpers/validateRuc';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
  total: number;
  emisorId: number | string;
  busy: boolean;
}

export default function CobroModal({ isOpen, onClose, onConfirm, total, emisorId, busy }: Props) {
  const [identificacion, setIdentificacion] = useState('9999999999999');
  const [cliente, setCliente] = useState<any>({});
  const [formaPago, setFormaPago] = useState('01');
  const [efectivo, setEfectivo] = useState('');
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);

  const esMayor50 = total > 50.00;

  const handleClienteNotFound = (idToInit: string) => {
    if (idToInit === '9999999999999') {
      if (esMayor50) {
        setMessage('Por disposición del SRI, en facturas superiores a $50.00 no se admite Consumidor Final.');
        return;
      }
      setCliente({
        identificacion: idToInit,
        tipo_identificacion: 'CONSUMIDOR_FINAL',
        razon_social: 'CONSUMIDOR FINAL',
        direccion: 'S/N',
        email: 'consumidor@final.com',
        telefono: '',
      });
    } else {
      const guessedTipo = idToInit.length === 13 ? 'RUC' : (idToInit.length === 10 ? 'CEDULA' : 'PASAPORTE');
      setCliente({
        identificacion: idToInit,
        tipo_identificacion: guessedTipo,
        razon_social: '',
        direccion: '',
        email: '',
        telefono: '',
      });
      setMessage('Cliente no registrado previamente. Completa sus datos fiscales para guardarlo al confirmar.');
    }
  };

  const buscar = async (id: string) => {
    const current = ++requestId.current;
    const cleanId = id.trim();
    if (!cleanId) return;

    if (esMayor50 && (cleanId === '9999999999999')) {
      setMessage('Por disposición del SRI, en facturas superiores a $50.00 no se admite Consumidor Final. Debe registrar un cliente identificado.');
      setCliente({});
      return;
    }

    setSearching(true);
    setMessage('');
    setCliente({});

    try {
      const res = await clientesService.buscar(emisorId, cleanId);
      if (current === requestId.current) {
        const found = res.data?.data;
        if (found) {
          if (esMayor50 && (found.tipo_identificacion === 'CONSUMIDOR_FINAL' || found.identificacion === '9999999999999')) {
            setMessage('Por disposición del SRI, en facturas superiores a $50.00 no se admite Consumidor Final.');
            setCliente({});
          } else {
            setCliente(found);
          }
        } else {
          handleClienteNotFound(cleanId);
        }
      }
    } catch (error: any) {
      if (current !== requestId.current) return;
      if (error.response?.status === 404) {
        handleClienteNotFound(cleanId);
      } else {
        setMessage(error.response?.data?.message || 'No se pudo consultar el cliente. Reintenta la búsqueda.');
      }
    } finally {
      if (current === requestId.current) setSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setEfectivo('');
      if (total > 50.00) {
        setIdentificacion('');
        setCliente({});
        setMessage('Venta superior a $50.00: Por normativa del SRI es obligatorio identificar al cliente.');
      } else {
        setIdentificacion('9999999999999');
        setCliente({});
        buscar('9999999999999');
      }
    }
    const reqRef = requestId;
    return () => {
      reqRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, emisorId, total]);

  if (!isOpen) return null;

  const update = (field: string, value: string) => setCliente((c: any) => ({ ...c, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || searching || !cliente.identificacion) return;

    // Validación P02: Consumidor Final > $50.00
    if (esMayor50 && (cliente.tipo_identificacion === 'CONSUMIDOR_FINAL' || cliente.identificacion === '9999999999999')) {
      setMessage('Por disposición del SRI, en facturas superiores a $50.00 no se admite Consumidor Final. Debe registrar un cliente identificado.');
      return;
    }

    // Validación P01 / P03: Validación de formato y dígito verificador de la identificación
    const idValidation = validateClientIdentification(cliente.tipo_identificacion || '', cliente.identificacion || '', total);
    if (!idValidation.valid) {
      setMessage(idValidation.message || 'Identificación inválida.');
      return;
    }

    // Datos obligatorios
    if (!cliente.razon_social?.trim()) {
      setMessage('Razón social o nombres del cliente es obligatorio.');
      return;
    }
    if (!cliente.direccion?.trim()) {
      setMessage('Dirección del cliente es obligatoria.');
      return;
    }
    if (!cliente.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email.trim())) {
      setMessage('Correo electrónico válido es obligatorio.');
      return;
    }

    if (formaPago === '01' && (!efectivo || Number(efectivo) < total)) {
      setMessage('El efectivo recibido debe cubrir el total de la venta.');
      return;
    }

    await onConfirm({ cliente, formaPago, efectivo: formaPago === '01' ? Number(efectivo) : undefined });
  };

  return (
    <div className="v1-dialog-backdrop">
      <section className="v1-dialog" role="dialog" aria-modal="true" aria-labelledby="cobro-title">
        <h2 id="cobro-title">Cobrar venta</h2>
        <p className="v1-total">Total ${total.toFixed(2)}</p>

        {esMayor50 && (
          <div className="v1-notice v1-warning" style={{ marginBottom: 12, fontSize: '0.9rem' }}>
            ⚠️ <strong>Normativa SRI (Ficha Técnica sección 9.10):</strong> Facturas superiores a $50.00 requieren identificar al cliente (RUC, Cédula o Pasaporte). No se admite Consumidor Final.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0 }}>
            <label>
              Identificación
              <input
                required
                value={identificacion}
                placeholder={esMayor50 ? 'Cédula, RUC o Pasaporte' : '9999999999999'}
                onChange={e => {
                  requestId.current++;
                  setIdentificacion(e.target.value);
                  setCliente({});
                  setMessage('');
                }}
              />
            </label>
            <button
              type="button"
              disabled={searching || !identificacion.trim()}
              onClick={() => buscar(identificacion)}
            >
              Buscar cliente
            </button>
            {searching && <p>Buscando cliente…</p>}
            {message && <p role="status" style={{ color: message.includes('obligatorio') || message.includes('SRI') || message.includes('no se') ? '#b91c1c' : 'inherit' }}>{message}</p>}

            {cliente.identificacion && (
              <>
                <label>
                  Tipo de identificación
                  <select
                    value={cliente.tipo_identificacion || ''}
                    onChange={e => update('tipo_identificacion', e.target.value)}
                  >
                    <option value="CEDULA">Cédula</option>
                    <option value="RUC">RUC</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="IDENTIFICACION_EXTERIOR">Identificación exterior</option>
                    <option value="CONSUMIDOR_FINAL" disabled={esMayor50}>
                      Consumidor final {esMayor50 ? '(no permitido > $50.00)' : ''}
                    </option>
                  </select>
                </label>
                <label>
                  Razón social o nombres
                  <input
                    required
                    maxLength={255}
                    value={cliente.razon_social || ''}
                    onChange={e => update('razon_social', e.target.value)}
                  />
                </label>
                <label>
                  Dirección
                  <input
                    required
                    maxLength={500}
                    value={cliente.direccion || ''}
                    onChange={e => update('direccion', e.target.value)}
                  />
                </label>
                <label>
                  Correo del cliente
                  <input
                    required
                    type="email"
                    maxLength={255}
                    value={cliente.email || ''}
                    onChange={e => update('email', e.target.value)}
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    maxLength={50}
                    value={cliente.telefono || ''}
                    onChange={e => update('telefono', e.target.value)}
                  />
                </label>
              </>
            )}

            <label>
              Forma de pago
              <select value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                <option value="01">Efectivo</option>
                <option value="16">Tarjeta de débito</option>
                <option value="19">Tarjeta de crédito</option>
                <option value="20">Transferencia</option>
              </select>
            </label>

            {formaPago === '01' && (
              <>
                <label>
                  Efectivo recibido
                  <input
                    type="number"
                    required
                    min={total}
                    step="0.01"
                    value={efectivo}
                    onChange={e => setEfectivo(e.target.value)}
                  />
                </label>
                <p>Vuelto ${Math.max(0, Number(efectivo) - total).toFixed(2)}</p>
              </>
            )}

            <p>La firma se procesa con la configuración privada de la empresa.</p>
            <div className="v1-actions">
              <button type="button" className="v1-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" disabled={searching || !cliente.identificacion}>
                {busy ? 'Confirmando…' : 'Confirmar venta'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
