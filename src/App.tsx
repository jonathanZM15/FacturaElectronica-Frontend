import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import PasswordRecovery from './pages/PasswordRecovery';
import CambiarPassword from './pages/cambiarPassword';
import VerifyEmail from './pages/VerifyEmail';
import ChangePassword from './pages/ChangePassword';
import { auth } from './services/api';
import { UserProvider, useUser } from './contexts/userContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';

import AppLayout from './layouts/AppLayout';
import Emisores from './pages/Emisores';
import EmisorInfo from './pages/EmisorInfo';
import EstablecimientoInfo from './pages/EstablecimientoInfo';
import EstablecimientoEditInfo from './pages/EstablecimientoEditInfo';
import PuntoEmisionInfo from './pages/PuntoEmisionInfo';
import Usuarios from './pages/Usuarios';
import UsuarioInfo from './pages/UsuarioInfo';
import Planes from './pages/Planes';
import Blank from './pages/Blank';

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
                <Route path="/emisores/:id/establecimientos/:estId" element={<EstablecimientoEditInfo />} />
                <Route path="/emisores/:id/establecimientos/:estId/puntos/:puntoId" element={<PuntoEmisionInfo />} />
                
                {/* Usuarios */}
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/usuarios/:id" element={<UsuarioInfo />} />
                
                {/* Planes */}
                <Route path="/planes" element={<Planes />} />
                
                {/* Compatibilidad: redirige /Navbar a /emisores */}
                <Route path="/Navbar" element={<Navigate to="/emisores" replace />} />

                {/* Secciones en blanco por ahora */}
                <Route path="/dashboard" element={<Blank />} />
                <Route path="/impuestos" element={<Blank />} />
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
