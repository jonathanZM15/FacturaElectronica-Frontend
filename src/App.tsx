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
import Blank from './pages/Dashboard/Blank';

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
                {/* Ruta inicial autenticada */}
                <Route path="/emisores" element={<Emisores />} />
                <Route path="/emisores/:id" element={<EmisorInfo />} />
                <Route path="/emisores/:id/establecimientos" element={<EmisorInfo />} />
                <Route path="/emisores/:id/usuarios" element={<EmisorInfo />} />
                <Route path="/emisores/:id/suscripciones" element={<EmisorInfo />} />
                <Route path="/emisores/:id/establecimientos/:estId" element={<EstablecimientoEditInfo />} />
                <Route path="/emisores/:id/establecimientos/:estId/puntos/:puntoId" element={<PuntoEmisionInfo />} />
                
                {/* Usuarios */}
                <Route path="/usuarios" element={<Usuarios />} />
                
                {/* Planes */}
                <Route path="/planes" element={<Planes />} />
                
                {/* Tipos de Impuesto */}
                <Route path="/impuestos" element={<TiposImpuesto />} />
                
                {/* Tipos de Retención */}
                <Route path="/retenciones" element={<TiposRetencion />} />
                
                {/* Compatibilidad: redirige /Navbar a /emisores */}
                <Route path="/Navbar" element={<Navigate to="/emisores" replace />} />

                {/* Secciones en blanco por ahora */}
                <Route path="/dashboard" element={<Blank />} />
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
