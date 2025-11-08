import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { establecimientosApi } from '../services/establecimientosApi';
import { useNotification } from '../contexts/NotificationContext';

const EstablecimientoInfo: React.FC = () => {
  const { id, estId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [est, setEst] = React.useState<any | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!id || !estId) return;
      setLoading(true);
      try {
        const r = await establecimientosApi.show(id, estId);
        const data = r.data?.data ?? r.data;
        setEst(data);
      } catch (e:any) {
        show({ title: 'Error', message: 'No se pudo cargar el establecimiento', type: 'error' });
      } finally { setLoading(false); }
    };
    load();
  }, [id, estId]);

  if (!id || !estId) return <div>Establecimiento no especificado</div>;

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{est?.nombre ?? '—'} <small style={{ marginLeft: 12, fontWeight: 700 }}>{est?.codigo ?? ''}</small></h2>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 12px', borderRadius: 8 }}>Volver</button>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Datos del establecimiento</h4>
          <p><strong>Código:</strong> {est?.codigo ?? '-'}</p>
          <p><strong>Nombre:</strong> {est?.nombre ?? '-'}</p>
          <p><strong>Nombre comercial:</strong> {est?.nombre_comercial ?? '-'}</p>
          <p><strong>Dirección:</strong> {est?.direccion ?? '-'}</p>
          <p><strong>Correo:</strong> {est?.correo ?? '-'}</p>
          <p><strong>Teléfono:</strong> {est?.telefono ?? '-'}</p>
          <p><strong>Actividades económicas:</strong> {est?.actividades_economicas ?? '-'}</p>
          <p><strong>Fecha inicio:</strong> {est?.fecha_inicio_actividades ?? '-'}</p>
          <p><strong>Fecha reinicio:</strong> {est?.fecha_reinicio_actividades ?? '-'}</p>
          <p><strong>Fecha cierre:</strong> {est?.fecha_cierre_establecimiento ?? '-'}</p>
        </div>

        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Logo</h4>
          {est?.logo_url ? (
            <img src={est.logo_url} alt="logo" style={{ width: '100%', height: 180, objectFit: 'contain' }} />
          ) : <div style={{ width: '100%', height: 180, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No hay logo</div>}
        </div>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #e6e6e6', padding: 12, borderRadius: 8 }}>
        <h4 style={{ marginTop: 0 }}>Puntos de emisión</h4>
        {Array.isArray(est?.puntos_emision) && est.puntos_emision.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Código</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Usuario asociado</th>
              </tr>
            </thead>
            <tbody>
              {est.puntos_emision.map((p:any) => (
                <tr key={p.id}>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.codigo}</td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.nombre}</td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.estado}</td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.usuario_asociado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>No hay puntos de emisión registrados.</div>
        )}
      </div>
    </div>
  );
};

export default EstablecimientoInfo;
