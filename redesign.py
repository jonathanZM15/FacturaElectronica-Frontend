import os

frontend_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\pages"

def generate_child_component(type_name, api_name):
    title = "Clientes" if type_name == "Cliente" else "Proveedores"
    emoji = "👥" if type_name == "Cliente" else "🏢"
    
    code = """import React, { useState, useEffect } from 'react';
import { _API_NAME_, _TYPE_NAME_ } from '../../services/_API_NAME_';
import { emisoresApi } from '../../services/emisoresApi';

const _TITLE_Page: React.FC<{isEmbedded?: boolean}> = ({ isEmbedded }) => {
  const [emisores, setEmisores] = useState<any[]>([]);
  const [emisorId, setEmisorId] = useState<string>('');
  
  const [items, setItems] = useState<_TYPE_NAME_[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<_TYPE_NAME_>>({});

  useEffect(() => {
    emisoresApi.list().then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setEmisores(data);
      if (data.length > 0) setEmisorId(data[0].id.toString());
    });
  }, []);

  useEffect(() => {
    if (emisorId) fetchItems();
  }, [emisorId]);

  const fetchItems = async (q = search) => {
    if (!emisorId) return;
    setLoading(true);
    try {
      const res = await _API_NAME_.list(emisorId, 1, q);
      setItems(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(search);
  };

  const openModal = (item?: _TYPE_NAME_) => {
    setCurrentItem(item || {
      tipo_identificacion: 'CEDULA',
      identificacion: '',
      razon_social: '',
      direccion: '',
      email: '',
      telefono: ''
    });
    setIsModalOpen(true);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emisorId) return;
    
    try {
      if (currentItem.id) {
        await _API_NAME_.update(emisorId, currentItem.id, currentItem);
      } else {
        await _API_NAME_.create(emisorId, currentItem);
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (e: any) {
      alert("Error al guardar: " + (e.response?.data?.message || e.message));
    }
  };

  const deleteItem = async (id: number) => {
    if (!emisorId || !window.confirm("¿Seguro que deseas eliminar este registro?")) return;
    try {
      await _API_NAME_.delete(emisorId, id);
      fetchItems();
    } catch (e) {
      alert("Error al eliminar");
    }
  };

  return (
    <div style={{ ...(isEmbedded ? { padding: '0 24px' } : { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }), fontFamily: 'Inter, sans-serif' }}>
      
      {!isEmbedded && (
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#1e293b' }}>_TITLE_</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Gestión individual.</p>
        </div>
      )}

      <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* Controls Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                placeholder="Buscar por cédula, RUC o nombre..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px' }}
              />
              <span style={{ position: 'absolute', left: '14px', top: '10px', color: '#94a3b8' }}>🔍</span>
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#f8fafc', color: '#475569', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}>
              Buscar
            </button>
          </form>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              value={emisorId} 
              onChange={e => setEmisorId(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', fontWeight: 500, outline: 'none' }}
            >
              {emisores.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
            </select>
            <button 
              onClick={() => openModal()}
              style={{ background: '#3b82f6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}
            >
              <span>➕</span> Nuevo
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Identificación</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Razón Social</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contacto</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando datos...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No hay registros para mostrar.</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{item.identificacion}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{item.tipo_identificacion}</div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: 500, color: '#0f172a' }}>
                      {item.razon_social}
                      {item.nombre_comercial && <div style={{fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 400}}>{item.nombre_comercial}</div>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px', color: '#475569' }}>📞 {item.telefono || 'N/A'}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>✉️ {item.email || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => openModal(item)} style={{ marginRight: '8px', padding: '8px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>✏️</button>
                      <button onClick={() => deleteItem(item.id)} style={{ padding: '8px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '20px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', color: '#0f172a' }}>{currentItem.id ? `Editar _TYPE_NAME_` : `Nuevo _TYPE_NAME_`}</h2>
            
            <form onSubmit={saveItem} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tipo ID</label>
                  <select 
                    value={currentItem.tipo_identificacion} 
                    onChange={e => setCurrentItem({...currentItem, tipo_identificacion: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  >
                    <option value="CEDULA">Cédula</option>
                    <option value="RUC">RUC</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Identificación</label>
                  <input 
                    required
                    value={currentItem.identificacion} 
                    onChange={e => setCurrentItem({...currentItem, identificacion: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Razón Social (Nombre)</label>
                <input 
                  required
                  value={currentItem.razon_social} 
                  onChange={e => setCurrentItem({...currentItem, razon_social: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Dirección</label>
                <input 
                  value={currentItem.direccion || ''} 
                  onChange={e => setCurrentItem({...currentItem, direccion: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Teléfono</label>
                  <input 
                    value={currentItem.telefono || ''} 
                    onChange={e => setCurrentItem({...currentItem, telefono: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Email</label>
                  <input 
                    type="email"
                    value={currentItem.email || ''} 
                    onChange={e => setCurrentItem({...currentItem, email: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}>Guardar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default _TITLE_Page;
"""

    code = code.replace('_API_NAME_', api_name)
    code = code.replace('_TYPE_NAME_', type_name)
    code = code.replace('_TITLE_', title)
    return code

with open(os.path.join(frontend_path, "Clientes", "ClientesPage.tsx"), 'w', encoding='utf-8') as f:
    f.write(generate_child_component("Cliente", "clientesApi"))

with open(os.path.join(frontend_path, "Proveedores", "ProveedoresPage.tsx"), 'w', encoding='utf-8') as f:
    f.write(generate_child_component("Proveedor", "proveedoresApi"))

print("Redesign syntax fixed.")
