import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { puntosEmisionApi } from '../services/puntosEmisionApi';
import { establecimientosApi } from '../services/establecimientosApi';
import { emisoresApi } from '../services/emisoresApi';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageViewerModal from './ImageViewerModal';
import PuntoEmisionFormModal from './PuntoEmisionFormModal';
import PuntoEmisionDeleteModal from './PuntoEmisionDeleteModal';
import { getImageUrl } from '../helpers/imageUrl';
import './PuntoEmisionInfo.css';

const PuntoEmisionInfo: React.FC = () => {
  const { id, estId, puntoId } = useParams();
  const navigate = useNavigate();
  const { show } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [punto, setPunto] = useState<any | null>(null);
  const [establecimiento, setEstablecimiento] = useState<any | null>(null);
  const [emisor, setEmisor] = useState<any | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsMenuPos, setActionsMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const actionsButtonRef = React.useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id || !estId || !puntoId) return;
      setLoading(true);
      try {
        const [pRes, eRes, cRes] = await Promise.all([
          puntosEmisionApi.show(id, estId, puntoId),
          establecimientosApi.show(id, estId),
          emisoresApi.get(id)
        ]);
        
        setPunto(pRes.data?.data ?? pRes.data);
        setEstablecimiento(eRes.data?.data ?? eRes.data);
        setEmisor(cRes.data?.data ?? cRes.data);
      } catch (error: any) {
        show({
          title: 'Error',
          message: 'No se pudo cargar la información del punto de emisión',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, estId, puntoId, show]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onDocClick = () => setActionsOpen(false);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [actionsOpen]);

  useEffect(() => {
    if (!actionsOpen) {
      setActionsMenuPos(null);
      return;
    }

    const updatePos = () => {
      const btn = actionsButtonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 220;
      const padding = 12;

      const idealLeft = rect.right - menuWidth;
      const left = Math.min(
        window.innerWidth - menuWidth - padding,
        Math.max(padding, idealLeft)
      );
      const top = rect.bottom + 10;
      setActionsMenuPos({ top, left });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [actionsOpen]);

  if (loading) {
    return (
      <div className="punto-info-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const establecimientoLogoRaw = establecimiento?.logo_url || establecimiento?.logo_path || establecimiento?.logo;
  const establecimientoLogoUrl = getImageUrl(establecimientoLogoRaw);

  const operatividadText = () => {
    const estado = String(punto?.estado ?? '').toUpperCase();
    if (estado === 'ACTIVO') return 'Operativo (Activo)';
    if (estado === 'DESACTIVADO') return 'No operativo (Desactivado)';
    return punto?.estado ?? '-';
  };

  const disponibilidadText = () => {
    const disponibilidad = String(punto?.estado_disponibilidad ?? '').toUpperCase();
    if (disponibilidad === 'OCUPADO') return 'Ocupado';
    if (disponibilidad === 'LIBRE') return 'Libre';
    return punto?.estado_disponibilidad ?? '-';
  };

  const disponibilidadClass = () => {
    const disponibilidad = String(punto?.estado_disponibilidad ?? '').toUpperCase();
    if (disponibilidad === 'OCUPADO') return 'ocupado';
    if (disponibilidad === 'LIBRE') return 'libre';
    return 'unknown';
  };

  return (
    <div className="punto-info-page">
      <ImageViewerModal open={viewerOpen} imageUrl={viewerImage} onClose={() => setViewerOpen(false)} />

      {/* ========== HEADER PREMIUM ========== */}
      <div className="punto-info-header">
        <div className="punto-header-bg"></div>
        <div className="punto-header-content">
          <div className="punto-header-left">
            <div className="punto-header-icon">📍</div>
            <div className="punto-header-info">
              <div className="punto-header-badge">
                <span className="punto-header-badge-label">Código</span>
                <span className="punto-header-badge-value">{punto?.codigo ?? '---'}</span>
              </div>
              <h1 className="punto-header-name">{punto?.nombre ?? 'Punto de Emisión'}</h1>
              <div className={`punto-header-status ${punto?.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                <span className="punto-header-status-dot"></span>
                Operatividad: {punto?.estado === 'ACTIVO' ? 'Activo' : 'Desactivado'}
              </div>
            </div>
          </div>
          <div className="punto-header-right">
            <div className="punto-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="punto-actions-btn"
                ref={actionsButtonRef}
                onClick={() => setActionsOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={actionsOpen}
              >
                ⋮ Acciones
              </button>
            </div>

            {actionsOpen && actionsMenuPos &&
              createPortal(
                <div
                  className="punto-actions-menu punto-actions-menu-portal"
                  role="menu"
                  style={{ top: actionsMenuPos.top, left: actionsMenuPos.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="punto-actions-item"
                    role="menuitem"
                    onClick={() => {
                      setActionsOpen(false);
                      setEditOpen(true);
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    className="punto-actions-item danger"
                    role="menuitem"
                    onClick={() => {
                      setActionsOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>,
                document.body
              )}

            <button
              className="punto-back-btn"
              onClick={() => navigate(`/emisores/${id}/establecimientos/${estId}`)}
            >
              ← Volver al Establecimiento
            </button>
          </div>
        </div>
      </div>

      {/* ========== BREADCRUMB CARDS ========== */}
      <div className="punto-breadcrumb-section">
        {/* Card Emisor */}
        <Link
          className="punto-breadcrumb-card emisor"
          to={`/emisores/${id}`}
        >
          <div className="punto-card-header">
            <div className="punto-card-icon">🏢</div>
            <span className="punto-card-title">Emisor</span>
          </div>
          <div className="punto-card-body">
            <div className="punto-card-row">
              <span className="punto-card-label">RUC</span>
              <span className="punto-card-value link">{emisor?.ruc ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Razón Social</span>
              <span className="punto-card-value">{emisor?.razon_social ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Estado</span>
              <span className={`punto-card-status ${emisor?.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                {emisor?.estado === 'ACTIVO' ? '✓ Activo' : emisor?.estado ?? '-'}
              </span>
            </div>
          </div>
        </Link>

        {/* Card Establecimiento */}
        <Link
          className="punto-breadcrumb-card establecimiento"
          to={`/emisores/${id}/establecimientos/${estId}`}
        >
          {establecimientoLogoUrl && (
            <img
              src={establecimientoLogoUrl}
              alt="Logo establecimiento"
              title="Haz clic para ampliar"
              className="punto-est-logo-corner"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setViewerImage(establecimientoLogoUrl);
                setViewerOpen(true);
              }}
            />
          )}

          <div className="punto-card-header">
            <div className="punto-card-icon">🏪</div>
            <span className="punto-card-title">Establecimiento</span>
          </div>
          <div className="punto-card-body">
            <div className="punto-card-row">
              <span className="punto-card-label">Código</span>
              <span className="punto-card-value link">{establecimiento?.codigo ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Nombre</span>
              <span className="punto-card-value">{establecimiento?.nombre ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Nombre comercial</span>
              <span className="punto-card-value punto-one-line">{establecimiento?.nombre_comercial ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Dirección</span>
              <span className="punto-card-value">{establecimiento?.direccion ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Correo</span>
              <span className="punto-card-value" style={{ fontSize: '13px' }}>{establecimiento?.correo ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Teléfono</span>
              <span className="punto-card-value">{establecimiento?.telefono ?? '-'}</span>
            </div>
            <div className="punto-card-row">
              <span className="punto-card-label">Estado</span>
              <span className={`punto-card-status ${establecimiento?.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                {establecimiento?.estado === 'ACTIVO' ? '✓ Activo' : establecimiento?.estado ?? '-'}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      <div className="punto-main-content">
        <div className="punto-detail-card">
          <PuntoEmisionFormModal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            onSave={async (puntoEmision) => {
              if (!id || !estId || !puntoId) return;
              try {
                await puntosEmisionApi.update(parseInt(id, 10), parseInt(estId, 10), parseInt(puntoId, 10), puntoEmision);
                show({ title: 'Éxito', message: 'Punto de emisión actualizado correctamente', type: 'success' });
                setEditOpen(false);

                const [pRes, eRes, cRes] = await Promise.all([
                  puntosEmisionApi.show(id, estId, puntoId),
                  establecimientosApi.show(id, estId),
                  emisoresApi.get(id)
                ]);
                setPunto(pRes.data?.data ?? pRes.data);
                setEstablecimiento(eRes.data?.data ?? eRes.data);
                setEmisor(cRes.data?.data ?? cRes.data);
              } catch (error: any) {
                show({
                  title: 'Error',
                  message: error?.response?.data?.message || 'No se pudo actualizar el punto de emisión',
                  type: 'error'
                });
              }
            }}
            initialData={punto}
            companyId={id ? parseInt(id, 10) : undefined}
            establecimientoId={estId ? parseInt(estId, 10) : undefined}
            existingPuntos={establecimiento?.puntos_emision || []}
          />

          <PuntoEmisionDeleteModal
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onSuccess={() => {
              setDeleteOpen(false);
              if (id && estId) navigate(`/emisores/${id}/establecimientos/${estId}`);
            }}
            punto={punto}
            companyId={id ? parseInt(id, 10) : undefined}
            establecimientoId={estId ? parseInt(estId, 10) : undefined}
            onError={(message) => show({ title: 'Error', message, type: 'error' })}
            onSuccess_notification={(message) => show({ title: 'Éxito', message, type: 'success' })}
          />

          {/* Header */}
          <div className="punto-detail-header">
            <div className="punto-detail-icon">📍</div>
            <div>
              <h2 className="punto-detail-title">Información del Punto de Emisión</h2>
              <p className="punto-detail-subtitle">Configuración y secuenciales de comprobantes</p>
            </div>
          </div>

          {/* Grid de información */}
          <div className="punto-info-grid">
            <div className="punto-info-item">
              <span className="punto-info-label">Código</span>
              <span className="punto-info-value code">{punto?.codigo ?? '-'}</span>
            </div>
            <div className="punto-info-item">
              <span className="punto-info-label">Nombre</span>
              <span className="punto-info-value">{punto?.nombre ?? '-'}</span>
            </div>
            <div className="punto-info-item punto-info-item-center">
              <span className="punto-info-label">Estado de operatividad</span>
              <div className={`punto-status-badge ${punto?.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                <span className="punto-status-dot"></span>
                {operatividadText()}
              </div>
            </div>

            <div className="punto-info-item punto-info-item-center">
              <span className="punto-info-label">Estado de disponibilidad</span>
              <div className={`punto-availability-badge ${disponibilidadClass()}`}>
                <span className="punto-availability-dot"></span>
                {disponibilidadText()}
              </div>
            </div>
            <div className="punto-info-item">
              <span className="punto-info-label">Usuario Asociado</span>
              {punto?.user_id ? (
                <span className="punto-user-link">
                  {punto?.user?.name ?? punto?.user_id}
                </span>
              ) : (
                <span className="punto-info-value" style={{ color: '#94a3b8' }}>Sin asignar</span>
              )}
            </div>
          </div>

          {/* Secuenciales */}
          <div className="punto-secuenciales-section">
            <div className="punto-secuenciales-header">
              <div className="punto-secuenciales-icon">🔢</div>
              <h3 className="punto-secuenciales-title">Secuenciales de Comprobantes</h3>
            </div>
            <div className="punto-secuenciales-grid">
              <div className="punto-secuencial-card">
                <div className="punto-secuencial-label">Factura</div>
                <div className="punto-secuencial-value">{punto?.secuencial_factura ?? '0'}</div>
              </div>
              <div className="punto-secuencial-card">
                <div className="punto-secuencial-label">Liquidación Compra</div>
                <div className="punto-secuencial-value">{punto?.secuencial_liquidacion_compra ?? '0'}</div>
              </div>
              <div className="punto-secuencial-card">
                <div className="punto-secuencial-label">Nota Crédito</div>
                <div className="punto-secuencial-value">{punto?.secuencial_nota_credito ?? '0'}</div>
              </div>
              <div className="punto-secuencial-card">
                <div className="punto-secuencial-label">Nota Débito</div>
                <div className="punto-secuencial-value">{punto?.secuencial_nota_debito ?? '0'}</div>
              </div>
              <div className="punto-secuencial-card">
                <div className="punto-secuencial-label">Guía Remisión</div>
                <div className="punto-secuencial-value">{punto?.secuencial_guia_remision ?? '0'}</div>
              </div>
              <div className="punto-secuencial-card">
                <div className="punto-secuencial-label">Retención</div>
                <div className="punto-secuencial-value">{punto?.secuencial_retencion ?? '0'}</div>
              </div>
              <div className="punto-secuencial-card">
                <div className="punto-secuencial-label">Proforma</div>
                <div className="punto-secuencial-value">{punto?.secuencial_proforma ?? '0'}</div>
              </div>
            </div>
          </div>

          {/* Auditoría */}
          <div className="punto-audit-section">
            <div className="punto-audit-item">
              <div className="punto-audit-icon">📅</div>
              <div className="punto-audit-content">
                <span className="punto-audit-label">Fecha de Creación</span>
                <span className="punto-audit-value">{formatDate(punto?.created_at)}</span>
              </div>
            </div>
            <div className="punto-audit-item">
              <div className="punto-audit-icon">✏️</div>
              <div className="punto-audit-content">
                <span className="punto-audit-label">Última Actualización</span>
                <span className="punto-audit-value">{formatDate(punto?.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuntoEmisionInfo;
