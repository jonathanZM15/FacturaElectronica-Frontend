import React, { useState, useEffect } from 'react';
import { Bodega, Producto, TransferenciaPayload, TipoBodega, TipoProducto } from '../../types/inventory';
import { getBodegas, getProductos, transferirStock } from '../../services/inventoryService';

interface Props {
    emisorId: number | string;
    onSuccess?: () => void;
}

export const TransferenciaForm: React.FC<Props> = ({ emisorId, onSuccess }) => {
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [origenId, setOrigenId] = useState<number | ''>('');
    const [destinoId, setDestinoId] = useState<number | ''>('');
    const [observacion, setObservacion] = useState('');
    const [detalles, setDetalles] = useState<{producto_id: number | ''; cantidad: number}[]>([{ producto_id: '', cantidad: 1 }]);

    useEffect(() => {
        getBodegas(emisorId).then(setBodegas).catch(console.error);
        getProductos(emisorId).then(data => setProductos(data.filter(p => p.tipo === TipoProducto.FISICO))).catch(console.error);
    }, [emisorId]);

    const bodegaDestino = bodegas.find(b => b.id === destinoId);
    const requiresObservation = bodegaDestino?.tipo === TipoBodega.MERMAS;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        
        setError('');
        setSuccess('');
        
        if (!origenId || !destinoId) {
            setError('Debe seleccionar origen y destino'); return;
        }
        if (origenId === destinoId) {
            setError('La bodega de origen y destino no pueden ser la misma'); return;
        }

        const validDetalles = detalles.filter(d => d.producto_id !== '' && d.cantidad > 0) as {producto_id: number; cantidad: number}[];
        if (validDetalles.length === 0) {
            setError('Debe agregar al menos un producto válido'); return;
        }

        setLoading(true);
        try {
            const payload: TransferenciaPayload = {
                bodega_origen_id: origenId,
                bodega_destino_id: destinoId,
                observacion,
                detalles: validDetalles
            };
            await transferirStock(emisorId, payload);
            setSuccess('Transferencia ejecutada correctamente.');
            setOrigenId(''); setDestinoId(''); setObservacion(''); setDetalles([{ producto_id: '', cantidad: 1 }]);
            if (onSuccess) onSuccess();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error en transferencia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#e0e7ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: 'inset 0 0 0 1px #c7d2fe' }}>
                    <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Transferencia entre Bodegas
                </h2>
            </div>
            
            <div style={{ padding: '32px' }}>
                {error && (
                    <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', fontSize: '0.95rem', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span> <strong>Error:</strong> {error}
                    </div>
                )}
                {success && (
                    <div style={{ marginBottom: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', fontSize: '0.95rem', color: '#15803d', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.2rem' }}>✅</span> <strong>Éxito:</strong> {success}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 300px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Bodega Origen <span style={{ color: '#ef4444' }}>*</span></label>
                            <select required value={origenId} onChange={e => setOrigenId(Number(e.target.value) || '')} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                                <option value="">Seleccione origen...</option>
                                {bodegas.filter(b => b.tipo !== TipoBodega.TRANSITO).map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: '1 1 300px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Bodega Destino <span style={{ color: '#ef4444' }}>*</span></label>
                            <select required value={destinoId} onChange={e => setDestinoId(Number(e.target.value) || '')} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                                <option value="">Seleccione destino...</option>
                                {bodegas.filter(b => b.tipo !== TipoBodega.TRANSITO && b.id !== origenId).map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                            Observación / Justificación {requiresObservation && <span style={{ color: '#ef4444' }}>* (Obligatorio para Mermas)</span>}
                        </label>
                        <textarea 
                            required={requiresObservation}
                            rows={2} 
                            value={observacion} 
                            onChange={e => setObservacion(e.target.value)} 
                            style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a', boxSizing: 'border-box' }}
                            placeholder="Motivo de la transferencia..."
                        />
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📦 Productos a Transferir
                        </h3>
                        {detalles.map((detalle, index) => (
                            <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 300px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Producto</label>
                                    <select required value={detalle.producto_id} onChange={e => {
                                        const newDetalles = [...detalles];
                                        newDetalles[index].producto_id = Number(e.target.value) || '';
                                        setDetalles(newDetalles);
                                    }} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}>
                                        <option value="">Seleccione producto...</option>
                                        {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                                    </select>
                                </div>
                                <div style={{ width: '120px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Cantidad</label>
                                    <input type="number" required min="0.000001" step="0.000001" value={detalle.cantidad} onChange={e => {
                                        const newDetalles = [...detalles];
                                        newDetalles[index].cantidad = Number(e.target.value);
                                        setDetalles(newDetalles);
                                    }} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <button type="button" onClick={() => setDetalles(detalles.filter((_, i) => i !== index))} style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar fila">
                                    🗑️
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={() => setDetalles([...detalles, { producto_id: '', cantidad: 1 }])} style={{ padding: '8px 16px', backgroundColor: 'white', color: '#4f46e5', border: '1px dashed #a5b4fc', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            + Añadir Producto
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="submit" disabled={loading} style={{
                            backgroundColor: '#4f46e5', color: 'white', padding: '14px 32px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', transition: 'all 0.2s'
                        }}>
                            {loading ? (
                                <><svg style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Procesando...</>
                            ) : 'Ejecutar Transferencia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
