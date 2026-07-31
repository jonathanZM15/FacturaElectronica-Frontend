import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../../contexts/userContext';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../../services/inventoryService';
import { Categoria } from '../../types/inventory';

const ITEMS_PER_PAGE = 10;

export default function CategoriasPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 1;
    
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loadingTable, setLoadingTable] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [newNombre, setNewNombre] = useState('');
    const [newDescripcion, setNewDescripcion] = useState('');
    const [newEstado, setNewEstado] = useState(true);
    const [newColor, setNewColor] = useState('#6366f1');

    // Modal Editar
    const [editModalCategoria, setEditModalCategoria] = useState<Categoria | null>(null);
    const [editNombre, setEditNombre] = useState('');
    const [editDescripcion, setEditDescripcion] = useState('');
    const [editEstado, setEditEstado] = useState(true);
    const [editColor, setEditColor] = useState('#6366f1');
    const [editError, setEditError] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Modal Eliminar
    const [deleteModalCategoria, setDeleteModalCategoria] = useState<Categoria | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Paginación
    const totalPages = Math.max(1, Math.ceil(categorias.length / ITEMS_PER_PAGE));
    const paginatedCategorias = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return categorias.slice(start, start + ITEMS_PER_PAGE);
    }, [categorias, currentPage]);

    const loadCategorias = async () => {
        try {
            const data = await getCategorias(emisorId);
            setCategorias(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTable(false);
        }
    };

    useEffect(() => { loadCategorias(); }, [emisorId]);

    const isDuplicate = (name: string, excludeId?: number) => {
        const normalized = name.trim().toLowerCase();
        return categorias.some(c => c.nombre.toLowerCase() === normalized && c.id !== excludeId);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        if (!newNombre.trim()) return;
        
        setError('');
        setSuccess('');
        
        if (isDuplicate(newNombre)) {
            setError(`Ya existe una categoría con el nombre "${newNombre.trim()}".`);
            return;
        }

        setLoading(true);
        try {
            await createCategoria(emisorId, { nombre: newNombre.trim(), descripcion: newDescripcion.trim(), estado: newEstado, color: newColor });
            setNewNombre('');
            setNewDescripcion('');
            setNewEstado(true);
            setNewColor('#6366f1');
            setSuccess('Categoría creada exitosamente.');
            await loadCategorias();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error al crear la categoría');
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (cat: Categoria) => {
        setEditModalCategoria(cat);
        setEditNombre(cat.nombre);
        setEditDescripcion(cat.descripcion || '');
        setEditEstado(cat.estado ?? true);
        setEditColor(cat.color || '#6366f1');
        setEditError('');
    };

    const handleUpdate = async () => {
        if (isSavingEdit || !editModalCategoria || !editNombre.trim()) return;
        
        setEditError('');
        if (isDuplicate(editNombre, editModalCategoria.id)) {
            setEditError(`Ya existe otra categoría con el nombre "${editNombre.trim()}".`);
            return;
        }

        setIsSavingEdit(true);
        try {
            await updateCategoria(emisorId, editModalCategoria.id, { nombre: editNombre.trim(), descripcion: editDescripcion.trim(), estado: editEstado, color: editColor });
            setSuccess('Categoría actualizada correctamente.');
            setEditModalCategoria(null);
            await loadCategorias();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setEditError(err.response?.data?.error || err.response?.data?.message || 'Error al actualizar');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDelete = async () => {
        if (isDeleting || !deleteModalCategoria) return;
        
        setIsDeleting(true);
        try {
            await deleteCategoria(emisorId, deleteModalCategoria.id);
            setSuccess('Categoría eliminada correctamente.');
            await loadCategorias();
            const newTotal = Math.max(1, Math.ceil((categorias.length - 1) / ITEMS_PER_PAGE));
            if (currentPage > newTotal) setCurrentPage(newTotal);
            setDeleteModalCategoria(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'No se puede eliminar (tiene productos asociados)');
            setDeleteModalCategoria(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
            
            {/* Header Premium */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        🏷️
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Categorías de Producto
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Clasifica y organiza tu inventario eficientemente
                        </p>
                    </div>
                </div>
                
                <div style={{ backgroundColor: 'white', padding: '8px 16px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 0 3px #d1fae5' }}></span>
                    <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
                        {categorias.length} Registradas
                    </span>
                </div>
            </div>

            {/* Mensajes */}
            {error && (
                <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', fontSize: '0.95rem', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span> <strong style={{ fontWeight: 600 }}>Error:</strong> {error}
                </div>
            )}
            {success && (
                <div style={{ marginBottom: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', fontSize: '0.95rem', color: '#15803d', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '1.2rem' }}>✅</span> <strong style={{ fontWeight: 600 }}>Éxito:</strong> {success}
                </div>
            )}

            {/* Formulario Premium */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '40px' }}>
                <div style={{ padding: '20px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#e0e7ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: 'inset 0 0 0 1px #c7d2fe' }}>
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Crear Nueva Categoría
                    </h2>
                </div>
                
                <form onSubmit={handleCreate} style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Nombre <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="text"
                                required
                                value={newNombre}
                                onChange={(e) => setNewNombre(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: '#f8fafc', transition: 'all 0.3s ease', boxSizing: 'border-box', color: '#0f172a' }}
                                onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)'; }}
                                onBlur={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                                placeholder="Ej. Lácteos..."
                            />
                        </div>
                        <div style={{ flex: '2 1 300px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Descripción</label>
                            <input
                                type="text"
                                value={newDescripcion}
                                onChange={(e) => setNewDescripcion(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: '#f8fafc', transition: 'all 0.3s ease', boxSizing: 'border-box', color: '#0f172a' }}
                                onFocus={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)'; }}
                                onBlur={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                                placeholder="Breve descripción (opcional)"
                            />
                        </div>
                        <div style={{ flex: '0 0 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Color</label>
                            <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <input
                                    type="color"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    style={{ position: 'absolute', top: '-10px', left: '-10px', width: '60px', height: '60px', padding: 0, border: 'none', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                        <div style={{ flex: '0 0 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Estado</label>
                            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                <input type="checkbox" checked={newEstado} onChange={(e) => setNewEstado(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: newEstado ? '#10b981' : '#cbd5e1', transition: '.4s', borderRadius: '24px' }}></span>
                                <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: newEstado ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                            </label>
                        </div>
                        <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
<button
                            type="submit"
                            disabled={loading || !newNombre.trim()}
                            style={{
                                backgroundColor: '#0f172a',
                                color: 'white',
                                padding: '0 32px',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                cursor: (loading || !newNombre.trim()) ? 'not-allowed' : 'pointer',
                                opacity: (loading || !newNombre.trim()) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 6px rgba(15, 23, 42, 0.2)',
                                height: '52px',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => { if (!loading && newNombre.trim()) { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(15, 23, 42, 0.3)'; } }}
                            onMouseLeave={(e) => { if (!loading && newNombre.trim()) { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(15, 23, 42, 0.2)'; } }}
                        >
                            {loading ? (
                                <><svg style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Guardando...</>
                            ) : (
                                <>Crear Categoría <svg style={{width:'18px', height:'18px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg></>
                            )}
                        </button>
                    </div>
                </div>
            </form>
            </div>

            {/* Tabla Premium */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <span>📋</span> Categorías Registradas
                    </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                                                        <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' }}>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%' }}>Nombre</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', width: '35%' }}>Descripción</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '10%' }}>Estado</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '10%' }}>Productos</th>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '15%' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingTable ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }}></div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Cargando categorías...</div>
                                    </td>
                                </tr>
                            ) : categorias.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏷️</div>
                                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '1.1rem' }}>No hay categorías registradas aún</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '6px' }}>Crea tu primera categoría usando el formulario de arriba</div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedCategorias.map((cat, idx) => (
                                    <tr
                                        key={cat.id}
                                        style={{ borderBottom: idx < paginatedCategorias.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.2s ease', backgroundColor: 'white' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                                                                <td style={{ padding: '16px 24px' }}>
                                            <span style={{ 
                                                backgroundColor: cat.color || '#6366f1', 
                                                color: 'white', 
                                                padding: '6px 16px', 
                                                borderRadius: '24px', 
                                                fontSize: '0.9rem', 
                                                fontWeight: 600,
                                                display: 'inline-block',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                {cat.nombre}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '0.85rem' }}>
                                            {cat.descripcion || '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            <span style={{ 
                                                backgroundColor: cat.estado !== false ? '#dcfce7' : '#fee2e2', 
                                                color: cat.estado !== false ? '#166534' : '#991b1b', 
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 
                                            }}>
                                                {cat.estado !== false ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            <span style={{ 
                                                backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 12px', 
                                                borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #e2e8f0'
                                            }}>
                                                {cat.productos_count ?? 0}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 32px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                <button
                                                    onClick={() => openEditModal(cat)}
                                                    style={{ backgroundColor: 'white', color: '#f97316', padding: '8px', borderRadius: '8px', border: '1px solid #fdba74', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fff7ed'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModalCategoria(cat)}
                                                    style={{ backgroundColor: 'white', color: '#ef4444', padding: '8px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, categorias.length)} de {categorias.length} categorías
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600,
                                        backgroundColor: page === currentPage ? '#4f46e5' : 'transparent',
                                        color: page === currentPage ? 'white' : '#64748b',
                                        cursor: 'pointer', transition: 'all 0.15s', minWidth: '36px'
                                    }}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 500,
                                    backgroundColor: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#475569',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EDITAR PREMIUM */}
            {editModalCategoria && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transform: 'translateY(0)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                            <span>✏️</span> Editar Categoría
                        </h3>
                        
                        {editError && (
                            <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '12px 16px', fontSize: '0.9rem', color: '#b91c1c', borderRadius: '8px' }}>
                                {editError}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Nombre de la Categoría</label>
                            <input
                                type="text"
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                style={{ width: '100%', padding: '14px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
                                autoFocus
                            />
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Descripción</label>
                            <input
                                type="text"
                                value={editDescripcion}
                                onChange={(e) => setEditDescripcion(e.target.value)}
                                style={{ width: '100%', padding: '14px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                            <div style={{ flex: '0 0 60px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Color</label>
                                <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <input
                                        type="color"
                                        value={editColor}
                                        onChange={(e) => setEditColor(e.target.value)}
                                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '60px', height: '60px', padding: 0, border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            <div style={{ flex: '0 0 80px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Estado</label>
                                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                    <input type="checkbox" checked={editEstado} onChange={(e) => setEditEstado(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: editEstado ? '#10b981' : '#cbd5e1', transition: '.4s', borderRadius: '24px' }}></span>
                                    <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: editEstado ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setEditModalCategoria(null)}
                                style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                                disabled={isSavingEdit}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={isSavingEdit || !editNombre.trim()}
                                style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: '#6366f1', color: 'white', border: 'none', fontSize: '0.95rem', fontWeight: 600, cursor: (isSavingEdit || !editNombre.trim()) ? 'not-allowed' : 'pointer', opacity: (isSavingEdit || !editNombre.trim()) ? 0.7 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)' }}
                                onMouseEnter={(e) => { if (!isSavingEdit && editNombre.trim()) { e.currentTarget.style.backgroundColor = '#4f46e5'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                onMouseLeave={(e) => { if (!isSavingEdit && editNombre.trim()) { e.currentTarget.style.backgroundColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                            >
                                {isSavingEdit ? (
                                    <><svg style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Guardando...</>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL ELIMINAR PREMIUM */}
            {deleteModalCategoria && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transform: 'translateY(0)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}>
                        
                        <div style={{ padding: '40px 32px 24px', textAlign: 'center' }}>
                            <div style={{ 
                                width: '80px', height: '80px', backgroundColor: '#fff1f2', border: '8px solid #ffe4e6', 
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                margin: '0 auto 24px auto', boxShadow: '0 8px 16px rgba(225, 29, 72, 0.1)' 
                            }}>
                                <svg style={{ width: '32px', height: '32px', color: '#e11d48' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </div>
                            
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
                                ¿Eliminar categoría?
                            </h3>
                            
                            <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: '0', lineHeight: 1.6 }}>
                                Estás a punto de eliminar permanentemente:
                            </p>
                            
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>{deleteModalCategoria.nombre}</span>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                    {deleteModalCategoria.productos_count ?? 0} Productos asociados
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ padding: '0 32px 32px', display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setDeleteModalCategoria(null)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                style={{ 
                                    flex: 1, padding: '12px', borderRadius: '12px', color: 'white', border: 'none', 
                                    fontSize: '0.95rem', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', 
                                    opacity: isDeleting ? 0.7 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)',
                                    boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.3), 0 2px 4px -1px rgba(225, 29, 72, 0.2)'
                                }}
                                onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(225, 29, 72, 0.4)'; } }}
                                onMouseLeave={(e) => { if (!isDeleting) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(225, 29, 72, 0.3)'; } }}
                            >
                                {isDeleting ? (
                                    <><svg style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Eliminando...</>
                                ) : (
                                    'Sí, eliminar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
