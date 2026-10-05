import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { emisoresApi } from '../../services/emisoresApi';
import { establecimientosApi } from '../../services/establecimientosApi';
import { puntosEmisionApi } from '../../services/puntosEmisionApi';

interface DetalleGR {
  id: string;
  producto_id: string;
  descripcion: string;
  cantidad: string;
}

const GuiaRemisionPage: React.FC = () => {
  // Config
  const [emisores, setEmisores] = useState<any[]>([]);
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [puntos, setPuntos] = useState<any[]>([]);
  const [emisorId, setEmisorId] = useState('');
  const [estabId, setEstabId] = useState('');
  const [puntoId, setPuntoId] = useState('');
  const [firma, setFirma] = useState<File | null>(null);
  const [password, setPassword] = useState('');

  // Cliente (Destinatario)
  const [cliente, setCliente] = useState({
    tipo_identificacion: 'CEDULA',
    identificacion: '',
    razon_social: '',
    direccion: '',
    email: ''
  });

  // Datos Guia
  const [guiaData, setGuiaData] = useState({
    direccion_partida: '',
    transportista_nombre: '',
    transportista_identificacion: '',
    placa_vehiculo: '',
    fecha_inicio_transporte: new Date().toISOString().split('T')[0],
    fecha_fin_transporte: new Date().toISOString().split('T')[0],
    motivo_traslado: 'VENTA',
    direccion_destino: '',
    ruta: ''
  });

  // Detalles
  const [detalles, setDetalles] = useState<DetalleGR[]>([
    { id: '1', producto_id: '001', descripcion: '', cantidad: '1' }
  ]);

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [estadoSRI, setEstadoSRI] = useState<any>(null);

  useEffect(() => {
    emisoresApi.list().then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setEmisores(data);
      if (data.length > 0) setEmisorId(data[0].id.toString());
    });
  }, []);

  useEffect(() => {
    if (!emisorId) return;
    establecimientosApi.list(Number(emisorId)).then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setEstablecimientos(data);
      if (data.length > 0) setEstabId(data[0].id.toString());
    });
  }, [emisorId]);

  useEffect(() => {
    if (!estabId) return;
    puntosEmisionApi.list(Number(estabId)).then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setPuntos(data);
      if (data.length > 0) setPuntoId(data[0].id.toString());
    });
  }, [estabId]);

  const addRow = () => {
    setDetalles([...detalles, { id: Math.random().toString(), producto_id: '001', descripcion: '', cantidad: '1' }]);
  };

  const removeRow = (id: string) => {
    if (detalles.length > 1) {
      setDetalles(detalles.filter(d => d.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof DetalleGR, value: string) => {
    setDetalles(detalles.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const pollEstado = async (comprobanteId: number) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/api/facturacion/comprobantes/${comprobanteId}`);
        setEstadoSRI(res.data);
        if (res.data.estado_sri === 'AUTORIZADO' || res.data.estado_sri === 'RECHAZADO') {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (e) {
        clearInterval(interval);
        setLoading(false);
      }
      if (attempts > 15) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firma || !password) return alert('Sube la firma y pon la contraseña');
    
    // Copy destination to GuiaData if empty to keep it consistent
    if (!guiaData.direccion_destino) {
        guiaData.direccion_destino = cliente.direccion;
    }

    setLoading(true);
    setResultado(null);
    setEstadoSRI(null);

    const payload = {
      emisor_id: emisorId,
      establecimiento_id: estabId,
      punto_emision_id: puntoId,
      cliente: cliente,
      guia_remision_data: guiaData,
      detalles: detalles.map(d => ({
        producto_id: d.producto_id,
        descripcion: d.descripcion,
        cantidad: parseFloat(d.cantidad) || 1
      }))
    };

    const formData = new FormData();
    formData.append('firma', firma);
    formData.append('password', password);
    formData.append('payload', JSON.stringify(payload));

    try {
      const res = await api.emitirGuiaRemision(formData);
      setResultado(res.data);
      pollEstado(res.data.comprobante_id);
    } catch (error: any) {
      console.error(error);
      alert('Error al emitir guía de remisión');
      setLoading(false);
    }
  };

  const downloadPdf = async (id: number) => {
    try {
      const res = await api.get(`/api/facturacion/comprobantes/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GuiaRemision_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      alert("Error al descargar PDF");
    }
  };

  const downloadXml = async (id: number) => {
    try {
      const res = await api.get(`/api/facturacion/comprobantes/${id}/xml`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GuiaRemision_${id}.xml`);
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      alert("Error al descargar XML");
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", color: "#1e293b", margin: "0 0 8px 0", fontWeight: 700 }}>Guía de Remisión</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "15px" }}>Emite guías de remisión electrónicas (código 06) para el transporte de mercadería.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>1. Configuración de Emisión</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Emisor</label>
              <select style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={emisorId} onChange={e => setEmisorId(e.target.value)}>
                {emisores.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Establecimiento</label>
              <select style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={estabId} onChange={e => setEstabId(e.target.value)}>
                {establecimientos.map(e => <option key={e.id} value={e.id}>{e.nombre} - {e.codigo}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Punto de Emisión</label>
              <select style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={puntoId} onChange={e => setPuntoId(e.target.value)}>
                {puntos.map(e => <option key={e.id} value={e.id}>{e.nombre} - {e.codigo}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Firma Electrónica (.p12)</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} type="file" accept=".p12,.pfx" onChange={e => setFirma(e.target.files?.[0] || null)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Contraseña de la firma</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>2. Datos del Transporte y Traslado</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Identificación Transportista</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={guiaData.transportista_identificacion} onChange={e => setGuiaData({...guiaData, transportista_identificacion: e.target.value})} placeholder="RUC/Cédula" required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Razón Social Transportista</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={guiaData.transportista_nombre} onChange={e => setGuiaData({...guiaData, transportista_nombre: e.target.value})} placeholder="Nombre del chofer o empresa" required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Placa del Vehículo</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={guiaData.placa_vehiculo} onChange={e => setGuiaData({...guiaData, placa_vehiculo: e.target.value})} placeholder="ABC-1234" required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Motivo del Traslado</label>
              <select style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={guiaData.motivo_traslado} onChange={e => setGuiaData({...guiaData, motivo_traslado: e.target.value})}>
                <option value="VENTA">Venta</option>
                <option value="TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA">Traslado entre sucursales</option>
                <option value="DEVOLUCION">Devolución</option>
                <option value="CONSIGNACION">Consignación</option>
                <option value="IMPORTACION">Importación</option>
                <option value="EXPORTACION">Exportación</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Fecha Inicio Transporte</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} type="date" value={guiaData.fecha_inicio_transporte} onChange={e => setGuiaData({...guiaData, fecha_inicio_transporte: e.target.value})} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Fecha Fin Transporte</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} type="date" value={guiaData.fecha_fin_transporte} onChange={e => setGuiaData({...guiaData, fecha_fin_transporte: e.target.value})} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Dirección de Partida</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={guiaData.direccion_partida} onChange={e => setGuiaData({...guiaData, direccion_partida: e.target.value})} placeholder="Lugar de salida" required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Ruta (Opcional)</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={guiaData.ruta} onChange={e => setGuiaData({...guiaData, ruta: e.target.value})} placeholder="Ruta planificada" />
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>3. Destinatario</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Tipo ID</label>
              <select style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={cliente.tipo_identificacion} onChange={e => setCliente({...cliente, tipo_identificacion: e.target.value})}>
                <option value="RUC">RUC</option>
                <option value="CEDULA">Cédula</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Identificación</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={cliente.identificacion} onChange={e => setCliente({...cliente, identificacion: e.target.value})} placeholder="RUC/Cédula destinatario" required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Razón Social (Nombre)</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={cliente.razon_social} onChange={e => setCliente({...cliente, razon_social: e.target.value})} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Dirección Destino</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={cliente.direccion} onChange={e => {
                  setCliente({...cliente, direccion: e.target.value});
                  setGuiaData({...guiaData, direccion_destino: e.target.value});
              }} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Email (Opcional)</label>
              <input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} type="email" value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} />
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>4. Mercadería a Transportar</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Código</th>
                <th style={{ width: '55%' }}>Descripción del producto</th>
                <th style={{ width: '15%' }}>Cantidad</th>
                <th style={{ width: '15%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map(d => (
                <tr key={d.id}>
                  <td style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "14px" }}><input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={d.producto_id} onChange={e => updateRow(d.id, 'producto_id', e.target.value)} placeholder="001" /></td>
                  <td style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "14px" }}><input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} value={d.descripcion} onChange={e => updateRow(d.id, 'descripcion', e.target.value)} required placeholder="Sacos de cemento..." /></td>
                  <td style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "14px" }}><input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }} type="number" step="0.01" value={d.cantidad} onChange={e => updateRow(d.id, 'cantidad', e.target.value)} required /></td>
                  <td style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "14px" }}>
                    <button type="button" onClick={() => removeRow(d.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}>❌ Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addRow} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>➕ Agregar ítem</button>
        </div>

        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <button style={{ background: "#3b82f6", color: "white", padding: "12px 24px", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }} type="submit" disabled={loading}>
            {loading ? '⏳ Procesando...' : '🚀 Emitir Guía de Remisión'}
          </button>
        </div>
      </form>

      {/* Resultados */}
      {estadoSRI && (
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>Resultado SRI</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '16px', borderRadius: 8, background: estadoSRI.estado_sri === 'AUTORIZADO' ? '#dcfce7' : '#fef2f2', color: estadoSRI.estado_sri === 'AUTORIZADO' ? '#166534' : '#991b1b' }}>
              <strong>Estado:</strong> {estadoSRI.estado_sri}
            </div>
            {estadoSRI.estado_sri === 'AUTORIZADO' && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <button type="button" onClick={() => downloadPdf(resultado?.comprobante_id)} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>📄 Descargar RIDE (PDF)</button>
                <button type="button" onClick={() => downloadXml(resultado?.comprobante_id)} style={{ padding: '10px 20px', background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>⚡ Descargar XML</button>
              </div>
            )}
            {(estadoSRI.sri_estado_recepcion || estadoSRI.sri_estado_autorizacion) && (
              <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, fontSize: 13, overflowX: 'auto' }}>
                Recepción: {estadoSRI.sri_estado_recepcion}{'\n'}
                Autorización: {estadoSRI.sri_estado_autorizacion}
              </pre>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default GuiaRemisionPage;
