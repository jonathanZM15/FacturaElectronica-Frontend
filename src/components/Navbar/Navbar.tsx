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
                <NavLink to="/inventario/despachos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Despachos Sucursales">
                  <span className="icon">🚚</span>
                  <span className="label">Despachos Sucursales</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/inventario/existencias" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Existencias">
                  <span className="icon">📦</span>
                  <span className="label">Existencias</span>
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
              <li className="nav-item">
                <NavLink to="/clientes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Clientes">
                  <span className="icon">👥</span>
                  <span className="label">Clientes</span>
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

          {/* Emisión de Comprobantes: Solo Emisor, Gerente o Cajero */}
          {user && (user.role === 'emisor' || user.role === 'gerente' || user.role === 'cajero') && (
            <>
              <li className="nav-title">EMISIÓN DE COMPROBANTES</li>
              <li className="nav-item">
                <NavLink
                  to="/guia-remision"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  data-tooltip="Guía de Remisión"
                >
                  <span className="icon">🚚</span>
                  <span className="label">Guía de Remisión</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/nota-credito"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  data-tooltip="Nota de Crédito"
                >
                  <span className="icon">🧾</span>
                  <span className="label">Nota de Crédito</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/nota-debito"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  data-tooltip="Nota de Débito"
                >
                  <span className="icon">📑</span>
                  <span className="label">Nota de Débito</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/liquidaciones-compra"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  data-tooltip="Liquidación de Compra"
                >
                  <span className="icon">🛍️</span>
                  <span className="label">Liquidación de Compra</span>
                </NavLink>
              </li>
            </>
          )}
                    {user && (user.role === 'emisor' || user.role === 'gerente' || user.role === 'cajero') && (
            <>
              <li className="nav-title">POS / VENTAS</li>
          <li className="nav-item">
            <NavLink
              to="/pos"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Punto de Venta"
            >
              <span className="icon">🏪</span>
              <span className="label">Punto de Venta</span>
            </NavLink>
          </li>
            </>
          )}
          
          
          <li className="nav-title">COMPRAS</li>
          <li className="nav-item">
            <NavLink
              to="/ingreso-compras"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Ingreso de Compras"
            >
              <span className="icon">🛒</span>
              <span className="label">Ingreso de Compras</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/historial-compras"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Historial de Compras"
            >
              <span className="icon">🕒</span>
              <span className="label">Historial de Compras</span>
            </NavLink>
          </li>

          <li className="nav-title">ENTIDADES</li>
          <li className="nav-item">
            <NavLink
              to="/directorio"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Directorio"
            >
              <span className="icon">📇</span>
              <span className="label">Directorio</span>
            </NavLink>
          </li>
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
