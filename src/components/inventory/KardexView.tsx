import React, { useState, useEffect } from 'react';
import { getKardex } from '../../services/inventoryService';
import { MovimientoInventarioDetalle } from '../../types/inventory';

interface Props {
    emisorId: number | string;
}

export const KardexView: React.FC<Props> = ({ emisorId }) => {
    const [historial, setHistorial] = useState<MovimientoInventarioDetalle[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadKardex = async (showRefreshAnimation = false) => {
        if (showRefreshAnimation) setIsRefreshing(true);
        else setLoading(true);
        
        try {
            const data = await getKardex(emisorId, page);
            setHistorial(data.data);
            setTotalPages(data.last_page || 1);
        } catch (error) {
            console.error("Error loading kardex", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadKardex();
    }, [emisorId, page]);

    const formatTipo = (tipo: string) => {
        if (!tipo) return 'Desconocido';
        const str = tipo.replace(/_/g, ' ');
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const renderBadge = (tipo: string) => {
        const typeStr = tipo || '';
        let bg = '#f1f5f9';
        let color = '#475569';
        let border = '#e2e8f0';

        if (typeStr.includes('POSITIVO')) {
            bg = '#dcfce7'; color = '#166534'; border = '#bbf7d0';
        } else if (typeStr.includes('NEGATIVO')) {
            bg = '#fee2e2'; color = '#991b1b'; border = '#fecaca';
        } else if (typeStr === 'MERMA') {
            bg = '#ffedd5'; color = '#9a3412'; border = '#fed7aa';
        } else if (typeStr === 'TRANSFERENCIA') {
            bg = '#dbeafe'; color = '#1e40af'; border = '#bfdbfe';
        }

        return (
            <span style={{ 
                backgroundColor: bg, color, border: `1px solid ${border}`,
                padding: '6px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                display: 'inline-block', whiteSpace: 'nowrap'
            }}>
                {formatTipo(typeStr)}
            </span>
        );
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
            
            {/* Header Premium */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        📑
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Kardex de Movimientos
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Historial detallado de todas las transacciones de inventario
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={() => loadKardex(true)}
                    disabled={isRefreshing || loading}
                    style={{
                        backgroundColor: 'white', color: '#4f46e5', padding: '10px 20px', borderRadius: '12px',
                        border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.95rem', cursor: (isRefreshing || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={(e) => { if (!isRefreshing && !loading) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
                    onMouseLeave={(e) => { if (!isRefreshing && !loading) { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
                >
                    <svg 
                        style={{ width: '18px', height: '18px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Tabla Premium */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <span>📊</span> Registro de Transacciones
                    </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1400px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#6366f1' }}>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Fecha</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Tipo</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Producto</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', textAlign: 'center', whiteSpace: 'nowrap' }}>Cantidad</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Costo U.</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Lote / Serie</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', width: '20%', whiteSpace: 'nowrap' }}>Bodegas / Doc</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Usuario</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !isRefreshing ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }}></div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Cargando movimientos...</div>
                                    </td>
                                </tr>
                            ) : historial.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📄</div>
                                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '1.1rem' }}>No hay movimientos registrados</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '6px' }}>Los ajustes y transferencias aparecerán aquí</div>
                                    </td>
                                </tr>
                            ) : (
                                historial.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        style={{ borderBottom: idx < historial.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.2s ease', backgroundColor: 'white' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                            {new Date(item.created_at).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            {renderBadge(item.movimiento?.tipo_movimiento || '')}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#0f172a', fontSize: '0.9rem', fontWeight: 500 }}>
                                            <span style={{ color: '#64748b', marginRight: '6px' }}>{item.producto?.codigo}</span> 
                                            {item.producto?.nombre}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', minWidth: '100px' }}>
                                            {item.cantidad > 0 ? `+${Number(item.cantidad)}` : Number(item.cantidad)}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                                            {item.costo_unitario ? `$${Number(item.costo_unitario)}` : '—'}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#475569', fontSize: '0.85rem' }}>
                                            {item.codigo_lote && <div style={{ marginBottom: '4px' }}><span style={{ fontWeight: 600 }}>Lote:</span> {item.codigo_lote}</div>}
                                            {item.numero_serie && <div><span style={{ fontWeight: 600 }}>Serie:</span> {item.numero_serie}</div>}
                                            {(!item.codigo_lote && !item.numero_serie) && '—'}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#475569', fontSize: '0.85rem' }}>
                                            <div style={{ display: 'grid', gap: '4px' }}>
                                                {item.movimiento?.origen?.nombre && <div><strong style={{ color: '#0f172a' }}>De:</strong> {item.movimiento.origen.nombre}</div>}
                                                {item.movimiento?.destino?.nombre && <div><strong style={{ color: '#0f172a' }}>A:</strong> {item.movimiento.destino.nombre}</div>}
                                                {item.movimiento?.observacion && <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>{item.movimiento.observacion}</div>}
                                                {(!item.movimiento?.origen && !item.movimiento?.destino && !item.movimiento?.observacion) && '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
                                                    {item.movimiento?.usuario_id || '?'}
                                                </div>
                                                <span>ID: {item.movimiento?.usuario_id || 'Auto'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                        Página {page} de {totalPages}
                    </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                                    backgroundColor: (page === 1 || loading) ? '#f8fafc' : 'white', color: (page === 1 || loading) ? '#cbd5e1' : '#475569',
                                    cursor: (page === 1 || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                Anterior
                            </button>
                            {/* Simple page numbers around current page */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((p, index, array) => (
                                    <React.Fragment key={p}>
                                        {index > 0 && array[index - 1] !== p - 1 && (
                                            <span style={{ padding: '8px', color: '#94a3b8' }}>...</span>
                                        )}
                                        <button
                                            onClick={() => setPage(p)}
                                            disabled={loading}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600,
                                                backgroundColor: p === page ? '#4f46e5' : 'transparent',
                                                color: p === page ? 'white' : '#64748b',
                                                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s', minWidth: '36px'
                                            }}
                                        >
                                            {p}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                                    backgroundColor: (page === totalPages || loading) ? '#f8fafc' : 'white', color: (page === totalPages || loading) ? '#cbd5e1' : '#475569',
                                    cursor: (page === totalPages || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
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
