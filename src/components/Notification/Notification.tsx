import React, { useEffect } from 'react';
import '../../pages/auth.css';

interface Props {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
}

const Notification: React.FC<Props> = ({ title, message, type = 'info', duration = 4500, onClose }) => {
  useEffect(() => {
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const icon = type === 'success' ? '✓' : type === 'error' ? '✖' : type === 'warning' ? '!' : 'i';

  return (
    <div className={`notif notif-${type}`} role="alert">
      <div className="notif-icon">{icon}</div>
      <div className="notif-body">
        <strong className="notif-title">{title}</strong>
        <div className="notif-message">{message}</div>
      </div>
      <button className="notif-close" onClick={() => onClose && onClose()} aria-label="Cerrar">✖</button>
    </div>
  );
};

export default Notification;
