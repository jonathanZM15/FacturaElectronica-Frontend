import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Auth/Login';
import PasswordRecovery from './pages/Auth/PasswordRecovery';
import CambiarPassword from './pages/Auth/cambiarPassword';
import VerifyEmail from './pages/Auth/VerifyEmail';
import ConfirmEmailChange from './pages/Auth/ConfirmEmailChange';
import ChangePassword from './pages/Auth/ChangePassword';
import { auth } from './services/api';
import { UserProvider, useUser } from './contexts/userContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';

import AppLayout from './layouts/AppLayout';
import Emisores from './pages/Emisores/Emisores';
import EmisorInfo from './pages/Emisores/EmisorInfo';
import EstablecimientoInfo from './pages/Establecimientos/EstablecimientoInfo';
import EstablecimientoEditInfo from './pages/Establecimientos/EstablecimientoEditInfo';
import PuntoEmisionInfo from './pages/PuntosEmision/PuntoEmisionInfo';
import Usuarios from './pages/Usuarios/Usuarios';
import Planes from './pages/Planes/Planes';
import TiposImpuesto from './pages/TiposImpuesto/TiposImpuesto';
import TiposRetencion from './pages/TiposRetencion/TiposRetencion';
import PruebaEmisionComprobante from './pages/PruebaEmision/PruebaEmision';
import NotaCreditoPage from './pages/NotaCredito/NotaCredito';
import LiquidacionesCompraPage from './pages/LiquidacionesCompra/LiquidacionesCompraPage';
import NotaDebitoPage from './pages/NotaDebito/NotaDebito';
import GuiaRemisionPage from './pages/GuiaRemision/GuiaRemision';
import DirectorioPage from './pages/Directorio/DirectorioPage';
import IngresoComprasPage from './pages/Compras/IngresoComprasPage';
import HistorialComprasPage from './pages/Compras/HistorialComprasPage';
import PosPage from './pages/POS/PosPage';

import Blank from './pages/Dashboard/Blank';

import BodegasPage from './pages/Inventario/BodegasPage';
import ProductosPage from './pages/Inventario/ProductosPage';
import MovimientosPage from './pages/Inventario/MovimientosPage';
import KardexPage from './pages/Inventario/KardexPage';
import CategoriasPage from './pages/Inventario/CategoriasPage';
import StockParametrosPage from './pages/Inventario/StockParametrosPage';
import DespachosSucursalPage from './pages/Inventario/DespachosSucursalPage';
import ExistenciasPage from './pages/Inventario/ExistenciasPage';
import ClientesPage from './pages/Clientes/ClientesPage';

