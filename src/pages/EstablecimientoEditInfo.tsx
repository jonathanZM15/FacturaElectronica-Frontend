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
import './UsuarioDeleteModalModern.css';
import './EstablecimientoDetail.css';

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
        let dataEst = rEst.data?.data ?? rEst.data;
        const dataComp = rComp.data?.data ?? rComp.data;
        
        // Filtrar puntos de emisión para Emisor, Gerente y Cajero
        const shouldFilterPuntos = user && (role === 'emisor' || role === 'gerente' || role === 'cajero');
        
        if (shouldFilterPuntos && dataEst?.puntos_emision) {
          let user_puntos_ids = (user as any).puntos_emision_ids || [];
          
          if (typeof user_puntos_ids === 'string') {
            try {
              user_puntos_ids = JSON.parse(user_puntos_ids);
            } catch (e) {
              user_puntos_ids = [];
            }
          }
          
          if (Array.isArray(user_puntos_ids) && user_puntos_ids.length > 0) {
            dataEst.puntos_emision = dataEst.puntos_emision.filter((p: any) => {
              return user_puntos_ids.includes(p.id) ||
                     user_puntos_ids.includes(Number(p.id)) ||
                     user_puntos_ids.includes(String(p.id));
            });
          }
        }
        
        setEst(dataEst);
        setCompany(dataComp);
        setCodigoEditable(dataEst.codigo_editable ?? true);
      } catch (e:any) {
        show({ title: 'Error', message: 'No se pudo cargar el establecimiento', type: 'error' });
      } finally { setLoading(false); }
    };
    load();
  }, [id, estId, show, user, role]);

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
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  const openDeleteModal = () => {
    if (isLimitedRole) return;
    setActionsOpen(false);
    setDeleteOpen(true);
  };

  return (
    <div className="estd-container">
      <div className="estd-content">
      {/* Header moderno */}
      <div className="estd-header">
        <div className="estd-header-left">
          <div className="estd-header-icon">🏢</div>
          <div className="estd-header-info">
            <h2>{est?.nombre ?? '—'}</h2>
            <div className="estd-header-badge">
              <span className="estd-codigo-badge">
                📋 Código: {est?.codigo ?? ''}
              </span>
              {est?.estado && (
                <span className={`estd-status-badge ${est.estado === 'ABIERTO' ? 'abierto' : 'cerrado'}`}>
                  {est.estado === 'ABIERTO' ? '✅ Activo' : '🔒 Cerrado'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="estd-header-right">
          <div style={{ position: 'relative' }}>
            <button
              className="estd-actions-btn"
              onClick={() => {
                if (isLimitedRole) return;
                setActionsOpen((s) => !s);
              }}
              aria-expanded={actionsOpen}
              disabled={isLimitedRole}
              title={isLimitedRole ? 'Tu rol no permite modificar establecimientos' : 'Acciones del establecimiento'}
            >
              ⚙️ Acciones ▾
            </button>
            {!isLimitedRole && actionsOpen && (
              <div className="estd-actions-menu">
                <button 
                  className="estd-menu-item"
                  onClick={() => { setOpenEdit(true); setActionsOpen(false); }}
                >
                  <span style={{ fontSize: '18px' }}>✏️</span>
                  <span>Editar establecimiento</span>
                </button>
                <div className="estd-menu-divider"></div>
                <button 
                  className="estd-menu-item danger"
                  onClick={openDeleteModal}
                >
                  <span style={{ fontSize: '18px' }}>🗑️</span>
                  <span>Eliminar establecimiento</span>
                </button>
              </div>
            )}
          </div>

          <button 
            className="estd-back-btn"
            onClick={() => navigate(`/emisores/${id}?tab=establecimientos`)}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="estd-grid">
        {/* Datos del establecimiento */}
        {/* Card: Datos del establecimiento */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon purple">📊</div>
            <h4>Datos del establecimiento</h4>
          </div>

          <div className="estd-card-body">
            <div className="estd-info-row">
              <span className="estd-info-label">📋 Código:</span>
              <span className="estd-info-value highlight">{est?.codigo ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">🏢 Nombre:</span>
              <span className="estd-info-value highlight">{est?.nombre ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">🏪 Nombre comercial:</span>
              <span className="estd-info-value">{est?.nombre_comercial ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">📍 Dirección:</span>
              <span className="estd-info-value">{est?.direccion ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">✉️ Correo:</span>
              <span className="estd-info-value">{est?.correo ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">📞 Teléfono:</span>
              <span className="estd-info-value">{est?.telefono ?? '-'}</span>
            </div>
            <div className="estd-info-row">
              <span className="estd-info-label">🚦 Estado:</span>
              {est?.estado ? (
                <span className={`estd-estado-badge ${est.estado === 'ABIERTO' ? 'activo' : 'inactivo'}`}>
                  {est.estado === 'ABIERTO' ? '✅ Abierto' : '🔒 Cerrado'}
                </span>
              ) : '-'}
            </div>
          </div>
        </div>

        {/* Card: Logo */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon blue">🖼️</div>
            <h4>Logo</h4>
          </div>

          {est?.logo_url ? (
            <div className="estd-logo-container">
              <img 
                src={getImageUrl(est.logo_url)} 
                alt="logo" 
                className="estd-logo-img"
              />
            </div>
          ) : (
            <div className="estd-logo-empty">
              <div className="estd-logo-empty-icon">🖼️</div>
              <div className="estd-logo-empty-text">No hay logo</div>
            </div>
          )}
        </div>

        {/* Card: Información adicional */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon orange">📝</div>
            <h4>Información adicional</h4>
          </div>

          <div className="estd-chips-vertical">
            <div className="estd-chip yellow">
              <div className="estd-chip-label">📅 Actividades económicas</div>
              <div className="estd-chip-value">{est?.actividades_economicas ?? '-'}</div>
            </div>

            <div className="estd-chip blue">
              <div className="estd-chip-label">🚀 Fecha inicio de actividades</div>
              <div className="estd-chip-value">{est?.fecha_inicio_actividades ?? '-'}</div>
            </div>

            <div className="estd-chip green">
              <div className="estd-chip-label">🔄 Fecha reinicio de actividades</div>
              <div className="estd-chip-value">{est?.fecha_reinicio_actividades ?? '-'}</div>
            </div>

            <div className="estd-chip red">
              <div className="estd-chip-label">🔒 Fecha cierre de establecimiento</div>
              <div className="estd-chip-value">{est?.fecha_cierre_establecimiento ?? '-'}</div>
            </div>
          </div>
        </div>

        {/* Card: Emisor asociado */}
        <div className="estd-card">
          <div className="estd-card-header">
            <div className="estd-card-icon green">🏛️</div>
            <h4>Emisor asociado</h4>
          </div>

          <div className="estd-emisor-vertical">
            <div className="estd-emisor-item">
              <div className="estd-emisor-label">🔢 RUC</div>
              {company?.id ? (
                <a 
                  href={`/emisores/${company.id}`} 
                  onClick={(e) => { e.preventDefault(); navigate(`/emisores/${company.id}`); }} 
                  className="estd-emisor-link"
                >
                  {company?.ruc}
                </a>
              ) : (
                <div className="estd-emisor-value">{company?.ruc ?? '-'}</div>
              )}
            </div>

            <div className="estd-emisor-item">
              <div className="estd-emisor-label">🏢 Razón Social</div>
              <div className="estd-emisor-value">{company?.razon_social ?? '-'}</div>
            </div>
          </div>
        </div>

        {/* Card: Actividad de la cuenta */}
        <div className="estd-card full-width activity">
          <div className="estd-card-header">
            <div className="estd-card-icon gray">⏱️</div>
            <h4>Actividad de la cuenta</h4>
          </div>

          <div className="estd-activity-grid">
            <div className="estd-activity-item">
              <span className="estd-activity-label">📅 Fecha de creación:</span>
              <span className="estd-activity-value">{est?.created_at ?? '-'}</span>
            </div>

            <div className="estd-activity-item">
              <span className="estd-activity-label">🔄 Fecha de actualización:</span>
              <span className="estd-activity-value">{est?.updated_at ?? '-'}</span>
            </div>

            <div className="estd-activity-item">
              <span className="estd-activity-label">👤 Creado por:</span>
              <span className="estd-activity-value">{est?.created_by_name ?? '-'}</span>
            </div>

            <div className="estd-activity-item">
              <span className="estd-activity-label">✏️ Actualizado por:</span>
              <span className="estd-activity-value">{est?.updated_by_name ?? '-'}</span>
            </div>
          </div>
        </div>
      </div>

        {/* Card: Lista de puntos de emisión - FUERA del grid para ancho completo */}
        <div className="estd-puntos-section">
          <div className="estd-puntos-header">
            <h4>📍 Lista de puntos de emisión</h4>
            <div className="estd-puntos-filters">
            {/* Filter UI - Text filter */}
            <div className="estd-filter-input-container">
              <div className="estd-filter-input-wrapper">
                {activePuntoFilter === 'estado' ? (
                  <select 
                    value={puntoFilterValue} 
                    onChange={(e) => setPuntoFilterValue(e.target.value)}
                    className="estd-filter-select"
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
                    className="estd-filter-input"
                  />
                )}
              </div>
              <span className="estd-filter-icon">🔍</span>
              {activePuntoFilter && puntoFilterValue && (
                <button
                  onClick={() => setPuntoFilterValue('')}
                  className="estd-filter-clear"
                >
                  ×
                </button>
              )}
            </div>

            {/* Date range filter */}
            <div className="estd-date-range" ref={puntosDateRef}>
              <button 
                className="estd-date-range-btn"
                onClick={() => setPuntosDateOpen((v) => !v)}
              >
                <span>{puntoDesde ? formatDate(puntoDesde) : 'Fecha Inicial'}</span>
                <span>→</span>
                <span>{puntoHasta ? formatDate(puntoHasta) : 'Fecha Final'}</span>
              </button>
              {puntosDateOpen && (
                <div className="estd-date-popover">
                  <div className="estd-date-inputs">
                    <label className="estd-date-label">
                      Desde
                      <input 
                        ref={puntoDesdeInputRef}
                        type="date" 
                        value={puntoDesde} 
                        onChange={(e) => setPuntoDesde(e.target.value)}
                        className="estd-date-input"
                      />
                    </label>
                    <label className="estd-date-label">
                      Hasta
                      <input 
                        type="date" 
                        value={puntoHasta} 
                        onChange={(e) => setPuntoHasta(e.target.value)}
                        className="estd-date-input"
                      />
                    </label>
                  </div>
                  <div className="estd-date-actions">
                    <button 
                      onClick={() => { setPuntoDesde(''); setPuntoHasta(''); setPuntosDateOpen(false); }}
                      className="estd-date-clear-btn"
                    >
                      Limpiar
                    </button>
                    <button 
                      onClick={() => setPuntosDateOpen(false)}
                      className="estd-date-apply-btn"
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
                className="estd-date-clear-x"
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
              className={`estd-new-punto-btn ${isLimitedRole ? 'disabled' : ''}`}
            >
              + Nuevo
            </button>
          </div>
        </div>
        {activePuntoFilter && (
          <div className="estd-active-filter-bar">
            Buscando por {puntoFilterLabels[activePuntoFilter]}
            {puntoFilterValue && (
              <button
                onClick={() => { setPuntoFilterValue(''); }}
                className="estd-filter-clear-text"
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        <div className="estd-table-wrapper">
            <table className="estd-table">
              <thead>
                <tr>
                  <th className="estd-th sticky-codigo">CÓDIGO</th>
                  <th className="estd-th sticky-nombre">NOMBRE</th>
                  <th className="estd-th sticky-estado">ESTADO</th>
                  <th className="estd-th">SECUENCIAL FACTURAS</th>
                  <th className="estd-th">SECUENCIAL LIQUIDACIONES</th>
                  <th className="estd-th">SECUENCIAL NOTAS CRÉDITO</th>
                  <th className="estd-th">SECUENCIAL NOTAS DÉBITO</th>
                  <th className="estd-th">SECUENCIAL GUÍA REM.</th>
                  <th className="estd-th">SECUENCIAL RETENCIÓN</th>
                  <th className="estd-th">SECUENCIAL L. PORTE</th>
                  <th className="estd-th">SECUENCIAL PROFORMA</th>
                  <th className="estd-th">F. CREACIÓN</th>
                  <th className="estd-th">F. ACTUALIZACIÓN</th>
                  <th className="estd-th sticky-acciones">ACCIONES</th>
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
                        <td colSpan={14} className="estd-empty-cell">
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
                      className={`estd-tr ${idx % 2 === 0 ? 'even' : 'odd'}`}
                    >
                      <td className="estd-td sticky-codigo">
                        <a 
                          href={`/emisores/${id}/establecimientos/${estId}/puntos/${punto.id}`}
                          onClick={(e) => { 
                            e.preventDefault(); 
                            navigate(`/emisores/${id}/establecimientos/${estId}/puntos/${punto.id}`); 
                          }} 
                          className="estd-punto-link"
                        >
                          {punto.codigo ?? '-'}
                        </a>
                      </td>
                      <td className="estd-td sticky-nombre">{punto.nombre ?? '-'}</td>
                      <td className="estd-td sticky-estado">
                        <span className={`estd-punto-estado ${punto.estado === 'ACTIVO' ? 'activo' : 'inactivo'}`}>
                          {punto.estado ?? '-'}
                        </span>
                      </td>
                      <td className="estd-td">{punto.secuencial_factura ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_liquidacion_compra ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_nota_credito ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_nota_debito ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_guia_remision ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_retencion ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_liquidacion_compra ?? '-'}</td>
                      <td className="estd-td">{punto.secuencial_proforma ?? '-'}</td>
                      <td className="estd-td">{formatDate(punto.created_at)}</td>
                      <td className="estd-td">{formatDate(punto.updated_at)}</td>
                      <td className="estd-td sticky-acciones">
                        <div className="estd-action-buttons">
                          <button
                            onClick={() => {
                              if (isLimitedRole) return;
                              setSelectedPunto(punto); 
                              setPuntoFormOpen(true); 
                            }}
                            disabled={isLimitedRole}
                            title={isLimitedRole ? 'Tu rol no permite editar puntos de emisión' : 'Editar punto de emisión'}
                            className={`estd-action-btn edit ${isLimitedRole ? 'disabled' : ''}`}
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
                            className={`estd-action-btn delete ${isLimitedRole ? 'disabled' : ''}`}
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
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>
                <span className="icon">⚠️</span>
                Eliminar establecimiento
              </h2>
              <button 
                className="delete-modal-close" 
                onClick={() => setDeleteOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              <p className="delete-confirmation-text">
                ¿Está seguro que desea eliminar el establecimiento:
              </p>
              <p style={{ textAlign: 'center', marginTop: 12, marginBottom: 20, fontSize: 18 }}>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{est?.codigo ?? ''}</span>
                <span style={{ fontWeight: 600 }}> - </span>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{est?.nombre ?? ''}</span>
              </p>
              <p className="delete-info-text" style={{ textAlign: 'center' }}>
                y todos sus datos asociados?
              </p>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => setDeleteOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={() => { setDeleteOpen(false); setDeletePasswordOpen(true); }}
              >
                🗑️ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Password entry modal */}
      {deletePasswordOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>
                <span className="icon">🔒</span>
                Verificar contraseña
              </h2>
              <button 
                className="delete-modal-close" 
                onClick={() => { 
                  setDeletePasswordOpen(false); 
                  setDeletePassword(''); 
                  setDeleteError(null); 
                }}
              >
                ✕
              </button>
            </div>

            <div className="delete-modal-body">
              <p className="delete-password-text">
                Ingresa tu clave de administrador para confirmar la eliminación del establecimiento
              </p>

              <div className="delete-form-group">
                <label htmlFor="delete-password" className="delete-form-label">
                  Clave de administrador *
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className={deleteError ? 'delete-form-input error' : 'delete-form-input'}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && deletePassword && !deleteLoading) {
                      (async () => {
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
                      })();
                    }
                  }}
                />
                {deleteError && (
                  <span className="delete-error-text">
                    <span className="icon">⚠</span>
                    {deleteError}
                  </span>
                )}
              </div>
            </div>

            <div className="delete-modal-footer">
              <button 
                type="button"
                className="delete-btn delete-btn-cancel" 
                onClick={() => { 
                  setDeletePasswordOpen(false); 
                  setDeletePassword(''); 
                  setDeleteError(null); 
                }} 
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="delete-btn delete-btn-danger" 
                onClick={async () => {
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
                }} 
                disabled={deleteLoading || deletePassword.length === 0}
              >
                {deleteLoading ? 'Eliminando…' : '🗑️ Eliminar'}
              </button>
            </div>
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
