import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TipoBodega, Bodega } from '../../types/inventory';
import { getBodegas, createBodega, updateBodega, deleteBodega } from '../../services/inventoryService';

interface BodegaFormProps {
    emisorId: number | string;
    onSuccess?: (bodega: Bodega) => void;
}

const TIPO_LABELS: Record<string, string> = {
    VENTA: 'Venta',
    ALMACEN: 'Almacén',
    EXHIBICION: 'Exhibición',
    MERMAS: 'Mermas',
    TRANSITO: 'Tránsito',
};

const ITEMS_PER_PAGE = 10;

const TIPO_OPTIONS = [
    { value: TipoBodega.VENTA, label: 'Venta', icon: '🟢', color: '#166534', bg: '#dcfce7' },
    { value: TipoBodega.ALMACEN, label: 'Almacén', icon: '🔵', color: '#1e40af', bg: '#dbeafe' },
    { value: TipoBodega.EXHIBICION, label: 'Exhibición', icon: '🟡', color: '#92400e', bg: '#fef3c7' },
    { value: TipoBodega.MERMAS, label: 'Mermas', icon: '🔴', color: '#991b1b', bg: '#fee2e2' },
];

export const BodegaForm: React.FC<BodegaFormProps> = ({ emisorId, onSuccess }) => {
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<TipoBodega>(TipoBodega.VENTA);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Custom Dropdown States
    const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
    const createDropdownRef = useRef<HTMLDivElement>(null);

    // Tabla
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [loadingTable, setLoadingTable] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal Editar
    const [editModalBodega, setEditModalBodega] = useState<Bodega | null>(null);
    const [editNombre, setEditNombre] = useState('');
    const [editTipo, setEditTipo] = useState<TipoBodega>(TipoBodega.VENTA);
    const [editError, setEditError] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    
    const [isEditTypeOpen, setIsEditTypeOpen] = useState(false);
    const editDropdownRef = useRef<HTMLDivElement>(null);

    // Modal Eliminar
    const [deleteModalBodega, setDeleteModalBodega] = useState<Bodega | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Paginación
    const totalPages = Math.max(1, Math.ceil(bodegas.length / ITEMS_PER_PAGE));
    const paginatedBodegas = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return bodegas.slice(start, start + ITEMS_PER_PAGE);
    }, [bodegas, currentPage]);

    const loadBodegas = async () => {
        try {
            const data = await getBodegas(emisorId);
            setBodegas(data);
        } catch (err) {
            console.error('Error cargando bodegas:', err);
        } finally {
            setLoadingTable(false);
        }
    };

    useEffect(() => { loadBodegas(); }, [emisorId]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (createDropdownRef.current && !createDropdownRef.current.contains(event.target as Node)) {
                setIsCreateTypeOpen(false);
            }
            if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) {
                setIsEditTypeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Validación de nombre y tipo duplicado
    const isDuplicate = (name: string, checkTipo: TipoBodega, excludeId?: number): boolean => {
        const normalized = name.trim().toLowerCase();
        return bodegas.some(b => b.nombre.toLowerCase() === normalized && b.tipo === checkTipo && b.id !== excludeId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return; // Previene doble envío si el usuario hace doble clic muy rápido
        
        setError('');
        setSuccess('');

        if (isDuplicate(nombre, tipo)) {
            setError(`Ya existe una bodega con el nombre "${nombre.trim()}" del tipo ${TIPO_LABELS[tipo]}.`);
            return;
        }

        setLoading(true);
        try {
            const nuevaBodega = await createBodega(emisorId, { nombre: nombre.trim(), tipo });
            setNombre('');
            setTipo(TipoBodega.VENTA);
            setSuccess('¡Bodega creada exitosamente!');
            await loadBodegas();
            if (onSuccess) onSuccess(nuevaBodega);
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al crear la bodega');
        } finally {
            setLoading(false);
        }
    };

    // Funciones Modal Editar
    const openEditModal = (bodega: Bodega) => {
        setEditModalBodega(bodega);
        setEditNombre(bodega.nombre);
        setEditTipo(bodega.tipo);
        setEditError('');
        setIsEditTypeOpen(false);
    };

    const handleUpdate = async () => {
        if (isSavingEdit || !editModalBodega || !editNombre.trim()) return; // Previene doble envío
        
        setEditError('');
        if (isDuplicate(editNombre, editTipo, editModalBodega.id)) {
            setEditError(`Ya existe otra bodega con el nombre "${editNombre.trim()}" del tipo ${TIPO_LABELS[editTipo]}.`);
            return;
        }
        
        setIsSavingEdit(true);
        try {
            await updateBodega(emisorId, editModalBodega.id, { nombre: editNombre.trim(), tipo: editTipo });
            setSuccess('Bodega actualizada correctamente.');
            await loadBodegas();
            setEditModalBodega(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setEditError(err.response?.data?.message || 'Error al actualizar');
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Funciones Modal Eliminar
    const handleDelete = async () => {
        if (isDeleting || !deleteModalBodega) return; // Previene doble clic
        
        setIsDeleting(true);
        try {
            await deleteBodega(emisorId, deleteModalBodega.id);
            setSuccess('Bodega eliminada correctamente.');
            await loadBodegas();
            const newTotal = Math.max(1, Math.ceil((bodegas.length - 1) / ITEMS_PER_PAGE));
            if (currentPage > newTotal) setCurrentPage(newTotal);
            setDeleteModalBodega(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'No se puede eliminar esta bodega.');
            setDeleteModalBodega(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const renderCustomSelect = (currentValue: TipoBodega, onSelect: (val: TipoBodega) => void, isOpen: boolean, setIsOpen: (val: boolean) => void, ref: React.RefObject<HTMLDivElement>) => {
        const selectedOption = TIPO_OPTIONS.find(o => o.value === currentValue) || TIPO_OPTIONS[0];

        return (
            <div ref={ref} style={{ position: 'relative', width: '100%' }}>
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ 
                        width: '100%', padding: '12px 16px', border: `1px solid ${isOpen ? '#6366f1' : '#cbd5e1'}`, 
                        borderRadius: '10px', fontSize: '0.95rem', backgroundColor: isOpen ? 'white' : '#f8fafc', 
                        transition: 'all 0.2s', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', 
                        alignItems: 'center', justifyContent: 'space-between', color: '#0f172a',
                        boxShadow: isOpen ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : 'none'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{selectedOption.icon}</span>
                        <span style={{ fontWeight: 500 }}>{selectedOption.label}</span>
                    </div>
                    <svg style={{ width: '16px', height: '16px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                
                {isOpen && (
                    <div style={{ 
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, 
                        backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', 
                        zIndex: 50, overflow: 'hidden', padding: '6px'
                    }}>
                        {TIPO_OPTIONS.map((opt) => (
                            <div 
                                key={opt.value}
                                onClick={() => { onSelect(opt.value); setIsOpen(false); }}
                                style={{
                                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', 
                                    cursor: 'pointer', borderRadius: '8px', transition: 'all 0.15s',
                                    backgroundColor: currentValue === opt.value ? '#f8fafc' : 'transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentValue === opt.value ? '#f8fafc' : 'transparent'}
                            >
                                <span>{opt.icon}</span>
                                <span style={{ fontWeight: 500, color: '#334155', flex: 1 }}>{opt.label}</span>
                                {currentValue === opt.value && (
                                    <svg style={{ width: '16px', height: '16px', color: '#6366f1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
            {/* Header Premium */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        🏬
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Gestión de Bodegas
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Administra y organiza tus espacios de almacenamiento
                        </p>
                    </div>
                </div>
                
                <div style={{ backgroundColor: 'white', padding: '8px 16px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 0 3px #d1fae5' }}></span>
                    <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
                        {bodegas.length} Registradas
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
            <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'visible', marginBottom: '40px' }}>
                <div style={{ padding: '20px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#e0e7ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: 'inset 0 0 0 1px #c7d2fe' }}>
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Crear Nueva Bodega
                    </h2>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: '32px', display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
                            Nombre de la Bodega <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'white', transition: 'all 0.2s', boxSizing: 'border-box', color: '#0f172a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
                            placeholder="Ej. Bodega Principal Norte"
                        />
                    </div>
                    
                    <div style={{ width: '280px', flexShrink: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
                            Tipo Asignado <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        {renderCustomSelect(tipo, setTipo, isCreateTypeOpen, setIsCreateTypeOpen, createDropdownRef)}
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading || !nombre.trim()}
                        style={{
                            backgroundColor: '#4f46e5',
                            color: 'white',
                            padding: '14px 32px',
                            borderRadius: '12px',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: (loading || !nombre.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !nombre.trim()) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                            height: '52px' // Matches input height (14px pad + ~20px text)
                        }}
                        onMouseEnter={(e) => { if (!loading && nombre.trim()) { e.currentTarget.style.backgroundColor = '#4338ca'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.3)'; } }}
                        onMouseLeave={(e) => { if (!loading && nombre.trim()) { e.currentTarget.style.backgroundColor = '#4f46e5'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.25)'; } }}
                    >
                        {loading ? (
                            <><svg style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Guardando...</>
                        ) : (
                            <>Crear Bodega <svg style={{width:'18px', height:'18px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg></>
                        )}
                    </button>
                </form>
            </div>

            {/* Tabla */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <span>📋</span> Bodegas Registradas
                    </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#6366f1' }}>
                                <th style={{ padding: '16px 32px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', width: '30%' }}>Nombre</th>
                                <th style={{ padding: '16px 32px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', width: '15%' }}>Tipo</th>
                                <th style={{ padding: '16px 32px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', width: '25%' }}>Creador</th>
                                <th style={{ padding: '16px 32px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', width: '15%' }}>Creada</th>
                                <th style={{ padding: '16px 32px', fontSize: '0.85rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #4f46e5', textAlign: 'right', width: '15%' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingTable ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }}></div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Cargando bodegas...</div>
                                    </td>
                                </tr>
                            ) : bodegas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
                                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '1.1rem' }}>No hay bodegas registradas aún</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '6px' }}>Crea tu primera bodega usando el formulario de arriba</div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedBodegas.map((bodega, idx) => (
                                    <tr
                                        key={bodega.id}
                                        style={{ borderBottom: idx < paginatedBodegas.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.2s ease', backgroundColor: 'white' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <td style={{ padding: '16px 32px', color: '#0f172a', fontSize: '0.9rem', fontWeight: 500 }}>
                                            {bodega.nombre}
                                        </td>
                                        <td style={{ padding: '16px 32px' }}>
                                            <span style={{ 
                                                padding: '6px 12px', 
                                                borderRadius: '999px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: 600,
                                                ...(bodega.tipo === 'VENTA' ? { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' } :
                                                    bodega.tipo === 'ALMACEN' ? { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' } :
                                                    bodega.tipo === 'EXHIBICION' ? { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' } :
                                                    bodega.tipo === 'MERMAS' ? { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' } :
                                                    { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' })
                                            }}>
                                                {TIPO_LABELS[bodega.tipo] || bodega.tipo}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 32px', color: '#475569', fontSize: '0.9rem' }}>
                                            {bodega.creador ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                                        {bodega.creador.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 500 }}>{bodega.creador.name}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#94a3b8' }}>Sistema</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 32px', color: '#64748b', fontSize: '0.9rem' }}>
                                            {bodega.created_at ? new Date(bodega.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td style={{ padding: '16px 32px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                <button
                                                    onClick={() => openEditModal(bodega)}
                                                    style={{ backgroundColor: 'white', color: '#f97316', padding: '8px', borderRadius: '8px', border: '1px solid #fdba74', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fff7ed'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModalBodega(bodega)}
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
                            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, bodegas.length)} de {bodegas.length} bodegas
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

            {/* MODAL EDITAR */}
            {editModalBodega && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', transform: 'translateY(0)', animation: 'slideUp 0.3s ease-out' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>✏️</span> Editar Bodega
                        </h3>
                        
                        {editError && (
                            <div style={{ marginBottom: '20px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '12px 16px', fontSize: '0.85rem', color: '#b91c1c', borderRadius: '8px' }}>
                                {editError}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Nombre</label>
                            <input
                                type="text"
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                                autoFocus
                            />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Tipo</label>
                            {renderCustomSelect(editTipo, setEditTipo, isEditTypeOpen, setIsEditTypeOpen, editDropdownRef)}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setEditModalBodega(null)}
                                style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                disabled={isSavingEdit}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={isSavingEdit || !editNombre.trim()}
                                style={{ padding: '10px 24px', borderRadius: '10px', backgroundColor: '#6366f1', color: 'white', border: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: (isSavingEdit || !editNombre.trim()) ? 'not-allowed' : 'pointer', opacity: (isSavingEdit || !editNombre.trim()) ? 0.7 : 1, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onMouseEnter={(e) => { if (!isSavingEdit && editNombre.trim()) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
                                onMouseLeave={(e) => { if (!isSavingEdit && editNombre.trim()) e.currentTarget.style.backgroundColor = '#6366f1'; }}
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
            {deleteModalBodega && createPortal(
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
                                ¿Eliminar bodega?
                            </h3>
                            
                            <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: '0', lineHeight: 1.6 }}>
                                Estás a punto de eliminar permanentemente:
                            </p>
                            
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>{deleteModalBodega.nombre}</span>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                    {TIPO_LABELS[deleteModalBodega.tipo]}
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ padding: '0 32px 32px', display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setDeleteModalBodega(null)}
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
};
