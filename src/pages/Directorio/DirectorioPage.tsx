import React, { useState } from 'react';
import ClientesPage from '../Clientes/ClientesPage';
import ProveedoresPage from '../Proveedores/ProveedoresPage';
import TransportistasPage from '../Transportistas/TransportistasPage';

const DirectorioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clientes' | 'proveedores' | 'transportistas'>('clientes');

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      
      {/* Header & Tabs Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#1e293b', fontWeight: 800, letterSpacing: '-0.5px' }}>Directorio</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Administra y organiza tus entidades comerciales.</p>
        </div>

        {/* Modern Segmented Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('clientes')}
            style={{
              padding: '8px 20px',
              background: activeTab === 'clientes' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === 'clientes' ? '#2563eb' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === 'clientes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>👥</span> Clientes
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            style={{
              padding: '8px 20px',
              background: activeTab === 'proveedores' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === 'proveedores' ? '#2563eb' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === 'proveedores' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>🏢</span> Proveedores
          </button>
          <button
            onClick={() => setActiveTab('transportistas')}
            style={{
              padding: '8px 20px',
              background: activeTab === 'transportistas' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === 'transportistas' ? '#2563eb' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === 'transportistas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>🚚</span> Transportistas
          </button>
        </div>
      </div>

      <div style={{ margin: '0 -24px' }}>
        {activeTab === 'clientes' && <ClientesPage isEmbedded />}
        {activeTab === 'proveedores' && <ProveedoresPage isEmbedded />}
        {activeTab === 'transportistas' && <TransportistasPage isEmbedded />}
      </div>
    </div>
  );
};

export default DirectorioPage;
