import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUser } from '../../contexts/userContext';

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  roles: string[];
  to?: string;
  children?: MenuItem[];
};

const operators = ['emisor', 'gerente'];
const managers = ['administrador', 'distribuidor', ...operators];
const movementPath = '/inventario/movimientos';

// La organización cambia; cada opción conserva los roles de acceso existentes.
const items: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard Administrativo', icon: '📊', roles: ['administrador'], to: '/dashboard' },
  {
    id: 'administracion', label: 'Administración', icon: '⚙️', roles: managers,
    children: [
      { id: 'emisores', label: 'Emisores', icon: '🏢', roles: managers, to: '/emisores' },
      { id: 'usuarios', label: 'Usuarios', icon: '👥', roles: ['administrador', 'distribuidor'], to: '/usuarios' },
      { id: 'planes', label: 'Planes', icon: '💎', roles: ['administrador'], to: '/planes' },
      { id: 'impuestos', label: 'Impuestos', icon: '🧾', roles: ['administrador'], to: '/impuestos' },
      { id: 'retenciones', label: 'Retenciones', icon: '📋', roles: ['administrador'], to: '/retenciones' },
      { id: 'firma', label: 'Firma electrónica', icon: '🔐', roles: ['emisor'], to: '/firma' },
    ],
  },
  {
    id: 'inventario', label: 'Inventario', icon: '📦', roles: operators,
    children: [
      { id: 'bodegas', label: 'Bodegas', icon: '🏬', roles: operators, to: '/inventario/bodegas' },
      { id: 'categorias', label: 'Categorías', icon: '🏷️', roles: ['emisor'], to: '/inventario/categorias' },
      { id: 'productos', label: 'Productos', icon: '📦', roles: operators, to: '/inventario/productos' },
      { id: 'existencias', label: 'Existencias', icon: '📊', roles: operators, to: '/inventario/existencias' },
      {
        id: 'movimientos', label: 'Movimientos de inventario', icon: '🔄', roles: operators,
        children: [
          { id: 'ajuste-positivo', label: 'Ajuste positivo', icon: '＋', roles: operators, to: movementPath + '?vista=ajuste-positivo' },
          { id: 'ajuste-negativo', label: 'Ajuste negativo', icon: '−', roles: operators, to: movementPath + '?vista=ajuste-negativo' },
          { id: 'inventario-inicial', label: 'Inventario inicial', icon: '📥', roles: operators, to: movementPath + '?vista=inventario-inicial' },
        ],
      },
      { id: 'kardex', label: 'Kardex', icon: '📑', roles: operators, to: '/inventario/kardex' },
      { id: 'stock-parametros', label: 'Stock Parámetros', icon: '⚙️', roles: operators, to: '/inventario/stock-parametros' },
    ],
  },
  { id: 'clientes', label: 'Clientes', icon: '👥', roles: operators, to: '/clientes' },
  {
    id: 'facturacion', label: 'Facturación', icon: '🧾', roles: ['administrador', ...operators, 'cajero'],
    children: [
      { id: 'facturas', label: 'Facturas', icon: '🧾', roles: ['administrador', ...operators, 'cajero'], to: '/facturas' },
      { id: 'pos', label: 'Punto de Venta', icon: '🏪', roles: ['cajero'], to: '/pos' },
    ],
  },
];

function isSelected(item: MenuItem, pathname: string, search: string): boolean {
  if (item.children) return item.children.some(child => isSelected(child, pathname, search));
  if (!item.to) return false;
  const [path, query] = item.to.split('?');
  if (item.id === 'clientes' && pathname === '/inventario/clientes') return true;
  if (pathname !== path && !pathname.startsWith(path + '/')) return false;
  if (!query) return true;
  const requestedView = new URLSearchParams(query).get('vista');
  const currentView = new URLSearchParams(search).get('vista');
  const validViews = ['ajuste-positivo', 'ajuste-negativo', 'inventario-inicial'];
  return requestedView === (currentView && validViews.includes(currentView) ? currentView : 'ajuste-positivo');
}

const MenuGroup: React.FC<{ item: MenuItem; role: string; onNavigate: () => void }> = ({ item, role, onNavigate }) => {
  const { menuOpen, setMenuOpen } = useSidebar();
  const { pathname, search } = useLocation();
  const active = isSelected(item, pathname, search);
  const [expanded, setExpanded] = useState(active);

  // Una URL directa o el historial del navegador revela su opción y sus padres.
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active, pathname, search]);

  const children = item.children?.filter(child => child.roles.includes(role)) || [];
  if (children.length === 0) return null;
  const open = menuOpen && expanded;

  return (
    <li className="nav-item nav-group">
      <button
        type="button"
        className={`nav-link nav-group-toggle ${active ? 'group-active' : ''}`}
        aria-label={item.label}
        aria-expanded={open}
        aria-controls={`submenu-${item.id}`}
        title={item.label}
        onClick={() => {
          if (!menuOpen) {
            setMenuOpen(true);
            setExpanded(true);
          } else setExpanded(previous => !previous);
        }}
      >
        <span className="icon" aria-hidden="true">{item.icon}</span>
        <span className="label">{item.label}</span>
        <ChevronDown className={`nav-chevron ${open ? 'expanded' : ''}`} size={18} aria-hidden="true" />
      </button>
      <ul id={`submenu-${item.id}`} className="nav-submenu" hidden={!open}>
        {children.map(child => <MenuEntry key={child.id} item={child} role={role} onNavigate={onNavigate} />)}
      </ul>
    </li>
  );
};

const MenuEntry: React.FC<{ item: MenuItem; role: string; onNavigate: () => void }> = ({ item, role, onNavigate }) => {
  const { pathname, search } = useLocation();
  if (item.children) return <MenuGroup item={item} role={role} onNavigate={onNavigate} />;
  const selected = isSelected(item, pathname, search);
  return (
    <li className="nav-item">
      <NavLink to={item.to!} className={() => `nav-link ${selected ? 'active' : ''}`}
        aria-label={item.label} aria-current={selected ? 'page' : false} title={item.label}
        data-tooltip={item.label} onClick={onNavigate}>
        <span className="icon" aria-hidden="true">{item.icon}</span>
        <span className="label">{item.label}</span>
      </NavLink>
    </li>
  );
};

const SidebarMenu: React.FC = () => {
  const { user } = useUser();
  const { setMenuOpen } = useSidebar();
  if (!user) return null;
  const closeOnMobile = () => {
    if (window.matchMedia('(max-width: 768px)').matches) setMenuOpen(false);
  };
  return (
    <ul className="nav-list">
      {items.filter(item => item.roles.includes(user.role)).map(item => (
        <MenuEntry key={item.id} item={item} role={user.role} onNavigate={closeOnMobile} />
      ))}
    </ul>
  );
};

export default SidebarMenu;
