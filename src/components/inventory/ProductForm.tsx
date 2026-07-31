import React, { useState, useEffect } from 'react';
import { 
    Producto, TipoProducto, TipoControlInventario, TipoEntrega, 
    TipoBodegaSalida, StockInicialPayload, StockInicialLote, StockInicialSerie, Bodega, Categoria 
} from '../../types/inventory';
import { createProducto, updateProducto, deleteProducto, getBodegas, getCategorias, getProductos } from '../../services/inventoryService';
import { LoteFields } from './LoteFields';
import { SerieFields } from './SerieFields';

interface ProductFormProps {
    emisorId: number | string;
    onSuccess?: (producto: Producto) => void;
}

const ImagePreview = ({ src }: { src: string }) => {
    const [error, setError] = useState(false);
    useEffect(() => { setError(false); }, [src]);
    
    if (error) {
        return <span style={{color:'#ef4444',fontSize:'12px'}}>URL de imagen no válida</span>;
    }
    return <img src={src} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} onError={() => setError(true)} />;
};

export const ProductForm: React.FC<ProductFormProps> = ({ emisorId, onSuccess }) => {
    const [activeTab, setActiveTab] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [productosList, setProductosList] = useState<Producto[]>([]);
    const [loadingTable, setLoadingTable] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editModalProduct, setEditModalProduct] = useState<Producto | null>(null);
    const [deleteModalProduct, setDeleteModalProduct] = useState<Producto | null>(null);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [producto, setProducto] = useState<Partial<Producto>>({
        codigo: '', nombre: '', precio_1: 0, precio_por_defecto: 1, tipo_iva: '12%',
        tipo: TipoProducto.FISICO, tipo_control_inventario: TipoControlInventario.CANTIDAD,
        permite_venta: true, permite_compra: true, uso_interno: false, permite_exhibicion: true,
        seleccionable_venta_suspendida: false, requiere_preparacion: false, seleccion_avanzada_bodega_salida: false, permite_devolucion: true,
    });

    const [stockInicial, setStockInicial] = useState<StockInicialPayload>({});
    const [lotes, setLotes] = useState<StockInicialLote[]>([]);
    const [series, setSeries] = useState<StockInicialSerie[]>([]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModalProduct || !editModalProduct.id) return;
        
        setUpdating(true);
        try {
            await updateProducto(emisorId, editModalProduct.id, editModalProduct);
            setSuccess('Producto actualizado exitosamente.');
            setEditModalProduct(null);
            loadProductos();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Error al actualizar el producto');
            window.scrollTo(0, 0);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModalProduct || !deleteModalProduct.id) return;
        
        setDeleting(true);
        try {
            await deleteProducto(emisorId, deleteModalProduct.id);
            setSuccess('Producto eliminado exitosamente.');
            setDeleteModalProduct(null);
            loadProductos();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Error al eliminar el producto');
            window.scrollTo(0, 0);
        } finally {
            setDeleting(false);
        }
    };

    const loadProductos = async () => {
        setLoadingTable(true);
        try {
            const data = await getProductos(emisorId);
            setProductosList(data);
        } catch (error) {
            console.error('Error cargando productos:', error);
        } finally {
            setLoadingTable(false);
        }
    };

    useEffect(() => {
        getBodegas(emisorId).then(data => setBodegas(data)).catch(console.error);
        getCategorias(emisorId).then(data => setCategorias(data)).catch(console.error);
        loadProductos();
    }, [emisorId]);

    useEffect(() => {
        if (producto.tipo === TipoProducto.SERVICIO) {
            setProducto(prev => ({ ...prev, tipo_control_inventario: TipoControlInventario.SIN_CONTROL }));
            if (activeTab === 6) setActiveTab(1);
        }
    }, [producto.tipo, activeTab]);

    const showStockTab = producto.tipo === TipoProducto.FISICO && producto.tipo_control_inventario !== TipoControlInventario.SIN_CONTROL;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return; // Prevent double submit
        
        setLoading(true); 
        setError('');
        setSuccess('');

        try {
            const payload: any = { ...producto };
            
            if (showStockTab) {
                const stockPayload: StockInicialPayload = { bodega_destino_id: stockInicial.bodega_destino_id };
                
                if (producto.tipo_control_inventario === TipoControlInventario.CANTIDAD) {
                    stockPayload.cantidad = stockInicial.cantidad;
                    stockPayload.costo_unitario = stockInicial.costo_unitario;
                } else if (producto.tipo_control_inventario === TipoControlInventario.LOTE) {
                    stockPayload.lotes = lotes;
                } else if (producto.tipo_control_inventario === TipoControlInventario.SERIE) {
                    stockPayload.series = series;
                    stockPayload.cantidad = series.length;
                }
                payload.stock_inicial = stockPayload;
            }

            const nuevoProducto = await createProducto(emisorId, payload as Producto);
            setSuccess('Producto guardado exitosamente.');
            
            // Limpiar formulario
            setProducto({
                codigo: '', nombre: '', precio_1: 0, precio_por_defecto: 1, tipo_iva: '12%',
                tipo: TipoProducto.FISICO, tipo_control_inventario: TipoControlInventario.CANTIDAD,
                permite_venta: true, permite_compra: true, uso_interno: false, permite_exhibicion: true,
                seleccionable_venta_suspendida: false, requiere_preparacion: false, seleccion_avanzada_bodega_salida: false, permite_devolucion: true,
            });
            setStockInicial({});
            setLotes([]);
            setSeries([]);
            setActiveTab(1);
            
            loadProductos();
            setTimeout(() => {
                if (onSuccess) onSuccess(nuevoProducto);
                setSuccess('');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof Producto, value: any) => setProducto(prev => ({ ...prev, [field]: value }));

    const tabs = [
        { id: 1, label: 'Datos Generales', icon: '📝' }, 
        { id: 2, label: 'Precios', icon: '💲' }, 
        { id: 3, label: 'Impuestos', icon: '⚖️' },
        { id: 4, label: 'Configuración', icon: '⚙️' }, 
        { id: 5, label: 'Comercial', icon: '🤝' },
    ];
    if (showStockTab) tabs.push({ id: 6, label: 'Stock Inicial', icon: '📦' });

    // Common input styles for consistency
    const inputStyle = {
        width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', 
        fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', transition: 'all 0.2s', 
        boxSizing: 'border-box' as const, color: '#0f172a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
    };

    const labelStyle = {
        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px'
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Header Premium */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        📦
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Gestión de Productos
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Crea y configura nuevos productos o servicios para tu catálogo
                        </p>
                    </div>
                </div>
                
                <button
                    type="button"
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    style={{
                        backgroundColor: isFormOpen ? '#f1f5f9' : '#4f46e5',
                        color: isFormOpen ? '#475569' : 'white',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: isFormOpen ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.25)'
                    }}
                >
                    {isFormOpen ? (
                        <><span>Ocultar Formulario</span> <span style={{fontSize:'1.2rem'}}>⬆️</span></>
                    ) : (
                        <><span>Crear Nuevo Producto</span> <span style={{fontSize:'1.2rem'}}>➕</span></>
                    )}
                </button>
            </div>

            {isFormOpen && (<>
            {error && (
                <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', fontSize: '0.95rem', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span> <strong>Error:</strong> {error}
                </div>
            )}
            
            {success && (
                <div style={{ marginBottom: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', fontSize: '0.95rem', color: '#15803d', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '1.2rem' }}>✅</span> <strong>Éxito:</strong> {success}
                </div>
            )}

            <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                
                {/* Tabs Navigation */}
                <div style={{ display: 'flex', gap: '8px', padding: '20px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', flexWrap: 'wrap' }}>
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            type="button" 
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '10px 20px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                                backgroundColor: activeTab === tab.id ? '#4f46e5' : 'white',
                                color: activeTab === tab.id ? 'white' : '#64748b',
                                boxShadow: activeTab === tab.id ? '0 4px 6px rgba(79, 70, 229, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                                border: activeTab === tab.id ? 'none' : '1px solid #e2e8f0'
                            }}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    {/* 1. Datos Generales */}
                    <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                            <div>
                                <label style={labelStyle}>Código <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" required value={producto.codigo || ''} onChange={e => handleChange('codigo', e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Código Auxiliar</label>
                                <input type="text" value={producto.codigo_auxiliar || ''} onChange={e => handleChange('codigo_auxiliar', e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Nombre del Producto <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" required value={producto.nombre || ''} onChange={e => handleChange('nombre', e.target.value)} style={inputStyle} placeholder="Ej. Computadora Portátil HP 15''" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Descripción</label>
                                <textarea rows={3} value={producto.descripcion || ''} onChange={e => handleChange('descripcion', e.target.value)} style={{...inputStyle, resize: 'vertical'}} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}></textarea>
                            </div>
                            <div>
                                <label style={labelStyle}>URL de la Foto</label>
                                <input type="text" value={producto.foto || ''} onChange={e => handleChange('foto', e.target.value)} style={inputStyle} placeholder="https://ejemplo.com/foto.jpg" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                {producto.foto && (
                                    <div style={{ marginTop: '12px', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', height: '120px' }}>
                                        <ImagePreview src={producto.foto} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Categoría (Opcional)</label>
                                <select 
                                    value={producto.categoria_id || ''} 
                                    onChange={e => handleChange('categoria_id', e.target.value ? Number(e.target.value) : undefined)} 
                                    style={inputStyle} 
                                    onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} 
                                    onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
                                >
                                    <option value="">Sin categoría...</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Unidad de Medida</label>
                                <input type="text" value={producto.unidad_medida || ''} onChange={e => handleChange('unidad_medida', e.target.value)} style={inputStyle} placeholder="Ej. unidad, caja, kg" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Ubicación Referencial</label>
                                <input type="text" value={producto.ubicacion_referencial || ''} onChange={e => handleChange('ubicacion_referencial', e.target.value)} style={inputStyle} placeholder="Ej. Pasillo 3 / Estante B" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                            </div>
                        </div>
                    </div>

                    {/* 2. Precios */}
                    <div style={{ display: activeTab === 2 ? 'block' : 'none' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                            <div>
                                <label style={labelStyle}>Precio Principal (1) <span style={{ color: '#ef4444' }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '16px', top: '12px', color: '#64748b', fontWeight: 600 }}>$</span>
                                    <input type="number" step="0.000001" required value={producto.precio_1 || ''} onChange={e => handleChange('precio_1', Number(e.target.value))} style={{...inputStyle, paddingLeft: '32px'}} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Precio Secundario (2)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '16px', top: '12px', color: '#64748b', fontWeight: 600 }}>$</span>
                                    <input type="number" step="0.000001" value={producto.precio_2 || ''} onChange={e => handleChange('precio_2', Number(e.target.value))} style={{...inputStyle, paddingLeft: '32px'}} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Precio Mayorista (3)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '16px', top: '12px', color: '#64748b', fontWeight: 600 }}>$</span>
                                    <input type="number" step="0.000001" value={producto.precio_3 || ''} onChange={e => handleChange('precio_3', Number(e.target.value))} style={{...inputStyle, paddingLeft: '32px'}} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Precio por defecto al facturar</label>
                                <select value={producto.precio_por_defecto} onChange={e => handleChange('precio_por_defecto', Number(e.target.value))} style={inputStyle}>
                                    <option value={1}>Usar Precio 1 (Principal)</option>
                                    <option value={2}>Usar Precio 2 (Secundario)</option>
                                    <option value={3}>Usar Precio 3 (Mayorista)</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Subsidio Unitario (Opcional)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '16px', top: '12px', color: '#64748b', fontWeight: 600 }}>$</span>
                                    <input type="number" step="0.000001" value={producto.subsidio_unitario || ''} onChange={e => handleChange('subsidio_unitario', e.target.value ? Number(e.target.value) : undefined)} style={{...inputStyle, paddingLeft: '32px'}} placeholder="0.000000" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Impuestos */}
                    <div style={{ display: activeTab === 3 ? 'block' : 'none' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                            <div>
                                <label style={labelStyle}>Porcentaje de IVA <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" required value={producto.tipo_iva || ''} onChange={e => handleChange('tipo_iva', e.target.value)} style={inputStyle} placeholder="Ej. 12%, 15%, 0%" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                            </div>
                            
                            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={producto.impuesto_ice || false} onChange={e => handleChange('impuesto_ice', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Aplica ICE (Impuestos Consumos Especiales)</span>
                                </label>
                                {producto.impuesto_ice && (
                                    <div>
                                        <label style={labelStyle}>Porcentaje ICE</label>
                                        <input type="number" step="0.000001" value={producto.porcentaje_ice || ''} onChange={e => handleChange('porcentaje_ice', e.target.value ? Number(e.target.value) : undefined)} style={inputStyle} placeholder="Ej. 5.00" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={labelStyle}>Monto IRBPNR (Retornables)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '16px', top: '12px', color: '#64748b', fontWeight: 600 }}>$</span>
                                    <input type="number" step="0.000001" value={producto.irbpnr || ''} onChange={e => handleChange('irbpnr', e.target.value ? Number(e.target.value) : undefined)} style={{...inputStyle, paddingLeft: '32px'}} placeholder="0.000000" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Configuración */}
                    <div style={{ display: activeTab === 4 ? 'block' : 'none' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                            <div>
                                <label style={{...labelStyle, color: '#312e81'}}>Tipo de Base <span style={{ color: '#ef4444' }}>*</span></label>
                                <select required value={producto.tipo} onChange={e => handleChange('tipo', e.target.value as TipoProducto)} style={inputStyle}>
                                    <option value={TipoProducto.FISICO}>📦 Producto Físico (Tangible)</option>
                                    <option value={TipoProducto.SERVICIO}>🛠️ Servicio (Intangible)</option>
                                </select>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>Los servicios no manejan inventario ni bodegas.</p>
                            </div>
                            <div>
                                <label style={{...labelStyle, color: '#312e81'}}>Tipo de Control de Inventario <span style={{ color: '#ef4444' }}>*</span></label>
                                <select 
                                    required 
                                    disabled={producto.tipo === TipoProducto.SERVICIO}
                                    value={producto.tipo_control_inventario} 
                                    onChange={e => handleChange('tipo_control_inventario', e.target.value as TipoControlInventario)} 
                                    style={{...inputStyle, backgroundColor: producto.tipo === TipoProducto.SERVICIO ? '#f1f5f9' : 'white', opacity: producto.tipo === TipoProducto.SERVICIO ? 0.7 : 1}}
                                >
                                    <option value={TipoControlInventario.SIN_CONTROL}>Libre (Sin Control)</option>
                                    <option value={TipoControlInventario.CANTIDAD}>Controlar por Cantidad (Estándar)</option>
                                    <option value={TipoControlInventario.LOTE}>Controlar por Lote (Perecederos)</option>
                                    <option value={TipoControlInventario.SERIE}>Controlar por Serie (Electrónicos)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <input type="checkbox" checked={producto.permite_venta} onChange={e => handleChange('permite_venta', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Permite Venta</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Disponible en el catálogo de ventas</span>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <input type="checkbox" checked={producto.permite_compra} onChange={e => handleChange('permite_compra', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Permite Compra</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Disponible para registrar compras</span>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <input type="checkbox" checked={producto.uso_interno} onChange={e => handleChange('uso_interno', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Uso Interno</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Material para uso operativo interno</span>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <input type="checkbox" checked={producto.permite_exhibicion} onChange={e => handleChange('permite_exhibicion', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Exhibición Pública</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Visible en tiendas en línea y catálogos</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* 5. Comercial */}
                    <div style={{ display: activeTab === 5 ? 'block' : 'none' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <label style={labelStyle}>Tipo de Entrega</label>
                                <select value={producto.tipo_entrega || ''} onChange={e => handleChange('tipo_entrega', e.target.value as TipoEntrega)} style={inputStyle}>
                                    <option value="">No especificado...</option>
                                    <option value={TipoEntrega.INMEDIATA}>Inmediata (En el momento)</option>
                                    <option value={TipoEntrega.DESPACHO}>Despacho (Programada)</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Bodega de Salida Predeterminada</label>
                                <select value={producto.tipo_bodega_salida || ''} onChange={e => handleChange('tipo_bodega_salida', e.target.value as TipoBodegaSalida)} style={inputStyle}>
                                    <option value="">Usar cualquier bodega con stock...</option>
                                    <option value={TipoBodegaSalida.VENTA}>Siempre desde Venta (Piso de tienda)</option>
                                    <option value={TipoBodegaSalida.ALMACEN}>Siempre desde Almacén (Bodega principal)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <input type="checkbox" checked={producto.seleccionable_venta_suspendida} onChange={e => handleChange('seleccionable_venta_suspendida', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Seleccionable en Venta Suspendida</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Permite incluir este producto en ventas con estado suspendido</span>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <input type="checkbox" checked={producto.requiere_preparacion} onChange={e => handleChange('requiere_preparacion', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Requiere Preparación</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>El producto necesita un proceso previo a la entrega (embalaje, ensamblaje, etc.)</span>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <input type="checkbox" checked={producto.seleccion_avanzada_bodega_salida} onChange={e => handleChange('seleccion_avanzada_bodega_salida', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Selección Avanzada de Bodega</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Habilita una lista prioritaria personalizada de bodegas para salida de inventario</span>
                                </div>
                            </label>
                        </div>

                        <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '16px' }}>
                                <input type="checkbox" checked={producto.permite_devolucion} onChange={e => handleChange('permite_devolucion', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }} />
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Permitir Devoluciones (Garantía)</span>
                            </label>
                            
                            {producto.permite_devolucion && (
                                <div style={{ maxWidth: '300px', paddingLeft: '28px' }}>
                                    <label style={labelStyle}>Tiempo Máximo de Garantía (Días)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="number" min="0" value={producto.tiempo_garantia_devolucion || ''} onChange={e => handleChange('tiempo_garantia_devolucion', e.target.value ? Number(e.target.value) : undefined)} style={{...inputStyle, paddingRight: '45px'}} placeholder="Ej. 30" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                        <span style={{ position: 'absolute', right: '16px', top: '12px', color: '#64748b', fontSize: '0.9rem' }}>días</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 6. Stock Inicial */}
                    {showStockTab && (
                        <div style={{ display: activeTab === 6 ? 'block' : 'none' }}>
                            <div style={{ backgroundColor: '#eef2ff', padding: '20px', borderRadius: '16px', border: '1px solid #c7d2fe', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '1.5rem', marginTop: '2px' }}>📦</div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', color: '#312e81', fontSize: '1.05rem', fontWeight: 700 }}>Asignación Inicial de Inventario</h3>
                                    <p style={{ margin: 0, color: '#4338ca', fontSize: '0.9rem' }}>Puedes asignar existencias ahora para que el producto ya nazca con stock. Esto generará automáticamente el movimiento contable inicial.</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>Bodega para el Stock <span style={{ color: '#ef4444' }}>*</span></label>
                                    <select required={showStockTab} value={stockInicial.bodega_destino_id || ''} onChange={e => setStockInicial(p => ({ ...p, bodega_destino_id: Number(e.target.value) }))} style={inputStyle}>
                                        <option value="">Seleccione dónde guardar...</option>
                                        {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>)}
                                    </select>
                                </div>

                                {producto.tipo_control_inventario === TipoControlInventario.CANTIDAD && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Cantidad que Ingresa <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="number" required min="0.000001" step="0.000001" value={stockInicial.cantidad || ''} onChange={e => setStockInicial(p => ({ ...p, cantidad: Number(e.target.value) }))} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Costo Unitario Promedio (Opcional)</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '16px', top: '12px', color: '#64748b', fontWeight: 600 }}>$</span>
                                                <input type="number" step="0.000001" value={stockInicial.costo_unitario || ''} onChange={e => setStockInicial(p => ({ ...p, costo_unitario: e.target.value ? Number(e.target.value) : undefined }))} style={{...inputStyle, paddingLeft: '32px'}} placeholder="Costo de compra" onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {producto.tipo_control_inventario === TipoControlInventario.LOTE && (
                                <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <LoteFields lotes={lotes} onChange={setLotes} />
                                </div>
                            )}

                            {producto.tipo_control_inventario === TipoControlInventario.SERIE && (
                                <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <SerieFields series={series} onChange={setSeries} />
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                backgroundColor: '#4f46e5', color: 'white', padding: '16px 36px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                            }}
                            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.backgroundColor = '#4338ca'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)'; } }}
                            onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.backgroundColor = '#4f46e5'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.3)'; } }}
                        >
                            {loading ? (
                                <><svg style={{ animation: 'spin 1s linear infinite', width: '20px', height: '20px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Registrando Producto...</>
                            ) : 'Guardar y Publicar Producto'}
                        </button>
                    </div>
                </form>
            </div>
            </>)}

            {/* TABLA DE PRODUCTOS */}
            <div style={{ marginTop: '40px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <span>📋</span> Productos Registrados
                    </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' }}>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', width: '20%' }}>Código / SKU</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%' }}>Producto</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '15%' }}>Categoría</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '15%' }}>Tipo</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '10%' }}>Precio</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '15%' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingTable ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }}></div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Cargando productos...</div>
                                    </td>
                                </tr>
                            ) : productosList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
                                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '1.1rem' }}>No hay productos registrados aún</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '6px' }}>Crea tu primer producto usando el formulario de arriba</div>
                                    </td>
                                </tr>
                            ) : (
                                (() => {
                                    const totalPages = Math.ceil(productosList.length / ITEMS_PER_PAGE) || 1;
                                    const paginatedProductos = productosList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                                    return paginatedProductos.map((prod, idx) => (
                                        <tr 
                                            key={prod.id} 
                                            style={{ borderBottom: idx < paginatedProductos.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.2s ease', backgroundColor: 'white' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                                                {prod.codigo}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {prod.foto ? (
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                                            <img src={prod.foto} alt={prod.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                                            📦
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 600 }}>{prod.nombre}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    {(prod as any).categoria?.nombre || '-'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                <span style={{ 
                                                    backgroundColor: prod.tipo === TipoProducto.FISICO ? '#dcfce7' : '#e0e7ff', 
                                                    color: prod.tipo === TipoProducto.FISICO ? '#166534' : '#3730a3', 
                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 
                                                }}>
                                                    {prod.tipo}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center', color: '#0f172a', fontWeight: 600 }}>
                                                ${Number(prod.precio_1).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setEditModalProduct(prod)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', opacity: 0.7, transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setDeleteModalProduct(prod)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', opacity: 0.7, transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {(() => {
                    const totalPages = Math.ceil(productosList.length / ITEMS_PER_PAGE) || 1;
                    return totalPages > 1 && (
                        <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, productosList.length)} de {productosList.length} productos
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s' }}
                                >
                                    Anterior
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={currentPage === totalPages}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s' }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Modal Editar Producto */}
            {editModalProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transform: 'translateY(0)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: '#e0e7ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    ✏️
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Editar Información Básica</h3>
                            </div>
                            <button type="button" onClick={() => setEditModalProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                                ✕
                            </button>
                        </div>
                        
                        <form onSubmit={handleUpdate}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Código / SKU</label>
                                    <input 
                                        type="text" 
                                        required 
                                        style={inputStyle} 
                                        value={editModalProduct.codigo}
                                        onChange={(e) => setEditModalProduct({...editModalProduct, codigo: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label style={labelStyle}>Nombre del Producto</label>
                                    <input 
                                        type="text" 
                                        required 
                                        style={inputStyle} 
                                        value={editModalProduct.nombre}
                                        onChange={(e) => setEditModalProduct({...editModalProduct, nombre: e.target.value})}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={labelStyle}>Precio (Sin IVA)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600 }}>$</span>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                min="0" 
                                                required 
                                                style={{...inputStyle, paddingLeft: '32px'}} 
                                                value={editModalProduct.precio_1}
                                                onChange={(e) => setEditModalProduct({...editModalProduct, precio_1: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Categoría</label>
                                        <select 
                                            style={inputStyle} 
                                            value={editModalProduct.categoria_id || ''}
                                            onChange={(e) => setEditModalProduct({...editModalProduct, categoria_id: parseInt(e.target.value) || undefined})}
                                        >
                                            <option value="">Seleccione...</option>
                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label style={labelStyle}>Tipo de Producto</label>
                                    <select 
                                        style={inputStyle} 
                                        value={editModalProduct.tipo}
                                        onChange={(e) => setEditModalProduct({...editModalProduct, tipo: e.target.value as TipoProducto})}
                                    >
                                        <option value={TipoProducto.FISICO}>Producto Físico</option>
                                        <option value={TipoProducto.SERVICIO}>Servicio Intangible</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setEditModalProduct(null)} style={{ flex: 1, padding: '14px', backgroundColor: 'white', color: '#475569', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={updating} style={{ flex: 1, padding: '14px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1 }}>
                                    {updating ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Eliminar Producto */}
            {deleteModalProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div style={{ backgroundColor: '#fef2f2', padding: '32px 32px 24px 32px', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '2rem' }}>
                                ⚠️
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>¿Eliminar Producto?</h3>
                            <p style={{ margin: 0, color: '#7f1d1d', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                ¿Estás seguro que deseas eliminar <strong>{deleteModalProduct.nombre}</strong>? 
                                Esta acción no se puede deshacer y fallará si el producto ya tiene movimientos en Kardex.
                            </p>
                        </div>
                        <div style={{ padding: '24px 32px', display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={() => setDeleteModalProduct(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#475569', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button type="button" onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
