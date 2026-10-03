import React, { useState, useEffect } from 'react';
import { Bodega, Producto, AjustePayload, TipoProducto, TipoControlInventario, MotivoMovimiento } from '../../types/inventory';
import { getBodegas, getProductos, ajustarStock, getExistenciasLotes, getExistenciasSeries, getStockEnBodega } from '../../services/inventoryService';
import { MotivoSelect } from './MotivoSelect';

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
    costo_unitario?: number | '';
    stock_actual?: number;
    lotes: LoteItem[];
    series: SerieItem[];
}

export const AjusteForm: React.FC<Props> = ({ emisorId, onSuccess }) => {
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [bodegaId, setBodegaId] = useState<number | ''>('');
    const [tipo, setTipo] = useState<'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO'>('AJUSTE_POSITIVO');
    const [motivoId, setMotivoId] = useState<number | ''>('');
    const [selectedMotivoObj, setSelectedMotivoObj] = useState<MotivoMovimiento | undefined>(undefined);
    const [observacion, setObservacion] = useState('');
    const [detalles, setDetalles] = useState<DetalleItem[]>([
        { producto_id: '', cantidad: 1, costo_unitario: '', lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }
    ]);

    // Existencias disponibles en la bodega para sugerir en AJUSTE_NEGATIVO
    const [lotesDisponibles, setLotesDisponibles] = useState<Record<number, any[]>>({});
    const [seriesDisponibles, setSeriesDisponibles] = useState<Record<number, any[]>>({});

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
            console.error('Error cargando bodegas/productos en AjusteForm:', err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadFormData();
    }, [emisorId]);

    // Cargar existencias de lotes o series si es ajuste negativo y hay bodega seleccionada
    const fetchExistenciasProducto = async (prodId: number) => {
        if (!bodegaId || tipo !== 'AJUSTE_NEGATIVO') return;
        const prod = productos.find(p => p.id === prodId);
        if (!prod) return;

        if (prod.tipo_control_inventario === TipoControlInventario.LOTE) {
            try {
                const res = await getExistenciasLotes(emisorId, { producto_id: prodId, bodega_id: bodegaId, solo_con_stock: 1 });
                setLotesDisponibles(prev => ({ ...prev, [prodId]: res.data || [] }));
            } catch (err) {
                console.error('Error cargando lotes disponibles:', err);
            }
        } else if (prod.tipo_control_inventario === TipoControlInventario.SERIE) {
            try {
                const res = await getExistenciasSeries(emisorId, { producto_id: prodId, bodega_id: bodegaId, estado: 'DISPONIBLE' });
                setSeriesDisponibles(prev => ({ ...prev, [prodId]: res.data || [] }));
            } catch (err) {
                console.error('Error cargando series disponibles:', err);
            }
        }
    };

    const handleProductoChange = (index: number, prodId: number | '') => {
        const newDetalles = [...detalles];
        newDetalles[index].producto_id = prodId;

        if (prodId !== '') {
            const prod = productos.find(p => p.id === prodId);
            const tipoControl = prod?.tipo_control_inventario;

            if (bodegaId) {
                getStockEnBodega(emisorId, bodegaId, prodId).then(stock => {
                    setDetalles(curr => {
                        const next = [...curr];
                        if (next[index] && next[index].producto_id === prodId) {
                            next[index] = { ...next[index], stock_actual: stock };
                        }
                        return next;
                    });
                }).catch(() => {});
            }

            if (tipoControl === TipoControlInventario.LOTE) {
                newDetalles[index].lotes = [{ numero_lote: '', cantidad: newDetalles[index].cantidad || 1 }];
                fetchExistenciasProducto(prodId);
            } else if (tipoControl === TipoControlInventario.SERIE) {
                const cant = Math.max(1, Math.round(newDetalles[index].cantidad || 1));
                newDetalles[index].cantidad = cant;
                newDetalles[index].series = Array.from({ length: cant }, () => ({ numero_serie: '' }));
                fetchExistenciasProducto(prodId);
            }
        } else {
            newDetalles[index].stock_actual = undefined;
        }

        setDetalles(newDetalles);
    };

    const handleCantidadChange = (index: number, nuevaCantidad: number) => {
        const newDetalles = [...detalles];
        newDetalles[index].cantidad = nuevaCantidad;

        const prodId = newDetalles[index].producto_id;
        const prod = productos.find(p => p.id === prodId);

        if (prod?.tipo_control_inventario === TipoControlInventario.LOTE) {
            // Si solo hay un lote, ajustar automáticamente su cantidad
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

    // Manejo de Lotes
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

    // Manejo de Series
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
        
        if (!bodegaId) {
            setError('Debe seleccionar una bodega');
            return;
        }

        if (!motivoId) {
            setError('El motivo del movimiento es obligatorio.');
            return;
        }

        const isOtro = selectedMotivoObj?.codigo?.endsWith('-99');
        if (isOtro && !observacion.trim()) {
            setError(`La observación general es obligatoria cuando el motivo seleccionado es Otro (${selectedMotivoObj?.codigo}).`);
            return;
        }

        const validDetalles = detalles.filter(d => d.producto_id !== '' && d.cantidad > 0);
        if (validDetalles.length === 0) {
            setError('Debe agregar al menos un producto válido');
            return;
        }

        // Validación estricta en UI de Lotes y Series
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
                    setError(`La suma de las cantidades de los lotes (${sumaLotes}) no coincide con la cantidad total (${d.cantidad}) para el producto ${nombreProd}.`);
                    return;
                }
                for (const l of d.lotes) {
                    if (!l.numero_lote.trim()) {
                        setError(`Existe un lote sin número asignado para ${nombreProd}.`);
                        return;
                    }
                    if (l.cantidad <= 0) {
                        setError(`La cantidad del lote ${l.numero_lote} debe ser mayor a 0 en ${nombreProd}.`);
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
                    setError(`Existen números de serie duplicados en la lista de ${nombreProd}.`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const payload: AjustePayload = {
                bodega_id: Number(bodegaId),
                tipo,
                motivo_id: Number(motivoId),
                observacion,
                detalles: validDetalles.map(d => {
                    const prod = productos.find(p => p.id === d.producto_id);
                    const tipoControl = prod?.tipo_control_inventario;

                    const item: any = {
                        producto_id: Number(d.producto_id),
                        cantidad: Number(d.cantidad),
                        costo_unitario: d.costo_unitario !== '' && d.costo_unitario !== undefined ? Number(d.costo_unitario) : 0
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

            const res = await ajustarStock(emisorId, payload);
            const movNumero = res?.data?.numero || res?.movimiento || res?.data?.movimiento || '';
            setSuccess(`Ajuste ${movNumero ? movNumero + ' ' : ''}ejecutado correctamente.`);
            setBodegaId('');
            setMotivoId('');
            setSelectedMotivoObj(undefined);
            setObservacion('');
            setDetalles([{ producto_id: '', cantidad: 1, costo_unitario: '', lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }]);
            
            if (onSuccess) onSuccess();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error en el ajuste');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#fff7ed', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', boxShadow: 'inset 0 0 0 1px #ffedd5' }}>
                    ⚙️
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Ajuste Manual de Inventario (MOV-09 / MOV-10)
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
                        <div style={{ flex: '1 1 250px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                Tipo de Ajuste <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select 
                                required 
                                value={tipo} 
                                onChange={e => {
                                    setTipo(e.target.value as any);
                                    setMotivoId('');
                                    setSelectedMotivoObj(undefined);
                                    // Limpiar existencias cacheadas al cambiar de tipo
                                    setLotesDisponibles({});
                                    setSeriesDisponibles({});
                                }} 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', color: '#0f172a' }}
                            >
                                <option value="AJUSTE_POSITIVO">📈 Ajuste Positivo (Entrada al inventario)</option>
                                <option value="AJUSTE_NEGATIVO">📉 Ajuste Negativo (Salida por desmedro/merma)</option>
                            </select>
                        </div>

                        <div style={{ flex: '1 1 250px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                Bodega Afectada <span style={{ color: '#ef4444' }}>*</span>
                                {loadingData && <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 400 }}>(cargando...)</span>}
                            </label>
                            <select 
                                required 
                                disabled={loadingData}
                                value={bodegaId} 
                                onChange={async e => {
                                    const bId = Number(e.target.value) || '';
                                    setBodegaId(bId);
                                    if (bId) {
                                        const updated = await Promise.all(detalles.map(async d => {
                                            if (d.producto_id) {
                                                fetchExistenciasProducto(Number(d.producto_id));
                                                const stock = await getStockEnBodega(emisorId, bId, Number(d.producto_id)).catch(() => 0);
                                                return { ...d, stock_actual: stock };
                                            }
                                            return d;
                                        }));
                                        setDetalles(updated);
                                    } else {
                                        setDetalles(prev => prev.map(d => ({ ...d, stock_actual: undefined })));
                                    }
                                }} 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: loadingData ? '#f1f5f9' : 'white', color: '#0f172a', cursor: loadingData ? 'wait' : 'pointer' }}
                            >
                                <option value="">{loadingData ? '⏳ Cargando bodegas...' : 'Seleccione bodega...'}</option>
                                {!loadingData && bodegas.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>
                        </div>

                        <MotivoSelect
                            emisorId={emisorId}
                            tipoMovimiento={tipo === 'AJUSTE_POSITIVO' ? 'MOV_09_AJUSTE_POSITIVO' : 'MOV_10_AJUSTE_NEGATIVO'}
                            value={motivoId}
                            onChange={(val, mot) => {
                                setMotivoId(val);
                                setSelectedMotivoObj(mot);
                            }}
                            required
                            label={tipo === 'AJUSTE_POSITIVO' ? 'Motivo Ajuste Positivo (MOV-09)' : 'Motivo Ajuste Negativo (MOV-10)'}
                            containerStyle={{ flex: '1 1 300px' }}
                        />
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
                            placeholder="Ej. Conteo físico de auditoría / Mercancía rota en almacén..."
                        />
                    </div>

                    {/* Detalle de Productos */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📦 Productos a Ajustar
                        </h3>
                        
                        {productos.length === 0 && !loadingData && (
                            <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', fontSize: '0.85rem', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>⚠️ No se encontraron productos cargados para este emisor.</span>
                                <button type="button" onClick={loadFormData} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                                    🔄 Recargar Productos
                                </button>
                            </div>
                        )}

                        {detalles.map((detalle, index) => {
                            const prod = productos.find(p => p.id === detalle.producto_id);
                            const tipoControl = prod?.tipo_control_inventario || TipoControlInventario.CANTIDAD;

                            // Cálculos de validación en vivo para LOTE
                            const sumaLotes = detalle.lotes.reduce((acc, l) => acc + (parseFloat(String(l.cantidad)) || 0), 0);
                            const lotesCuadran = Math.abs(sumaLotes - detalle.cantidad) < 0.000001;

                            // Cálculos de validación en vivo para SERIE
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

                                        {/* COLUMNA 1: STOCK ACTUAL */}
                                        <div style={{ width: '120px' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                                Stock Actual
                                            </label>
                                            <input 
                                                type="text" 
                                                readOnly 
                                                value={detalle.producto_id && bodegaId ? (detalle.stock_actual !== undefined ? Number(detalle.stock_actual).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '...') : '—'} 
                                                title="Stock físico disponible actualmente en la bodega seleccionada"
                                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, textAlign: 'right', boxSizing: 'border-box' }} 
                                            />
                                        </div>

                                        {/* COLUMNA 2: CANTIDAD AJUSTADA */}
                                        <div style={{ width: '130px' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                                Cant. Ajustada
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

                                        {/* COLUMNA 3: STOCK RESULTANTE PROYECTADO */}
                                        {(() => {
                                            const stockAct = detalle.stock_actual ?? 0;
                                            const cant = Number(detalle.cantidad) || 0;
                                            const proyectado = tipo === 'AJUSTE_POSITIVO' ? stockAct + cant : stockAct - cant;
                                            const esNegativoInvalido = tipo === 'AJUSTE_NEGATIVO' && proyectado < -0.000001;

                                            return (
                                                <div style={{ width: '130px' }}>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                                        Stock Resultante
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        readOnly 
                                                        value={detalle.producto_id && bodegaId ? proyectado.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'} 
                                                        title={esNegativoInvalido ? '¡Advertencia! El stock resultante sería negativo' : 'Stock proyectado tras el ajuste'}
                                                        style={{ 
                                                            width: '100%', padding: '10px 14px', 
                                                            border: `1px solid ${esNegativoInvalido ? '#fca5a5' : '#e2e8f0'}`, 
                                                            borderRadius: '10px', fontSize: '0.9rem', outline: 'none', 
                                                            backgroundColor: esNegativoInvalido ? '#fef2f2' : '#f8fafc', 
                                                            color: esNegativoInvalido ? '#b91c1c' : (proyectado > 0 ? '#15803d' : '#475569'), 
                                                            fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' 
                                                        }} 
                                                    />
                                                </div>
                                            );
                                        })()}

                                        {/* COSTO UNITARIO */}
                                        <div style={{ width: '130px' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                                Costo Unitario ($)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                step="0.000001" 
                                                placeholder="0.00"
                                                value={detalle.costo_unitario ?? ''} 
                                                onChange={e => {
                                                    const newDetalles = [...detalles];
                                                    newDetalles[index].costo_unitario = e.target.value === '' ? '' : parseFloat(e.target.value);
                                                    setDetalles(newDetalles);
                                                }} 
                                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} 
                                            />
                                        </div>

                                        {/* SUBTOTAL CALCULADO */}
                                        <div style={{ width: '120px' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                                Subtotal ($)
                                            </label>
                                            <input 
                                                type="text" 
                                                readOnly 
                                                value={`$ ${((Number(detalle.cantidad) || 0) * (Number(detalle.costo_unitario) || 0)).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }} 
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
                                                            placeholder="Nº Lote (ej. LOTE-2026)" 
                                                            value={lote.numero_lote} 
                                                            onChange={e => updateLoteRow(index, lIdx, 'numero_lote', e.target.value)} 
                                                            list={`lotes-list-${index}`}
                                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                                                        />
                                                        {lotesOptions.length > 0 && (
                                                            <datalist id={`lotes-list-${index}`}>
                                                                {lotesOptions.map((lo: any, loIdx: number) => (
                                                                    <option key={loIdx} value={lo.lote?.numero_lote}>
                                                                        Stock disp: {lo.stock_disponible}
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

                                            {/* Si hay series disponibles en bodega (ajuste negativo), mostrarlas para seleccionar rápidamente */}
                                            {seriesOptions.length > 0 && (
                                                <div style={{ marginBottom: '10px', fontSize: '0.75rem', color: '#6d28d9' }}>
                                                    <strong>Sugerencias en bodega: </strong>
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

                    {/* Barra de Resumen Acumulado */}
                    <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Ítems</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{detalles.filter(d => d.producto_id !== '').length}</span>
                            </div>
                            <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Unidades</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                    {detalles.reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                                </span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Costo Total Acumulado</span>
                            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: tipo === 'AJUSTE_POSITIVO' ? '#15803d' : '#ea580c' }}>
                                $ {detalles.reduce((acc, d) => acc + ((Number(d.cantidad) || 0) * (Number(d.costo_unitario) || 0)), 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            style={{
                                backgroundColor: tipo === 'AJUSTE_POSITIVO' ? '#10b981' : '#f97316', 
                                color: 'white', padding: '14px 32px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 4px 12px ${tipo === 'AJUSTE_POSITIVO' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(249, 115, 22, 0.25)'}`, transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Procesando...' : 'Ejecutar Ajuste'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
