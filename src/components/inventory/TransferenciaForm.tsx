import React, { useState, useEffect } from 'react';
import { Bodega, Producto, TransferenciaPayload, TipoBodega, TipoProducto, TipoControlInventario } from '../../types/inventory';
import { getBodegas, getProductos, transferirStock, getExistenciasLotes, getExistenciasSeries } from '../../services/inventoryService';

interface Props {
    emisorId: number | string;
    onSuccess?: () => void;
}

interface LoteItem {
    numero_lote: string;
    cantidad: number;
}

interface SerieItem {
    numero_serie: string;
}

interface DetalleItem {
    producto_id: number | '';
    cantidad: number;
    lotes: LoteItem[];
    series: SerieItem[];
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
    const [detalles, setDetalles] = useState<DetalleItem[]>([
        { producto_id: '', cantidad: 1, lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }
    ]);

    const [lotesDisponibles, setLotesDisponibles] = useState<Record<number, any[]>>({});
    const [seriesDisponibles, setSeriesDisponibles] = useState<Record<number, any[]>>({});
    const [loadingData, setLoadingData] = useState(true);

    const loadFormData = async () => {
        setLoadingData(true);
        try {
            const [bData, pData] = await Promise.all([
                getBodegas(emisorId),
                getProductos(emisorId)
            ]);
            const bodegasArr = Array.isArray(bData) ? bData : (bData as any)?.data || [];
            const prodsArr = Array.isArray(pData) ? pData : (pData as any)?.data || [];
            setBodegas(bodegasArr);
            setProductos(prodsArr.filter((p: any) => !p.tipo || p.tipo === TipoProducto.FISICO || p.tipo === 'FISICO'));
        } catch (err) {
            console.error('Error cargando bodegas/productos en TransferenciaForm:', err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadFormData();
    }, [emisorId]);

    // Consultar existencias de lotes o series en la bodega de origen
    const fetchExistenciasOrigen = async (prodId: number, bOrigenId: number | '') => {
        if (!bOrigenId || !prodId) return;
        const prod = productos.find(p => p.id === prodId);
        if (!prod) return;

        if (prod.tipo_control_inventario === TipoControlInventario.LOTE) {
            try {
                const res = await getExistenciasLotes(emisorId, { producto_id: prodId, bodega_id: bOrigenId, solo_con_stock: 1 });
                setLotesDisponibles(prev => ({ ...prev, [prodId]: res.data || [] }));
            } catch (err) {
                console.error('Error consultando lotes en origen:', err);
            }
        } else if (prod.tipo_control_inventario === TipoControlInventario.SERIE) {
            try {
                const res = await getExistenciasSeries(emisorId, { producto_id: prodId, bodega_id: bOrigenId, estado: 'DISPONIBLE' });
                setSeriesDisponibles(prev => ({ ...prev, [prodId]: res.data || [] }));
            } catch (err) {
                console.error('Error consultando series en origen:', err);
            }
        }
    };

    const handleOrigenChange = (newOrigenId: number | '') => {
        setOrigenId(newOrigenId);
        setLotesDisponibles({});
        setSeriesDisponibles({});
        detalles.forEach(d => {
            if (d.producto_id) fetchExistenciasOrigen(Number(d.producto_id), newOrigenId);
        });
    };

    const handleProductoChange = (index: number, prodId: number | '') => {
        const newDetalles = [...detalles];
        newDetalles[index].producto_id = prodId;

        if (prodId !== '') {
            const prod = productos.find(p => p.id === prodId);
            const tipoControl = prod?.tipo_control_inventario;

            if (tipoControl === TipoControlInventario.LOTE) {
                newDetalles[index].lotes = [{ numero_lote: '', cantidad: newDetalles[index].cantidad || 1 }];
                fetchExistenciasOrigen(prodId, origenId);
            } else if (tipoControl === TipoControlInventario.SERIE) {
                const cant = Math.max(1, Math.round(newDetalles[index].cantidad || 1));
                newDetalles[index].cantidad = cant;
                newDetalles[index].series = Array.from({ length: cant }, () => ({ numero_serie: '' }));
                fetchExistenciasOrigen(prodId, origenId);
            }
        }

        setDetalles(newDetalles);
    };

    const handleCantidadChange = (index: number, nuevaCantidad: number) => {
        const newDetalles = [...detalles];
        newDetalles[index].cantidad = nuevaCantidad;

        const prodId = newDetalles[index].producto_id;
        const prod = productos.find(p => p.id === prodId);

        if (prod?.tipo_control_inventario === TipoControlInventario.LOTE) {
            if (newDetalles[index].lotes.length === 1) {
                newDetalles[index].lotes[0].cantidad = nuevaCantidad;
            }
        } else if (prod?.tipo_control_inventario === TipoControlInventario.SERIE) {
            const cantEntera = Math.max(0, Math.round(nuevaCantidad));
            const currentSeries = [...newDetalles[index].series];
            if (currentSeries.length < cantEntera) {
                while (currentSeries.length < cantEntera) {
                    currentSeries.push({ numero_serie: '' });
                }
            } else if (currentSeries.length > cantEntera) {
                currentSeries.splice(cantEntera);
            }
            newDetalles[index].series = currentSeries;
        }

        setDetalles(newDetalles);
    };

    // Lotes
    const addLoteRow = (detalleIndex: number) => {
        const newDetalles = [...detalles];
        const sumaActual = newDetalles[detalleIndex].lotes.reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0);
        const restante = Math.max(0, newDetalles[detalleIndex].cantidad - sumaActual);
        newDetalles[detalleIndex].lotes.push({ numero_lote: '', cantidad: restante });
        setDetalles(newDetalles);
    };

