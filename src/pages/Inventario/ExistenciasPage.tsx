import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/userContext';
import { Bodega, Producto } from '../../types/inventory';
import { 
    getBodegas, 
    getProductos, 
    getExistenciasConsolidado, 
    getExistenciasLotes, 
    getExistenciasSeries 
} from '../../services/inventoryService';

export default function ExistenciasPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 6;

    const [activeTab, setActiveTab] = useState<'consolidado' | 'lotes' | 'series'>('consolidado');
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);

    // Filtros
    const [filtroBodegaId, setFiltroBodegaId] = useState<string>('');
    const [filtroProductoId, setFiltroProductoId] = useState<string>('');
    const [filtroEstadoSerie, setFiltroEstadoSerie] = useState<string>('DISPONIBLE');
    const [soloConStock, setSoloConStock] = useState<boolean>(true);

    // Datos
    const [consolidadoData, setConsolidadoData] = useState<any[]>([]);
    const [lotesData, setLotesData] = useState<any[]>([]);
    const [seriesData, setSeriesData] = useState<any[]>([]);

    useEffect(() => {
        getBodegas(emisorId).then(setBodegas).catch(console.error);
        getProductos(emisorId).then(setProductos).catch(console.error);
    }, [emisorId]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filtroBodegaId) params.bodega_id = filtroBodegaId;
            if (filtroProductoId) params.producto_id = filtroProductoId;
            if (soloConStock) params.solo_con_stock = 1;

            if (activeTab === 'consolidado') {
                const res = await getExistenciasConsolidado(emisorId, params);
                setConsolidadoData(res.data || []);
            } else if (activeTab === 'lotes') {
                const res = await getExistenciasLotes(emisorId, params);
                setLotesData(res.data || []);
            } else if (activeTab === 'series') {
                if (filtroEstadoSerie) params.estado = filtroEstadoSerie;
                const res = await getExistenciasSeries(emisorId, params);
                setSeriesData(res.data || []);
            }
        } catch (err) {
            console.error('Error cargando existencias:', err);
        } finally {
            setLoading(false);
        }
    }, [emisorId, activeTab, filtroBodegaId, filtroProductoId, filtroEstadoSerie, soloConStock]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatNumber = (val: any) => {
        const n = parseFloat(String(val || 0));
        return isNaN(n) ? '0.00' : n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Header */}
            <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        📦
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                            Consulta de Existencias
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Visor integral de stock consolidado, existencias por lote y trazabilidad de series
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '6px', borderRadius: '14px' }}>
                    <button
                        onClick={() => setActiveTab('consolidado')}
                        style={{
                            padding: '8px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === 'consolidado' ? 'white' : 'transparent',
                            color: activeTab === 'consolidado' ? '#4f46e5' : '#64748b'
                        }}
                    >
                        📊 Consolidado Bodega
                    </button>
                    <button
                        onClick={() => setActiveTab('lotes')}
                        style={{
                            padding: '8px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === 'lotes' ? 'white' : 'transparent',
                            color: activeTab === 'lotes' ? '#4f46e5' : '#64748b'
                        }}
                    >
                        🏷️ Por Lotes
                    </button>
                    <button
                        onClick={() => setActiveTab('series')}
                        style={{
                            padding: '8px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === 'series' ? 'white' : 'transparent',
                            color: activeTab === 'series' ? '#4f46e5' : '#64748b'
                        }}
                    >
                        🔢 Por Series
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Bodega</label>
                    <select
                        value={filtroBodegaId}
                        onChange={e => setFiltroBodegaId(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                        <option value="">Todas las bodegas</option>
                        {bodegas.map(b => (
                            <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                        ))}
                    </select>
                </div>

                <div style={{ flex: '1 1 220px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Producto</label>
                    <select
                        value={filtroProductoId}
                        onChange={e => setFiltroProductoId(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                        <option value="">Todos los productos</option>
                        {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.codigo} - {p.nombre} ({p.tipo_control_inventario})</option>
                        ))}
                    </select>
                </div>

                {activeTab === 'series' && (
                    <div style={{ width: '160px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Estado Serie</label>
                        <select
                            value={filtroEstadoSerie}
                            onChange={e => setFiltroEstadoSerie(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="">Todos</option>
                            <option value="DISPONIBLE">Disponible</option>
                            <option value="EN_TRANSITO">En Tránsito</option>
                            <option value="VENDIDO">Vendido</option>
                            <option value="BLOQUEADA">Bloqueada</option>
                            <option value="BAJA">Baja</option>
                        </select>
                    </div>
                )}

                <div style={{ paddingBottom: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={soloConStock} 
                            onChange={e => setSoloConStock(e.target.checked)} 
                        />
                        Solo con stock &gt; 0
                    </label>
                </div>

                <div>
                    <button 
                        onClick={fetchData}
                        style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#4f46e5', color: 'white', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Filtrar
                    </button>
                </div>
            </div>

            {/* TABLA: CONSOLIDADO */}
            {activeTab === 'consolidado' && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        Stock Consolidado por Producto y Bodega ({consolidadoData.length} registros)
                    </div>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando existencias...</div>
                    ) : consolidadoData.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No se encontraron existencias con los filtros aplicados.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Producto</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Tipo Control</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Bodega</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Stock Físico</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Reservado</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#15803d', textAlign: 'right' }}>Disponible</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consolidadoData.map((row: any) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.producto?.nombre}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.producto?.codigo}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                                <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                                                    {row.producto?.tipo_control_inventario}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                                                {row.bodega?.nombre} ({row.bodega?.tipo})
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>
                                                {formatNumber(row.stock_fisico)}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#64748b', textAlign: 'right' }}>
                                                {formatNumber(row.stock_reservado)}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: 700, color: '#15803d', textAlign: 'right' }}>
                                                {formatNumber(row.stock_disponible)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TABLA: LOTES */}
            {activeTab === 'lotes' && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        Existencias Detalladas por Lote ({lotesData.length} registros)
                    </div>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando lotes...</div>
                    ) : lotesData.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No se encontraron lotes para los filtros seleccionados.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Nº Lote</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Producto</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Bodega</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Vencimiento</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Stock Físico</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#15803d', textAlign: 'right' }}>Disponible</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotesData.map((row: any) => {
                                        const fVenc = row.lote?.fecha_vencimiento ? new Date(row.lote.fecha_vencimiento) : null;
                                        const esVencido = fVenc && fVenc < new Date();
                                        return (
                                            <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                                                    🏷️ {row.lote?.numero_lote || '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.producto?.nombre}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.producto?.codigo}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                                                    {row.bodega?.nombre}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                                                    {fVenc ? (
                                                        <span style={{ color: esVencido ? '#b91c1c' : '#475569', fontWeight: esVencido ? 700 : 400 }}>
                                                            {fVenc.toLocaleDateString('es-EC')} {esVencido ? '(Vencido)' : ''}
                                                        </span>
                                                    ) : 'Sin vencimiento'}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>
                                                    {formatNumber(row.stock_fisico)}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: 700, color: '#15803d', textAlign: 'right' }}>
                                                    {formatNumber(row.stock_disponible)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TABLA: SERIES */}
            {activeTab === 'series' && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        Trazabilidad de Números de Serie ({seriesData.length} unidades)
                    </div>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando series...</div>
                    ) : seriesData.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No se encontraron números de serie con los filtros aplicados.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Número de Serie</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Producto</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Bodega Actual</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Estado</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569' }}>Reacondicionado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seriesData.map((row: any) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 700, color: '#5b21b6', fontFamily: 'monospace' }}>
                                                🔢 {row.numero_serie}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.producto?.nombre}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.producto?.codigo}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                                                {row.bodega_actual?.nombre || row.bodega?.nombre || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                                    backgroundColor: row.estado === 'DISPONIBLE' ? '#dcfce7' : (row.estado === 'EN_TRANSITO' ? '#eff6ff' : '#fee2e2'),
                                                    color: row.estado === 'DISPONIBLE' ? '#166534' : (row.estado === 'EN_TRANSITO' ? '#1d4ed8' : '#991b1b')
                                                }}>
                                                    {row.estado}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                                                {row.reacondicionado ? '🛠️ Sí' : 'No'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
