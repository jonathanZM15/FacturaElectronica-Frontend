import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import SidebarMenu from './SidebarMenu';
import logo from '../../assets/maximofactura.png';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUser } from '../../contexts/userContext';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';

const Navbar: React.FC = () => {
  const { menuOpen, toggleMenu, setMenuOpen } = useSidebar();
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const menuToggle = useRef<HTMLButtonElement>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <button ref={menuToggle} type="button" className="menu-toggle-btn"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen}
          aria-controls="main-sidebar" onClick={toggleMenu}>
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

      {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Cerrar menú lateral"
        onClick={() => { setMenuOpen(false); menuToggle.current?.focus(); }} />}
      <nav id="main-sidebar" aria-label="Menú principal" className={`sidebar ${menuOpen ? 'open' : ''}`}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setMenuOpen(false);
            menuToggle.current?.focus();
          }
        }}>
        <SidebarMenu />
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
