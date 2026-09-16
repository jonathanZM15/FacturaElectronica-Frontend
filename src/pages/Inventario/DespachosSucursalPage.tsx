import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/userContext';
import { Bodega, Producto, TipoBodega, TipoProducto, TipoControlInventario } from '../../types/inventory';
import { 
    getBodegas, 
    getProductos, 
    getExistenciasLotes, 
    getExistenciasSeries, 
    despacharSucursal, 
    getDespachos, 
    descargarSucursal, 
    recibirSucursal 
} from '../../services/inventoryService';

interface LoteDespacho {
    numero_lote: string;
    cantidad: number;
}

interface SerieDespacho {
    numero_serie: string;
}

interface DetalleDespacho {
    producto_id: number | '';
    cantidad: number;
    lotes: LoteDespacho[];
    series: SerieDespacho[];
}

export default function DespachosSucursalPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 6;

    const [activeTab, setActiveTab] = useState<'despachar' | 'transito' | 'recibir'>('transito');
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- ESTADOS SUB-PANTALLA 1: DESPACHAR ---
    const [origenId, setOrigenId] = useState<number | ''>('');
    const [destinoId, setDestinoId] = useState<number | ''>('');
    const [observacionDespacho, setObservacionDespacho] = useState('');
    const [detallesDespacho, setDetallesDespacho] = useState<DetalleDespacho[]>([
        { producto_id: '', cantidad: 1, lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }
    ]);
    const [lotesDisponibles, setLotesDisponibles] = useState<Record<number, any[]>>({});
    const [seriesDisponibles, setSeriesDisponibles] = useState<Record<number, any[]>>({});

    // --- ESTADOS SUB-PANTALLA 2 & 3: ENVÍOS ---
    const [despachosPendientes, setDespachosPendientes] = useState<any[]>([]);
    const [despachosDescargados, setDespachosDescargados] = useState<any[]>([]);
    const [loadingEnvios, setLoadingEnvios] = useState(false);

    // Modal Descargar
    const [movToDescargar, setMovToDescargar] = useState<any | null>(null);
    const [obsDescarga, setObsDescarga] = useState('');

    // Formulario Recepción
    const [selectedMovRecibir, setSelectedMovRecibir] = useState<any | null>(null);
    const [bodegaIncidenciaId, setBodegaIncidenciaId] = useState<number | ''>('');
    const [obsRecepcion, setObsRecepcion] = useState('');
    const [detallesRecepcion, setDetallesRecepcion] = useState<Record<number, {
        cantidad_buena: number;
        cantidad_faltante: number;
        cantidad_danada: number;
        cantidad_sobrante: number;
        lotes: Record<string, { buena: number; faltante: number; danada: number; sobrante: number }>;
        series: Record<string, 'BUENA' | 'FALTANTE' | 'DANADA'>;
    }>>({});

    useEffect(() => {
        getBodegas(emisorId).then(setBodegas).catch(console.error);
        getProductos(emisorId).then(data => {
            const arr = Array.isArray(data) ? data : (data as any)?.data || [];
            setProductos(arr.filter((p: any) => !p.tipo || p.tipo === TipoProducto.FISICO || p.tipo === 'FISICO'));
        }).catch(console.error);
    }, [emisorId]);

    const loadEnvios = useCallback(async () => {
        try {
            setLoadingEnvios(true);
            const [resPend, resDesc] = await Promise.all([
                getDespachos(emisorId, 1, { estado_operativo_recepcion: 'PENDIENTE_DE_DESCARGA' }),
                getDespachos(emisorId, 1, { estado_operativo_recepcion: 'DESCARGA_REGISTRADA' })
            ]);
            setDespachosPendientes(resPend.data || []);
            setDespachosDescargados(resDesc.data || []);
        } catch (err) {
            console.error('Error cargando envíos:', err);
        } finally {
            setLoadingEnvios(false);
        }
    }, [emisorId]);

    useEffect(() => {
        loadEnvios();
    }, [loadEnvios]);

    // Lotes y Series en origen
    const fetchExistenciasOrigen = async (prodId: number, bOrigenId: number | '') => {
        if (!bOrigenId || !prodId) return;
        const prod = productos.find(p => p.id === prodId);
        if (!prod) return;

        if (prod.tipo_control_inventario === TipoControlInventario.LOTE) {
            try {
                const res = await getExistenciasLotes(emisorId, { producto_id: prodId, bodega_id: bOrigenId, solo_con_stock: 1 });
                setLotesDisponibles(prev => ({ ...prev, [prodId]: res.data || [] }));
            } catch (err) {
                console.error('Error cargando lotes:', err);
            }
        } else if (prod.tipo_control_inventario === TipoControlInventario.SERIE) {
            try {
                const res = await getExistenciasSeries(emisorId, { producto_id: prodId, bodega_id: bOrigenId, estado: 'DISPONIBLE' });
                setSeriesDisponibles(prev => ({ ...prev, [prodId]: res.data || [] }));
            } catch (err) {
                console.error('Error cargando series:', err);
            }
        }
    };

    // --- ACCIONES SUB-PANTALLA 1: DESPACHAR ---
    const handleDespacharSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setError('');
        setSuccess('');

        if (!origenId || !destinoId) {
            setError('Debe seleccionar origen y destino');
            return;
        }

        const bOrigen = bodegas.find(b => b.id === origenId);
        const bDestino = bodegas.find(b => b.id === destinoId);

        if (bOrigen && bDestino && (bOrigen as any).establecimiento_id === (bDestino as any).establecimiento_id) {
            setError('El despacho entre sucursales exige que las bodegas pertenezcan a ESTABLECIMIENTOS DISTINTOS. Para bodegas del mismo establecimiento, use "Transferencias Internas".');
            return;
        }

        if (!observacionDespacho.trim()) {
            setError('La observación es obligatoria');
            return;
        }

        const validDetalles = detallesDespacho.filter(d => d.producto_id !== '' && d.cantidad > 0);
        if (validDetalles.length === 0) {
            setError('Debe agregar al menos un producto válido');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                bodega_origen_id: Number(origenId),
                bodega_destino_id: Number(destinoId),
                observacion: observacionDespacho.trim(),
                detalles: validDetalles.map(d => {
                    const prod = productos.find(p => p.id === d.producto_id);
                    const item: any = { producto_id: Number(d.producto_id), cantidad: Number(d.cantidad) };
                    if (prod?.tipo_control_inventario === TipoControlInventario.LOTE) {
                        item.lotes = d.lotes.map(l => ({ numero_lote: l.numero_lote.trim(), cantidad: Number(l.cantidad) }));
                    } else if (prod?.tipo_control_inventario === TipoControlInventario.SERIE) {
                        item.series = d.series.map(s => ({ numero_serie: s.numero_serie.trim() }));
                    }
                    return item;
                })
            };

            const res = await despacharSucursal(emisorId, payload);
            setSuccess(`Despacho ${res.movimiento_numero || ''} registrado con éxito. Estado: PENDIENTE DE DESCARGA.`);
            setOrigenId('');
            setDestinoId('');
            setObservacionDespacho('');
            setDetallesDespacho([{ producto_id: '', cantidad: 1, lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }]);
            loadEnvios();
            setActiveTab('transito');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error registrando despacho');
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES SUB-PANTALLA 2: REGISTRAR DESCARGA ---
    const handleConfirmarDescarga = async () => {
        if (!movToDescargar || !obsDescarga.trim()) {
            setError('La observación de llegada/descarga es obligatoria');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await descargarSucursal(emisorId, movToDescargar.id, obsDescarga.trim());
            setSuccess(`Llegada de vehículo registrada para el despacho ${movToDescargar.numero}. Ahora está listo para recepción.`);
            setMovToDescargar(null);
            setObsDescarga('');
            loadEnvios();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error al registrar descarga');
        } finally {
            setLoading(false);
        }
    };

    // --- PREPARAR FORMULARIO RECEPCIÓN ---
    const iniciarRecepcion = (mov: any) => {
        setSelectedMovRecibir(mov);
        setBodegaIncidenciaId('');
        setObsRecepcion('');

        const inicialDetalles: any = {};
        (mov.detalles || []).forEach((det: any) => {
            const cantTotal = parseFloat(String(det.cantidad || 0));

            const lotesInit: any = {};
            (det.lotes || []).forEach((dl: any) => {
                const numLote = dl.lote?.numero_lote || dl.numero_lote || 'LOTE';
                const cLote = parseFloat(String(dl.cantidad || 0));
                lotesInit[numLote] = { buena: cLote, faltante: 0, danada: 0, sobrante: 0 };
            });

            const seriesInit: any = {};
            (det.series || []).forEach((ds: any) => {
                const numSerie = ds.serie?.numero_serie || ds.numero_serie || 'SN';
                seriesInit[numSerie] = 'BUENA';
            });

            inicialDetalles[det.id] = {
                cantidad_buena: cantTotal,
                cantidad_faltante: 0,
                cantidad_danada: 0,
                cantidad_sobrante: 0,
                lotes: lotesInit,
                series: seriesInit
            };
        });

        setDetallesRecepcion(inicialDetalles);
        setActiveTab('recibir');
    };

    // Comprobar si hay daño total en la recepción (para exigir o no bodega de incidencias)
    const tieneMercaderiaDanada = () => {
        return Object.values(detallesRecepcion).some(d => {
            if (d.cantidad_danada > 0) return true;
            return Object.values(d.series || {}).some(estado => estado === 'DANADA');
        });
    };

    const handleConfirmarRecepcion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMovRecibir || loading) return;
        setError('');
        setSuccess('');

        if (tieneMercaderiaDanada() && !bodegaIncidenciaId) {
            setError('⚠️ Se detectó mercadería DAÑADA. Debe seleccionar obligatoriamente una Bodega de Incidencias/Cuarentena para aislarla.');
            return;
        }

        if (!obsRecepcion.trim()) {
            setError('Debe ingresar una observación para la recepción.');
            return;
        }

        // Validar sumas por producto
        for (const det of (selectedMovRecibir.detalles || [])) {
            const data = detallesRecepcion[det.id];
            const cantEnviada = parseFloat(String(det.cantidad));
            const sumaRecep = (Number(data.cantidad_buena) || 0) + (Number(data.cantidad_faltante) || 0) + (Number(data.cantidad_danada) || 0);

            if (Math.abs(sumaRecep - cantEnviada) > 0.000001) {
                setError(`Descuadre en ${det.producto?.nombre}: Cantidad enviada (${cantEnviada}) debe ser igual a Buena (${data.cantidad_buena}) + Faltante (${data.cantidad_faltante}) + Dañada (${data.cantidad_danada}).`);
                return;
            }
        }

        setLoading(true);
        try {
            const payload = {
                bodega_incidencia_id: bodegaIncidenciaId ? Number(bodegaIncidenciaId) : null,
                observacion: obsRecepcion.trim(),
                detalles: (selectedMovRecibir.detalles || []).map((det: any) => {
                    const data = detallesRecepcion[det.id];
                    const prod = det.producto;

                    const item: any = {
                        producto_id: det.producto_id,
                        cantidad_buena: Number(data.cantidad_buena) || 0,
                        cantidad_faltante: Number(data.cantidad_faltante) || 0,
                        cantidad_danada: Number(data.cantidad_danada) || 0,
                        cantidad_sobrante: Number(data.cantidad_sobrante) || 0
                    };

                    if (prod?.tipo_control_inventario === TipoControlInventario.LOTE) {
                        item.lotes = Object.entries(data.lotes || {}).map(([numLote, lData]: [string, any]) => ({
                            numero_lote: numLote,
                            cantidad_buena: Number(lData.buena) || 0,
                            cantidad_faltante: Number(lData.faltante) || 0,
                            cantidad_danada: Number(lData.danada) || 0,
                            cantidad_sobrante: Number(lData.sobrante) || 0
                        }));
                    } else if (prod?.tipo_control_inventario === TipoControlInventario.SERIE) {
                        item.series = Object.entries(data.series || {}).map(([numSerie, estado]: [string, any]) => ({
                            numero_serie: numSerie,
                            estado_recepcion: estado
                        }));
                    }

                    return item;
                })
            };

            const res = await recibirSucursal(emisorId, selectedMovRecibir.id, payload);
            setSuccess(`Recepción confirmada exitosamente. Se generó el movimiento ${res.movimiento_numero || ''}.`);
            setSelectedMovRecibir(null);
            loadEnvios();
            setActiveTab('transito');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error confirmando recepción');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Header */}
            <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        🚚
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                            Transferencias entre Sucursales (MOV-07 / MOV-08)
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Despacho inter-establecimientos con custodia en tránsito, registro de llegada y recepción con incidencias
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '6px', borderRadius: '14px' }}>
                    <button
                        onClick={() => setActiveTab('transito')}
                        style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === 'transito' ? 'white' : 'transparent',
                            color: activeTab === 'transito' ? '#4f46e5' : '#64748b'
                        }}
                    >
                        🚛 Envíos en Tránsito ({despachosPendientes.length + despachosDescargados.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('despachar')}
                        style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === 'despachar' ? 'white' : 'transparent',
                            color: activeTab === 'despachar' ? '#4f46e5' : '#64748b'
                        }}
                    >
                        ➕ Nuevo Despacho
                    </button>
                    {selectedMovRecibir && (
                        <button
                            onClick={() => setActiveTab('recibir')}
                            style={{
                                padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                backgroundColor: activeTab === 'recibir' ? 'white' : 'transparent',
                                color: activeTab === 'recibir' ? '#15803d' : '#64748b'
                            }}
                        >
                            📦 Recibir {selectedMovRecibir.numero}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', fontSize: '0.95rem', color: '#b91c1c', borderRadius: '12px' }}>
                    ⚠️ {error}
                </div>
            )}
            {success && (
                <div style={{ marginBottom: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', fontSize: '0.95rem', color: '#15803d', borderRadius: '12px' }}>
                    ✅ {success}
                </div>
            )}

            {/* TAB 1: NUEVO DESPACHO (MOV-07) */}
            {activeTab === 'despachar' && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
                        Crear Despacho a Otra Sucursal
                    </h2>
                    <form onSubmit={handleDespacharSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Bodega Origen <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select 
                                    required 
                                    value={origenId} 
                                    onChange={e => {
                                        const val = Number(e.target.value) || '';
                                        setOrigenId(val);
                                        detallesDespacho.forEach(d => { if (d.producto_id) fetchExistenciasOrigen(Number(d.producto_id), val); });
                                    }}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                >
                                    <option value="">Seleccione origen...</option>
                                    {bodegas.filter(b => b.tipo !== TipoBodega.TRANSITO).map(b => (
                                        <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ flex: '1 1 300px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Bodega Destino (Sucursal Distinta) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select 
                                    required 
                                    value={destinoId} 
                                    onChange={e => setDestinoId(Number(e.target.value) || '')}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                >
                                    <option value="">Seleccione destino...</option>
                                    {bodegas.filter(b => b.tipo !== TipoBodega.TRANSITO && b.id !== origenId).map(b => (
                                        <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                Observación / Manifiesto de Carga <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea 
                                required 
                                rows={2} 
                                value={observacionDespacho} 
                                onChange={e => setObservacionDespacho(e.target.value)} 
                                placeholder="Ej. Chofer: Juan Pérez, Placa: ABC-1234, Ruta Guayaquil -> Quito..."
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Detalle */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                                Mercadería a Cargar en Camión
                            </h3>
                            {detallesDespacho.map((det, index) => {
                                const prod = productos.find(p => p.id === det.producto_id);
                                const tipoControl = prod?.tipo_control_inventario || TipoControlInventario.CANTIDAD;
                                const sumaLotes = det.lotes.reduce((acc, l) => acc + (parseFloat(String(l.cantidad)) || 0), 0);
                                const lotesOptions = (prod?.id && lotesDisponibles[prod.id]) || [];
                                const seriesOptions = (prod?.id && seriesDisponibles[prod.id]) || [];

                                return (
                                    <div key={index} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                            <div style={{ flex: '1 1 260px' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Producto</label>
                                                <select 
                                                    required 
                                                    value={det.producto_id} 
                                                    onChange={e => {
                                                        const pId = Number(e.target.value) || '';
                                                        const newD = [...detallesDespacho];
                                                        newD[index].producto_id = pId;
                                                        if (pId) fetchExistenciasOrigen(pId, origenId);
                                                        setDetallesDespacho(newD);
                                                    }}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                >
                                                    <option value="">Seleccione producto...</option>
                                                    {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                                                </select>
                                            </div>

                                            <div style={{ width: '120px' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Cantidad</label>
                                                <input 
                                                    type="number" 
                                                    required 
                                                    min="0.000001" 
                                                    step="0.000001" 
                                                    value={det.cantidad} 
                                                    onChange={e => {
                                                        const newD = [...detallesDespacho];
                                                        newD[index].cantidad = parseFloat(e.target.value) || 0;
                                                        setDetallesDespacho(newD);
                                                    }}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                                />
                                            </div>

                                            <button 
                                                type="button" 
                                                onClick={() => setDetallesDespacho(detallesDespacho.filter((_, i) => i !== index))}
                                                style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>

                                        {tipoControl === TipoControlInventario.LOTE && (
                                            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                                                    Lotes (Suma: {sumaLotes} / {det.cantidad})
                                                </div>
                                                {det.lotes.map((l, lIdx) => (
                                                    <div key={lIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nº Lote" 
                                                            value={l.numero_lote} 
                                                            onChange={e => {
                                                                const newD = [...detallesDespacho];
                                                                newD[index].lotes[lIdx].numero_lote = e.target.value;
                                                                setDetallesDespacho(newD);
                                                            }}
                                                            list={`desp-lotes-${index}`}
                                                            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                                        />
                                                        {lotesOptions.length > 0 && (
                                                            <datalist id={`desp-lotes-${index}`}>
                                                                {lotesOptions.map((lo: any, idx: number) => <option key={idx} value={lo.lote?.numero_lote}>Stock: {lo.stock_disponible}</option>)}
                                                            </datalist>
                                                        )}
                                                        <input 
                                                            type="number" 
                                                            placeholder="Cantidad" 
                                                            value={l.cantidad} 
                                                            onChange={e => {
                                                                const newD = [...detallesDespacho];
                                                                newD[index].lotes[lIdx].cantidad = parseFloat(e.target.value) || 0;
                                                                setDetallesDespacho(newD);
                                                            }}
                                                            style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                                        />
                                                    </div>
                                                ))}
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const newD = [...detallesDespacho];
                                                        newD[index].lotes.push({ numero_lote: '', cantidad: 1 });
                                                        setDetallesDespacho(newD);
                                                    }}
                                                    style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', border: '1px dashed #f59e0b', backgroundColor: 'white', color: '#b45309', cursor: 'pointer' }}
                                                >
                                                    + Añadir lote
                                                </button>
                                            </div>
                                        )}

                                        {tipoControl === TipoControlInventario.SERIE && (
                                            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f5f3ff', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6', marginBottom: '6px' }}>
                                                    Series ({det.series.filter(s => s.numero_serie.trim()).length} de {Math.round(det.cantidad)})
                                                </div>
                                                {seriesOptions.length > 0 && (
                                                    <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: '#6d28d9' }}>
                                                        {seriesOptions.slice(0, 8).map((so: any, sIdx: number) => (
                                                            <button 
                                                                key={sIdx} 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const newD = [...detallesDespacho];
                                                                    const empty = newD[index].series.findIndex(s => !s.numero_serie.trim());
                                                                    if (empty !== -1) newD[index].series[empty].numero_serie = so.numero_serie;
                                                                    else {
                                                                        newD[index].series.push({ numero_serie: so.numero_serie });
                                                                        newD[index].cantidad = newD[index].series.length;
                                                                    }
                                                                    setDetallesDespacho(newD);
                                                                }}
                                                                style={{ margin: '2px 4px', padding: '2px 6px', backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                            >
                                                                +{so.numero_serie}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {det.series.map((s, sIdx) => (
                                                    <div key={sIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder={`Serie #${sIdx + 1}`} 
                                                            value={s.numero_serie} 
                                                            onChange={e => {
                                                                const newD = [...detallesDespacho];
                                                                newD[index].series[sIdx].numero_serie = e.target.value;
                                                                setDetallesDespacho(newD);
                                                            }}
                                                            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button 
                                type="button" 
                                onClick={() => setDetallesDespacho([...detallesDespacho, { producto_id: '', cantidad: 1, lotes: [{ numero_lote: '', cantidad: 1 }], series: [{ numero_serie: '' }] }])}
                                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px dashed #4f46e5', backgroundColor: 'white', color: '#4f46e5', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                + Añadir Producto
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                type="submit" 
                                disabled={loading}
                                style={{ padding: '12px 28px', borderRadius: '10px', backgroundColor: '#4f46e5', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {loading ? 'Despachando...' : 'Despachar a Tránsito'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 2: ENVÍOS EN TRÁNSITO */}
            {activeTab === 'transito' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Sección 1: En Camino (Pendiente de Descarga) */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🚛</span> Vehículos en Tránsito (Pendientes de Llegada)
                            </h2>
                            <button onClick={loadEnvios} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                                Actualizar
                            </button>
                        </div>

                        {loadingEnvios ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Cargando despachos...</div>
                        ) : despachosPendientes.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No hay vehículos en tránsito pendientes de llegada.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Nº Despacho</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Fecha</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Origen</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Destino</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Ítems</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {despachosPendientes.map((m: any) => (
                                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }}>{m.numero}</td>
                                                <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.85rem' }}>{new Date(m.created_at || m.fecha).toLocaleString()}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{m.bodega_origen?.nombre || 'Origen'}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{m.bodega_destino?.nombre || 'Destino'}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{(m.detalles || []).length} productos</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                    <button 
                                                        onClick={() => { setMovToDescargar(m); setObsDescarga('Vehículo arribado sin novedad física aparente'); }}
                                                        style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#2563eb', color: 'white', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        📥 Registrar Llegada
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Sección 2: Descargados (Listos para Recepción) */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📦</span> Mercadería en Andén (Listos para Recibir y Cuadrar)
                        </h2>
                        {despachosDescargados.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No hay despachos con descarga registrada pendientes de recepción.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Nº Despacho</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Origen</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Destino</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>Estado Logístico</th>
                                            <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {despachosDescargados.map((m: any) => (
                                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{m.numero}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{m.bodega_origen?.nombre || 'Origen'}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{m.bodega_destino?.nombre || 'Destino'}</td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 700 }}>
                                                        DESCARGA REGISTRADA
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                    <button 
                                                        onClick={() => iniciarRecepcion(m)}
                                                        style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#15803d', color: 'white', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        📋 Realizar Recepción (MOV-08)
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: SUB-PANTALLA DE RECEPCIÓN (MOV-08) */}
            {activeTab === 'recibir' && selectedMovRecibir && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                Recepción Física de Despacho: {selectedMovRecibir.numero}
                            </h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                Bodega Destino: <strong>{selectedMovRecibir.bodega_destino?.nombre}</strong> | Tránsito Custodia
                            </p>
                        </div>
                        <button onClick={() => setActiveTab('transito')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem', cursor: 'pointer' }}>
                            ← Volver a Envíos
                        </button>
                    </div>

                    <form onSubmit={handleConfirmarRecepcion} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Selector de Bodega de Incidencias: Requerido SOLO si hay dañados */}
                        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: tieneMercaderiaDanada() ? '#fef2f2' : '#f8fafc', border: `1px solid ${tieneMercaderiaDanada() ? '#fecaca' : '#e2e8f0'}` }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: tieneMercaderiaDanada() ? '#991b1b' : '#475569', marginBottom: '6px' }}>
                                Bodega de Incidencias / Cuarentena {tieneMercaderiaDanada() ? <span style={{ color: '#ef4444' }}>* (Obligatoria: Se detectó mercancía dañada)</span> : <span style={{ color: '#94a3b8' }}>(Solo requerida si hay unidades dañadas)</span>}
                            </label>
                            <select 
                                required={tieneMercaderiaDanada()}
                                value={bodegaIncidenciaId} 
                                onChange={e => setBodegaIncidenciaId(Number(e.target.value) || '')}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: 'white' }}
                            >
                                <option value="">Seleccione bodega de incidencias...</option>
                                {bodegas.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                Observación / Justificación de Recepción <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea 
                                required 
                                rows={2} 
                                value={obsRecepcion} 
                                onChange={e => setObsRecepcion(e.target.value)} 
                                placeholder="Informe del estado de la carga recibida..."
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Comparativa por producto */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(selectedMovRecibir.detalles || []).map((det: any) => {
                                const data = detallesRecepcion[det.id] || { cantidad_buena: 0, cantidad_faltante: 0, cantidad_danada: 0, cantidad_sobrante: 0, lotes: {}, series: {} };
                                const prod = det.producto;
                                const cantEnviada = parseFloat(String(det.cantidad));
                                const sumaRecep = (Number(data.cantidad_buena) || 0) + (Number(data.cantidad_faltante) || 0) + (Number(data.cantidad_danada) || 0);
                                const cuadra = Math.abs(sumaRecep - cantEnviada) < 0.000001;

                                return (
                                    <div key={det.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#ffffff' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                            <div>
                                                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{prod?.nombre}</strong> ({prod?.codigo})
                                                <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#64748b' }}>Despachado: <strong>{cantEnviada}</strong></span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: cuadra ? '#15803d' : '#b91c1c' }}>
                                                {cuadra ? '✅ Suma cuadra (Buena+Faltante+Dañada)' : `⚠️ Descuadre: Suma = ${sumaRecep} vs Enviada = ${cantEnviada}`}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>Buena (Aceptada)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.000001" 
                                                    value={data.cantidad_buena} 
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setDetallesRecepcion(prev => ({
                                                            ...prev,
                                                            [det.id]: { ...prev[det.id], cantidad_buena: val }
                                                        }));
                                                    }}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>Faltante (Queda en Tránsito)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.000001" 
                                                    value={data.cantidad_faltante} 
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setDetallesRecepcion(prev => ({
                                                            ...prev,
                                                            [det.id]: { ...prev[det.id], cantidad_faltante: val }
                                                        }));
                                                    }}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>Dañada (A Cuarentena)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.000001" 
                                                    value={data.cantidad_danada} 
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setDetallesRecepcion(prev => ({
                                                            ...prev,
                                                            [det.id]: { ...prev[det.id], cantidad_danada: val }
                                                        }));
                                                    }}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5' }}>Sobrante (Extra)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.000001" 
                                                    value={data.cantidad_sobrante} 
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setDetallesRecepcion(prev => ({
                                                            ...prev,
                                                            [det.id]: { ...prev[det.id], cantidad_sobrante: val }
                                                        }));
                                                    }}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Series asociadas al despacho */}
                                        {prod?.tipo_control_inventario === TipoControlInventario.SERIE && Object.keys(data.series || {}).length > 0 && (
                                            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                                    Estado de las Series Recibidas:
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {Object.entries(data.series || {}).map(([sn, estado]) => (
                                                        <div key={sn} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px' }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{sn}</span>
                                                            <select 
                                                                value={estado} 
                                                                onChange={e => {
                                                                    const val = e.target.value as any;
                                                                    setDetallesRecepcion(prev => ({
                                                                        ...prev,
                                                                        [det.id]: {
                                                                            ...prev[det.id],
                                                                            series: { ...prev[det.id].series, [sn]: val }
                                                                        }
                                                                    }));
                                                                }}
                                                                style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                            >
                                                                <option value="BUENA">Buena</option>
                                                                <option value="FALTANTE">Faltante</option>
                                                                <option value="DANADA">Dañada</option>
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button 
                                type="button" 
                                onClick={() => setActiveTab('transito')}
                                style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                style={{ padding: '12px 28px', borderRadius: '10px', backgroundColor: '#15803d', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {loading ? 'Confirmando...' : 'Confirmar Recepción Definitiva'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL REGISTRAR LLEGADA / DESCARGA */}
            {movToDescargar && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#0f172a' }}>
                            Registrar Llegada de Camión
                        </h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
                            Despacho <strong>{movToDescargar.numero}</strong>. Al registrar la llegada, la mercadería pasa a estado "Descarga Registrada", habilitando su conteo y recepción física.
                        </p>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                Observación de Recepción del Camión <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea 
                                rows={3} 
                                value={obsDescarga} 
                                onChange={e => setObsDescarga(e.target.value)} 
                                placeholder="Ej. Camión arribó a las 14:30 con sellos intactos..."
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button 
                                onClick={() => setMovToDescargar(null)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmarDescarga}
                                disabled={loading}
                                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {loading ? 'Registrando...' : 'Confirmar Llegada'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
