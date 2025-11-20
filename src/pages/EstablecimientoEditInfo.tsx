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
  
  // Delete modal states
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePasswordOpen, setDeletePasswordOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

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

  const openDeleteModal = () => {
    setActionsOpen(false);
    setDeleteOpen(true);
  };

  return (
    <div style={{ 
      padding: '24px 32px',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      minHeight: '100vh'
    }}>
      {/* Header con gradiente */}
      <div style={{ 
        background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            🏢
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '26px', fontWeight: 700 }}>
              {est?.nombre ?? '—'}
            </h2>
            <div style={{ 
              marginTop: '6px',
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '4px 12px',
                borderRadius: '6px',
                backdropFilter: 'blur(10px)'
              }}>
                📋 Código: {est?.codigo ?? ''}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="actions-btn"
              onClick={() => setActionsOpen((s) => !s)}
              aria-expanded={actionsOpen}
              style={{ 
                padding: '10px 18px', 
                borderRadius: '10px', 
                background: 'rgba(255, 255, 255, 0.95)', 
                color: '#5b21b6', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
            >
              ⚙️ Acciones ▾
            </button>
            {actionsOpen && (
              <div role="menu" style={{ 
                position: 'absolute', 
                right: 0, 
                top: '110%', 
                background: '#fff', 
                border: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', 
                borderRadius: '12px', 
                zIndex: 50,
                overflow: 'hidden',
                minWidth: '240px'
              }}>
                <button 
                  role="menuitem" 
                  onClick={() => { setOpenEdit(true); setActionsOpen(false); }} 
                  className="menu-item" 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px', 
                    width: '100%', 
                    textAlign: 'left', 
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>✏️</span>
                  <span>Editar establecimiento</span>
                </button>
                <div style={{ height: '1px', background: '#e5e7eb', margin: '0 12px' }}></div>
                <button 
                  role="menuitem" 
                  onClick={openDeleteModal} 
                  className="menu-item" 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px', 
                    width: '100%', 
                    textAlign: 'left', 
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#dc2626',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>🗑️</span>
                  <span>Eliminar establecimiento</span>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              padding: '10px 18px', 
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Grid de cards modernos - Ajustado para dar más espacio al logo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 520px', gap: 20 }}>
        {/* Datos del establecimiento */}
        <div style={{ 
          background: '#fff',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f3f4f6'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff'
            }}>
              📊
            </div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Datos del establecimiento</h4>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>📋 Código:</span>
              <span style={{ color: '#1f2937', fontSize: '14px', fontWeight: 600 }}>{est?.codigo ?? '-'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>🏢 Nombre:</span>
              <span style={{ color: '#1f2937', fontSize: '14px', fontWeight: 600 }}>{est?.nombre ?? '-'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>🏪 Nombre comercial:</span>
              <span style={{ color: '#1f2937', fontSize: '14px' }}>{est?.nombre_comercial ?? '-'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>📍 Dirección:</span>
              <span style={{ color: '#1f2937', fontSize: '14px' }}>{est?.direccion ?? '-'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>✉️ Correo:</span>
              <span style={{ color: '#1f2937', fontSize: '14px' }}>{est?.correo ?? '-'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>📞 Teléfono:</span>
              <span style={{ color: '#1f2937', fontSize: '14px' }}>{est?.telefono ?? '-'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '14px' }}>🚦 Estado:</span>
              {est?.estado ? (
                <span style={{ 
                  background: est.estado === 'ABIERTO' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
                  padding: '6px 14px', 
                  borderRadius: '8px', 
                  color: est.estado === 'ABIERTO' ? '#065f46' : '#991b1b', 
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'inline-block',
                  boxShadow: est.estado === 'ABIERTO' ? '0 2px 8px rgba(16, 185, 129, 0.2)' : '0 2px 8px rgba(239, 68, 68, 0.2)'
                }}>
                  {est.estado === 'ABIERTO' ? '✅ Abierto' : '🔒 Cerrado'}
                </span>
              ) : '-'}
            </div>
          </div>
        </div>

        {/* Logo card */}
        <div style={{ 
          background: '#fff',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f3f4f6'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff'
            }}>
              🖼️
            </div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Logo</h4>
          </div>

          {est?.logo_url ? (
            <div style={{
              width: '100%',
              height: '240px',
              background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              border: '2px solid #e5e7eb',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}>
              <img 
                src={est.logo_url} 
                alt="logo" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }} 
              />
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              height: '240px', 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
              borderRadius: '12px',
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '12px',
              border: '2px dashed #fbbf24'
            }}>
              <div style={{
                fontSize: '48px',
                opacity: 0.6
              }}>🖼️</div>
              <div style={{
                color: '#92400e',
                fontWeight: 600,
                fontSize: '14px'
              }}>No hay logo</div>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div style={{ 
          gridColumn: '1 / -1',
          background: '#fff',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f3f4f6'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff'
            }}>
              📝
            </div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Información adicional</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#78350f', marginBottom: '6px' }}>📅 Actividades económicas</div>
              <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>{est?.actividades_economicas ?? '-'}</div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #3b82f6'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>🚀 Fecha inicio de actividades</div>
              <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>{est?.fecha_inicio_actividades ?? '-'}</div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #10b981'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#064e3b', marginBottom: '6px' }}>🔄 Fecha reinicio de actividades</div>
              <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>{est?.fecha_reinicio_actividades ?? '-'}</div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #ef4444'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#7f1d1d', marginBottom: '6px' }}>🔒 Fecha cierre de establecimiento</div>
              <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>{est?.fecha_cierre_establecimiento ?? '-'}</div>
            </div>
          </div>
        </div>

        {/* Emisor asociado */}
        <div style={{ 
          gridColumn: '1 / -1',
          background: '#fff',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f3f4f6'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff'
            }}>
              🏛️
            </div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Emisor asociado</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>🔢 RUC</div>
              {company?.id ? (
                <a 
                  href={`/emisores/${company.id}`} 
                  onClick={(e) => { e.preventDefault(); navigate(`/emisores/${company.id}`); }} 
                  style={{ 
                    color: '#7c3aed', 
                    fontWeight: 700,
                    fontSize: '15px',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#5b21b6'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#7c3aed'}
                >
                  {company?.ruc}
                </a>
              ) : (
                <div style={{ fontSize: '15px', color: '#1f2937', fontWeight: 600 }}>{company?.ruc ?? '-'}</div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>🏢 Razón Social</div>
              <div style={{ fontSize: '15px', color: '#1f2937', fontWeight: 600 }}>{company?.razon_social ?? '-'}</div>
            </div>
          </div>
        </div>

        {/* Actividad de la cuenta */}
        <div style={{ 
          gridColumn: '1 / -1',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid #d1d5db'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #d1d5db'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff'
            }}>
              ⏱️
            </div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Actividad de la cuenta</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>📅 Fecha de creación:</span>
              <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: 600 }}>{est?.created_at ?? '-'}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>🔄 Fecha de actualización:</span>
              <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: 600 }}>{est?.updated_at ?? '-'}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>👤 Creado por:</span>
              <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: 600 }}>{est?.created_by_name ?? '-'}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>✏️ Actualizado por:</span>
              <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: 600 }}>{est?.updated_by_name ?? '-'}</span>
            </div>
          </div>
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

      {/* Step 1: Confirmation modal (shows codigo + nombre) */}
      {deleteOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(620px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de establecimiento</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 8px', fontWeight: 700 }}>¿Está seguro que desea eliminar el establecimiento:</p>
            <p style={{ textAlign: 'center', marginTop: 6, marginBottom: 12 }}>
              <span style={{ color: '#c62828', fontWeight: 800, fontSize: 16 }}>{est?.codigo ?? ''}</span>
              <span> - </span>
              <span style={{ color: '#c62828', fontWeight: 800 }}>{est?.nombre ?? ''}</span>
            </p>
            <p style={{ textAlign: 'center', marginTop: 0, marginBottom: 18, fontSize: 15 }}>y todos sus datos asociados?</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="mf-btn-cancel" onClick={() => setDeleteOpen(false)} style={{ padding: '10px 22px', borderRadius: 20 }}>CANCELAR</button>
              <button className="mf-btn-confirm" onClick={() => { setDeleteOpen(false); setDeletePasswordOpen(true); }} style={{ padding: '10px 22px', borderRadius: 20, background: '#ff6b6b' }}>CONFIRMAR</button>
            </div>

            <style>{`
              .mf-modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:3000; }
              .mf-modal{ width:min(540px, 92vw); background:#fff; border-radius:12px; padding:28px 24px; box-shadow:0 20px 60px rgba(0,0,0,.25); text-align:center; }
              .mf-btn-cancel{ padding:10px 18px; border-radius:8px; background:#fff; color:#333; border:2px solid #000; font-weight:700; cursor:pointer; }
              .mf-btn-confirm{ padding:10px 18px; border-radius:8px; background:#ff6b6b; color:#fff; border:none; font-weight:700; cursor:pointer; }
              .mf-btn-cancel:disabled, .mf-btn-confirm:disabled{ opacity:0.6; cursor:not-allowed; }
            `}</style>
          </div>
        </div>
      )}

      {/* Step 2: Password entry modal */}
      {deletePasswordOpen && (
        <div className="mf-modal-overlay" role="dialog" aria-modal="true">
          <div className="mf-modal" style={{ width: 'min(520px,92vw)', padding: 22 }}>
            <h3 style={{ margin: 0, color: '#1a63d6', fontSize: 22, textAlign: 'center' }}>Eliminación de establecimiento</h3>
            <div style={{ height: 12 }} />
            <p style={{ textAlign: 'center', fontSize: 16, margin: '0 0 12px', fontWeight: 600 }}>Ingresa tu clave de administrador para confirmar la eliminación del establecimiento</p>

            <div style={{ margin: '8px 0 6px' }}>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Clave de administrador"
                style={{ width: '100%', padding: '12px 2px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 16 }}
                autoFocus
              />
              {deleteError && <div style={{ color: '#b00020', marginTop: 8 }}>{deleteError}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14 }}>
              <button className="mf-btn-cancel" onClick={() => { setDeletePasswordOpen(false); setDeletePassword(''); setDeleteError(null); }} disabled={deleteLoading}>CANCELAR</button>
              <button className="mf-btn-confirm" onClick={async () => {
                if (!id || !estId) return;
                setDeleteLoading(true);
                setDeleteError(null);
                try {
                  await establecimientosApi.delete(id, estId, deletePassword);
                  setDeletePasswordOpen(false);
                  show({ title: 'Éxito', message: 'Establecimiento eliminado correctamente', type: 'success' });
                  navigate(`/emisores/${id}`);
                } catch (err: any) {
                  const msg = err?.response?.data?.message || 'No se pudo eliminar el establecimiento';
                  setDeleteError(msg);
                } finally {
                  setDeleteLoading(false);
                }
              }} disabled={deleteLoading || deletePassword.length === 0}>{deleteLoading ? 'Eliminando…' : 'CONFIRMAR'}</button>
            </div>

            <style>{`
              .mf-modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:3000; }
              .mf-modal{ width:min(540px, 92vw); background:#fff; border-radius:12px; padding:28px 24px; box-shadow:0 20px 60px rgba(0,0,0,.25); text-align:center; }
              .mf-btn-cancel{ padding:10px 18px; border-radius:8px; background:#fff; color:#333; border:2px solid #000; font-weight:700; cursor:pointer; }
              .mf-btn-confirm{ padding:10px 18px; border-radius:8px; background:#ff6b6b; color:#fff; border:none; font-weight:700; cursor:pointer; }
              .mf-btn-cancel:disabled, .mf-btn-confirm:disabled{ opacity:0.6; cursor:not-allowed; }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstablecimientoEditInfo;
