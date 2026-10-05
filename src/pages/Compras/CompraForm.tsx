import React, { useState, useEffect } from 'react';
import { emisoresApi } from '../../services/emisoresApi';
import { proveedoresApi, Proveedor } from '../../services/proveedoresApi';
import { productosApi, Producto } from '../../services/productosApi';

interface CompraFormProps {
  tipoIngreso: 'FACTURA_PROVEEDOR' | 'LIQUIDACION_COMPRA' | 'SIN_COMPROBANTE';
}

interface Detalle {
  id_local: string;
  producto_id?: number;
  codigo_principal: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number; // Costo
  descuento: number;
  codigo_porcentaje: string; // '0' o '2' (12%) o '3' (14%) o '4' (15%)
  tarifa: number; // 0, 12, 14, 15
}

const CompraForm: React.FC<CompraFormProps> = ({ tipoIngreso }) => {
  const [emisores, setEmisores] = useState<any[]>([]);
  const [emisorId, setEmisorId] = useState('');
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [establecimientoId, setEstablecimientoId] = useState('');

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Form State
  const [proveedorId, setProveedorId] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [claveAcceso, setClaveAcceso] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [detalles, setDetalles] = useState<Detalle[]>([]);

  useEffect(() => {
    emisoresApi.list().then(res => {
      const data = res.data?.data ?? res.data ?? [];
      setEmisores(data);
      if (data.length > 0) setEmisorId(data[0].id.toString());
    });
  }, []);

  useEffect(() => {
    if (!emisorId) return;
    
    // Load Establecimientos
    emisoresApi.getEstablecimientos(emisorId).then(res => {
      const data = res.data?.data ?? res.data ?? [];
      setEstablecimientos(data);
      if (data.length > 0) setEstablecimientoId(data[0].id.toString());
    });

    // Load Proveedores
    proveedoresApi.list(emisorId, 1, '').then(res => {
      setProveedores(res.data?.data ?? []);
    });

    // Load Productos
    productosApi.list(emisorId, '').then(res => {
      setProductos(res.data?.data ?? res.data ?? []);
    });
    
  }, [emisorId]);

  const addDetalle = () => {
    setDetalles([
      ...detalles,
      {
        id_local: Math.random().toString(),
        codigo_principal: '',
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        descuento: 0,
        codigo_porcentaje: '2',
        tarifa: 15
      }
    ]);
  };

  const removeDetalle = (id_local: string) => {
    setDetalles(detalles.filter(d => d.id_local !== id_local));
  };

  const updateDetalle = (id_local: string, field: keyof Detalle, value: any) => {
    setDetalles(detalles.map(d => {
      if (d.id_local !== id_local) return d;
      
      const updated = { ...d, [field]: value };
      
      if (field === 'producto_id' && value) {
        const prod = productos.find(p => p.id.toString() === value.toString());
        if (prod) {
          updated.codigo_principal = prod.codigo_principal || '';
          updated.descripcion = prod.nombre;
          // By default, set the cost if we have one, otherwise 0
          updated.precio_unitario = 0; 
          updated.codigo_porcentaje = prod.codigo_porcentaje_iva;
          updated.tarifa = prod.codigo_porcentaje_iva === '2' ? 12 : (prod.codigo_porcentaje_iva === '4' ? 15 : 0);
        }
      }
      return updated;
    }));
  };

  // Calculations
  const calcSubtotal0 = () => detalles.filter(d => d.codigo_porcentaje === '0').reduce((acc, d) => acc + (d.cantidad * d.precio_unitario - d.descuento), 0);
  const calcSubtotal12 = () => detalles.filter(d => d.codigo_porcentaje !== '0').reduce((acc, d) => acc + (d.cantidad * d.precio_unitario - d.descuento), 0);
  const calcDescuento = () => detalles.reduce((acc, d) => acc + Number(d.descuento), 0);
  
  const calcIva = () => detalles.filter(d => d.codigo_porcentaje !== '0').reduce((acc, d) => acc + ((d.cantidad * d.precio_unitario - d.descuento) * (d.tarifa / 100)), 0);
  
  const total = calcSubtotal0() + calcSubtotal12() + calcIva();

  const handleSave = () => {
    alert("Función de guardar en construcción (Requiere conexión final al backend).");
  };

  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Emisor y Establecimiento */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Empresa Emisora</label>
          <select 
            value={emisorId} onChange={e => setEmisorId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          >
            {emisores.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Establecimiento (Bodega Destino)</label>
          <select 
            value={establecimientoId} onChange={e => setEstablecimientoId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          >
            <option value="">Seleccione...</option>
            {establecimientos.map(e => <option key={e.id} value={e.id}>{e.nombre_comercial} ({e.codigo})</option>)}
          </select>
        </div>

        {/* Proveedor */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Proveedor {tipoIngreso === 'SIN_COMPROBANTE' && '(Opcional)'}</label>
          <select 
            value={proveedorId} onChange={e => setProveedorId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          >
            <option value="">Seleccione un proveedor...</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social} - {p.identificacion}</option>)}
          </select>
        </div>

        {/* Fecha */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Fecha de Emisión / Ingreso</label>
          <input 
            type="date"
            value={fechaEmision} onChange={e => setFechaEmision(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Dynamic Fields based on Type */}
        {tipoIngreso === 'FACTURA_PROVEEDOR' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Nº Comprobante Físico/Electrónico</label>
              <input 
                placeholder="Ej. 001-002-123456789"
                value={numeroComprobante} onChange={e => setNumeroComprobante(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Clave de Acceso (Opcional)</label>
              <input 
                placeholder="49 dígitos..."
                value={claveAcceso} onChange={e => setClaveAcceso(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Detalles / Productos */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Productos / Ítems</h3>
          <button onClick={addDetalle} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>+</span> Agregar Ítem
          </button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Producto (Inventario)</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Descripción (Manual)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', width: '100px' }}>Cantidad</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', width: '120px' }}>Costo Unit.</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', width: '100px' }}>Desc.</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', width: '100px' }}>IVA</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', width: '100px' }}>Total</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {detalles.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No hay productos agregados a esta compra.
                  </td>
                </tr>
              ) : (
                detalles.map(d => {
                  const sub = (d.cantidad * d.precio_unitario) - d.descuento;
                  return (
                    <tr key={d.id_local} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <select 
                          value={d.producto_id || ''} 
                          onChange={e => updateDetalle(d.id_local, 'producto_id', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="">(Ninguno)</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input 
                          value={d.descripcion} onChange={e => updateDetalle(d.id_local, 'descripcion', e.target.value)}
                          placeholder="Descripción del gasto..."
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input 
                          type="number" min="0.01" step="0.01"
                          value={d.cantidad} onChange={e => updateDetalle(d.id_local, 'cantidad', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input 
                          type="number" min="0" step="0.01"
                          value={d.precio_unitario} onChange={e => updateDetalle(d.id_local, 'precio_unitario', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input 
                          type="number" min="0" step="0.01"
                          value={d.descuento} onChange={e => updateDetalle(d.id_local, 'descuento', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <select 
                          value={d.codigo_porcentaje}
                          onChange={e => {
                            const val = e.target.value;
                            let t = 0;
                            if (val === '2') t = 12;
                            if (val === '3') t = 14;
                            if (val === '4') t = 15;
                            updateDetalle(d.id_local, 'codigo_porcentaje', val);
                            updateDetalle(d.id_local, 'tarifa', t);
                          }}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="0">0%</option>
                          <option value="2">12%</option>
                          <option value="4">15%</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        ${sub.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button onClick={() => removeDetalle(d.id_local)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>✖</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '300px', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#475569', fontSize: '14px' }}>
            <span>Subtotal 0%:</span>
            <span style={{ fontWeight: 600 }}>${calcSubtotal0().toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#475569', fontSize: '14px' }}>
            <span>Subtotal IVA:</span>
            <span style={{ fontWeight: 600 }}>${calcSubtotal12().toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#475569', fontSize: '14px' }}>
            <span>Descuento:</span>
            <span style={{ fontWeight: 600 }}>${calcDescuento().toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#475569', fontSize: '14px' }}>
            <span>IVA:</span>
            <span style={{ fontWeight: 600 }}>${calcIva().toFixed(2)}</span>
          </div>
          
          <div style={{ height: '1px', background: '#cbd5e1', marginBottom: '16px' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: '#0f172a', fontSize: '18px', fontWeight: 700 }}>
            <span>TOTAL:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button onClick={handleSave} disabled={detalles.length === 0} style={{ width: '100%', padding: '14px', background: detalles.length > 0 ? '#f59e0b' : '#cbd5e1', color: 'white', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: detalles.length > 0 ? 'pointer' : 'not-allowed', fontSize: '15px' }}>
            Registrar Compra
          </button>
        </div>
      </div>

    </div>
  );
};

export default CompraForm;
