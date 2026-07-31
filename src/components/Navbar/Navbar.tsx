import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';
import logo from '../../assets/maximofactura.png';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUser } from '../../contexts/userContext';
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

          {/* Inventario: Admin, Distribuidor, Emisor y Gerente */}
          {user && (user.role === 'administrador' || user.role === 'distribuidor' || user.role === 'emisor' || user.role === 'gerente') && (
            <>
              <li className="nav-item">
                <NavLink to="/inventario/bodegas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Bodegas">
                  <span className="icon">🏬</span>
                  <span className="label">Bodegas</span>
                </NavLink>
              </li>
              <li className="nav-item">
                  <NavLink to="/inventario/categorias" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Categorías">
                      <span className="icon">🏷️</span>
                      <span className="label">Categorías</span>
                  </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/inventario/productos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Productos">
                  <span className="icon">📦</span>
                  <span className="label">Productos</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/inventario/movimientos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Movimientos">
                  <span className="icon">🔄</span>
                  <span className="label">Movimientos</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/inventario/kardex" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Kardex">
                  <span className="icon">📑</span>
                  <span className="label">Kardex</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/inventario/stock-parametros" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Stock Parámetros">
                  <span className="icon">⚙️</span>
                  <span className="label">Stock Parámetros</span>
                </NavLink>
              </li>
            </>
          )}

          {/* Prueba Emisión: solo Admin */}
          {user && user.role === 'administrador' && (
            <li className="nav-item">
              <NavLink
                to="/prueba-emision"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Prueba Emisión"
              >
                <span className="icon">🧪</span>
                <span className="label">Prueba Emisión</span>
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