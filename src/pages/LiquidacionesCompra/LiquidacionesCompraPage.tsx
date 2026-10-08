import React, { useState, useEffect } from 'react';
import { emisoresApi } from '../../services/emisoresApi';
import { establecimientosApi } from '../../services/establecimientosApi';
import { puntosEmisionApi } from '../../services/puntosEmisionApi';
import { facturacion } from '../../services/api';
import { Loader2, Plus, Trash2, FileText, UploadCloud, UserCheck, Search, Info } from 'lucide-react';
import type { Emisor } from '../../types/emisor';

const LiquidacionesCompraPage: React.FC = () => {
    const [emisores, setEmisores] = useState<Emisor[]>([]);
    const [establecimientos, setEstablecimientos] = useState<any[]>([]);
    const [puntos, setPuntos] = useState<any[]>([]);

    const [emisorId, setEmisorId] = useState<number | ''>('');
    const [establecimientoId, setEstablecimientoId] = useState<number | ''>('');
    const [puntoEmisionId, setPuntoEmisionId] = useState<number | ''>('');

    // Proveedor
    const [proveedor, setProveedor] = useState({
        tipo_identificacion: '05',
        identificacion: '',
        razon_social: '',
        direccion: '',
        email: '',
        telefono: ''
    });

    // Productos
    const [detalles, setDetalles] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        descuento: 0,
        tarifa_iva: 12
    });

    // Firma
    const [firmaFile, setFirmaFile] = useState<File | null>(null);
    const [passwordFirma, setPasswordFirma] = useState('');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        emisoresApi.list().then(res => setEmisores(res.data.data || res.data));
    }, []);

    useEffect(() => {
        if (emisorId) {
            establecimientosApi.list(emisorId).then(res => setEstablecimientos(res.data.data || res.data));
        } else {
            setEstablecimientos([]);
            setPuntos([]);
        }
        setEstablecimientoId('');
        setPuntoEmisionId('');
    }, [emisorId]);

    useEffect(() => {
        if (emisorId && establecimientoId) {
            puntosEmisionApi.list(emisorId, establecimientoId).then(res => setPuntos(res.data.data || res.data));
        } else {
            setPuntos([]);
        }
        setPuntoEmisionId('');
    }, [establecimientoId]);

    const handleAddItem = () => {
        if (!newItem.descripcion) {
            alert('Por favor, ingresa la descripción del bien o servicio.');
            return;
        }
        const tipo_impuesto_id = newItem.tarifa_iva === 12 ? 2 : (newItem.tarifa_iva === 0 ? 1 : 2); // Simplification, relies on backend IDs
        
        setDetalles([...detalles, {
            ...newItem,
            impuesto: {
                tipo_impuesto_id,
                tarifa: newItem.tarifa_iva
            }
        }]);
        setNewItem({ descripcion: '', cantidad: 1, precio_unitario: 0, descuento: 0, tarifa_iva: 12 });
    };

    const handleRemoveItem = (index: number) => {
        setDetalles(detalles.filter((_, i) => i !== index));
    };

    // Cálculos
    const subtotal = detalles.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario - item.descuento), 0);
    const totalIva = detalles.reduce((acc, item) => {
        const itemSub = item.cantidad * item.precio_unitario - item.descuento;
        return acc + (itemSub * (item.tarifa_iva / 100));
    }, 0);
    const total = subtotal + totalIva;

    const handleEmitir = async () => {
        if (!emisorId || !establecimientoId || !puntoEmisionId) {
            alert("Selecciona la configuración del Emisor completo.");
            return;
        }
        if (detalles.length === 0) {
            alert("Debes agregar al menos un ítem.");
            return;
        }
        if (!firmaFile || !passwordFirma) {
            alert("Sube tu archivo de firma .p12 y la contraseña.");
            return;
        }
        if (!proveedor.identificacion || !proveedor.razon_social || !proveedor.direccion) {
            alert("Completa los datos principales del proveedor.");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                emisor_id: Number(emisorId),
                establecimiento_id: Number(establecimientoId),
                punto_emision_id: Number(puntoEmisionId),
                proveedor: proveedor,
                detalles: detalles
            };

            const fd = new FormData();
            fd.append('firma', firmaFile);
            fd.append('password', passwordFirma);
            fd.append('payload', JSON.stringify(payload));

            const res = await facturacion.emitirLiquidacionCompra(fd);
            setResult(res.data);
            alert("Liquidación de Compra emitida exitosamente!");
        } catch (error: any) {
            console.error(error);
            alert("Error al emitir: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '12px', color: 'white' }}>
                    <FileText size={32} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>Emisión de Liquidaciones de Compra</h1>
                    <p style={{ margin: 0, color: '#64748b' }}>Adquisición de bienes o servicios a personas sin RUC</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                {/* CONFIGURACIÓN Y PROVEEDOR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Tarjeta Emisor */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}><Info size={20}/> Punto de Emisión</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <select value={emisorId} onChange={e => setEmisorId(e.target.value ? Number(e.target.value) : '')} style={inputStyle}>
                                <option value="">-- Seleccionar Emisor --</option>
                                {emisores.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
                            </select>
                            <select value={establecimientoId} onChange={e => setEstablecimientoId(e.target.value ? Number(e.target.value) : '')} style={inputStyle} disabled={!emisorId}>
                                <option value="">-- Seleccionar Establecimiento --</option>
                                {establecimientos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                            </select>
                            <select value={puntoEmisionId} onChange={e => setPuntoEmisionId(e.target.value ? Number(e.target.value) : '')} style={inputStyle} disabled={!establecimientoId}>
                                <option value="">-- Seleccionar Punto Emisión --</option>
                                {puntos.map(e => <option key={e.id} value={e.id}>{e.codigo} - {e.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Tarjeta Proveedor */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}><UserCheck size={20}/> Datos del Proveedor</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                <select value={proveedor.tipo_identificacion} onChange={e => setProveedor({...proveedor, tipo_identificacion: e.target.value})} style={inputStyle}>
                                    <option value="05">Cédula</option>
                                    <option value="06">Pasaporte</option>
                                </select>
                                <input type="text" placeholder="Identificación" value={proveedor.identificacion} onChange={e => setProveedor({...proveedor, identificacion: e.target.value})} style={inputStyle} />
                            </div>
                            <input type="text" placeholder="Razón Social / Nombres Completos" value={proveedor.razon_social} onChange={e => setProveedor({...proveedor, razon_social: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Dirección" value={proveedor.direccion} onChange={e => setProveedor({...proveedor, direccion: e.target.value})} style={inputStyle} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input type="email" placeholder="Correo Electrónico" value={proveedor.email} onChange={e => setProveedor({...proveedor, email: e.target.value})} style={inputStyle} />
                                <input type="text" placeholder="Teléfono" value={proveedor.telefono} onChange={e => setProveedor({...proveedor, telefono: e.target.value})} style={inputStyle} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* DETALLES Y FIRMA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Items */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>Bienes y Servicios Adquiridos</h3>
                        
                        {/* Add new item form */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <input type="text" placeholder="Descripción" value={newItem.descripcion} onChange={e => setNewItem({...newItem, descripcion: e.target.value})} style={{...inputStyle, flex: '2 1 200px'}} />
                            <input type="number" placeholder="Cant." value={newItem.cantidad} onChange={e => setNewItem({...newItem, cantidad: Number(e.target.value)})} style={{...inputStyle, flex: '1 1 80px'}} min="1" />
                            <input type="number" placeholder="Precio U." value={newItem.precio_unitario} onChange={e => setNewItem({...newItem, precio_unitario: Number(e.target.value)})} style={{...inputStyle, flex: '1 1 100px'}} min="0" step="0.01" />
                            <select value={newItem.tarifa_iva} onChange={e => setNewItem({...newItem, tarifa_iva: Number(e.target.value)})} style={{...inputStyle, flex: '1 1 100px'}}>
                                <option value={12}>IVA 12%</option>
                                <option value={15}>IVA 15%</option>
                                <option value={0}>IVA 0%</option>
                            </select>
                            <button onClick={handleAddItem} style={btnStylePrimary}><Plus size={18}/> Agregar</button>
                        </div>

                        {/* List */}
                        {detalles.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                                        <th style={{ padding: '0.5rem' }}>Descripción</th>
                                        <th style={{ padding: '0.5rem' }}>Cant.</th>
                                        <th style={{ padding: '0.5rem' }}>P.Unit</th>
                                        <th style={{ padding: '0.5rem' }}>Subtotal</th>
                                        <th style={{ padding: '0.5rem' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalles.map((d, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '0.5rem' }}>{d.descripcion}</td>
                                            <td style={{ padding: '0.5rem' }}>{d.cantidad}</td>
                                            <td style={{ padding: '0.5rem' }}>${d.precio_unitario.toFixed(2)}</td>
                                            <td style={{ padding: '0.5rem' }}>${(d.cantidad * d.precio_unitario).toFixed(2)}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <button onClick={() => handleRemoveItem(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                No hay ítems agregados.
                            </div>
                        )}

                        {/* Totals */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', fontSize: '1.1rem' }}>
                            <div><span style={{ color: '#64748b', marginRight: '1rem' }}>Subtotal:</span> <strong>${subtotal.toFixed(2)}</strong></div>
                            <div><span style={{ color: '#64748b', marginRight: '1rem' }}>IVA:</span> <strong>${totalIva.toFixed(2)}</strong></div>
                            <div style={{ fontSize: '1.5rem', color: '#0f172a', borderTop: '2px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                <span style={{ marginRight: '1rem' }}>Total a Pagar:</span> <strong>${total.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Firma y Emisión */}
                    <div style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', padding: '1.5rem', borderRadius: '16px', color: 'white', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UploadCloud size={20}/> Firma Electrónica</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <input type="file" accept=".p12,.pfx" onChange={e => setFirmaFile(e.target.files?.[0] || null)} style={fileInputStyle} />
                            <input type="password" placeholder="Contraseña de firma" value={passwordFirma} onChange={e => setPasswordFirma(e.target.value)} style={inputStyleDark} />
                        </div>
                        <button onClick={handleEmitir} disabled={loading} style={btnStyleAction}>
                            {loading ? <><Loader2 className="animate-spin" style={{marginRight: '8px'}} /> Procesando SRI...</> : 'Emitir Liquidación'}
                        </button>
                    </div>

                    {result && (
                        <div style={{ padding: '1rem', background: '#ecfdf5', border: '1px solid #34d399', borderRadius: '12px', color: '#065f46' }}>
                            <strong>¡Éxito!</strong> Comprobante procesado.<br/>
                            Secuencial: {result.secuencial}<br/>
                            Estado SRI: {result.estado_sri ?? 'Recibida'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Styles
const inputStyle: React.CSSProperties = {
    padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.95rem'
};
const inputStyleDark: React.CSSProperties = {
    ...inputStyle, background: '#334155', border: '1px solid #475569', color: 'white'
};
const fileInputStyle: React.CSSProperties = {
    padding: '0.6rem', borderRadius: '8px', background: '#334155', border: '1px dashed #64748b', color: 'white', cursor: 'pointer', fontFamily: 'inherit'
};
const btnStylePrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit'
};
const btnStyleAction: React.CSSProperties = {
    ...btnStylePrimary, background: 'linear-gradient(135deg, #10b981, #059669)', width: '100%', justifyContent: 'center', fontSize: '1.1rem', padding: '1rem', marginTop: '1rem'
};

export default LiquidacionesCompraPage;
