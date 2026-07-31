import React, { useState, useEffect } from 'react';
import { Bodega, Producto, AjustePayload, TipoProducto } from '../../types/inventory';
import { getBodegas, getProductos, ajustarStock } from '../../services/inventoryService';

interface Props {
    emisorId: number | string;
    onSuccess?: () => void;
}

export const AjusteForm: React.FC<Props> = ({ emisorId, onSuccess }) => {
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [bodegaId, setBodegaId] = useState<number | ''>('');
    const [tipo, setTipo] = useState<'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO'>('AJUSTE_POSITIVO');
    const [observacion, setObservacion] = useState('');
    const [detalles, setDetalles] = useState<{producto_id: number | ''; cantidad: number}[]>([{ producto_id: '', cantidad: 1 }]);

    useEffect(() => {
        getBodegas(emisorId).then(setBodegas).catch(console.error);
        getProductos(emisorId).then(data => setProductos(data.filter(p => p.tipo === TipoProducto.FISICO))).catch(console.error);
    }, [emisorId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setError('');
        setSuccess('');
        
        if (!bodegaId) {
            setError('Debe seleccionar una bodega'); return;
        }

        const validDetalles = detalles.filter(d => d.producto_id !== '' && d.cantidad > 0) as {producto_id: number; cantidad: number}[];
        if (validDetalles.length === 0) {
            setError('Debe agregar al menos un producto válido'); return;
        }

        setLoading(true);
        try {
            const payload: AjustePayload = {
                bodega_id: bodegaId,
                tipo,
                observacion,
                detalles: validDetalles
            };
            await ajustarStock(emisorId, payload);
            setSuccess('Ajuste ejecutado correctamente.');
            setBodegaId(''); setObservacion(''); setDetalles([{ producto_id: '', cantidad: 1 }]);
            if (onSuccess) onSuccess();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error en el ajuste');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#fff7ed', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', boxShadow: 'inset 0 0 0 1px #ffedd5' }}>
                    <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Ajuste Manual de Inventario
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
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Tipo de Ajuste <span style={{ color: '#ef4444' }}>*</span></label>
                            <select required value={tipo} onChange={e => setTipo(e.target.value as any)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                                <option value="AJUSTE_POSITIVO">📈 Ajuste Positivo (Entrada)</option>
                                <option value="AJUSTE_NEGATIVO">📉 Ajuste Negativo (Salida)</option>
                            </select>
                        </div>
                        <div style={{ flex: '1 1 300px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Bodega Afectada <span style={{ color: '#ef4444' }}>*</span></label>
                            <select required value={bodegaId} onChange={e => setBodegaId(Number(e.target.value) || '')} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                                <option value="">Seleccione bodega...</option>
                                {bodegas.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                            Justificación Obligatoria <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea 
                            required
                            rows={2} 
                            value={observacion} 
                            onChange={e => setObservacion(e.target.value)} 
                            style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a', boxSizing: 'border-box' }}
                            placeholder="Ej. Ingreso por mercancía sobrante / Daño de producto..."
                        />
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📦 Productos a Ajustar
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
                            backgroundColor: tipo === 'AJUSTE_POSITIVO' ? '#10b981' : '#f97316', 
                            color: 'white', padding: '14px 32px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 4px 12px ${tipo === 'AJUSTE_POSITIVO' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(249, 115, 22, 0.25)'}`, transition: 'all 0.2s'
                        }}>
                            {loading ? (
                                <><svg style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Procesando...</>
                            ) : 'Ejecutar Ajuste'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
