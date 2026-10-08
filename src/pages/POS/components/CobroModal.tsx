import React, { useState, useEffect } from 'react';
import { clientesService } from '../../../services/api';

interface CobroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payload: any, firmaFile: File, firmaPassword: string) => void;
    total: number;
    emisorId: number;
}

export default function CobroModal({ isOpen, onClose, onConfirm, total, emisorId }: CobroModalProps) {
    const [identificacion, setIdentificacion] = useState('9999999999999');
    const [cliente, setCliente] = useState<any>(null);
    const [loadingCliente, setLoadingCliente] = useState(false);
    
    const [formaPago, setFormaPago] = useState('01'); // 01 = Sin utilizacion del sistema financiero
    const [efectivoEntregado, setEfectivoEntregado] = useState<number | ''>('');
    const [firmaFile, setFirmaFile] = useState<File | null>(null);
    const [firmaPassword, setFirmaPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            buscarCliente('9999999999999'); // Default Consumidor Final
        }
    }, [isOpen]);

    const buscarCliente = async (idBusqueda: string) => {
        if (!idBusqueda) return;
        try {
            setLoadingCliente(true);
            const res = await clientesService.buscar(emisorId, idBusqueda);
            if (res.data?.data) {
                setCliente(res.data.data);
            } else {
                setCliente(null);
            }
        } catch (error) {
            setCliente(null);
        } finally {
            setLoadingCliente(false);
        }
    };

    const handleConfirm = () => {
        if (!cliente) {
            alert('Debe buscar y seleccionar un cliente (o usar 9999999999999 para Consumidor Final).');
            return;
        }
        if (!firmaFile) {
            alert('Debe seleccionar el archivo de firma (.p12) para emitir la factura.');
            return;
        }
        if (!firmaPassword) {
            alert('Debe ingresar la contraseña de la firma.');
            return;
        }
        
        onConfirm({ cliente, formaPago }, firmaFile, firmaPassword);
    };

    if (!isOpen) return null;

    const vuelto = (typeof efectivoEntregado === 'number' && efectivoEntregado > total) 
        ? efectivoEntregado - total 
        : 0;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '500px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    Cobrar Venta
                </h3>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={{ fontSize: '1.2rem', color: '#64748b' }}>Total a Pagar:</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>${total.toFixed(2)}</span>
                    </div>

                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Cliente (Identificación)</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            value={identificacion}
                            onChange={(e) => setIdentificacion(e.target.value)}
                            onBlur={(e) => buscarCliente(e.target.value)}
                            style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            placeholder="Cédula / RUC"
                        />
                        <button 
                            type="button" 
                            onClick={() => buscarCliente(identificacion)}
                            style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px' }}
                        >
                            Buscar
                        </button>
                    </div>
                    {loadingCliente ? (
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>Buscando...</p>
                    ) : cliente ? (
                        <p style={{ fontSize: '0.9rem', color: '#16a34a', margin: 0, fontWeight: 500 }}>
                            ✓ {cliente.razon_social || cliente.nombre}
                        </p>
                    ) : (
                        <p style={{ fontSize: '0.9rem', color: '#ef4444', margin: 0 }}>Cliente no encontrado en este emisor.</p>
                    )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Forma de Pago</label>
                    <select
                        value={formaPago}
                        onChange={(e) => setFormaPago(e.target.value)}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '10px' }}
                    >
                        <option value="01">Efectivo (Sin utilización del sistema financiero)</option>
                        <option value="16">Tarjeta de Débito</option>
                        <option value="19">Tarjeta de Crédito</option>
                        <option value="20">Transferencia</option>
                    </select>
                    
                    {formaPago === '01' && (
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>Efectivo Recibido</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={efectivoEntregado}
                                    onChange={(e) => setEfectivoEntregado(e.target.value ? parseFloat(e.target.value) : '')}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>Vuelto</label>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: vuelto > 0 ? '#f59e0b' : '#94a3b8' }}>
                                    ${vuelto.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#334155' }}>Firma Electrónica</h4>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Archivo de Firma (.p12)</label>
                    <input
                        type="file"
                        accept=".p12,.pfx"
                        onChange={(e) => setFirmaFile(e.target.files?.[0] || null)}
                        style={{ width: '100%', marginBottom: '10px', fontSize: '0.9rem' }}
                    />
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Contraseña de Firma</label>
                    <input
                        type="password"
                        value={firmaPassword}
                        onChange={(e) => setFirmaPassword(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{ padding: '10px 16px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 600 }}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirm}
                        style={{ padding: '10px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600 }}
                    >
                        Confirmar Venta
                    </button>
                </div>
            </div>
        </div>
    );
}
