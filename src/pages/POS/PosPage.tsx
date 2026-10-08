import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/userContext';
import { posApi, PosTurno } from '../../services/posApi';
import { getProductos } from '../../services/inventoryService';
import { establecimientosApi } from '../../services/establecimientosApi';

export default function PosPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 6;

    const [activeTurno, setActiveTurno] = useState<PosTurno | null>(null);
    const [puntosEmision, setPuntosEmision] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Apertura state
    const [puntoEmisionId, setPuntoEmisionId] = useState('');
    const [saldoInicial, setSaldoInicial] = useState('0.00');

    // POS state
    const [productos, setProductos] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        checkActiveTurno();
    }, [emisorId]);

    const checkActiveTurno = async () => {
        try {
            setLoading(true);
            console.log("Fetching active turno for emisor:", emisorId);
            const turno = await posApi.getActiveTurno(emisorId);
            console.log("Turno response:", turno);
            
            if (turno) {
                setActiveTurno(turno);
                loadPosData();
            } else {
                setActiveTurno(null);
                console.log("Fetching establecimientos...");
                const estRes = await establecimientosApi.list(emisorId);
                console.log("Establecimientos response:", estRes);
                
                const establecimientos = estRes.data?.data || estRes.data || [];
                
                // Extraer todos los puntos de emision de todos los establecimientos
                const todosPuntos = establecimientos.flatMap((est: any) => 
                    (est.puntos_emision || []).map((pe: any) => ({
                        ...pe,
                        establecimiento_codigo: est.codigo,
                        establecimiento_nombre: est.nombre_comercial || est.nombre
                    }))
                ).filter((pe: any) => pe.estado === 'ACTIVO' || pe.estado === 'activo');
                
                console.log("Puntos cargados:", todosPuntos);
                setPuntosEmision(todosPuntos);
            }
        } catch (error) {
            console.error('Error checking turno:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPosData = async () => {
        try {
            const prodRes = await getProductos(emisorId);
            setProductos(prodRes.data || prodRes);
        } catch (error) {
            console.error('Error loading products for POS:', error);
        }
    };

    const handleApertura = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await posApi.aperturarTurno(emisorId, {
                punto_emision_id: Number(puntoEmisionId),
                saldo_inicial: Number(saldoInicial)
            });
            checkActiveTurno();
        } catch (error: any) {
            console.error('Error aperturando caja:', error);
            alert(error.response?.data?.error || 'Error al aperturar caja');
        }
    };

    const handleCierre = async () => {
        if (!activeTurno) return;
        const saldoFinal = prompt('Ingrese el saldo final en caja (efectivo):', '0.00');
        if (saldoFinal === null) return;

        try {
            await posApi.cerrarTurno(emisorId, activeTurno.id, {
                saldo_final: Number(saldoFinal)
            });
            alert('Caja cerrada con éxito');
            checkActiveTurno();
        } catch (error: any) {
            console.error('Error cerrando caja:', error);
            alert(error.response?.data?.error || 'Error al cerrar caja');
        }
    };

    const addToCart = (prod: any) => {
        const exist = cart.find(item => item.id === prod.id);
        if (exist) {
            setCart(cart.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, { ...prod, qty: 1 }]);
        }
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.precio_unitario * item.qty), 0);

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando POS...</div>;
    }

    if (!activeTurno) {
        return (
            <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '450px', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏪</div>
                        <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Apertura de Caja</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Debes abrir un turno en un Punto de Emisión para vender</p>
                    </div>

                    <form onSubmit={handleApertura}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Seleccionar Punto de Venta</label>
                            <select 
                                required
                                value={puntoEmisionId}
                                onChange={e => setPuntoEmisionId(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                            >
                                <option value="">-- Seleccione Punto de Emisión --</option>
                                {puntosEmision.map(pe => (
                                    <option key={pe.id} value={pe.id}>{pe.establecimiento_codigo}-{pe.codigo} ({pe.establecimiento_nombre})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Saldo Inicial ($)</label>
                            <input 
                                type="number"
                                step="0.01"
                                required
                                value={saldoInicial}
                                onChange={e => setSaldoInicial(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}
                            />
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>
                            Abrir Turno
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const filteredProducts = productos.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo_principal.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
            {/* Left side: Products Grid */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ padding: '20px 24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            POS
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Punto de Venta</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Caja/Punto: {activeTurno.puntoEmision?.codigo} | Cajero: {activeTurno.usuario_id}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar producto..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ padding: '10px 16px', borderRadius: '20px', border: '1px solid #cbd5e1', width: '250px', outline: 'none' }}
                        />
                        <button onClick={handleCierre} style={{ padding: '10px 16px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                            Cerrar Turno
                        </button>
                    </div>
                </div>
                
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                        {filteredProducts.map(prod => (
                            <div 
                                key={prod.id} 
                                onClick={() => addToCart(prod)}
                                style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.1s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', textAlign: 'center' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ height: '80px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                    📦
                                </div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={prod.nombre}>
                                    {prod.nombre}
                                </h4>
                                <p style={{ margin: 0, color: '#2563eb', fontWeight: 700, fontSize: '1.1rem' }}>
                                    ${Number(prod.precio_unitario).toFixed(2)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right side: Cart */}
            <div style={{ width: '400px', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Pedido Actual</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
                            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🛒</span>
                            El carrito está vacío
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {cart.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#1e293b' }}>{item.nombre}</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                            ${Number(item.precio_unitario).toFixed(2)} x {item.qty}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{ fontWeight: 600, color: '#0f172a' }}>${(item.precio_unitario * item.qty).toFixed(2)}</span>
                                        <button onClick={() => removeFromCart(item.id)} style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                        <span>Total:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <button 
                        disabled={cart.length === 0}
                        style={{ width: '100%', padding: '16px', backgroundColor: cart.length === 0 ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', boxShadow: cart.length > 0 ? '0 4px 6px -1px rgba(22,163,74,0.2)' : 'none' }}
                    >
                        Cobrar
                    </button>
                </div>
            </div>
        </div>
    );
}