    const updateLoteRow = (detalleIndex: number, loteIndex: number, field: keyof LoteItem, value: any) => {
        const newDetalles = [...detalles];
        newDetalles[detalleIndex].lotes[loteIndex] = {
            ...newDetalles[detalleIndex].lotes[loteIndex],
            [field]: value
        };
        setDetalles(newDetalles);
    };

    const removeLoteRow = (detalleIndex: number, loteIndex: number) => {
        const newDetalles = [...detalles];
        newDetalles[detalleIndex].lotes = newDetalles[detalleIndex].lotes.filter((_, i) => i !== loteIndex);
        setDetalles(newDetalles);
    };

    // Series
    const addSerieRow = (detalleIndex: number) => {
        const newDetalles = [...detalles];
        newDetalles[detalleIndex].series.push({ numero_serie: '' });
        newDetalles[detalleIndex].cantidad = newDetalles[detalleIndex].series.length;
        setDetalles(newDetalles);
    };

    const updateSerieRow = (detalleIndex: number, serieIndex: number, value: string) => {
        const newDetalles = [...detalles];
        newDetalles[detalleIndex].series[serieIndex].numero_serie = value;
        setDetalles(newDetalles);
    };

    const removeSerieRow = (detalleIndex: number, serieIndex: number) => {
        const newDetalles = [...detalles];
        newDetalles[detalleIndex].series = newDetalles[detalleIndex].series.filter((_, i) => i !== serieIndex);
        newDetalles[detalleIndex].cantidad = Math.max(1, newDetalles[detalleIndex].series.length);
        setDetalles(newDetalles);
    };

