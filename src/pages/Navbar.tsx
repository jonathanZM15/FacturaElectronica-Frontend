import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../assets/maximofactura.png';
import api, { company } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';
import ConfirmDialog from './ConfirmDialog';

const Navbar: React.FC = () => {
  const { user, logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { show } = useNotification();

  // NUEVO: estado del modal de confirmación
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    api.get('/api/companies/1/logo')
      .then((res) => {
        if (!mounted) return;
        setLogoUrl(res?.data?.url || null);
      })
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

  // MODIFICADO: ahora solo abre el modal
  const handleLogout = () => {
    setConfirmLogoutOpen(true);
  };

  const confirmLogout = async () => {
    setConfirmLogoutOpen(false);
    await logout(); // userContext ya hace navigate('/') y limpia storage
  };

  const cancelLogout = () => setConfirmLogoutOpen(false);

  const toggleMenu = () => setMenuOpen((v) => !v);

  return (
    <header className="navbar-container">
      {/* 1. Sección Izquierda: Menú y Logo */}
      <div className="navbar-left">
        <button className="menu-toggle-btn" aria-label="Abrir Menú" onClick={toggleMenu}>
          ☰
        </button>

        {/* Logo (clic para subir) */}
        <img
          onClick={handleLogoClick}
          src={logoUrl || logo}
          alt="Máximo Facturas Logo"
          className="navbar-logo"
          style={{ cursor: 'pointer' }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
      </div>

      {/* 2. Sección Derecha: Usuario y Botón de Salir */}
      <div className="navbar-right">
        <span className="user-info">
          {user?.name ?? 'Usuario'} <span className="dropdown-arrow">▼</span>
        </span>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">→</span> salir
        </button>
      </div>

      {/* 3. Sidebar o Menú Lateral */}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link">
              <span className="icon">👤</span> Dashboard Administrativo
            </Link>
          </li>
          <li className="nav-item active">
            <Link to="/emisores" className="nav-link">
              <span className="icon">📧</span> Emisores
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/usuarios" className="nav-link">
              <span className="icon">👥</span> Usuarios
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/planes" className="nav-link">
              <span className="icon">📊</span> Planes
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/impuestos" className="nav-link">
              <span className="icon">🧾</span> Impuestos
            </Link>
          </li>
        </ul>
      </nav>

      {/* Modal de confirmación (como en la imagen) */}
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