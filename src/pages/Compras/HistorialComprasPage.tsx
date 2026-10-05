import React, { useState, useEffect } from 'react';
import { comprasApi, Compra } from '../../services/comprasApi';
import { emisoresApi } from '../../services/emisoresApi';

const HistorialComprasPage: React.FC = () => {
  const [emisores, setEmisores] = useState<any[]>([]);
  const [emisorId, setEmisorId] = useState('');
  
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoIngreso, setTipoIngreso] = useState('');

  useEffect(() => {
    emisoresApi.list().then(res => {
      const data = res.data?.data ?? res.data ?? [];
      setEmisores(data);
      if (data.length > 0) setEmisorId(data[0].id.toString());
    });
  }, []);

  useEffect(() => {
    if (emisorId) fetchCompras();
  }, [emisorId]);

  const fetchCompras = async () => {
    if (!emisorId) return;
    setLoading(true);
    try {
      const res = await comprasApi.list(emisorId, {
        search,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        tipo_ingreso: tipoIngreso || undefined
      });
      setCompras(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompras();
  };

  const getTipoLabel = (tipo: string) => {
    switch(tipo) {
      case 'FACTURA_PROVEEDOR': return <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Factura</span>;
      case 'LIQUIDACION_COMPRA': return <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Liquidación</span>;
      case 'SIN_COMPROBANTE': return <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Sin Comprobante</span>;
      default: return tipo;
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#1e293b', fontWeight: 800, letterSpacing: '-0.5px' }}>Historial de Compras</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Visualiza y gestiona las compras y gastos registrados.</p>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* Filters Toolbar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Buscar Proveedor o Nº Comprobante</label>
            <input 
              placeholder="Buscar..." 
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Tipo de Ingreso</label>
            <select 
              value={tipoIngreso} onChange={e => setTipoIngreso(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            >
              <option value="">Todos</option>
              <option value="FACTURA_PROVEEDOR">Factura de Proveedor</option>
              <option value="LIQUIDACION_COMPRA">Liquidación de Compra</option>
              <option value="SIN_COMPROBANTE">Sin Comprobante</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Desde</label>
            <input 
              type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Hasta</label>
            <input 
              type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer', height: '40px' }}>
            Filtrar
          </button>
        </form>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Proveedor</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Nº Comprobante</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando compras...</td></tr>
              ) : compras.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No hay registros que coincidan con la búsqueda.</td></tr>
              ) : (
                compras.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{c.fecha_emision}</td>
                    <td style={{ padding: '16px' }}>
                      {c.proveedor ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.proveedor.razon_social}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{c.proveedor.identificacion}</div>
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin Proveedor</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>{getTipoLabel(c.tipo_ingreso)}</td>
                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px', fontFamily: 'monospace' }}>{c.numero_comprobante || 'N/A'}</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>${Number(c.importe_total).toFixed(2)}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{ background: c.estado === 'APROBADA' ? '#dcfce7' : '#f1f5f9', color: c.estado === 'APROBADA' ? '#166534' : '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistorialComprasPage;
