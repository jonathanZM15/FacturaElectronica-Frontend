import React, { useState } from 'react';
import ClientesPage from '../Clientes/ClientesPage';
import ProveedoresPage from '../Proveedores/ProveedoresPage';

const DirectorioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clientes' | 'proveedores'>('clientes');

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#1e293b' }}>Directorio</h1>
        <p style={{ margin: 0, color: '#64748b' }}>Administra los clientes y proveedores de la empresa.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('clientes')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'clientes' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'clientes' ? '#3b82f6' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          👥 Clientes
        </button>
        <button
          onClick={() => setActiveTab('proveedores')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'proveedores' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'proveedores' ? '#3b82f6' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          🏢 Proveedores
        </button>
      </div>

      <div style={{ marginTop: '-24px' }}>
        {/* We wrap the child pages in a div that resets their internal padding to avoid double padding */}
        <div style={{ margin: '0 -24px' }}>
          {activeTab === 'clientes' ? <ClientesPage isEmbedded /> : <ProveedoresPage isEmbedded />}
        </div>
      </div>
    </div>
  );
};

export default DirectorioPage;
