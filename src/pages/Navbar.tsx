import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom'; // IMPORTANTE: Para la navegación interna
import './Navbar.css'; // Importa los estilos
// Asegúrate de que esta ruta sea correcta para tu logo
import logo from '../assets/maximofactura.png';
import api, { company } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useUser } from '../contexts/userContext';

const Navbar: React.FC = () => {
  const { user, logout } = useUser();
  // Start with menu open by default (matches current layout). Toggle will hide/show.
  const [menuOpen, setMenuOpen] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { show } = useNotification();

  React.useEffect(() => {
    let mounted = true;
    api.get('/api/companies/1/logo').then((res) => {
      if (!mounted) return;
      setLogoUrl(res.data?.url ?? null);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleLogoClick = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('logo', f);
    try {
      show({ title: 'Subiendo', message: 'Subiendo logo...', type: 'info' });
      const res = await company.uploadLogo(1, fd);
      const url = res.data?.url ?? null;
      setLogoUrl(url);
      show({ title: 'Éxito', message: 'Logo actualizado', type: 'success' });
    } catch (err: any) {
      // Log server response body when available to help debugging (422 validation errors)
      console.error('Upload error', err, err?.response?.data);
      const serverMessage = err?.response?.data?.message || err?.response?.data || 'No se pudo subir el logo';
      show({ title: 'Error', message: serverMessage, type: 'error' });
    } finally {
      // clear input value so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const toggleMenu = () => setMenuOpen((v) => !v);

  return (
    <header className="navbar-container">
      {/* 1. Sección Izquierda: Menú y Logo */}
      <div className="navbar-left">
        <button className="menu-toggle-btn" aria-label="Abrir Menú" onClick={toggleMenu}>
          ☰
        </button>
  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
  <img onClick={handleLogoClick} src={logoUrl || logo} alt="Máximo Facturas Logo" className="navbar-logo" style={{ cursor: 'pointer' }} />
      </div>

      {/* 2. Sección Derecha: Usuario y Botón de Salir */}
      <div className="navbar-right">
        <span className="user-info">
          {user?.name ?? 'Usuario'} <span className="dropdown-arrow">▼</span>
        </span>
        
        <button 
          className="logout-btn" 
          onClick={handleLogout}
        >
          <span className="logout-icon">→</span> salir
        </button>
      </div>

      {/* 3. Sidebar o Menú Lateral (Implementación de Rutas con Link) */}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          {/* Dashboard */}
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link">
              <span className="icon">👤</span> Dashboard Administrativo
            </Link>
          </li>
          {/* Emisores (ACTIVO en la imagen) */}
          <li className="nav-item active"> 
            <Link to="/emisores" className="nav-link">
              <span className="icon">📧</span> Emisores
            </Link>
          </li>
          {/* Usuarios */}
          <li className="nav-item">
            <Link to="/usuarios" className="nav-link">
              <span className="icon">👥</span> Usuarios
            </Link>
          </li>
          {/* Planes */}
          <li className="nav-item">
            <Link to="/planes" className="nav-link">
              <span className="icon">📊</span> Planes
            </Link>
          </li>
          {/* Impuestos */}
          <li className="nav-item">
            <Link to="/impuestos" className="nav-link">
              <span className="icon">🧾</span> Impuestos
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;