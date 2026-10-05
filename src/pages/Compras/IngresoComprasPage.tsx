import React, { useState } from 'react';
import CompraForm from './CompraForm';

const IngresoComprasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'FACTURA_PROVEEDOR' | 'LIQUIDACION_COMPRA' | 'SIN_COMPROBANTE'>('FACTURA_PROVEEDOR');

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      
      {/* Header & Tabs Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#1e293b', fontWeight: 800, letterSpacing: '-0.5px' }}>Ingreso de Compras</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Registra compras para actualizar tu inventario y contabilidad.</p>
        </div>

        {/* Modern Segmented Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('FACTURA_PROVEEDOR')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'FACTURA_PROVEEDOR' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === 'FACTURA_PROVEEDOR' ? '#f59e0b' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === 'FACTURA_PROVEEDOR' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>🧾</span> Factura de Proveedor
          </button>
          <button
            onClick={() => setActiveTab('LIQUIDACION_COMPRA')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'LIQUIDACION_COMPRA' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === 'LIQUIDACION_COMPRA' ? '#f59e0b' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === 'LIQUIDACION_COMPRA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>📄</span> Liquidación de Compra
          </button>
          <button
            onClick={() => setActiveTab('SIN_COMPROBANTE')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'SIN_COMPROBANTE' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === 'SIN_COMPROBANTE' ? '#f59e0b' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === 'SIN_COMPROBANTE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>📦</span> Sin Comprobante
          </button>
        </div>
      </div>

      <div>
        <CompraForm tipoIngreso={activeTab} />
      </div>
    </div>
  );
};

export default IngresoComprasPage;