const ChangePasswordAuthed: React.FC = () => {
  const { logout } = useUser();
  const handleSubmit = async (newPassword: string) => {
    await auth.cambiarPassword('', newPassword);
    await logout();
  };
  return <CambiarPassword onSubmit={handleSubmit} />;
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <UserProvider>
          <SidebarProvider>
            <Routes>
              {/* Públicas */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/PasswordRecovery" element={<PasswordRecovery/>} />
              <Route path="/cambiarPassword" element={<CambiarPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
              <Route path="/change-password" element={<ChangePassword />} />

              {/* Protegidas con layout (Navbar + contenido dinámico) */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Ruta inicial autenticada: Admin, Distribuidor, Emisor y Gerente */}
                <Route path="/emisores" element={<RoleRoute allowedRoles={['administrador', 'distribuidor', 'emisor', 'gerente']}><Emisores /></RoleRoute>} />
                <Route path="/emisores/:id" element={<RoleRoute allowedRoles={['administrador', 'distribuidor', 'emisor', 'gerente']}><EmisorInfo /></RoleRoute>} />
                <Route path="/emisores/:id/establecimientos" element={<RoleRoute allowedRoles={['administrador', 'distribuidor', 'emisor', 'gerente']}><EmisorInfo /></RoleRoute>} />
                <Route path="/emisores/:id/usuarios" element={<RoleRoute allowedRoles={['administrador', 'distribuidor', 'emisor', 'gerente']}><EmisorInfo /></RoleRoute>} />
                <Route path="/emisores/:id/suscripciones" element={<RoleRoute allowedRoles={['administrador', 'distribuidor', 'emisor', 'gerente']}><EmisorInfo /></RoleRoute>} />
                <Route path="/emisores/:id/establecimientos/:estId" element={<RoleRoute allowedRoles={['administrador', 'distribuidor', 'emisor', 'gerente']}><EstablecimientoEditInfo /></RoleRoute>} />
                <Route path="/emisores/:id/establecimientos/:estId/puntos/:puntoId" element={<RoleRoute allowedRoles={['administrador', 'distribuidor', 'emisor', 'gerente']}><PuntoEmisionInfo /></RoleRoute>} />
                
                {/* Usuarios: Admin y Distribuidor */}
                <Route path="/usuarios" element={<RoleRoute allowedRoles={['administrador', 'distribuidor']}><Usuarios /></RoleRoute>} />
                
                {/* Planes: solo Administrador */}
                <Route path="/planes" element={<RoleRoute allowedRoles={['administrador']}><Planes /></RoleRoute>} />
                
                {/* Tipos de Impuesto: solo Administrador */}
                <Route path="/impuestos" element={<RoleRoute allowedRoles={['administrador']}><TiposImpuesto /></RoleRoute>} />
                
                {/* Tipos de Retención: solo Administrador */}
                <Route path="/retenciones" element={<RoleRoute allowedRoles={['administrador']}><TiposRetencion /></RoleRoute>} />

                {/* Inventario: Emisor y Gerente */}
                <Route path="/inventario/bodegas" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><BodegasPage /></RoleRoute>} />
                <Route path="/inventario/productos" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><ProductosPage /></RoleRoute>} />
                <Route path="/inventario/movimientos" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><MovimientosPage /></RoleRoute>} />
                <Route path="/inventario/despachos" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><DespachosSucursalPage /></RoleRoute>} />
                <Route path="/inventario/existencias" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><ExistenciasPage /></RoleRoute>} />
                <Route path="/inventario/kardex" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><KardexPage /></RoleRoute>} />
                <Route path="/inventario/categorias" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><CategoriasPage /></RoleRoute>} />
                <Route path="/inventario/stock-parametros" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><StockParametrosPage /></RoleRoute>} />
                
                {/* Clientes: Emisor, Gerente y Cajero */}
                <Route path="/clientes" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><ClientesPage /></RoleRoute>} />
                <Route path="/inventario/clientes" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><ClientesPage /></RoleRoute>} />

                {/* Prueba Emisión: solo Administrador */}
                <Route path="/prueba-emision" element={<RoleRoute allowedRoles={['administrador']}><PruebaEmisionComprobante /></RoleRoute>} />

                {/* Módulo Emisión de Comprobantes: Emisor, Gerente y Cajero */}
                <Route path="/nota-credito" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><NotaCreditoPage /></RoleRoute>} />
                <Route path="/liquidaciones-compra" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><LiquidacionesCompraPage /></RoleRoute>} />
                <Route path="/nota-debito" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><NotaDebitoPage /></RoleRoute>} />
                <Route path="/guia-remision" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><GuiaRemisionPage /></RoleRoute>} />

                {/* Directorio: Emisor, Gerente y Cajero */}
                <Route path="/directorio" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><DirectorioPage /></RoleRoute>} />

                {/* POS / Ventas: Emisor, Gerente y Cajero */}
                <Route path="/pos" element={<RoleRoute allowedRoles={['emisor', 'gerente', 'cajero']}><PosPage /></RoleRoute>} />

                {/* Compras: Emisor y Gerente */}
                <Route path="/ingreso-compras" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><IngresoComprasPage /></RoleRoute>} />
                <Route path="/historial-compras" element={<RoleRoute allowedRoles={['emisor', 'gerente']}><HistorialComprasPage /></RoleRoute>} />
                
                {/* Compatibilidad: redirige /Navbar a /emisores */}
                <Route path="/Navbar" element={<Navigate to="/emisores" replace />} />

                {/* Dashboard: solo Administrador */}
                <Route path="/dashboard" element={<RoleRoute allowedRoles={['administrador']}><Blank /></RoleRoute>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SidebarProvider>
        </UserProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useUser();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const RoleRoute: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { user, loading } = useUser();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const userRole = typeof user.role === 'string' ? user.role : (user.role as any)?.value;
  if (!allowedRoles.includes(userRole)) {
    if (userRole === 'administrador') return <Navigate to="/dashboard" replace />;
    if (userRole === 'distribuidor') return <Navigate to="/emisores" replace />;
    if (userRole === 'cajero') return <Navigate to="/pos" replace />;
    return <Navigate to="/emisores" replace />;
  }

  return <>{children}</>;
};
