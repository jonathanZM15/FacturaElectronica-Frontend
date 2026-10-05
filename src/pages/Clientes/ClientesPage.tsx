import React, { useState, useEffect } from 'react';
import { clientesApi, Cliente } from '../../services/clientesApi';
import { emisoresApi } from '../../services/emisoresApi';

const ClientesPage: React.FC<{isEmbedded?: boolean}> = ({ isEmbedded }) => {
  const [emisores, setEmisores] = useState<any[]>([]);
  const [emisorId, setEmisorId] = useState<string>('');
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Partial<Cliente>>({});

  useEffect(() => {
    emisoresApi.list().then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setEmisores(data);
      if (data.length > 0) setEmisorId(data[0].id.toString());
    });
  }, []);

  useEffect(() => {
    if (emisorId) fetchClientes();
  }, [emisorId]);

  const fetchClientes = async (q = search) => {
    if (!emisorId) return;
    setLoading(true);
    try {
      const res = await clientesApi.list(emisorId, 1, q);
      setClientes(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClientes(search);
  };

  const openModal = (cliente?: Cliente) => {
    setCurrentCliente(cliente || {
      tipo_identificacion: 'CEDULA',
      identificacion: '',
      razon_social: '',
      direccion: '',
      email: '',
      telefono: ''
    });
    setIsModalOpen(true);
  };

  const saveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emisorId) return;
    
    try {
      if (currentCliente.id) {
        await clientesApi.update(emisorId, currentCliente.id, currentCliente);
      } else {
        await clientesApi.create(emisorId, currentCliente);
      }
      setIsModalOpen(false);
      fetchClientes();
    } catch (e: any) {
      alert("Error al guardar cliente: " + (e.response?.data?.message || e.message));
    }
  };

  const deleteCliente = async (id: number) => {
    if (!emisorId || !window.confirm("¿Seguro que deseas eliminar este cliente?")) return;
    try {
      await clientesApi.delete(emisorId, id);
      fetchClientes();
    } catch (e) {
      alert("Error al eliminar cliente");
    }
  };

  return (
    <div style={isEmbedded ? {} : { padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: isEmbedded ? "none" : "block" }}>
          <h1 style={{ fontSize: "24px", margin: "0 0 8px 0", color: "#1e293b" }}>Directorio</h1>
          <p style={{ margin: 0, color: "#64748b" }}>Gestión.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select 
            value={emisorId} 
            onChange={e => setEmisorId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            {emisores.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
          </select>
          <button 
            onClick={() => openModal()}
            style={{ background: '#3b82f6', color: 'white', padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            ➕ Nuevo Cliente
          </button>
        </div>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input 
            placeholder="Buscar por cédula, RUC o nombre..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <button type="submit" style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
            🔍 Buscar
          </button>
        </form>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Identificación</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Razón Social</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Teléfono</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>Cargando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No se encontraron clientes.</td></tr>
            ) : (
              clientes.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px' }}>{c.identificacion} <br/><small style={{ color: '#94a3b8' }}>{c.tipo_identificacion}</small></td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{c.razon_social}</td>
                  <td style={{ padding: '12px' }}>{c.email || '-'}</td>
                  <td style={{ padding: '12px' }}>{c.telefono || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button onClick={() => openModal(c)} style={{ marginRight: '8px', padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deleteCliente(c.id)} style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>{currentCliente.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={saveCliente} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Tipo ID</label>
                  <select 
                    value={currentCliente.tipo_identificacion} 
                    onChange={e => setCurrentCliente({...currentCliente, tipo_identificacion: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="CEDULA">Cédula</option>
                    <option value="RUC">RUC</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Identificación</label>
                  <input 
                    required
                    value={currentCliente.identificacion} 
                    onChange={e => setCurrentCliente({...currentCliente, identificacion: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Razón Social (Nombre)</label>
                <input 
                  required
                  value={currentCliente.razon_social} 
                  onChange={e => setCurrentCliente({...currentCliente, razon_social: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Dirección</label>
                <input 
                  value={currentCliente.direccion || ''} 
                  onChange={e => setCurrentCliente({...currentCliente, direccion: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Teléfono</label>
                  <input 
                    value={currentCliente.telefono || ''} 
                    onChange={e => setCurrentCliente({...currentCliente, telefono: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Email</label>
                  <input 
                    type="email"
                    value={currentCliente.email || ''} 
                    onChange={e => setCurrentCliente({...currentCliente, email: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPage;
