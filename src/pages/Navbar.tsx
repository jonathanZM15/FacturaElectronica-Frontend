import React from 'react';
import { Link,useNavigate } from 'react-router-dom'; // IMPORTANTE: Para la navegación interna
import './Navbar.css'; // Importa los estilos
// Asegúrate de que esta ruta sea correcta para tu logo
import logo from '../assets/maximofactura.png'; 

const Navbar: React.FC = () => {
  // Inicializa la función de navegación
  const navigate = useNavigate();

  // Función para manejar el clic de 'Salir'
  const handleLogout = () => {
    // 1. Lógica de limpieza (en una aplicación real)
    // - Eliminar el token JWT de localStorage o sessionStorage
    // localStorage.removeItem('authToken'); 
    
    console.log('Saliendo de la sesión y redirigiendo a /');
    
    // 2. Redirige al Login (ruta '/')
    navigate('/'); 
  };

  return (
    <header className="navbar-container">
      {/* 1. Sección Izquierda: Menú y Logo */}
      <div className="navbar-left">
        <button className="menu-toggle-btn" aria-label="Abrir Menú">
          ☰
        </button>
        <img src={logo} alt="Máximo Facturas Logo" className="navbar-logo" />
      </div>

      {/* 2. Sección Derecha: Usuario y Botón de Salir */}
      <div className="navbar-right">
        <span className="user-info">
          RBFORTY <span className="dropdown-arrow">▼</span>
        </span>
        
        <button 
          className="logout-btn" 
          onClick={handleLogout}
        >
          <span className="logout-icon">→</span> salir
        </button>
      </div>

      {/* 3. Sidebar o Menú Lateral (Implementación de Rutas con Link) */}
      <nav className="sidebar">
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