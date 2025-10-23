import React, { createContext, useContext, useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
};

type NotificationContextType = {
  show: (n: Omit<Notification, 'id'>, ttl?: number) => string;
  hide: (id: string) => void;
  list: Notification[];
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [list, setList] = useState<Notification[]>([]);

  const hide = useCallback((id: string) => {
    setList((s) => s.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((n: Omit<Notification, 'id'>, ttl = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newN: Notification = { id, ...n };
    setList((s) => [newN, ...s]);
    if (ttl > 0) setTimeout(() => hide(id), ttl);
    return id;
  }, [hide]);

  return (
    <NotificationContext.Provider value={{ show, hide, list }}>
      {children}
      <div className="notification-root" aria-live="polite">
        {list.map((n) => (
          <div key={n.id} className={`notification-item ${n.type}`}>
            <div className="notification-body">
              <div className="notification-title">{n.title}</div>
              <div className="notification-message">{n.message}</div>
            </div>
            <button className="notification-close" onClick={() => hide(n.id)}>✕</button>
          </div>
        ))}
      </div>
      <style>{`
        .notification-root{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:12px;z-index:2000}
        .notification-item{min-width:260px;max-width:360px;color:white;padding:12px 16px;border-radius:8px;display:flex;align-items:flex-start;gap:12px;box-shadow:0 6px 18px rgba(0,0,0,0.15)}
        .notification-item .notification-title{font-weight:700;margin-bottom:6px}
        .notification-item .notification-message{font-size:13px;opacity:0.95}
        .notification-item.success{background:linear-gradient(135deg,#2bb7ff,#4a7cff)}
        .notification-item.error{background:linear-gradient(135deg,#ff5f6d,#c86dd7)}
        .notification-item.info{background:linear-gradient(135deg,#00b09b,#96c93d)}
        .notification-close{background:transparent;border:none;color:white;font-weight:700;cursor:pointer}
      `}</style>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
