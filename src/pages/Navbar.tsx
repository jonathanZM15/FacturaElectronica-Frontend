import React, { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';
import logo from '../assets/maximofactura.png';
import api, { company } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import { useSidebar } from '../contexts/SidebarContext';
import ConfirmDialog from './ConfirmDialog';

const Navbar: React.FC = () => {
  const { user, logout } = useUser();
  const { menuOpen, toggleMenu } = useSidebar();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { show } = useNotification();

  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    api.get('/api/companies/1/logo')
      .then((res) => { if (mounted) setLogoUrl(res?.data?.url || null); })
      .catch(() => {})
      .finally(() => {});
    return () => { mounted = false; };
  }, []);

  const handleLogoClick = () => fileInputRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      show({ title: 'Error', message: 'No se seleccionó ningún archivo', type: 'error' });
      return;
    }
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await company.uploadLogo(1, formData);
      const url = res?.data?.url || URL.createObjectURL(file);
      setLogoUrl(url);
      show({ title: 'Éxito', message: 'Logo actualizado correctamente', type: 'success' });
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.response?.data || 'No se pudo subir el logo';
      show({ title: 'Error', message: serverMessage, type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => setConfirmLogoutOpen(true);
  const confirmLogout = async () => { setConfirmLogoutOpen(false); await logout(); };
  const cancelLogout = () => setConfirmLogoutOpen(false);

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <button className="menu-toggle-btn" aria-label="Abrir Menú" onClick={toggleMenu}>☰</button>

        <img
          onClick={handleLogoClick}
          src={logoUrl || logo}
          alt="Máximo Facturas Logo"
          className="navbar-logo"
          style={{ cursor: 'pointer' }}
        />
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
      </div>

      <div className="navbar-right">
        <span className="user-info">
          {user?.name ?? 'Usuario'} <span className="dropdown-arrow">▼</span>
        </span>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">→</span> salir
        </button>
      </div>

      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">👤</span> Dashboard Administrativo
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/emisores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">📧</span> Emisores
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">👥</span> Usuarios
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/planes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">📊</span> Planes
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/impuestos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">🧾</span> Impuestos
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/cambiarPassword" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">🔒</span> Cambiar Contraseña
            </NavLink>
          </li>
        </ul>
      </nav>

      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Cerrar Sesión"
        message="¿Está seguro que desea cerrar la sesión?"
        cancelText="CANCELAR"
        confirmText="CONFIRMAR"
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </header>
  );
};

export default Navbar;