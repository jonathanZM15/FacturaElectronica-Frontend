import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { establecimientosApi } from '../services/establecimientosApi';
import { emisoresApi } from '../services/emisoresApi';
import EstablishmentFormModal from './EstablishmentFormModal';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import PuntoEmisionFormModal from './PuntoEmisionFormModal';
import PuntoEmisionDeleteModal from './PuntoEmisionDeleteModal';
import { PuntoEmision } from '../types/puntoEmision';
import { getImageUrl } from '../helpers/imageUrl';
import LoadingSpinner from '../components/LoadingSpinner';

const EstablecimientoEditInfo: React.FC = () => {
  const { id, estId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  const { user } = useUser();
  const role = user?.role?.toLowerCase?.() ?? '';
  const isLimitedRole = role === 'gerente' || role === 'cajero';
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

  // Punto emisión modal states
  const [puntoFormOpen, setPuntoFormOpen] = React.useState(false);
  const [selectedPunto, setSelectedPunto] = React.useState<PuntoEmision | null>(null);

  // Punto emisión delete states
  const [puntoDeleteOpen, setPuntoDeleteOpen] = React.useState(false);
  const [puntoDeletePassword, setPuntoDeletePassword] = React.useState('');
  const [puntoDeleteError, setPuntoDeleteError] = React.useState<string | null>(null);
  const [puntoDeleteLoading, setPuntoDeleteLoading] = React.useState(false);
  const [puntoToDelete, setPuntoToDelete] = React.useState<PuntoEmision | null>(null);

  // Filtrado de puntos de emisión
  type PuntoFilterField = 'codigo'|'nombre'|'estado';
  const [activePuntoFilter, setActivePuntoFilter] = React.useState<PuntoFilterField | null>(null);
  const [puntoFilterValue, setPuntoFilterValue] = React.useState<string>('');
  const puntoFilterLabels: Record<PuntoFilterField, string> = {
    codigo: 'Código',
    nombre: 'Nombre',
    estado: 'Estado'
  };

  // Date range filter for puntos
  const [puntoDesde, setPuntoDesde] = React.useState<string>('');
  const [puntoHasta, setPuntoHasta] = React.useState<string>('');
  const [puntosDateOpen, setPuntosDateOpen] = React.useState(false);
  const puntosDateRef = React.useRef<HTMLDivElement | null>(null);
  const puntoDesdeInputRef = React.useRef<HTMLInputElement | null>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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

  // Close puntos date picker on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (puntosDateRef.current && !puntosDateRef.current.contains(e.target as Node)) {
        setPuntosDateOpen(false);
      }
    };
    if (puntosDateOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [puntosDateOpen]);

  if (!id || !estId) return <div>Establecimiento no especificado</div>;

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <LoadingSpinner fullHeight message="Cargando información del establecimiento…" />
      </div>
    );
  }

  const openDeleteModal = () => {
    if (isLimitedRole) return;
    setActionsOpen(false);
    setDeleteOpen(true);
  };

  return (
    <div style={{ 
      padding: '24px 32px',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      minHeight: '100vh',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
              onClick={() => {
                if (isLimitedRole) return;
                setActionsOpen((s) => !s);
              }}
              aria-expanded={actionsOpen}
              disabled={isLimitedRole}
              title={isLimitedRole ? 'Tu rol no permite modificar establecimientos' : 'Acciones del establecimiento'}
              style={{ 
                padding: '10px 18px', 
                borderRadius: '10px', 
                background: isLimitedRole ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.95)', 
                color: isLimitedRole ? '#9ca3af' : '#5b21b6', 
                border: 'none', 
                cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: isLimitedRole ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                opacity: isLimitedRole ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (isLimitedRole) return;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                if (isLimitedRole) return;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
            >
              ⚙️ Acciones ▾
            </button>
            {!isLimitedRole && actionsOpen && (
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
            onClick={() => navigate(`/emisores/${id}?tab=establecimientos`)} 
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
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
                src={getImageUrl(est.logo_url)} 
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

        {/* Lista de puntos de emisión */}
        <div style={{ gridColumn: '1 / -1', marginTop: 18, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', gap: 12, flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Lista de puntos de emisión</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 300, justifyContent: 'flex-end' }}>
            {/* Filter UI - Text filter */}
            <div style={{ 
              background: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: 6, 
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              flex: 1,
              maxWidth: 400
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {activePuntoFilter === 'estado' ? (
                  <select 
                    value={puntoFilterValue} 
                    onChange={(e) => setPuntoFilterValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: 'none',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      background: 'transparent'
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={activePuntoFilter ? `Filtrar por ${puntoFilterLabels[activePuntoFilter]}` : 'Haz clic en un encabezado para filtrar'}
                    value={puntoFilterValue}
                    onChange={(e) => setPuntoFilterValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: 'none',
                      fontSize: 14,
                      background: 'transparent',
                      outline: 'none'
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 16, color: '#666', flexShrink: 0 }}>🔍</span>
              {activePuntoFilter && puntoFilterValue && (
                <button
                  onClick={() => setPuntoFilterValue('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#666',
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Date range filter */}
            <div className="date-range" ref={puntosDateRef} style={{ position: 'relative' }}>
              <button 
                className="date-range-display"
                onClick={() => setPuntosDateOpen((v) => !v)}
                style={{
                  padding: '8px 12px',
                  background: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#666',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  height: 44
                }}
              >
                <span>{puntoDesde ? formatDate(puntoDesde) : 'Fecha Inicial'}</span>
                <span>→</span>
                <span>{puntoHasta ? formatDate(puntoHasta) : 'Fecha Final'}</span>
              </button>
              {puntosDateOpen && (
                <div 
                  className="date-range-popover"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: 8,
                    padding: 12,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    minWidth: 280
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Desde
                      <input 
                        ref={puntoDesdeInputRef}
                        type="date" 
                        value={puntoDesde} 
                        onChange={(e) => setPuntoDesde(e.target.value)}
                        style={{ padding: '6px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
                      />
                    </label>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Hasta
                      <input 
                        type="date" 
                        value={puntoHasta} 
                        onChange={(e) => setPuntoHasta(e.target.value)}
                        style={{ padding: '6px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setPuntoDesde(''); setPuntoHasta(''); setPuntosDateOpen(false); }}
                      style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#666' }}
                    >
                      Limpiar
                    </button>
                    <button 
                      onClick={() => setPuntosDateOpen(false)}
                      style={{ padding: '6px 12px', background: '#0d6efd', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#fff' }}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear date filter button */}
            {(puntoDesde || puntoHasta) && (
              <button 
                onClick={() => { setPuntoDesde(''); setPuntoHasta(''); }}
                style={{ padding: '4px 8px', background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#dc2626', display: 'flex', alignItems: 'center', height: 44 }}
              >
                ✕
              </button>
            )}

            <button 
              onClick={() => {
                if (isLimitedRole) return;
                setSelectedPunto(null); 
                setPuntoFormOpen(true); 
              }}
              disabled={isLimitedRole}
              title={isLimitedRole ? 'Tu rol no permite crear puntos de emisión' : 'Crear nuevo punto de emisión'}
              style={{
                padding: '11px 24px',
                background: isLimitedRole 
                  ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)' 
                  : 'linear-gradient(135deg, #0d6efd 0%, #0b5fd7 100%)',
                color: isLimitedRole ? '#4b5563' : 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                boxShadow: isLimitedRole ? 'none' : '0 4px 12px rgba(13, 110, 253, 0.3)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '44px',
                whiteSpace: 'nowrap',
                opacity: isLimitedRole ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (isLimitedRole) return;
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #0b5fd7 0%, #084298 100%)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(13, 110, 253, 0.4)';
              }}
              onMouseLeave={(e) => {
                if (isLimitedRole) return;
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #0d6efd 0%, #0b5fd7 100%)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.3)';
              }}
            >
              + Nuevo
            </button>
          </div>
        </div>
        {activePuntoFilter && (
          <div style={{ padding: '8px 20px', background: '#f8f9fa', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#666' }}>
            Buscando por {puntoFilterLabels[activePuntoFilter]}
            {puntoFilterValue && (
              <button
                onClick={() => { setPuntoFilterValue(''); }}
                style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#1e40af', cursor: 'pointer', fontSize: 12 }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        <div style={{ overflowX: 'auto', overflowY: 'visible', position: 'relative' }}>
            <table style={{ 
              width: '100%',
              minWidth: '1200px',
              borderCollapse: 'collapse',
              fontSize: '13px',
              background: '#fff',
              border: '1px solid #e5e7eb'
            }}>
              <thead>
                <tr style={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff'
                }}>
                  <th style={{ 
                    padding: '12px 10px', 
                    textAlign: 'left', 
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: 0,
                    minWidth: '80px',
                    maxWidth: '80px',
                    width: '80px',
                    background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                    zIndex: 10,
                    boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                  }}>CÓDIGO</th>
                  <th style={{ 
                    padding: '12px 10px', 
                    textAlign: 'left', 
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: '80px',
                    minWidth: '150px',
                    maxWidth: '150px',
                    width: '150px',
                    background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                    zIndex: 10,
                    boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                  }}>NOMBRE</th>
                  <th style={{ 
                    padding: '12px 10px', 
                    textAlign: 'left', 
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: '230px',
                    minWidth: '120px',
                    maxWidth: '120px',
                    width: '120px',
                    background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                    zIndex: 10,
                    boxShadow: '2px 0 8px rgba(99, 102, 241, 0.3)',
                    borderRight: '1px solid rgba(99, 102, 241, 0.3)'
                  }}>ESTADO</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL FACTURAS</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL LIQUIDACIONES</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL NOTAS CRÉDITO</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL NOTAS DÉBITO</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL GUÍA REM.</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL RETENCIÓN</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL L. PORTE</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>SECUENCIAL PROFORMA</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>F. CREACIÓN</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>F. ACTUALIZACIÓN</th>
                  <th style={{ 
                    padding: '12px 10px', 
                    textAlign: 'center', 
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    right: 0,
                    minWidth: '100px',
                    maxWidth: '100px',
                    width: '100px',
                    background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                    zIndex: 10,
                    boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
                  }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let puntos = est?.puntos_emision ?? [];
                  
                  // Filtro por campo
                  if (activePuntoFilter && puntoFilterValue) {
                    const lowerVal = puntoFilterValue.toLowerCase();
                    puntos = puntos.filter((p: any) => {
                      const fieldVal = String(p[activePuntoFilter] ?? '').toLowerCase();
                      return fieldVal.includes(lowerVal);
                    });
                  }

                  // Filtro por rango de fechas
                  if (puntoDesde || puntoHasta) {
                    puntos = puntos.filter((p: any) => {
                      const created = p.created_at ? new Date(p.created_at) : null;
                      if (!created) return false;
                      if (puntoDesde && created < new Date(puntoDesde)) return false;
                      if (puntoHasta && created > new Date(puntoHasta)) return false;
                      return true;
                    });
                  }

                  if (puntos.length === 0) {
                    return (
                      <tr>
                        <td colSpan={13} style={{ 
                          padding: '40px 20px', 
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '14px',
                          fontStyle: 'italic'
                        }}>
                          {activePuntoFilter || puntoDesde || puntoHasta 
                            ? 'No se encontraron puntos de emisión que coincidan con los filtros'
                            : 'No hay puntos de emisión registrados'}
                        </td>
                      </tr>
                    );
                  }

                  return puntos.map((punto: any, idx: number) => (
                    <tr 
                      key={punto.id ?? idx}
                      style={{
                        background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f9fafb';
                      }}
                    >
                      <td style={{ 
                        padding: '10px', 
                        borderBottom: '1px solid #e5e7eb',
                        fontWeight: 600,
                        color: '#1f2937',
                        position: 'sticky',
                        left: 0,
                        minWidth: '80px',
                        maxWidth: '80px',
                        width: '80px',
                        background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                        zIndex: 5,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                        pointerEvents: 'auto'
                      }}>
                        <a 
                          href={`/emisores/${id}/establecimientos/${estId}/puntos/${punto.id}`}
                          onClick={(e) => { 
                            e.preventDefault(); 
                            navigate(`/emisores/${id}/establecimientos/${estId}/puntos/${punto.id}`); 
                          }} 
                          style={{ 
                            color: '#1b4ab4', 
                            textDecoration: 'underline', 
                            cursor: 'pointer',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#1642a2')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#1b4ab4')}
                        >
                          {punto.codigo ?? '-'}
                        </a>
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        borderBottom: '1px solid #e5e7eb',
                        fontWeight: 600,
                        color: '#1f2937',
                        position: 'sticky',
                        left: '80px',
                        minWidth: '150px',
                        maxWidth: '150px',
                        width: '150px',
                        background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                        zIndex: 5,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                      }}>{punto.nombre ?? '-'}</td>
                      <td style={{ 
                        padding: '10px', 
                        borderBottom: '1px solid #e5e7eb',
                        position: 'sticky',
                        left: '230px',
                        minWidth: '120px',
                        maxWidth: '120px',
                        width: '120px',
                        background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                        zIndex: 5,
                        boxShadow: '2px 0 8px rgba(99, 102, 241, 0.15)',
                        borderRight: '1px solid rgba(99, 102, 241, 0.2)'
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: punto.estado === 'ACTIVO' ? '#dcfce7' : '#fee2e2',
                          color: punto.estado === 'ACTIVO' ? '#166534' : '#991b1b'
                        }}>
                          {punto.estado ?? '-'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_factura ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_liquidacion_compra ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_nota_credito ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_nota_debito ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_guia_remision ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_retencion ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_liquidacion_compra ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{punto.secuencial_proforma ?? '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{formatDate(punto.created_at)}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{formatDate(punto.updated_at)}</td>
                      <td style={{ 
                        padding: '10px', 
                        borderBottom: '1px solid #e5e7eb',
                        textAlign: 'center',
                        position: 'sticky',
                        right: 0,
                        minWidth: '100px',
                        maxWidth: '100px',
                        width: '100px',
                        background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                        zIndex: 5,
                        boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              if (isLimitedRole) return;
                              setSelectedPunto(punto); 
                              setPuntoFormOpen(true); 
                            }}
                            disabled={isLimitedRole}
                            title={isLimitedRole ? 'Tu rol no permite editar puntos de emisión' : 'Editar punto de emisión'}
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: 'none',
                              background: isLimitedRole ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: '#fff',
                              cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              opacity: isLimitedRole ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (isLimitedRole) return;
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              if (isLimitedRole) return;
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              if (isLimitedRole) return;
                              setPuntoToDelete(punto); 
                              setPuntoDeleteOpen(true); 
                            }}
                            disabled={isLimitedRole}
                            title={isLimitedRole ? 'Tu rol no permite eliminar puntos de emisión' : 'Eliminar punto de emisión'}
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: 'none',
                              background: isLimitedRole ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: '#fff',
                              cursor: isLimitedRole ? 'not-allowed' : 'pointer',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              opacity: isLimitedRole ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (isLimitedRole) return;
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              if (isLimitedRole) return;
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
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
            // Force refresh by reloading from server to ensure cache-busting works
            // Create a new promise to refresh data
            (async () => {
              if (!id || !estId) return;
              try {
                const [rEst, rComp] = await Promise.all([
                  establecimientosApi.show(id, estId),
                  emisoresApi.get(id)
                ]);
                const dataEst = rEst.data?.data ?? rEst.data;
                const dataComp = rComp.data?.data ?? rComp.data;
                
                // Force cache-busting for logo by adding timestamp
                if (dataEst.logo_url) {
                  const separator = dataEst.logo_url.includes('?') ? '&' : '?';
                  dataEst.logo_url = dataEst.logo_url.split('?')[0] + separator + 't=' + Date.now();
                }
                
                setEst(dataEst);
                setCompany(dataComp);
              } catch (e: any) {
                show({ title: 'Error', message: 'No se pudo recargar el establecimiento', type: 'error' });
              }
            })();
            
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

      {/* Punto Emisión Form Modal */}
      {puntoFormOpen && (
        <PuntoEmisionFormModal
          isOpen={puntoFormOpen}
          companyId={Number(id)}
          establecimientoId={Number(estId)}
          initialData={selectedPunto}
          onClose={() => { setPuntoFormOpen(false); setSelectedPunto(null); }}
          onSave={async (savedPunto: PuntoEmision) => {
            const wasEditing = !!selectedPunto;
            setPuntoFormOpen(false);
            setSelectedPunto(null);
            // Recargar establecimiento para actualizar la lista de puntos
            try {
              const rEst = await establecimientosApi.show(id!, estId!);
              const dataEst = rEst.data?.data ?? rEst.data;
              setEst(dataEst);
              // Mostrar notificación después de actualizar el estado
              setTimeout(() => {
                show({ 
                  title: 'Éxito', 
                  message: wasEditing ? 'Punto de emisión actualizado' : 'Punto de emisión creado', 
                  type: 'success' 
                });
              }, 100);
            } catch (e:any) {
              show({ title: 'Error', message: 'No se pudo recargar los datos', type: 'error' });
            }
          }}
          existingPuntos={est?.puntos_emision ?? []}
        />
      )}

      {/* Punto Emisión Delete Modal */}
      {puntoDeleteOpen && puntoToDelete && (
        <PuntoEmisionDeleteModal
          isOpen={puntoDeleteOpen}
          punto={puntoToDelete}
          companyId={Number(id)}
          establecimientoId={Number(estId)}
          onClose={() => { setPuntoDeleteOpen(false); setPuntoToDelete(null); }}
          onSuccess={async () => {
            setPuntoDeleteOpen(false);
            setPuntoToDelete(null);
            // Recargar establecimiento para actualizar la lista de puntos
            try {
              const rEst = await establecimientosApi.show(id!, estId!);
              const dataEst = rEst.data?.data ?? rEst.data;
              setEst(dataEst);
            } catch (e:any) {
              // Error silencioso
            }
          }}
          onError={(msg: string) => {
            show({ title: 'Error', message: msg, type: 'error' });
          }}
          onSuccess_notification={(msg: string) => {
            show({ title: 'Éxito', message: msg, type: 'success' });
          }}
        />
      )}
      </div>
    </div>
  );
};

export default EstablecimientoEditInfo;