    const handlePegarSeries = (detalleIndex: number, text: string) => {
        const lineas = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
        if (lineas.length === 0) return;

        const newDetalles = [...detalles];
        newDetalles[detalleIndex].series = lineas.map(sn => ({ numero_serie: sn }));
        newDetalles[detalleIndex].cantidad = lineas.length;
        setDetalles(newDetalles);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        
        setError('');
        setSuccess('');
        
        if (!origenId || !destinoId) {
            setError('Debe seleccionar bodega de origen y destino');
            return;
        }
        if (origenId === destinoId) {
            setError('La bodega de origen y destino no pueden ser la misma');
            return;
        }
        if (!observacion.trim()) {
            setError('La observación o motivo de la transferencia es obligatoria');
            return;
        }

        const validDetalles = detalles.filter(d => d.producto_id !== '' && d.cantidad > 0);
        if (validDetalles.length === 0) {
            setError('Debe agregar al menos un producto válido');
            return;
        }

        // Validación estricta de Lotes y Series
        for (let i = 0; i < validDetalles.length; i++) {
            const d = validDetalles[i];
            const prod = productos.find(p => p.id === d.producto_id);
            const nombreProd = prod ? `${prod.codigo} (${prod.nombre})` : `Ítem #${i + 1}`;
            const tipoControl = prod?.tipo_control_inventario;

            if (tipoControl === TipoControlInventario.LOTE) {
                if (!d.lotes || d.lotes.length === 0) {
                    setError(`El producto ${nombreProd} requiere especificar al menos un lote.`);
                    return;
                }
                const sumaLotes = d.lotes.reduce((acc, l) => acc + (parseFloat(String(l.cantidad)) || 0), 0);
                if (Math.abs(sumaLotes - d.cantidad) > 0.000001) {
                    setError(`La suma de los lotes (${sumaLotes}) no coincide con la cantidad total (${d.cantidad}) en ${nombreProd}.`);
                    return;
                }
                for (const l of d.lotes) {
                    if (!l.numero_lote.trim()) {
                        setError(`Existe un lote sin número asignado para ${nombreProd}.`);
                        return;
                    }
                    if (l.cantidad <= 0) {
                        setError(`La cantidad del lote ${l.numero_lote} debe ser mayor a 0.`);
                        return;
                    }
                }
            }

            if (tipoControl === TipoControlInventario.SERIE) {
                const seriesValidas = d.series.filter(s => s.numero_serie.trim() !== '');
                if (seriesValidas.length !== d.cantidad) {
                    setError(`El producto ${nombreProd} requiere exactamente ${d.cantidad} números de serie (se han ingresado ${seriesValidas.length}).`);
                    return;
                }
                const setSeries = new Set(seriesValidas.map(s => s.numero_serie.trim()));
                if (setSeries.size !== seriesValidas.length) {
                    setError(`Existen números de serie repetidos en la lista de ${nombreProd}.`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const payload: TransferenciaPayload = {
                bodega_origen_id: Number(origenId),
                bodega_destino_id: Number(destinoId),
                observacion: observacion.trim(),
                detalles: validDetalles.map(d => {
                    const prod = productos.find(p => p.id === d.producto_id);
                    const tipoControl = prod?.tipo_control_inventario;

                    const item: any = {
                        producto_id: Number(d.producto_id),
                        cantidad: Number(d.cantidad)
                    };

                    if (tipoControl === TipoControlInventario.LOTE) {
                        item.lotes = d.lotes.map(l => ({
                            numero_lote: l.numero_lote.trim(),
                            cantidad: Number(l.cantidad)
                        }));
                    } else if (tipoControl === TipoControlInventario.SERIE) {
                        item.series = d.series.map(s => ({
                            numero_serie: s.numero_serie.trim()
                        }));
                    }

                    return item;
                })
            };

            const res = await transferirStock(emisorId, payload);
            const movNumero = res?.movimiento || res?.data?.numero || res?.data?.movimiento || '';
            const tipoMov = res?.tipo ? ` (${res.tipo.replace(/_/g, ' ')})` : '';

            setSuccess(`Transferencia ${movNumero ? movNumero + ' ' : ''}${tipoMov} ejecutada correctamente.`);
            setOrigenId('');
            setDestinoId('');
            setObservacion('');
            setDetalles([{ producto_id: '', cantidad: 1, lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }]);
            
            if (onSuccess) onSuccess();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error en transferencia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#e0e7ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: 'inset 0 0 0 1px #c7d2fe' }}>
                    🔄
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Transferencia entre Bodegas (MOV-06 / MOV-11)
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
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                Bodega Origen <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select 
                                required 
                                value={origenId} 
                                onChange={e => handleOrigenChange(Number(e.target.value) || '')} 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a' }}
                            >
                                <option value="">Seleccione origen...</option>
                                {bodegas.filter(b => b.tipo !== TipoBodega.TRANSITO).map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: '1 1 300px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                Bodega Destino <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select 
                                required 
                                value={destinoId} 
                                onChange={e => setDestinoId(Number(e.target.value) || '')} 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a' }}
                            >
                                <option value="">Seleccione destino...</option>
                                {bodegas.filter(b => b.tipo !== TipoBodega.TRANSITO && b.id !== origenId).map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.nombre} ({b.tipo}){b.tipo === TipoBodega.MERMAS ? ' 🗑️ [ENVÍO A MERMAS]' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                            Observación / Justificación <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea 
                            required
                            rows={2} 
                            value={observacion} 
                            onChange={e => setObservacion(e.target.value)} 
                            style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a', boxSizing: 'border-box' }}
                            placeholder="Motivo de la transferencia (Obligatorio)..."
                        />
                    </div>

                    {/* Detalle de Productos */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📦 Productos a Transferir
                        </h3>
                        
                        {productos.length === 0 && !loadingData && (
                            <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', fontSize: '0.85rem', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>⚠️ No se encontraron productos cargados para este emisor.</span>
                                <button type="button" onClick={loadFormData} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                                    🔄 Recargar Productos
                                </button>
                            </div>
                        )}
                        
                        {detalles.map((detalle, index) => {
                            const prod = productos.find(p => p.id === detalle.producto_id);
                            const tipoControl = prod?.tipo_control_inventario || TipoControlInventario.CANTIDAD;

                            const sumaLotes = detalle.lotes.reduce((acc, l) => acc + (parseFloat(String(l.cantidad)) || 0), 0);
                            const lotesCuadran = Math.abs(sumaLotes - detalle.cantidad) < 0.000001;

                            const seriesLlenas = detalle.series.filter(s => s.numero_serie.trim() !== '').length;
                            const seriesCuadran = seriesLlenas === Math.round(detalle.cantidad);

                            const lotesOptions = (prod?.id && lotesDisponibles[prod.id]) || [];
                            const seriesOptions = (prod?.id && seriesDisponibles[prod.id]) || [];

                            return (
                                <div key={index} style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 280px' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                                Producto
                                            </label>
                                            <select 
                                                required 
                                                value={detalle.producto_id} 
                                                onChange={e => handleProductoChange(index, Number(e.target.value) || '')} 
                                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                                            >
                                                <option value="">
                                                    {loadingData ? '⏳ Cargando productos...' : productos.length === 0 ? '⚠️ No hay productos disponibles' : 'Seleccione producto...'}
                                                </option>
                                                {productos.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.codigo} - {p.nombre} ({p.tipo_control_inventario})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ width: '140px' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                                Cantidad Total
                                            </label>
                                            <input 
                                                type="number" 
                                                required 
                                                min="0.000001" 
                                                step={tipoControl === TipoControlInventario.SERIE ? "1" : "0.000001"} 
                                                value={detalle.cantidad} 
                                                onChange={e => handleCantidadChange(index, parseFloat(e.target.value) || 0)} 
                                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} 
                                            />
                                        </div>

                                        {tipoControl !== TipoControlInventario.CANTIDAD && (
                                            <div style={{ paddingBottom: '10px' }}>
                                                <span style={{
                                                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                                                    backgroundColor: tipoControl === TipoControlInventario.LOTE ? '#fef3c7' : '#ede9fe',
                                                    color: tipoControl === TipoControlInventario.LOTE ? '#92400e' : '#5b21b6',
                                                    border: `1px solid ${tipoControl === TipoControlInventario.LOTE ? '#fde68a' : '#ddd6fe'}`
                                                }}>
                                                    Control: {tipoControl}
                                                </span>
                                            </div>
                                        )}

                                        <button 
                                            type="button" 
                                            onClick={() => setDetalles(detalles.filter((_, i) => i !== index))} 
                                            style={{ padding: '10px 14px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer' }} 
                                            title="Eliminar producto"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    {/* SUB-SECCIÓN: CONTROL POR LOTE */}
                                    {tipoControl === TipoControlInventario.LOTE && (
                                        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                                                    🏷️ Desglose de Lotes ({sumaLotes} de {detalle.cantidad})
                                                </span>
                                                <span style={{
                                                    fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
                                                    backgroundColor: lotesCuadran ? '#dcfce7' : '#fee2e2',
                                                    color: lotesCuadran ? '#166534' : '#991b1b'
                                                }}>
                                                    {lotesCuadran ? '✅ Cuadre exacto' : `⚠️ Diferencia: ${(detalle.cantidad - sumaLotes).toFixed(4)}`}
                                                </span>
                                            </div>

                                            {detalle.lotes.map((lote, lIdx) => (
                                                <div key={lIdx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: '1 1 200px' }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Seleccionar o escribir Nº Lote" 
                                                            value={lote.numero_lote} 
                                                            onChange={e => updateLoteRow(index, lIdx, 'numero_lote', e.target.value)} 
                                                            list={`trf-lotes-list-${index}`}
                                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                                                        />
                                                        {lotesOptions.length > 0 && (
                                                            <datalist id={`trf-lotes-list-${index}`}>
                                                                {lotesOptions.map((lo: any, loIdx: number) => (
                                                                    <option key={loIdx} value={lo.lote?.numero_lote}>
                                                                        Stock origen: {lo.stock_disponible}
                                                                    </option>
                                                                ))}
                                                            </datalist>
                                                        )}
                                                    </div>
                                                    <div style={{ width: '120px' }}>
                                                        <input 
                                                            type="number" 
                                                            placeholder="Cantidad" 
                                                            min="0.000001" 
                                                            step="0.000001" 
                                                            value={lote.cantidad} 
                                                            onChange={e => updateLoteRow(index, lIdx, 'cantidad', parseFloat(e.target.value) || 0)} 
                                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                                                        />
                                                    </div>
                                                    {detalle.lotes.length > 1 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeLoteRow(index, lIdx)} 
                                                            style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            <button 
                                                type="button" 
                                                onClick={() => addLoteRow(index)} 
                                                style={{ marginTop: '6px', padding: '6px 12px', backgroundColor: 'white', color: '#b45309', border: '1px dashed #f59e0b', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                + Añadir otro lote
                                            </button>
                                        </div>
                                    )}

                                    {/* SUB-SECCIÓN: CONTROL POR SERIE */}
                                    {tipoControl === TipoControlInventario.SERIE && (
                                        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f5f3ff', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#5b21b6' }}>
                                                    🔢 Series ({seriesLlenas} de {Math.round(detalle.cantidad)})
                                                </span>
                                                <span style={{
                                                    fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
                                                    backgroundColor: seriesCuadran ? '#dcfce7' : '#fee2e2',
                                                    color: seriesCuadran ? '#166534' : '#991b1b'
                                                }}>
                                                    {seriesCuadran ? '✅ Todas las series asignadas' : `⚠️ Faltan ${Math.max(0, Math.round(detalle.cantidad) - seriesLlenas)}`}
                                                </span>
                                            </div>

                                            {seriesOptions.length > 0 && (
                                                <div style={{ marginBottom: '10px', fontSize: '0.75rem', color: '#6d28d9' }}>
                                                    <strong>Series disponibles en origen: </strong>
                                                    {seriesOptions.slice(0, 10).map((so: any, soIdx: number) => (
                                                        <button 
                                                            key={soIdx} 
                                                            type="button" 
                                                            onClick={() => {
                                                                const emptyIdx = detalle.series.findIndex(s => !s.numero_serie.trim());
                                                                if (emptyIdx !== -1) {
                                                                    updateSerieRow(index, emptyIdx, so.numero_serie);
                                                                } else {
                                                                    const newDetalles = [...detalles];
                                                                    newDetalles[index].series.push({ numero_serie: so.numero_serie });
                                                                    newDetalles[index].cantidad = newDetalles[index].series.length;
                                                                    setDetalles(newDetalles);
                                                                }
                                                            }}
                                                            style={{ margin: '2px 4px', padding: '2px 6px', backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                        >
                                                            +{so.numero_serie}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                                                {detalle.series.map((serie, sIdx) => (
                                                    <div key={sIdx} style={{ display: 'flex', gap: '4px' }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder={`Serie #${sIdx + 1}`} 
                                                            value={serie.numero_serie} 
                                                            onChange={e => updateSerieRow(index, sIdx, e.target.value)} 
                                                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} 
                                                        />
                                                        {detalle.series.length > 1 && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeSerieRow(index, sIdx)} 
                                                                style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <button 
                                                    type="button" 
                                                    onClick={() => addSerieRow(index)} 
                                                    style={{ padding: '6px 12px', backgroundColor: 'white', color: '#6d28d9', border: '1px dashed #8b5cf6', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    + Añadir serie
                                                </button>
                                                <input 
                                                    type="text" 
                                                    placeholder="Pegar series separadas por coma..." 
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handlePegarSeries(index, (e.target as HTMLInputElement).value);
                                                            (e.target as HTMLInputElement).value = '';
                                                        }
                                                    }}
                                                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <button 
                            type="button" 
                            onClick={() => setDetalles([...detalles, { producto_id: '', cantidad: 1, lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }])} 
                            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#4f46e5', border: '1px dashed #a5b4fc', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            + Añadir Producto
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            style={{
                                backgroundColor: '#4f46e5', color: 'white', padding: '14px 32px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Procesando...' : 'Ejecutar Transferencia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
