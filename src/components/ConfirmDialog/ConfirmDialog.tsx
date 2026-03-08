import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

type Props = {
  open: boolean;
  title?: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  modalStyle?: React.CSSProperties;
  /** 'danger' uses red, 'warning' amber, default indigo */
  variant?: 'default' | 'danger' | 'warning';
};

const variantConfig: Record<string, {
  btnBg: string; btnHover: string; ring: string;
  iconBg: string; iconStroke: string; topBorder: string;
}> = {
  default: {
    btnBg: '#4f46e5', btnHover: '#4338ca', ring: 'rgba(99,102,241,.3)',
    iconBg: '#eef2ff', iconStroke: '#6366f1', topBorder: '#6366f1',
  },
  danger: {
    btnBg: '#dc2626', btnHover: '#b91c1c', ring: 'rgba(239,68,68,.3)',
    iconBg: '#fef2f2', iconStroke: '#dc2626', topBorder: '#dc2626',
  },
  warning: {
    btnBg: '#d97706', btnHover: '#b45309', ring: 'rgba(245,158,11,.3)',
    iconBg: '#fffbeb', iconStroke: '#d97706', topBorder: '#d97706',
  },
};

/* SVG icons por variante — limpios y profesionales */
const variantIcons: Record<string, React.ReactNode> = {
  default: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  danger: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  warning: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

const ConfirmDialog: React.FC<Props> = ({
  open,
  title = 'Confirmar Acción',
  message,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  onCancel,
  onConfirm,
  modalStyle,
  variant = 'default',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const cfg = variantConfig[variant] || variantConfig.default;

  return ReactDOM.createPortal(
    <div className="cd-overlay" role="dialog" aria-modal="true" aria-labelledby="cd-title" onClick={onCancel}>
      <div className="cd-modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Barra superior de color */}
        <div className="cd-top-bar" style={{ background: cfg.topBorder }} />

        {/* Icono SVG */}
        <div className="cd-icon" style={{ background: cfg.iconBg, color: cfg.iconStroke }}>
          {variantIcons[variant] || variantIcons.default}
        </div>

        {/* Contenido */}
        <h3 id="cd-title" className="cd-title">{title}</h3>
        <p className="cd-message">{message}</p>

        {/* Separador */}
        <div className="cd-divider" />

        {/* Acciones */}
        <div className="cd-actions">
          <button className="cd-btn cd-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className="cd-btn cd-btn-confirm"
            style={{ background: cfg.btnBg } as React.CSSProperties}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        .cd-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: cdFadeIn 0.18s ease-out;
          padding: 20px;
        }

        @keyframes cdFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cd-modal {
          width: min(420px, 90vw);
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.04);
          animation: cdSlideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes cdSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .cd-top-bar {
          height: 4px;
          width: 100%;
        }

        .cd-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 28px auto 18px;
        }

        .cd-title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          text-align: center;
          letter-spacing: -0.01em;
        }

        .cd-message {
          margin: 0;
          font-size: 14px;
          color: #64748b;
          line-height: 1.55;
          text-align: center;
          padding: 0 32px;
        }

        .cd-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 24px 0 0;
        }

        .cd-actions {
          display: flex;
          gap: 0;
        }

        .cd-btn {
          flex: 1;
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          border: none;
          border-radius: 0;
        }

        .cd-btn-cancel {
          background: #f8fafc;
          color: #475569;
          border-right: 1px solid #e2e8f0;
        }
        .cd-btn-cancel:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .cd-btn-confirm {
          color: #fff;
        }
        .cd-btn-confirm:hover {
          filter: brightness(1.1);
        }

        .cd-btn:focus-visible {
          outline: 3px solid ${cfg.ring};
          outline-offset: -3px;
          z-index: 1;
        }

        @media (max-width: 480px) {
          .cd-modal {
            width: 92vw;
          }
          .cd-message {
            padding: 0 20px;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ConfirmDialog;