import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { puntosEmisionApi } from '../services/puntosEmisionApi';
import { establecimientosApi } from '../services/establecimientosApi';
import { emisoresApi } from '../services/emisoresApi';
import { useNotification } from '../contexts/NotificationContext';

const PuntoEmisionInfo: React.FC = () => {
  const { id, estId, puntoId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [punto, setPunto] = useState<any | null>(null);
  const [establecimiento, setEstablecimiento] = useState<any | null>(null);
  const [emisor, setEmisor] = useState<any | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id || !estId || !puntoId) return;
      setLoading(true);
      try {
        const [pRes, eRes, cRes] = await Promise.all([
          puntosEmisionApi.show(id, estId, puntoId),
          establecimientosApi.show(id, estId),
          emisoresApi.get(id)
        ]);
        
        setPunto(pRes.data?.data ?? pRes.data);
        setEstablecimiento(eRes.data?.data ?? eRes.data);
        setEmisor(cRes.data?.data ?? cRes.data);
      } catch (error: any) {
        show({
          title: 'Error',
          message: 'No se pudo cargar la información del punto de emisión',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, estId, puntoId, show]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Cargando información...</p>
      </div>
    );
  }

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
            {punto?.nombre}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Código: <span style={{ fontWeight: 600, color: '#1f2937' }}>{punto?.codigo}</span>
          </p>
        </div>
        <button
          onClick={() => navigate(`/emisores/${id}/establecimientos/${estId}`)}
          style={{
            padding: '10px 20px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Contenido principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Sección Emisor */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
            📋 Emisor
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                RUC
              </label>
              <p
                onClick={() => navigate(`/emisores/${emisor?.id}`)}
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1d4ed8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#2563eb')}
              >
                {emisor?.ruc ?? '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Razón Social
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
                {emisor?.razon_social ?? '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Estado
              </label>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: emisor?.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6',
                    color: emisor?.estado === 'ABIERTO' ? '#059669' : '#374151'
                  }}
                >
                  {emisor?.estado === 'ABIERTO' ? '✓ Activo' : emisor?.estado ?? '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección Establecimiento */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
            🏢 Establecimiento
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Código
              </label>
              <p
                onClick={() => navigate(`/emisores/${id}/establecimientos/${estId}`)}
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1d4ed8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#2563eb')}
              >
                {establecimiento?.codigo ?? '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nombre
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
                {establecimiento?.nombre ?? '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nombre Comercial
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
                {establecimiento?.nombre_comercial ?? '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Dirección
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
                {establecimiento?.direccion ?? '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Correo
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
                {establecimiento?.correo ?? '-'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Teléfono
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
                {establecimiento?.telefono ?? '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Punto de Emisión */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}
      >
        <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
          📍 Información del Punto de Emisión
        </h2>

        {/* Grid de información principal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
          {/* Código */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Código
            </label>
            <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
              {punto?.codigo ?? '-'}
            </p>
          </div>

          {/* Nombre */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nombre
            </label>
            <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
              {punto?.nombre ?? '-'}
            </p>
          </div>

          {/* Estado */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estado
            </label>
            <div style={{ marginTop: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: punto?.estado === 'ACTIVO' ? '#d1fae5' : '#f3f4f6',
                  color: punto?.estado === 'ACTIVO' ? '#059669' : '#374151'
                }}
              >
                {punto?.estado === 'ACTIVO' ? '✓ ' : ''}
                {punto?.estado ?? '-'}
              </span>
            </div>
          </div>

          {/* Usuario Asociado */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Usuario Asociado
            </label>
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '15px',
                fontWeight: 600,
                color: punto?.user_id ? '#2563eb' : '#6b7280',
                cursor: punto?.user_id ? 'pointer' : 'default',
                textDecoration: punto?.user_id ? 'underline' : 'none',
                transition: 'color 0.2s ease'
              }}
              onClick={() => {
                if (punto?.user_id) {
                  // TODO: Navegar a pantalla de información de usuario cuando esté disponible
                  // navigate(`/usuarios/${punto.user_id}`);
                }
              }}
              onMouseEnter={(e) => {
                if (punto?.user_id) {
                  e.currentTarget.style.color = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                if (punto?.user_id) {
                  e.currentTarget.style.color = '#2563eb';
                }
              }}
            >
              {punto?.user?.name ?? punto?.user_id ?? '-'}
            </p>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ borderTop: '2px solid #e5e7eb', margin: '24px 0' }} />

        {/* Secuenciales */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔢 Secuenciales de Comprobantes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {/* Factura */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                Factura
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                {punto?.secuencial_factura ?? '-'}
              </p>
            </div>

            {/* Liquidación de Compra */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                Liquidación Compra
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                {punto?.secuencial_liquidacion_compra ?? '-'}
              </p>
            </div>

            {/* Nota de Crédito */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                Nota Crédito
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                {punto?.secuencial_nota_credito ?? '-'}
              </p>
            </div>

            {/* Nota de Débito */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                Nota Débito
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                {punto?.secuencial_nota_debito ?? '-'}
              </p>
            </div>

            {/* Guía de Remisión */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                Guía Remisión
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                {punto?.secuencial_guia_remision ?? '-'}
              </p>
            </div>

            {/* Retención */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                Retención
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                {punto?.secuencial_retencion ?? '-'}
              </p>
            </div>

            {/* Proforma */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                Proforma
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                {punto?.secuencial_proforma ?? '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ borderTop: '2px solid #e5e7eb', margin: '24px 0' }} />

        {/* Información de auditoría */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📅 Fecha de Creación
            </label>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
              {formatDate(punto?.created_at)}
            </p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ✏️ Última Actualización
            </label>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
              {formatDate(punto?.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuntoEmisionInfo;
