import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';
import logo from '../assets/maximofactura.png';
// static header: no dynamic logo or user controls
import { useSidebar } from '../contexts/SidebarContext';
import { useUser } from '../contexts/userContext';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { menuOpen, toggleMenu } = useSidebar();
  const { user, logout } = useUser();
  const navigate = useNavigate();

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <button className="menu-toggle-btn" aria-label="Abrir Menú" onClick={toggleMenu}>
          <span className="hamburger" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <img
          src={logo}
          alt="Máximo Facturas Logo"
          className="navbar-logo"
          style={{ cursor: 'default' }}
        />
      </div>

      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="icon">👤</span>
                <span className="label">Dashboard Administrativo</span>
              </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/emisores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">📧</span>
              <span className="label">Emisores</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">👥</span>
              <span className="label">Usuarios</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/planes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">📊</span>
              <span className="label">Planes</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/impuestos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">🧾</span>
              <span className="label">Impuestos</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/cambiarPassword" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="icon">🔒</span>
              <span className="label">Cambiar Contraseña</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* top bar right: user name and logout */}
      <div className="navbar-right">
        {user && (
          <div className="user-area">
            <span className="user-name">{(user as any).name || (user as any).username || (user as any).email}</span>
            <button className="logout-btn" onClick={async () => { try { await logout(); } catch { navigate('/'); } }} title="Cerrar sesión">
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;