import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Reusing styled components from other emission pages
const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Inter', -apple-system, sans-serif;
`;

const PageHeader = styled.div`
  margin-bottom: 32px;
  h1 { font-size: 24px; color: #1e293b; margin: 0 0 8px 0; font-weight: 700; }
  p { color: #64748b; margin: 0; font-size: 15px; }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  label { font-size: 14px; font-weight: 600; color: #475569; }
  input, select {
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
    &:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
`;

const GlassCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.025);
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
`;

const PrimaryBtn = styled.button`
  background: #3b82f6; color: white;
  padding: 12px 24px; border: none; border-radius: 8px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center;
  &:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; margin-bottom: 16px;
  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  th { font-weight: 600; color: #475569; background: #f8fafc; }
  td input { width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; }
`;

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
    cargarEmisores();
  }, []);

  const cargarEmisores = async () => {
    try {
      const res = await api.get('/api/emisores');
      setEmisores(res.data);
      if (res.data.length > 0) setEmisorId(res.data[0].id.toString());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!emisorId) return;
    const emisor = emisores.find(e => e.id.toString() === emisorId);
    if (emisor?.establecimientos) {
      setEstablecimientos(emisor.establecimientos);
      if (emisor.establecimientos.length > 0) {
        setEstabId(emisor.establecimientos[0].id.toString());
      }
    }
  }, [emisorId, emisores]);

  useEffect(() => {
    if (!estabId) return;
    const estab = establecimientos.find(e => e.id.toString() === estabId);
    if (estab?.puntos_emision) {
      setPuntos(estab.puntos_emision);
      if (estab.puntos_emision.length > 0) {
        setPuntoId(estab.puntos_emision[0].id.toString());
      }
    }
  }, [estabId, establecimientos]);

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
    <PageContainer>
      <PageHeader>
        <h1>Guía de Remisión</h1>
        <p>Emite guías de remisión electrónicas (código 06) para el transporte de mercadería.</p>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <GlassCard>
          <SectionTitle>1. Configuración de Emisión</SectionTitle>
          <FormGrid>
            <FormGroup>
              <label>Emisor</label>
              <select value={emisorId} onChange={e => setEmisorId(e.target.value)}>
                {emisores.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
              </select>
            </FormGroup>
            <FormGroup>
              <label>Establecimiento</label>
              <select value={estabId} onChange={e => setEstabId(e.target.value)}>
                {establecimientos.map(e => <option key={e.id} value={e.id}>{e.nombre} - {e.codigo}</option>)}
              </select>
            </FormGroup>
            <FormGroup>
              <label>Punto de Emisión</label>
              <select value={puntoId} onChange={e => setPuntoId(e.target.value)}>
                {puntos.map(e => <option key={e.id} value={e.id}>{e.nombre} - {e.codigo}</option>)}
              </select>
            </FormGroup>
          </FormGrid>
          <FormGrid>
            <FormGroup>
              <label>Firma Electrónica (.p12)</label>
              <input type="file" accept=".p12,.pfx" onChange={e => setFirma(e.target.files?.[0] || null)} required />
            </FormGroup>
            <FormGroup>
              <label>Contraseña de la firma</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </FormGroup>
          </FormGrid>
        </GlassCard>

        <GlassCard>
          <SectionTitle>2. Datos del Transporte y Traslado</SectionTitle>
          <FormGrid>
            <FormGroup>
              <label>Identificación Transportista</label>
              <input value={guiaData.transportista_identificacion} onChange={e => setGuiaData({...guiaData, transportista_identificacion: e.target.value})} placeholder="RUC/Cédula" required />
            </FormGroup>
            <FormGroup>
              <label>Razón Social Transportista</label>
              <input value={guiaData.transportista_nombre} onChange={e => setGuiaData({...guiaData, transportista_nombre: e.target.value})} placeholder="Nombre del chofer o empresa" required />
            </FormGroup>
            <FormGroup>
              <label>Placa del Vehículo</label>
              <input value={guiaData.placa_vehiculo} onChange={e => setGuiaData({...guiaData, placa_vehiculo: e.target.value})} placeholder="ABC-1234" required />
            </FormGroup>
            <FormGroup>
              <label>Motivo del Traslado</label>
              <select value={guiaData.motivo_traslado} onChange={e => setGuiaData({...guiaData, motivo_traslado: e.target.value})}>
                <option value="VENTA">Venta</option>
                <option value="TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA">Traslado entre sucursales</option>
                <option value="DEVOLUCION">Devolución</option>
                <option value="CONSIGNACION">Consignación</option>
                <option value="IMPORTACION">Importación</option>
                <option value="EXPORTACION">Exportación</option>
                <option value="OTROS">Otros</option>
              </select>
            </FormGroup>
            <FormGroup>
              <label>Fecha Inicio Transporte</label>
              <input type="date" value={guiaData.fecha_inicio_transporte} onChange={e => setGuiaData({...guiaData, fecha_inicio_transporte: e.target.value})} required />
            </FormGroup>
            <FormGroup>
              <label>Fecha Fin Transporte</label>
              <input type="date" value={guiaData.fecha_fin_transporte} onChange={e => setGuiaData({...guiaData, fecha_fin_transporte: e.target.value})} required />
            </FormGroup>
            <FormGroup>
              <label>Dirección de Partida</label>
              <input value={guiaData.direccion_partida} onChange={e => setGuiaData({...guiaData, direccion_partida: e.target.value})} placeholder="Lugar de salida" required />
            </FormGroup>
            <FormGroup>
              <label>Ruta (Opcional)</label>
              <input value={guiaData.ruta} onChange={e => setGuiaData({...guiaData, ruta: e.target.value})} placeholder="Ruta planificada" />
            </FormGroup>
          </FormGrid>
        </GlassCard>

        <GlassCard>
          <SectionTitle>3. Destinatario</SectionTitle>
          <FormGrid>
            <FormGroup>
              <label>Tipo ID</label>
              <select value={cliente.tipo_identificacion} onChange={e => setCliente({...cliente, tipo_identificacion: e.target.value})}>
                <option value="RUC">RUC</option>
                <option value="CEDULA">Cédula</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
              </select>
            </FormGroup>
            <FormGroup>
              <label>Identificación</label>
              <input value={cliente.identificacion} onChange={e => setCliente({...cliente, identificacion: e.target.value})} placeholder="RUC/Cédula destinatario" required />
            </FormGroup>
            <FormGroup>
              <label>Razón Social (Nombre)</label>
              <input value={cliente.razon_social} onChange={e => setCliente({...cliente, razon_social: e.target.value})} required />
            </FormGroup>
            <FormGroup>
              <label>Dirección Destino</label>
              <input value={cliente.direccion} onChange={e => {
                  setCliente({...cliente, direccion: e.target.value});
                  setGuiaData({...guiaData, direccion_destino: e.target.value});
              }} required />
            </FormGroup>
            <FormGroup>
              <label>Email (Opcional)</label>
              <input type="email" value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} />
            </FormGroup>
          </FormGrid>
        </GlassCard>

        <GlassCard>
          <SectionTitle>4. Mercadería a Transportar</SectionTitle>
          <Table>
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
                  <td><input value={d.producto_id} onChange={e => updateRow(d.id, 'producto_id', e.target.value)} placeholder="001" /></td>
                  <td><input value={d.descripcion} onChange={e => updateRow(d.id, 'descripcion', e.target.value)} required placeholder="Sacos de cemento..." /></td>
                  <td><input type="number" step="0.01" value={d.cantidad} onChange={e => updateRow(d.id, 'cantidad', e.target.value)} required /></td>
                  <td>
                    <button type="button" onClick={() => removeRow(d.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}>❌ Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <button type="button" onClick={addRow} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>➕ Agregar ítem</button>
        </GlassCard>

        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <PrimaryBtn type="submit" disabled={loading}>
            {loading ? '⏳ Procesando...' : '🚀 Emitir Guía de Remisión'}
          </PrimaryBtn>
        </div>
      </form>

      {/* Resultados */}
      {estadoSRI && (
        <GlassCard>
          <SectionTitle>Resultado SRI</SectionTitle>
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
        </GlassCard>
      )}

    </PageContainer>
  );
};

export default GuiaRemisionPage;
