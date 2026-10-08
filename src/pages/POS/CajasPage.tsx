import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/userContext';
import { posApi, Caja } from '../../services/posApi';
import { establecimientosApi, Establecimiento } from '../../services/establecimientosApi';

export default function CajasPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 6;

    const [cajas, setCajas] = useState<Caja[]>([]);
    const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editCaja, setEditCaja] = useState<Caja | null>(null);

    const [formData, setFormData] = useState({
        establecimiento_id: '',
        nombre: '',
        activa: true
    });

    useEffect(() => {
        loadData();
    }, [emisorId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const estRes = await establecimientosApi.list(emisorId);
            setEstablecimientos(estRes);
            const cRes = await posApi.getCajas(emisorId);
            setCajas(cRes);
        } catch (error) {
            console.error('Error loading cajas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editCaja) {
                await posApi.updateCaja(emisorId, editCaja.id, {
                    ...formData,
                    establecimiento_id: Number(formData.establecimiento_id)
                });
            } else {
                await posApi.createCaja(emisorId, {
                    ...formData,
                    establecimiento_id: Number(formData.establecimiento_id)
                });
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Error saving caja:', error);
            alert('Error al guardar la caja');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Está seguro de eliminar esta caja?')) return;
        try {
            await posApi.deleteCaja(emisorId, id);
            loadData();
        } catch (error: any) {
            console.error('Error deleting caja:', error);
            alert(error.response?.data?.error || 'Error al eliminar la caja');
        }
    };

    const openCreate = () => {
        setEditCaja(null);
        setFormData({ establecimiento_id: establecimientos[0]?.id.toString() || '', nombre: '', activa: true });
        setShowModal(true);
    };

    const openEdit = (caja: Caja) => {
        setEditCaja(caja);
        setFormData({
            establecimiento_id: caja.establecimiento_id.toString(),
            nombre: caja.nombre,
            activa: caja.activa
        });
        setShowModal(true);
    };

    return (
        <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', fontSize: '2rem' }}>
                        💵
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Gestión de Cajas
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            Administra las cajas de tus establecimientos para el sistema POS
                        </p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    style={{
                        padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>+</span> Nueva Caja
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando cajas...</div>
            ) : cajas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <span style={{ fontSize: '3rem' }}>📭</span>
                    <h3 style={{ color: '#0f172a', margin: '16px 0 8px 0' }}>No tienes cajas configuradas</h3>
                    <p style={{ color: '#64748b', margin: 0 }}>Crea tu primera caja para poder abrir turnos en el POS.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {cajas.map(caja => (
                        <div key={caja.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '48px', height: '48px', backgroundColor: caja.activa ? '#dcfce7' : '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                        {caja.activa ? '🟢' : '⚫'}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.1rem' }}>{caja.nombre}</h3>
                                        <span style={{ fontSize: '0.85rem', color: caja.activa ? '#16a34a' : '#64748b', fontWeight: 600, padding: '2px 8px', backgroundColor: caja.activa ? '#dcfce7' : '#e2e8f0', borderRadius: '20px' }}>
                                            {caja.activa ? 'ACTIVA' : 'INACTIVA'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#64748b' }}>Establecimiento</p>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>
                                    {caja.establecimiento?.nombre_comercial || caja.establecimiento?.codigo}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => openEdit(caja)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                    Editar
                                </button>
                                <button onClick={() => handleDelete(caja.id)} style={{ flex: 1, padding: '10px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Creación/Edición */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: '#0f172a' }}>
                            {editCaja ? 'Editar Caja' : 'Nueva Caja'}
                        </h2>
                        
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Establecimiento</label>
                                <select 
                                    required
                                    value={formData.establecimiento_id}
                                    onChange={e => setFormData({...formData, establecimiento_id: e.target.value})}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                                >
                                    <option value="">Seleccione un establecimiento...</option>
                                    {establecimientos.map(e => (
                                        <option key={e.id} value={e.id}>{e.codigo} - {e.nombre_comercial}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Nombre de la Caja</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="Ej. Caja Principal, Punto de Venta 1"
                                    value={formData.nombre}
                                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox"
                                        checked={formData.activa}
                                        onChange={e => setFormData({...formData, activa: e.target.checked})}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#334155' }}>Caja Activa</span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', backgroundColor: 'transparent', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>
                                    Guardar Caja
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
