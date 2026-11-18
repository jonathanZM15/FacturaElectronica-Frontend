import React, { useState, useEffect } from 'react';
import { formatDateTime } from '../../helpers/formatDate';
import './FacturaEstadoModal.css';

interface FacturaEstadoModalProps {
  open: boolean;
  onClose: () => void;
  detail: any;
  row?: any;
  onOpenCorrection?: (row: any) => void;
  onRetry?: (row: any) => void;
  onDownload?: (row: any, type: 'pdf' | 'xml') => void;
  onReenviarEmail?: (row: any) => void;
  canRetry?: boolean;
  canCorrect?: boolean;
  canEmail?: boolean;
  busy?: boolean;
}

export default function FacturaEstadoModal({
  open,
  onClose,
  detail,
  row,
  onOpenCorrection,
  onRetry,
  onDownload,
  onReenviarEmail,
  canRetry = false,
  canCorrect = false,
  canEmail = false,
  busy = false,
}: FacturaEstadoModalProps) {
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !detail) return null;

  const handleCopyKey = () => {
    if (detail.clave_acceso) {
      navigator.clipboard.writeText(detail.clave_acceso);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const estadoSri = (detail.estado_sri || row?.estado_sri || 'PENDIENTE').toUpperCase();

  const getStatusBannerClass = () => {
    if (estadoSri === 'AUTORIZADO') return 'autorizado';
    if (estadoSri === 'DEVUELTA') return 'devuelta';
    if (['NO_AUTORIZADO', 'ERROR_SISTEMA', 'ERROR_FIRMA', 'ERROR_ENVIO', 'ERROR_AUTORIZACION'].includes(estadoSri)) {
      return 'error';
    }
    return 'proceso';
  };

  const getStatusSymbol = () => {
    if (estadoSri === 'AUTORIZADO') return '✓';
    if (estadoSri === 'DEVUELTA') return '⚠️';
    if (['NO_AUTORIZADO', 'ERROR_SISTEMA', 'ERROR_FIRMA', 'ERROR_ENVIO', 'ERROR_AUTORIZACION'].includes(estadoSri)) {
      return '✕';
    }
    return '⏳';
  };

  const getEmailBadgeClass = () => {
    const e = (detail.email_estado || row?.email_estado || '').toUpperCase();
    if (e === 'ENVIADO') return 'enviado';
    if (e === 'ERROR' || e === 'FALLIDO') return 'error';
    return 'pendiente';
  };

  const numeroDoc = row?.numero_documento || `Comprobante #${detail.comprobante_id}`;
  const clienteNombre = row?.cliente_razon_social || '';
  const totalDoc = row?.total ? Number(row.total).toFixed(2) : null;

  return (
    <div className="fem-backdrop" onClick={onClose}>
      <div className="fem-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="fem-header">
          <div className="fem-header-left">
            <div className="fem-icon-box">🧾</div>
            <div className="fem-title-group">
              <h2>Estado del Comprobante</h2>
              <div className="fem-subtitle">
                {numeroDoc} {clienteNombre ? `· ${clienteNombre}` : ''}
              </div>
            </div>
          </div>
          <button className="fem-close-btn" onClick={onClose} title="Cerrar ventana">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="fem-body">
          {/* Banner de Estado Principal */}
          <div className={`fem-status-banner ${getStatusBannerClass()}`}>
            <div className="fem-status-main">
              <div className="fem-status-symbol">{getStatusSymbol()}</div>
              <div className="fem-status-text">
                <span className="fem-status-label">Estado SRI</span>
                <span className="fem-status-value">{estadoSri}</span>
              </div>
            </div>
            {totalDoc && (
              <div className="fem-total-badge">
                <div className="fem-total-label">Total Factura</div>
                <div className="fem-total-value">${totalDoc}</div>
              </div>
            )}
          </div>

          {/* Tarjeta 1: Datos de Autorización SRI */}
          <div className="fem-card">
            <div className="fem-card-header">
              <span>🏛️</span>
              <h3>Datos de Autorización del SRI</h3>
            </div>
            <div className="fem-grid-2">
              <div className="fem-info-item">
                <span className="fem-info-label">N° de Autorización</span>
                <span className="fem-info-val" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {detail.numero_autorizacion || 'No confirmada'}
                </span>
              </div>
              <div className="fem-info-item">
                <span className="fem-info-label">Fecha de Autorización</span>
                <span className="fem-info-val">
                  {detail.fecha_autorizacion || detail.autorizado_en ? formatDateTime(detail.fecha_autorizacion || detail.autorizado_en) : 'Pendiente'}
                </span>
              </div>
            </div>

            <div className="fem-info-item" style={{ marginTop: '12px' }}>
              <span className="fem-info-label">Clave de Acceso (49 dígitos)</span>
              {detail.clave_acceso ? (
                <div className="fem-access-key-box">
                  <span className="fem-key-code">{detail.clave_acceso}</span>
                  <button
                    type="button"
                    className={`fem-btn-copy ${copiedKey ? 'copied' : ''}`}
                    onClick={handleCopyKey}
                    title="Copiar clave de acceso al portapapeles"
                  >
                    {copiedKey ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                </div>
              ) : (
                <span className="fem-info-val" style={{ color: '#94a3b8' }}>
                  Pendiente de generación
                </span>
              )}
            </div>
          </div>

          {/* Tarjeta 2: Notificación por Correo */}
          <div className="fem-card">
            <div className="fem-card-header">
              <span>✉️</span>
              <h3>Entrega por Correo Electrónico</h3>
            </div>
            <div className="fem-grid-2">
              <div className="fem-info-item">
                <span className="fem-info-label">Estado de Entrega</span>
                <span className={`fem-badge ${getEmailBadgeClass()}`}>
                  {detail.email_estado || 'PENDIENTE'}
                </span>
              </div>
              <div className="fem-info-item">
                <span className="fem-info-label">Intentos Realizados</span>
                <span className="fem-info-val">
                  {detail.email_intentos !== undefined && detail.email_intentos !== null
                    ? `${detail.email_intentos} intento(s)`
                    : '0 intentos'}
                </span>
              </div>
              {row?.cliente_email && (
                <div className="fem-info-item">
                  <span className="fem-info-label">Correo Destino</span>
                  <span className="fem-info-val" style={{ color: '#2563eb' }}>
                    {row.cliente_email}
                  </span>
                </div>
              )}
              {detail.email_enviado_en && (
                <div className="fem-info-item">
                  <span className="fem-info-label">Fecha de Envío</span>
                  <span className="fem-info-val">
                    {formatDateTime(detail.email_enviado_en)}
                  </span>
                </div>
              )}
            </div>

            {detail.email_error && (
              <div className="fem-error-banner" style={{ marginTop: '10px' }}>
                <div className="fem-error-title">⚠️ Error en el envío del correo</div>
                <p className="fem-error-desc">{detail.email_error}</p>
              </div>
            )}
          </div>

          {/* Tarjeta 3: Motivo / Error reportado por el SRI (si existe) */}
          {detail.ultimo_error_sri && (
            <div className="fem-card" style={{ borderColor: '#fca5a5' }}>
              <div className="fem-card-header">
                <span>⚠️</span>
                <h3 style={{ color: '#991b1b' }}>Motivo reportado por el SRI</h3>
              </div>
              <div className="fem-error-banner">
                <p className="fem-error-desc">{detail.ultimo_error_sri}</p>
              </div>
            </div>
          )}

          {/* Tarjeta 4: Historial de eventos / Logs */}
          <div className="fem-card">
            <div className="fem-card-header">
              <span>🕒</span>
              <h3>Historial de Procesamiento</h3>
            </div>
            {detail.logs && detail.logs.length > 0 ? (
              <div className="fem-timeline">
                {detail.logs.map((log: any) => {
                  const isError = log.estado?.includes('ERROR') || log.mensaje?.toLowerCase().includes('error');
                  const isSuccess = log.estado === 'AUTORIZADO' || log.estado === 'RECIBIDA';
                  return (
                    <div className="fem-timeline-item" key={log.id}>
                      <div className={`fem-timeline-dot ${isError ? 'error' : isSuccess ? 'success' : ''}`} />
                      <div className="fem-timeline-content">
                        <div className="fem-timeline-meta">
                          <span className="fem-timeline-time">{formatDateTime(log.created_at)}</span>
                          <span className="fem-timeline-tag">{log.estado}</span>
                        </div>
                        <p className="fem-timeline-msg">{log.mensaje}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                No hay registros de eventos detallados para este comprobante.
              </p>
            )}
          </div>
        </div>

        {/* Footer / Acciones */}
        <div className="fem-footer">
          <button type="button" className="fem-btn fem-btn-secondary" onClick={onClose}>
            Cerrar
          </button>

          {/* Si fue devuelta o no autorizada, botón directo para corregir */}
          {canCorrect && ['DEVUELTA', 'NO_AUTORIZADO'].includes(estadoSri) && onOpenCorrection && row && (
            <button
              type="button"
              className="fem-btn fem-btn-orange"
              disabled={busy}
              onClick={() => {
                onClose();
                onOpenCorrection(row);
              }}
            >
              ✏️ Corregir datos fiscales
            </button>
          )}

          {/* Si está autorizada, botones de descarga o reenvío */}
          {estadoSri === 'AUTORIZADO' && row && (
            <>
              {onDownload && (
                <>
                  <button
                    type="button"
                    className="fem-btn fem-btn-secondary"
                    onClick={() => onDownload(row, 'pdf')}
                  >
                    📄 PDF
                  </button>
                  <button
                    type="button"
                    className="fem-btn fem-btn-secondary"
                    onClick={() => onDownload(row, 'xml')}
                  >
                    📋 XML
                  </button>
                </>
              )}
              {canEmail && onReenviarEmail && (
                <button
                  type="button"
                  className="fem-btn fem-btn-primary"
                  disabled={busy}
                  onClick={() => onReenviarEmail(row)}
                >
                  ✉️ Reenviar correo
                </button>
              )}
            </>
          )}

          {/* Reintentar procesamiento si aplica */}
          {canRetry && ['BORRADOR', 'PROCESANDO', 'FIRMADO', 'ENVIADO', 'RECIBIDA', 'ERROR_ENVIO', 'ERROR_FIRMA', 'ERROR_AUTORIZACION', 'ERROR_SISTEMA'].includes(estadoSri) && onRetry && row && (
            <button
              type="button"
              className="fem-btn fem-btn-primary"
              disabled={busy}
              onClick={() => onRetry(row)}
            >
              🔄 {['RECIBIDA', 'ENVIADO'].includes(estadoSri) ? 'Consultar SRI' : 'Reintentar procesamiento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
