import React, { useState, useEffect, useCallback } from 'react';
import { getKardex, getProductos, getBodegas } from '../../services/inventoryService';
import { KardexItem, Producto, Bodega } from '../../types/inventory';

interface Props {
    emisorId: number | string;
}

export const KardexView: React.FC<Props> = ({ emisorId }) => {
    const [historial, setHistorial] = useState<KardexItem[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filtros
    const [filtroProductoId, setFiltroProductoId] = useState<string>('');
    const [filtroBodegaId, setFiltroBodegaId] = useState<string>('');
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [filtroFechaInicio, setFiltroFechaInicio] = useState<string>('');
    const [filtroFechaFin, setFiltroFechaFin] = useState<string>('');

    // Cargar listas para filtros
    useEffect(() => {
        getProductos(emisorId).then(setProductos).catch(console.error);
        getBodegas(emisorId).then(setBodegas).catch(console.error);
    }, [emisorId]);

    const loadKardex = useCallback(async (showRefreshAnimation = false) => {
        if (showRefreshAnimation) setIsRefreshing(true);
        else setLoading(true);

        try {
            const filters: Record<string, any> = {};
            if (filtroProductoId) filters.producto_id = filtroProductoId;
            if (filtroBodegaId) filters.bodega_id = filtroBodegaId;
            if (filtroTipo) filters.tipo_movimiento = filtroTipo;
            if (filtroFechaInicio) filters.fecha_inicio = filtroFechaInicio;
            if (filtroFechaFin) filters.fecha_fin = filtroFechaFin;

            const res = await getKardex(emisorId, page, filters);
            setHistorial(res.data || []);
            setTotalPages(res.last_page || 1);
            setTotalRecords(res.total || 0);
        } catch (error) {
            console.error('Error cargando Kardex:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [emisorId, page, filtroProductoId, filtroBodegaId, filtroTipo, filtroFechaInicio, filtroFechaFin]);

    useEffect(() => {
        loadKardex();
    }, [loadKardex]);

    const handleLimpiarFiltros = () => {
        setFiltroProductoId('');
        setFiltroBodegaId('');
        setFiltroTipo('');
        setFiltroFechaInicio('');
        setFiltroFechaFin('');
        setPage(1);
    };

    const formatTipo = (tipo: string) => {
        if (!tipo) return 'Desconocido';
        return tipo.replace(/^MOV_\d+_/i, '').replace(/_/g, ' ');
    };

    const renderBadge = (tipo: string) => {
        const typeStr = tipo || '';
        let bg = '#f1f5f9';
        let color = '#475569';
        let border = '#e2e8f0';

        if (typeStr.includes('POSITIVO') || typeStr.includes('INICIAL') || typeStr.includes('RECEPCION')) {
            bg = '#dcfce7'; color = '#166534'; border = '#bbf7d0';
        } else if (typeStr.includes('NEGATIVO') || typeStr.includes('MERMA')) {
            bg = '#fee2e2'; color = '#991b1b'; border = '#fecaca';
        } else if (typeStr.includes('TRANSFERENCIA') || typeStr.includes('REACONDICIONAMIENTO')) {
            bg = '#dbeafe'; color = '#1e40af'; border = '#bfdbfe';
        }

        return (
            <span style={{
                backgroundColor: bg, color, border: `1px solid ${border}`,
                padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                display: 'inline-block', whiteSpace: 'nowrap'
            }}>
                {formatTipo(typeStr)}
            </span>
        );
    };

    const formatNumber = (val: string | number | undefined) => {
        if (val === undefined || val === null) return '0.00';
        const n = parseFloat(String(val));
        return isNaN(n) ? '0.00' : n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Header */}
            <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        📑
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                            Kardex de Inventario
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Historial cronológico de movimientos de stock con saldos valorizados
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={() => loadKardex(true)}
                    disabled={isRefreshing || loading}
                    style={{
                        backgroundColor: 'white', color: '#4f46e5', padding: '10px 20px', borderRadius: '12px',
                        border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.9rem', cursor: (isRefreshing || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                >
                    <svg 
                        style={{ width: '16px', height: '16px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Barra de Filtros */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔍</span> Filtros de Búsqueda
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Producto</label>
                        <select
                            value={filtroProductoId}
                            onChange={e => { setFiltroProductoId(e.target.value); setPage(1); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                        >
                            <option value="">Todos los productos</option>
                            {productos.map(p => (
                                <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Bodega</label>
                        <select
                            value={filtroBodegaId}
                            onChange={e => { setFiltroBodegaId(e.target.value); setPage(1); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                        >
                            <option value="">Todas las bodegas</option>
                            {bodegas.map(b => (
                                <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Tipo de Movimiento</label>
                        <select
                            value={filtroTipo}
                            onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                        >
                            <option value="">Todos los tipos</option>
                            <option value="MOV_01_INVENTARIO_INICIAL">Inventario Inicial (MOV-01)</option>
                            <option value="MOV_06_TRANSFERENCIA_INTERNA">Transferencia Interna (MOV-06)</option>
                            <option value="MOV_07_TRANSFERENCIA_SUCURSALES">Despacho Sucursales (MOV-07)</option>
                            <option value="MOV_08_RECEPCION_TRANSFERENCIA">Recepción Sucursal (MOV-08)</option>
                            <option value="MOV_09_AJUSTE_POSITIVO">Ajuste Positivo (MOV-09)</option>
                            <option value="MOV_10_AJUSTE_NEGATIVO">Ajuste Negativo (MOV-10)</option>
                            <option value="MOV_11_ENVIO_MERMAS">Envío a Mermas (MOV-11)</option>
                            <option value="MOV_12_REACONDICIONAMIENTO_MERMAS">Reacondicionamiento (MOV-12)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Desde</label>
                        <input
                            type="date"
                            value={filtroFechaInicio}
                            onChange={e => { setFiltroFechaInicio(e.target.value); setPage(1); }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Hasta</label>
                        <input
                            type="date"
                            value={filtroFechaFin}
                            onChange={e => { setFiltroFechaFin(e.target.value); setPage(1); }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <button
                            onClick={handleLimpiarFiltros}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1',
                                backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '0.85rem',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla Principal */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📊</span> Registros encontrados: <span style={{ color: '#4f46e5' }}>{totalRecords}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Página {page} de {totalPages}</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha y Hora</th>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tipo Movimiento</th>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documento</th>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Producto</th>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bodega</th>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Entrada (+)</th>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Salida (-)</th>
                                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !isRefreshing ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '50px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '10px' }}></div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Cargando registros del Kardex...</div>
                                    </td>
                                </tr>
                            ) : historial.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '50px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
                                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '1rem' }}>No se encontraron registros de Kardex</div>
                                        <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Intenta ajustando los filtros de búsqueda</div>
                                    </td>
                                </tr>
                            ) : (
                                historial.map((item, idx) => {
                                    const cantEntrada = parseFloat(String(item.entrada || 0));
                                    const cantSalida = parseFloat(String(item.salida || 0));
                                    const fecha = item.fecha_hora ? new Date(item.fecha_hora).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium' }) : '—';

                                    return (
                                        <tr
                                            key={item.id || idx}
                                            style={{ borderBottom: idx < historial.length - 1 ? '1px solid #f1f5f9' : 'none', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}
                                        >
                                            <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                {fecha}
                                            </td>
                                            <td style={{ padding: '14px 18px' }}>
                                                {renderBadge(item.tipo_movimiento)}
                                            </td>
                                            <td style={{ padding: '14px 18px', color: '#334155', fontSize: '0.85rem' }}>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.numero_documento || '—'}</span>
                                                {item.documento_origen_tipo && (
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {item.documento_origen_tipo} #{item.documento_origen_id}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 18px', color: '#0f172a', fontSize: '0.85rem' }}>
                                                <div style={{ fontWeight: 600 }}>{item.producto?.nombre || 'Producto'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{item.producto?.codigo || ''}</div>
                                            </td>
                                            <td style={{ padding: '14px 18px', color: '#475569', fontSize: '0.85rem' }}>
                                                <div style={{ fontWeight: 500 }}>{item.bodega?.nombre || 'Bodega'}</div>
                                                {item.bodega?.establecimiento && (
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.bodega.establecimiento.nombre}</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 18px', color: cantEntrada > 0 ? '#15803d' : '#94a3b8', fontSize: '0.9rem', fontWeight: cantEntrada > 0 ? 700 : 400, textAlign: 'right' }}>
                                                {cantEntrada > 0 ? `+${formatNumber(item.entrada)}` : '—'}
                                            </td>
                                            <td style={{ padding: '14px 18px', color: cantSalida > 0 ? '#b91c1c' : '#94a3b8', fontSize: '0.9rem', fontWeight: cantSalida > 0 ? 700 : 400, textAlign: 'right' }}>
                                                {cantSalida > 0 ? `-${formatNumber(item.salida)}` : '—'}
                                            </td>
                                            <td style={{ padding: '14px 18px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, textAlign: 'right' }}>
                                                {formatNumber(item.saldo)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                        Mostrando página {page} de {totalPages} ({totalRecords} movimientos totales)
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                                backgroundColor: (page === 1 || loading) ? '#f8fafc' : 'white', color: (page === 1 || loading) ? '#cbd5e1' : '#475569',
                                cursor: (page === 1 || loading) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Anterior
                        </button>
                        <span style={{ padding: '8px 14px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                            {page}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                                backgroundColor: (page === totalPages || loading) ? '#f8fafc' : 'white', color: (page === totalPages || loading) ? '#cbd5e1' : '#475569',
                                cursor: (page === totalPages || loading) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
