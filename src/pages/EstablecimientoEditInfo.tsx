import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { establecimientosApi } from '../services/establecimientosApi';
import { emisoresApi } from '../services/emisoresApi';
import EstablishmentFormModal from './EstablishmentFormModal';
import { useNotification } from '../contexts/NotificationContext';

const EstablecimientoEditInfo: React.FC = () => {
  const { id, estId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const [loading, setLoading] = React.useState(false);
  const [est, setEst] = React.useState<any | null>(null);
  const [company, setCompany] = React.useState<any | null>(null);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [codigoEditable, setCodigoEditable] = React.useState(true);

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
        setCodigoEditable(dataEst.codigo_editable ?? true);
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
                <button role="menuitem" onClick={() => { setOpenEdit(true); setActionsOpen(false); }} className="menu-item" style={{ display: 'block', padding: 8, width: 220, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>✏️ Editar establecimiento</button>
                <button role="menuitem" onClick={() => { setActionsOpen(false); handleDeleteEst(); }} className="menu-item" style={{ display: 'block', padding: 8, width: 220, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️ Eliminar establecimiento</button>
              </div>
            )}
          </div>

          <button onClick={() => navigate(-1)} style={{ padding: '8px 12px', borderRadius: 8 }}>Volver</button>
        </div>
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
          <p><strong>Estado:</strong> {est?.estado ? <span style={{ background: est.estado === 'ABIERTO' ? '#bbf7d0' : '#f3f4f6', padding: '6px 8px', borderRadius: 6, color: est.estado === 'ABIERTO' ? '#059669' : '#374151', fontWeight: 700 }}>{est.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}</span> : '-'}</p>
        </div>

        <div style={{ border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Logo</h4>
          {est?.logo_url ? (
            <img src={est.logo_url} alt="logo" style={{ width: '100%', height: 180, objectFit: 'contain' }} />
          ) : <div style={{ width: '100%', height: 180, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No hay logo</div>}
        </div>

        <div style={{ gridColumn: '1 / -1', border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Información adicional</h4>
          <p><strong>Actividades económicas:</strong> {est?.actividades_economicas ?? '-'}</p>
          <p><strong>Fecha inicio de actividades:</strong> {est?.fecha_inicio_actividades ?? '-'}</p>
          <p><strong>Fecha reinicio de actividades:</strong> {est?.fecha_reinicio_actividades ?? '-'}</p>
          <p><strong>Fecha cierre de establecimiento:</strong> {est?.fecha_cierre_establecimiento ?? '-'}</p>
        </div>

        <div style={{ gridColumn: '1 / -1', border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Emisor asociado</h4>
          <p>
            <strong>RUC:</strong>{' '}
            {company?.id ? (
              <a href={`/emisores/${company.id}`} onClick={(e) => { e.preventDefault(); navigate(`/emisores/${company.id}`); }} style={{ color: '#1b4ab4', fontWeight: 700 }}>{company?.ruc}</a>
            ) : company?.ruc ?? '-'}
          </p>
          <p><strong>Razón Social:</strong> {company?.razon_social ?? '-'}</p>
        </div>

        <div style={{ gridColumn: '1 / -1', border: '1px solid #e6e6e6', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Actividad de la cuenta</h4>
          <p><strong>Fecha de creación:</strong> {est?.created_at ?? '-'}</p>
          <p><strong>Fecha de actualización:</strong> {est?.updated_at ?? '-'}</p>
          <p><strong>Creado por:</strong> {est?.created_by_name ?? '-'}</p>
          <p><strong>Actualizado por:</strong> {est?.updated_by_name ?? '-'}</p>
        </div>
      </div>

      {openEdit && (
        <EstablishmentFormModal
          open={openEdit}
          companyId={id!}
          editingEst={est}
          codigoEditable={codigoEditable}
          onClose={() => { setOpenEdit(false); }}
          onUpdated={(updated:any) => { 
            setEst(updated); 
            setOpenEdit(false);
            show({ title: 'Éxito', message: 'Establecimiento actualizado', type: 'success' });
          }}
        />
      )}
    </div>
  );
};

export default EstablecimientoEditInfo;
