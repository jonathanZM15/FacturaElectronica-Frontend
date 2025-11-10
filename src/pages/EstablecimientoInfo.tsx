import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { establecimientosApi } from '../services/establecimientosApi';
import { emisoresApi } from '../services/emisoresApi';
import { useNotification } from '../contexts/NotificationContext';

const EstablecimientoInfo: React.FC = () => {
  const { id, estId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [est, setEst] = React.useState<any | null>(null);
  const [company, setCompany] = React.useState<any | null>(null);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      if (!id || !estId) return;
      setLoading(true);
      try {
        const [rEst, rComp] = await Promise.all([
          establecimientosApi.show(id, estId),
          emisoresApi.get(id)
        ]);
        const dataEst = rEst.data?.data ?? rEst.data;
        const dataComp = rComp.data?.data ?? rComp.data;
        setEst(dataEst);
        setCompany(dataComp);
      } catch (e:any) {
        show({ title: 'Error', message: 'No se pudo cargar el establecimiento', type: 'error' });
      } finally { setLoading(false); }
    };
    load();
  }, [id, estId, show]);

  if (!id || !estId) return <div>Establecimiento no especificado</div>;

  const handleDeleteEst = async () => {
    if (!window.confirm('¿Eliminar este establecimiento?')) return;
    try {
      await establecimientosApi.delete(id!, estId!);
      show({ title: 'Éxito', message: 'Establecimiento eliminado', type: 'success' });
      navigate(`/emisores/${id}`);
    } catch (err:any) {
      show({ title: 'Error', message: err?.response?.data?.message || 'No se pudo eliminar', type: 'error' });
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{est?.nombre ?? '—'} <small style={{ marginLeft: 12, fontWeight: 700 }}>{est?.codigo ?? ''}</small></h2>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="actions-btn"
              onClick={() => setActionsOpen((s) => !s)}
              aria-expanded={actionsOpen}
              style={{ padding: '6px 10px', borderRadius: 8, background: '#1e40af', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Acciones ▾
            </button>
            {actionsOpen && (
              <div role="menu" style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #ddd', boxShadow: '0 6px 18px rgba(0,0,0,.08)', borderRadius: 6, zIndex: 50 }}>
                <button role="menuitem" onClick={() => { setActionsOpen(false); navigate(`/emisores/${id}/establecimientos/${estId}/edit`); }} className="menu-item" style={{ display: 'block', padding: 8, width: 220, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>✏️ Editar establecimiento</button>
                <button role="menuitem" onClick={() => { setActionsOpen(false); handleDeleteEst(); }} className="menu-item" style={{ display: 'block', padding: 8, width: 220, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️ Eliminar establecimiento</button>
              </div>
            )}
          </div>

          <button onClick={() => navigate(-1)} style={{ padding: '8px 12px', borderRadius: 8 }}>Volver</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Emisor</h4>
          <p>
            <strong>RUC:</strong>{' '}
            {company?.id ? (
              <a href={`/emisores/${company.id}`} onClick={(e) => { e.preventDefault(); navigate(`/emisores/${company.id}`); }} style={{ color: '#1b4ab4', fontWeight: 700 }}>{company?.ruc}</a>
            ) : company?.ruc ?? '-'}
          </p>
          <p><strong>Razón Social:</strong> {company?.razon_social ?? '-'}</p>
          <p><strong>Estado:</strong> {company?.estado ? <span style={{ background: company.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: company.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{company.estado === 'ABIERTO' ? 'Activo' : company.estado}</span> : '-'}</p>
        </div>

        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Logo</h4>
          {est?.logo_url ? (
            <img src={est.logo_url} alt="logo" style={{ width: '100%', height: 180, objectFit: 'contain' }} />
          ) : <div style={{ width: '100%', height: 180, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No hay logo</div>}
        </div>

        <div style={{ gridColumn: '1 / -1', border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Datos del establecimiento</h4>
          <p><strong>Código:</strong> {est?.codigo ?? '-'}</p>
          <p><strong>Nombre:</strong> {est?.nombre ?? '-'}</p>
          <p><strong>Nombre comercial:</strong> {est?.nombre_comercial ?? '-'}</p>
          <p><strong>Dirección:</strong> {est?.direccion ?? '-'}</p>
          <p><strong>Estado:</strong> {est?.estado ? <span style={{ background: est.estado === 'ACTIVO' || est.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: est.estado === 'ACTIVO' || est.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{est.estado}</span> : '-'}</p>
        </div>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #e6e6e6', padding: 12, borderRadius: 8 }}>
        <h4 style={{ marginTop: 0 }}>Lista de puntos de emisión</h4>

  <table className="puntos-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Código</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Estado</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Usuario asociado</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Secuencial Factura</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(est?.puntos_emision) && est.puntos_emision.length > 0 ? (
              est.puntos_emision.map((p:any) => (
                <tr key={p.id}>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>
                    <a href={`/emisores/${id}/establecimientos/${estId}/puntos/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/emisores/${id}/establecimientos/${estId}/puntos/${p.id}`); }} style={{ color: '#1b4ab4' }}>{p.codigo}</a>
                  </td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.nombre}</td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.estado}</td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.usuario_id ? <a href={`/usuarios/${p.usuario_id}`} onClick={(e) => { e.preventDefault(); navigate(`/usuarios/${p.usuario_id}`); }} style={{ color: '#1b4ab4' }}>{p.usuario_asociado}</a> : p.usuario_asociado}</td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>{p.secuencial_factura ?? p.secuencial ?? '-'}</td>
                  <td style={{ padding: 8, borderTop: '1px solid #e6e6e6', textAlign: 'center' }}>
                    <button title="Editar punto" onClick={() => navigate(`/emisores/${id}/establecimientos/${estId}/puntos/${p.id}/edit`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 8 }}>✏️</button>
                    <button title="Eliminar punto" onClick={() => { if (window.confirm('¿Eliminar este punto?')) show({ title: 'Info', message: 'Eliminación de punto no implementada en frontend', type: 'info' }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>&nbsp;</td>
                <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>&nbsp;</td>
                <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>&nbsp;</td>
                <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>&nbsp;</td>
                <td style={{ padding: 8, borderTop: '1px solid #e6e6e6' }}>&nbsp;</td>
                <td style={{ padding: 8, borderTop: '1px solid #e6e6e6', textAlign: 'center' }}>&nbsp;</td>
              </tr>
            )}
          </tbody>
        </table>
      
        <style>{`
          .puntos-table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          .puntos-table thead th { background: #e6e6e6; color: #1b4ab4; font-weight:700; border: 2px solid #000; position: relative; padding: 8px 18px 8px 12px; }
          .puntos-table th, .puntos-table td { padding: 8px; border: 2px solid #000; }
          /* make all column cells light gray to match request */
          .puntos-table tbody td { background: #f3f4f6; }
          /* make the acciones column a slightly darker gray */
          .puntos-table thead th:last-child, .puntos-table tbody td:last-child { background: #e9ecef; }

          /* small blue arrow at the right side of each header */
          .puntos-table thead th::after {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            font-size: 10px;
            color: #1b4ab4;
            line-height: 1;
            pointer-events: none;
            content: '▼';
            right: 6px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default EstablecimientoInfo;
