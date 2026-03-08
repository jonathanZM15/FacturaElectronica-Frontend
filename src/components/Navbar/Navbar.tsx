import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';
import logo from '../../assets/maximofactura.png';
// static header: no dynamic logo or user controls
import { useSidebar } from '../../contexts/SidebarContext';
import { useUser } from '../../contexts/userContext';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';

const Navbar: React.FC = () => {
  const { menuOpen, toggleMenu } = useSidebar();
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
          {/* Dashboard Administrativo: solo Admin */}
          {user && user.role === 'administrador' && (
            <li className="nav-item">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Dashboard"
              >
                <span className="icon">📊</span>
                <span className="label">Dashboard Administrativo</span>
              </NavLink>
            </li>
          )}
          
          {/* Emisores: Admin, Distribuidor, Emisor y Gerente */}
          {user && (user.role === 'administrador' || user.role === 'distribuidor' || user.role === 'emisor' || user.role === 'gerente') && (
            <li className="nav-item">
              <NavLink 
                to="/emisores" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Emisores"
              >
                <span className="icon">🏢</span>
                <span className="label">Emisores</span>
              </NavLink>
            </li>
          )}
          
          {/* Usuarios: Administrador y Distribuidor */}
          {user && (user.role === 'administrador' || user.role === 'distribuidor') && (
            <li className="nav-item">
              <NavLink 
                to="/usuarios" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Usuarios"
              >
                <span className="icon">👥</span>
                <span className="label">Usuarios</span>
              </NavLink>
            </li>
          )}
          
          {/* Planes: solo Administrador */}
          {user && user.role === 'administrador' && (
            <li className="nav-item">
              <NavLink 
                to="/planes" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Planes"
              >
                <span className="icon">💎</span>
                <span className="label">Planes</span>
              </NavLink>
            </li>
          )}
          
          {/* Impuestos: solo Admin */}
          {user && user.role === 'administrador' && (
            <li className="nav-item">
              <NavLink 
                to="/impuestos" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Impuestos"
              >
                <span className="icon">🧾</span>
                <span className="label">Impuestos</span>
              </NavLink>
            </li>
          )}
          
          {/* Retenciones: solo Admin */}
          {user && user.role === 'administrador' && (
            <li className="nav-item">
              <NavLink 
                to="/retenciones" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Retenciones"
              >
                <span className="icon">📋</span>
                <span className="label">Retenciones</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* top bar right: user name and logout */}
      <div className="navbar-right">
        {user && (
          <div className="user-area">
            <span className="user-name">{(user as any).name || (user as any).username || (user as any).email}</span>
            <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)} title="Cerrar sesión">
              Salir
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Cerrar Sesión"
        message="¿Estás seguro que deseas cerrar la sesión? Tu progreso no guardado se perderá."
        cancelText="Cancelar"
        confirmText="Sí, cerrar sesión"
        variant="danger"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          try {
            await logout();
          } catch {
            navigate('/');
          }
        }}
      />
    </header>
  );
};

export default Navbar;