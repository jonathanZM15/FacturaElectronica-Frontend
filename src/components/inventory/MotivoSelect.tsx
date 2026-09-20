import React, { useState, useEffect } from 'react';
import { MotivoMovimiento } from '../../types/inventory';
import { getMotivosMovimiento } from '../../services/inventoryService';

interface Props {
    emisorId: number | string;
    tipoMovimiento?: string;
    value: number | '';
    onChange: (motivoId: number | '', motivo?: MotivoMovimiento) => void;
    required?: boolean;
    disabled?: boolean;
    label?: string;
    placeholder?: string;
    error?: string;
    helperText?: string;
    containerStyle?: React.CSSProperties;
}

export const MotivoSelect: React.FC<Props> = ({
    emisorId,
    tipoMovimiento,
    value,
    onChange,
    required = false,
    disabled = false,
    label = 'Motivo del Movimiento',
    placeholder,
    error,
    helperText,
    containerStyle
}) => {
    const [motivos, setMotivos] = useState<MotivoMovimiento[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchMotivos = async () => {
            if (!emisorId) return;
            setLoading(true);
            setFetchError(null);
            try {
                const data = await getMotivosMovimiento(emisorId, tipoMovimiento);
                if (isMounted) {
                    setMotivos(Array.isArray(data) ? data : []);
                }
            } catch (err: any) {
                console.error('Error al cargar motivos de movimiento:', err);
                if (isMounted) {
                    setFetchError('No se pudieron cargar los motivos');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchMotivos();
        return () => {
            isMounted = false;
        };
    }, [emisorId, tipoMovimiento]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === '') {
            onChange('');
            return;
        }
        const numericVal = parseInt(val, 10);
        const motivoObj = motivos.find(m => m.id === numericVal);
        onChange(numericVal, motivoObj);
    };

    const selectedMotivo = motivos.find(m => m.id === value);
    const isOtro = selectedMotivo?.codigo?.endsWith('-99');

    const defaultPlaceholder = required
        ? '-- Seleccione un motivo (Obligatorio) --'
        : '-- Sin motivo específico (Opcional) --';

    return (
        <div style={{ flex: '1 1 300px', ...containerStyle }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                {loading && <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>(cargando...)</span>}
            </label>

            <select
                value={value}
                onChange={handleSelectChange}
                disabled={disabled || loading}
                required={required}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${error || fetchError ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    backgroundColor: disabled ? '#f1f5f9' : 'white',
                    color: '#0f172a',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                }}
            >
                <option value="">{placeholder || defaultPlaceholder}</option>
                {motivos.map(m => (
                    <option key={m.id} value={m.id}>
                        [{m.codigo}] {m.descripcion}
                    </option>
                ))}
            </select>

            {isOtro && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>ℹ️</span>
                    <span>El motivo seleccionado ({selectedMotivo?.codigo}) requiere que proporcione una justificación en la observación general.</span>
                </div>
            )}

            {(error || fetchError) && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#ef4444' }}>
                    {error || fetchError}
                </div>
            )}

            {helperText && !error && !fetchError && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                    {helperText}
                </div>
            )}
        </div>
    );
};
