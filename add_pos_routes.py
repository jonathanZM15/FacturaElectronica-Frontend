import os
import re

# App.tsx
file_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\App.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import HistorialComprasPage from './pages/Compras/HistorialComprasPage';",
    "import HistorialComprasPage from './pages/Compras/HistorialComprasPage';\nimport PosPage from './pages/POS/PosPage';\nimport CajasPage from './pages/POS/CajasPage';"
)

# Add routes
routes = """                {/* POS */}
                <Route path="/pos" element={<PosPage />} />
                <Route path="/cajas" element={<CajasPage />} />

                {/* Compras */}"""
content = content.replace("{/* Compras */}", routes)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Navbar.tsx
nav_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\components\Navbar\Navbar.tsx"
with open(nav_path, 'r', encoding='utf-8') as f:
    nav_content = f.read()

pos_nav = """          <li className="nav-title">POS / VENTAS</li>
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
          <li className="nav-item">
            <NavLink
              to="/cajas"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Gestión de Cajas"
            >
              <span className="icon">💵</span>
              <span className="label">Gestión de Cajas</span>
            </NavLink>
          </li>
          
          <li className="nav-title">COMPRAS</li>"""
nav_content = nav_content.replace('<li className="nav-title">COMPRAS</li>', pos_nav)

with open(nav_path, 'w', encoding='utf-8') as f:
    f.write(nav_content)

print("Injected routes and nav")
