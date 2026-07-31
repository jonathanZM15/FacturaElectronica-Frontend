import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/userContext';
import { getBodegas, getProductos, getStockParametros, saveStockParametro, deleteStockParametro } from '../../services/inventoryService';
import { Bodega, Producto, TipoBodega, BaseComparacionStock, StockParametro } from '../../types/inventory';
import { createPortal } from 'react-dom';

export default function StockParametrosPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 1;

    const [parametros, setParametros] = useState<StockParametro[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form state
    const [productoId, setProductoId] = useState<string>('');
    const [bodegaId, setBodegaId] = useState<string>('');
    const [stockMinimo, setStockMinimo] = useState<string>('');
    const [stockMaximo, setStockMaximo] = useState<string>('');
    const [baseComparacion, setBaseComparacion] = useState<BaseComparacionStock>(BaseComparacionStock.FISICO);
    const [activo, setActivo] = useState<boolean>(true);
    const [observacion, setObservacion] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Modals & Pagination
    const [editModalParam, setEditModalParam] = useState<StockParametro | null>(null);
    const [deleteModalParam, setDeleteModalParam] = useState<StockParametro | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        if (emisorId) {
            loadData();
        }
    }, [emisorId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [paramsData, prodData, bodData] = await Promise.all([
                getStockParametros(emisorId!),
                getProductos(emisorId!),
                getBodegas(emisorId!)
            ]);
            setParametros(paramsData);
            setProductos(prodData);
            setBodegas(bodData);
        } catch (err: any) {
            console.error(err);
            setError('Error al cargar los datos.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!productoId || !bodegaId) {
            setError('Debe seleccionar Producto y Bodega.');
            return;
        }

        const min = stockMinimo ? parseFloat(stockMinimo) : undefined;
        const max = stockMaximo ? parseFloat(stockMaximo) : undefined;

        if (min !== undefined && max !== undefined && min > max) {
            setError('El stock mínimo no puede ser mayor al stock máximo.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                producto_id: parseInt(productoId),
                bodega_id: parseInt(bodegaId),
                stock_minimo: min,
                stock_maximo: max,
                base_comparacion: baseComparacion,
                activo,
                observacion
            };
            await saveStockParametro(emisorId!, payload);
            
            // Reset form
            setProductoId('');
            setBodegaId('');
            setStockMinimo('');
            setStockMaximo('');
            setBaseComparacion(BaseComparacionStock.FISICO);
            setActivo(true);
            setObservacion('');
            setIsFormOpen(false);
            
            await loadData();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Error al guardar el parámetro.');
        } finally {
            setSaving(false);
        }
    };

        const handleEditSave = async () => {
        if (!editModalParam) return;
        setSaving(true);
        try {
            const min = editModalParam.stock_minimo;
            const max = editModalParam.stock_maximo;
            if (min !== undefined && max !== undefined && min !== null && max !== null && min > max) {
                alert('El stock mínimo no puede ser mayor al stock máximo.');
                return;
            }

            const payload = {
                producto_id: editModalParam.producto_id,
                bodega_id: editModalParam.bodega_id,
                stock_minimo: min,
                stock_maximo: max,
                base_comparacion: editModalParam.base_comparacion,
                activo: editModalParam.activo,
                observacion: editModalParam.observacion
            };
            await saveStockParametro(emisorId!, payload);
            setEditModalParam(null);
            await loadData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Error al actualizar el parámetro.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Está seguro de eliminar este parámetro?')) return;
        try {
            await deleteStockParametro(emisorId!, id);
            await loadData();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar');
        }
    };

    const editParam = (p: StockParametro) => {
        setProductoId(p.producto_id.toString());
        setBodegaId(p.bodega_id.toString());
        setStockMinimo(p.stock_minimo !== undefined && p.stock_minimo !== null ? p.stock_minimo.toString() : '');
        setStockMaximo(p.stock_maximo !== undefined && p.stock_maximo !== null ? p.stock_maximo.toString() : '');
        setBaseComparacion(p.base_comparacion);
        setActivo(p.activo);
        setObservacion(p.observacion || '');
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getEstadoStock = (p: StockParametro) => {
        const stock = p.base_comparacion === BaseComparacionStock.FISICO ? p.stock_fisico : p.stock_disponible;
        if (p.stock_minimo !== undefined && p.stock_minimo !== null && stock < p.stock_minimo) {
            return { label: 'Stock Bajo', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' };
        }
        if (p.stock_maximo !== undefined && p.stock_maximo !== null && stock > p.stock_maximo) {
            return { label: 'Sobrestock', color: '#9a3412', bg: '#ffedd5', border: '#fed7aa' };
        }
        return { label: 'Normal', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' };
    };

    const formatNumber = (num: any) => {
        if (num === null || num === undefined) return '—';
        return Number(num).toString();
    };

    if (loading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh' }}>
                <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>Cargando parámetros...</div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Header Premium */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        ⚙️
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Parámetros de Stock
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Gestiona los límites mínimos y máximos por sucursal o bodega
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    style={{
                        backgroundColor: isFormOpen ? '#f1f5f9' : '#4f46e5',
                        color: isFormOpen ? '#475569' : 'white',
                        padding: '12px 24px', borderRadius: '12px', border: 'none',
                        fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s', boxShadow: isFormOpen ? 'none' : '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                >
                    {isFormOpen ? '✕ Cerrar Formulario' : '＋ Nuevo Parámetro'}
                </button>
            </div>

            {/* Form Section (Collapsible) */}
            <div style={{
                maxHeight: isFormOpen ? '1000px' : '0',
                opacity: isFormOpen ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: isFormOpen ? '32px' : '0'
            }}>
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                    <h2 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>🛠️</span> Configurar Parámetro
                    </h2>
                    
                    {error && (
                        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#991b1b', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Fila 1: Producto y Bodega */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Producto *</label>
                                <select 
                                    value={productoId} 
                                    onChange={e => setProductoId(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}
                                >
                                    <option value="">Seleccione un producto</option>
                                    {productos.map(p => (
                                        <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Bodega *</label>
                                <select 
                                    value={bodegaId} 
                                    onChange={e => setBodegaId(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}
                                >
                                    <option value="">Seleccione una bodega</option>
                                    {bodegas.map(b => (
                                        <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Fila 2: Min, Max, Base, Activo */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Stock Mínimo</label>
                                <input 
                                    type="number" min="0" step="0.01"
                                    value={stockMinimo} onChange={e => setStockMinimo(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a' }}
                                    placeholder="Ej. 10"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Stock Máximo</label>
                                <input 
                                    type="number" min="0" step="0.01"
                                    value={stockMaximo} onChange={e => setStockMaximo(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a' }}
                                    placeholder="Ej. 100"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Base de Comparación</label>
                                <select 
                                    value={baseComparacion} 
                                    onChange={e => setBaseComparacion(e.target.value as BaseComparacionStock)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}
                                >
                                    <option value={BaseComparacionStock.FISICO}>Stock Físico</option>
                                    <option value={BaseComparacionStock.DISPONIBLE}>Stock Disponible</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={activo} 
                                        onChange={e => setActivo(e.target.checked)}
                                        style={{ width: '20px', height: '20px', accentColor: '#4f46e5', cursor: 'pointer' }}
                                    />
                                    Parámetro Activo
                                </label>
                            </div>
                        </div>

                        {/* Fila 3: Observación */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Observación (Opcional)</label>
                            <textarea 
                                value={observacion} 
                                onChange={e => setObservacion(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '100px', resize: 'vertical', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a' }}
                                placeholder="Detalles adicionales sobre este parámetro..."
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button 
                            onClick={() => {
                                setProductoId(''); setBodegaId(''); setStockMinimo(''); setStockMaximo(''); setBaseComparacion(BaseComparacionStock.FISICO); setActivo(true); setObservacion(''); setError(null); setIsFormOpen(false);
                            }}
                            style={{ backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem' }}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s', fontSize: '0.95rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
                        >
                            {saving ? 'Guardando...' : 'Guardar Parámetro'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> Listado de Parámetros
                    </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1300px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#6366f1' }}>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Producto</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Bodega</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap', textAlign: 'center' }}>Mínimo</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap', textAlign: 'center' }}>Máximo</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap', textAlign: 'center' }}>Stock Actual</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap', textAlign: 'center' }}>Estado</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap' }}>Observación</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parametros.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
                                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '1.1rem' }}>No hay parámetros configurados</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '6px' }}>Haz clic en "Nuevo Parámetro" para comenzar</div>
                                    </td>
                                </tr>
                            ) : (
                                parametros.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p, idx) => {
                                    const estado = getEstadoStock(p);
                                    const actual = p.base_comparacion === BaseComparacionStock.FISICO ? p.stock_fisico : p.stock_disponible;
                                    
                                    return (
                                        <tr 
                                            key={p.id} 
                                            style={{ borderBottom: idx < parametros.length - 1 ? '1px solid #f1f5f9' : 'none', backgroundColor: !p.activo ? '#f8fafc' : 'white', transition: 'background-color 0.2s ease' }}
                                            onMouseEnter={(e) => { if (p.activo) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                            onMouseLeave={(e) => { if (p.activo) e.currentTarget.style.backgroundColor = 'white'; }}
                                        >
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 600, color: !p.activo ? '#94a3b8' : '#0f172a', fontSize: '0.95rem' }}>{p.producto?.nombre}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Cód: {p.producto?.codigo}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 500, color: !p.activo ? '#94a3b8' : '#334155', fontSize: '0.9rem' }}>{p.bodega?.nombre}</div>
                                                <div style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', display: 'inline-block', marginTop: '4px', fontWeight: 600 }}>{p.bodega?.tipo}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', color: !p.activo ? '#94a3b8' : '#475569', fontSize: '0.95rem', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {formatNumber(p.stock_minimo)}
                                            </td>
                                            <td style={{ padding: '16px 24px', color: !p.activo ? '#94a3b8' : '#475569', fontSize: '0.95rem', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {formatNumber(p.stock_maximo)}
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 700, color: !p.activo ? '#94a3b8' : '#0f172a', fontSize: '1.05rem' }}>{formatNumber(actual)}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                    {p.base_comparacion === BaseComparacionStock.FISICO ? 'Físico' : 'Disponible'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {p.activo ? (
                                                    <span style={{ backgroundColor: estado.bg, color: estado.color, border: `1px solid ${estado.border}`, padding: '6px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        {estado.label}
                                                    </span>
                                                ) : (
                                                    <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        Inactivo
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 24px', color: !p.activo ? '#94a3b8' : '#64748b', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.observacion || '—'}
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button 
                                                        onClick={() => setEditModalParam(p)}
                                                        title="Editar"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '8px', borderRadius: '8px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeleteModalParam(p)}
                                                        title="Borrar"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '8px', borderRadius: '8px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Paginación */}
                {parametros.length > 0 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                            Página {currentPage} de {Math.max(1, Math.ceil(parametros.length / pageSize))} ({parametros.length} registros)
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                                    backgroundColor: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#475569',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(parametros.length / pageSize), p + 1))}
                                disabled={currentPage === Math.ceil(parametros.length / pageSize) || parametros.length === 0}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                                    backgroundColor: (currentPage === Math.ceil(parametros.length / pageSize) || parametros.length === 0) ? '#f8fafc' : 'white', 
                                    color: (currentPage === Math.ceil(parametros.length / pageSize) || parametros.length === 0) ? '#cbd5e1' : '#475569',
                                    cursor: (currentPage === Math.ceil(parametros.length / pageSize) || parametros.length === 0) ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Editar */}
            {editModalParam && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>✏️</span> Editar Parámetro
                            </h3>
                            <button type="button" onClick={() => setEditModalParam(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.5rem', padding: '4px' }}>
                                &times;
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Producto</label>
                                <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                                    {editModalParam.producto?.codigo} - {editModalParam.producto?.nombre}
                                </div>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Bodega</label>
                                <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                                    {editModalParam.bodega?.nombre}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Stock Mínimo</label>
                                    <input 
                                        type="number" min="0" step="0.01"
                                        value={editModalParam.stock_minimo !== null && editModalParam.stock_minimo !== undefined ? editModalParam.stock_minimo : ''} 
                                        onChange={(e) => setEditModalParam({...editModalParam, stock_minimo: e.target.value !== '' ? parseFloat(e.target.value) : undefined} as any)}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Stock Máximo</label>
                                    <input 
                                        type="number" min="0" step="0.01"
                                        value={editModalParam.stock_maximo !== null && editModalParam.stock_maximo !== undefined ? editModalParam.stock_maximo : ''} 
                                        onChange={(e) => setEditModalParam({...editModalParam, stock_maximo: e.target.value !== '' ? parseFloat(e.target.value) : undefined} as any)}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Base de Comparación</label>
                                <select 
                                    value={editModalParam.base_comparacion} 
                                    onChange={(e) => setEditModalParam({...editModalParam, base_comparacion: e.target.value as BaseComparacionStock} as any)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a' }}
                                >
                                    <option value={BaseComparacionStock.FISICO}>Stock Físico</option>
                                    <option value={BaseComparacionStock.DISPONIBLE}>Stock Disponible</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Observación</label>
                                <textarea 
                                    value={editModalParam.observacion || ''} 
                                    onChange={(e) => setEditModalParam({...editModalParam, observacion: e.target.value} as any)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '60px', backgroundColor: 'white', fontSize: '0.95rem', color: '#0f172a' }}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginTop: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={editModalParam.activo} 
                                    onChange={(e) => setEditModalParam({...editModalParam, activo: e.target.checked} as any)}
                                    style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                                />
                                Parámetro Activo
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button type="button" onClick={() => setEditModalParam(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#475569', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button type="button" onClick={handleEditSave} disabled={saving} style={{ flex: 1, padding: '12px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Eliminar */}
            {deleteModalParam && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 20px auto' }}>
                            🗑️
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                            ¿Eliminar parámetro?
                        </h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            ¿Estás seguro que deseas eliminar la configuración de stock para el producto <strong>{deleteModalParam.producto?.nombre}</strong> en <strong>{deleteModalParam.bodega?.nombre}</strong>?
                        </p>
                        
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={() => setDeleteModalParam(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#475569', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                onClick={async () => {
                                    setDeleteModalParam(null);
                                    await handleDelete(deleteModalParam.id);
                                }} 
                                style={{ flex: 1, padding: '12px', backgroundColor: '#dc2626', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
