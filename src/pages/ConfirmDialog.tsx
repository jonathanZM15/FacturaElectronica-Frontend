import React, { useEffect } from 'react';

type Props = {
  open: boolean;
  title?: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const ConfirmDialog: React.FC<Props> = ({
  open,
  title = 'Cerrar Sesión',
  message,
  cancelText = 'CANCELAR',
  confirmText = 'CONFIRMAR',
  onCancel,
  onConfirm,
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

  if (!open) return null;

  return (
    <div className="mf-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="mf-modal-title">
      <div className="mf-modal">
        <h3 id="mf-modal-title" className="mf-modal-title">{title}</h3>
        <p className="mf-modal-message">{message}</p>
        <div className="mf-modal-actions">
          <button className="mf-btn-cancel" onClick={onCancel}>{cancelText}</button>
          <button className="mf-btn-confirm" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>

      <style>{`
        .mf-modal-overlay{
          position:fixed; inset:0; background:rgba(0,0,0,.35);
          display:flex; align-items:center; justify-content:center; z-index:3000;
        }
        .mf-modal{
          width:min(540px, 92vw); background:#fff; border-radius:12px;
          padding:28px 24px; box-shadow:0 20px 60px rgba(0,0,0,.25);
          text-align:center;
        }
        .mf-modal-title{ margin:0 0 8px; font-size:24px; color:#233; }
        .mf-modal-message{ margin:8px 0 22px; font-size:18px; color:#333; font-weight:600; }
        .mf-modal-actions{ display:flex; gap:14px; justify-content:center; }
        .mf-btn-cancel{
          padding:10px 18px; border-radius:8px; background:#fff; color:#333;
          border:2px solid #ccc; font-weight:700; cursor:pointer;
        }
        .mf-btn-confirm{
          padding:10px 18px; border-radius:8px; background:#ff4d4f; color:#fff;
          border:none; font-weight:700; cursor:pointer;
        }
        .mf-btn-cancel:focus, .mf-btn-confirm:focus{ outline:3px solid rgba(12,45,231,.35); outline-offset:2px; }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;