import React, { useState, useEffect, useCallback } from 'react';
import { getKardex } from '../../services/inventoryService';
import { TransferenciaForm } from '../../components/inventory/TransferenciaForm';
import { AjusteForm } from '../../components/inventory/AjusteForm';
import { InventarioInicialForm } from '../../components/inventory/InventarioInicialForm';
import { ReacondicionarForm } from '../../components/inventory/ReacondicionarForm';
import { useUser } from '../../contexts/userContext';

export default function MovimientosPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 6;
    const [activeTab, setActiveTab] = useState<'transferencia' | 'ajuste' | 'inicial' | 'reacondicionar'>('transferencia');
    const [recentKardex, setRecentKardex] = useState<any[]>([]);
    const [loadingKardex, setLoadingKardex] = useState(true);

    const loadRecentKardex = useCallback(async () => {
        try {
            setLoadingKardex(true);
            const data = await getKardex(emisorId, 1);
            setRecentKardex((data.data || []).slice(0, 5)); // Top 5
        } catch (error) {
            console.error('Error loading recent kardex:', error);
        } finally {
            setLoadingKardex(false);
        }
    }, [emisorId]);

    useEffect(() => {
        loadRecentKardex();
    }, [loadRecentKardex]);
    
    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Header Premium */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        🔄
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Movimientos de Inventario
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Gestiona transferencias, ajustes, inventario inicial y reacondicionamiento
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#e2e8f0', padding: '6px', borderRadius: '14px', width: 'fit-content', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setActiveTab('transferencia')}
                    style={{
                        padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'transferencia' ? 'white' : 'transparent',
                        color: activeTab === 'transferencia' ? '#4f46e5' : '#64748b',
                        boxShadow: activeTab === 'transferencia' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    🔄 Transferencias
                </button>
                <button
                    onClick={() => setActiveTab('ajuste')}
                    style={{
                        padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'ajuste' ? 'white' : 'transparent',
                        color: activeTab === 'ajuste' ? '#4f46e5' : '#64748b',
                        boxShadow: activeTab === 'ajuste' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    ⚙️ Ajustes Manuales
                </button>
                <button
                    onClick={() => setActiveTab('inicial')}
                    style={{
                        padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'inicial' ? 'white' : 'transparent',
                        color: activeTab === 'inicial' ? '#2563eb' : '#64748b',
                        boxShadow: activeTab === 'inicial' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    📥 Inventario Inicial
                </button>
                <button
                    onClick={() => setActiveTab('reacondicionar')}
                    style={{
                        padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: activeTab === 'reacondicionar' ? 'white' : 'transparent',
                        color: activeTab === 'reacondicionar' ? '#d97706' : '#64748b',
                        boxShadow: activeTab === 'reacondicionar' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    🛠️ Reacondicionar Mermas
                </button>
            </div>
            
            <div>
                {activeTab === 'transferencia' && <TransferenciaForm emisorId={emisorId} onSuccess={loadRecentKardex} />}
                {activeTab === 'ajuste' && <AjusteForm emisorId={emisorId} onSuccess={loadRecentKardex} />}
                {activeTab === 'inicial' && <InventarioInicialForm emisorId={emisorId} onSuccess={loadRecentKardex} />}
                {activeTab === 'reacondicionar' && <ReacondicionarForm emisorId={emisorId} onSuccess={loadRecentKardex} />}
            </div>

            {/* Historial Reciente */}
            <div style={{ marginTop: '40px', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.3rem' }}>📋</span> Historial de Movimientos Recientes
                </h3>
                
                {loadingKardex ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Cargando historial...</div>
                ) : recentKardex.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No hay movimientos recientes.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Fecha</th>
                                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Tipo</th>
                                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Documento</th>
                                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Producto</th>
                                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Bodega</th>
                                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Entrada / Salida</th>
                                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentKardex.map((k: any, i: number) => {
                                    const fecha = k.fecha_hora ? new Date(k.fecha_hora).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—';
                                    const cantEntrada = parseFloat(String(k.entrada || 0));
                                    const cantSalida = parseFloat(String(k.salida || 0));
                                    return (
                                        <tr key={k.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '0.85rem' }}>{fecha}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '20px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 600,
                                                    backgroundColor: String(k.tipo_movimiento || '').includes('TRANSFERENCIA') ? '#eff6ff' : (String(k.tipo_movimiento || '').includes('POSITIVO') ? '#f0fdf4' : '#fef2f2'),
                                                    color: String(k.tipo_movimiento || '').includes('TRANSFERENCIA') ? '#1d4ed8' : (String(k.tipo_movimiento || '').includes('POSITIVO') ? '#15803d' : '#b91c1c')
                                                }}>
                                                    {String(k.tipo_movimiento || '').replace(/^MOV_\d+_/i, '').replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 600 }}>{k.numero_documento || '—'}</td>
                                            <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '0.85rem' }}>{k.producto?.nombre || '—'}</td>
                                            <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.85rem' }}>{k.bodega?.nombre || '—'}</td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600, color: cantEntrada > 0 ? '#15803d' : (cantSalida > 0 ? '#b91c1c' : '#64748b') }}>
                                                {cantEntrada > 0 ? `+${cantEntrada}` : (cantSalida > 0 ? `-${cantSalida}` : '0')}
                                            </td>
                                            <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>
                                                {parseFloat(String(k.saldo || 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
