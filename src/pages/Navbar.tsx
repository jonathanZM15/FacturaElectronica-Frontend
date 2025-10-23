import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // IMPORTANTE: Para la navegación interna
import './Navbar.css'; // Importa los estilos
// Asegúrate de que esta ruta sea correcta para tu logo
import logo from '../assets/maximofactura.png'; 
import { useUser } from '../contexts/userContext';

const Navbar: React.FC = () => {
  const { user, logout } = useUser();
  // Start with menu open by default (matches current layout). Toggle will hide/show.
  const [menuOpen, setMenuOpen] = useState(true);

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
        <img src={logo} alt="Máximo Facturas Logo" className="navbar-logo" />
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